import "server-only";

import crypto from "node:crypto";
import { getDb, newId, nowIso } from "./db";
import { isEssential, renderMail, type MailPayload, type MailTemplate } from "./mail-templates";

/**
 * Correo transaccional con bandeja de salida en la base de datos.
 *
 * Nunca se envía dentro de la petición: `enqueueEmail` solo guarda la fila y un
 * trabajo programado (`send-outbox`) la entrega. Así una caída del proveedor no
 * pierde ni bloquea una solicitud, y los reintentos quedan registrados.
 *
 * Proveedor (MAIL_PROVIDER): `resend` (API HTTP, sin dependencias) o `log`
 * (escribe en la consola; solo desarrollo). Sin proveedor en producción los
 * mensajes quedan pendientes: no se pierden, se entregan al configurarlo.
 */

export type OutboundMail = { to: string; from: string; subject: string; text: string; html: string };
export type MailTransport = (message: OutboundMail) => Promise<void>;

/** Error que no se arregla reintentando (dirección inválida, remitente no verificado). */
export class PermanentMailError extends Error {}

const MAX_ATTEMPTS = 6;
const BACKOFF_BASE_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 6 * 60 * 60_000;

export function mailFrom(): string {
  return process.env.MAIL_FROM?.trim() || "DatosPrivados <no-responder@datosprivados.pe>";
}

function apiBase() {
  return (process.env.MAIL_API_BASE || "https://api.resend.com").replace(/\/$/, "");
}

export function mailProvider(): "resend" | "log" | "none" {
  const configured = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (configured === "resend" && process.env.MAIL_API_KEY) return "resend";
  if (configured === "log") return "log";
  if (!configured && process.env.NODE_ENV !== "production") return "log";
  return "none";
}

const resendTransport: MailTransport = async (message) => {
  const response = await fetch(`${apiBase()}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MAIL_API_KEY}` },
    body: JSON.stringify({ from: message.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.ok) return;
  const detail = (await response.text()).slice(0, 300);
  const permanent = response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408;
  const error = `Resend respondió ${response.status}: ${detail}`;
  throw permanent ? new PermanentMailError(error) : new Error(error);
};

const logTransport: MailTransport = async (message) => {
  console.info(`[mail] → ${message.to} · ${message.subject}\n${message.text}`);
};

function defaultTransport(): MailTransport | null {
  const provider = mailProvider();
  if (provider === "resend") return resendTransport;
  if (provider === "log") return logTransport;
  return null;
}

type OutboxRow = {
  id: string;
  company_id: string | null;
  to_email: string;
  template: string;
  payload: string;
  essential: number;
  status: string;
  attempts: number;
};

/**
 * Encola un correo. Con `dedupeKey` es idempotente: repetir el mismo aviso
 * (por ejemplo, un recordatorio de plazo) no genera un segundo mensaje.
 * Devuelve true si se encoló uno nuevo.
 */
export function enqueueEmail(input: {
  to: string;
  template: MailTemplate;
  payload: MailPayload;
  companyId?: string | null;
  dedupeKey?: string;
  now?: Date;
}): boolean {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) return false;
  const now = (input.now ?? new Date()).toISOString();
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO email_outbox (id, company_id, to_email, template, payload, essential, status, attempts, next_attempt_at, dedupe_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`
    )
    .run(
      newId(),
      input.companyId ?? null,
      to,
      input.template,
      JSON.stringify(input.payload),
      isEssential(input.template) ? 1 : 0,
      now,
      input.dedupeKey ?? null,
      now
    );
  return Number(result.changes) > 0;
}

export function suppressEmail(email: string, reason: string) {
  getDb()
    .prepare("INSERT OR REPLACE INTO email_suppressions (email, reason, created_at) VALUES (?, ?, ?)")
    .run(email.trim().toLowerCase(), reason, nowIso());
}

export function isSuppressed(email: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM email_suppressions WHERE email = ?").get(email.trim().toLowerCase()));
}

export type OutboxResult = { sent: number; failed: number; skipped: number; dead: number };

/** Entrega los correos vencidos. Seguro de repetir: cada fila se reclama antes de enviarse. */
export async function processOutbox(
  options: { limit?: number; now?: Date; transport?: MailTransport | null } = {}
): Promise<OutboxResult> {
  const db = getDb();
  const now = options.now ?? new Date();
  const transport = options.transport === undefined ? defaultTransport() : options.transport;
  const result: OutboxResult = { sent: 0, failed: 0, skipped: 0, dead: 0 };
  if (!transport) return result;

  const due = db
    .prepare("SELECT * FROM email_outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at LIMIT ?")
    .all(now.toISOString(), options.limit ?? 50) as unknown as OutboxRow[];

  for (const row of due) {
    // Reclamo atómico: si otro proceso ya tomó la fila, no se envía dos veces.
    const claimed = db.prepare("UPDATE email_outbox SET status = 'sending' WHERE id = ? AND status = 'pending'").run(row.id);
    if (Number(claimed.changes) === 0) continue;

    const finish = (status: string, error: string | null, extra: { nextAttempt?: string; sentAt?: string } = {}) =>
      db
        .prepare(
          "UPDATE email_outbox SET status = ?, error = ?, attempts = attempts + ?, next_attempt_at = COALESCE(?, next_attempt_at), sent_at = ? WHERE id = ?"
        )
        .run(status, error, status === "skipped" || status === "suppressed" ? 0 : 1, extra.nextAttempt ?? null, extra.sentAt ?? null, row.id);

    if (isSuppressed(row.to_email)) {
      finish("suppressed", "Dirección con rebote o queja previa.");
      result.skipped += 1;
      continue;
    }
    if (!row.essential && row.company_id) {
      const company = db.prepare("SELECT mail_optout FROM companies WHERE id = ?").get(row.company_id) as { mail_optout: number } | undefined;
      if (company?.mail_optout) {
        finish("skipped", "La empresa desactivó los correos no esenciales.");
        result.skipped += 1;
        continue;
      }
    }

    try {
      const rendered = renderMail(row.template as MailTemplate, JSON.parse(row.payload) as MailPayload);
      await transport({ to: row.to_email, from: mailFrom(), ...rendered });
      finish("sent", null, { sentAt: now.toISOString() });
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = row.attempts + 1;
      if (error instanceof PermanentMailError || attempts >= MAX_ATTEMPTS) {
        finish("dead", message);
        result.dead += 1;
      } else {
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** row.attempts, BACKOFF_MAX_MS);
        const jitter = Math.floor(Math.random() * 30_000);
        finish("pending", message, { nextAttempt: new Date(now.getTime() + delay + jitter).toISOString() });
        result.failed += 1;
      }
    }
  }
  return result;
}

/** Correos que llevan demasiado tiempo sin salir (para la alerta de salud). */
export function stuckOutboxCount(olderThanMinutes = 60, now = new Date()): number {
  const cutoff = new Date(now.getTime() - olderThanMinutes * 60_000).toISOString();
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE status IN ('pending','dead') AND created_at <= ?")
    .get(cutoff) as { n: number };
  return row.n;
}

/**
 * Verifica la firma Svix con la que Resend firma sus webhooks:
 * HMAC-SHA256 de `${id}.${timestamp}.${cuerpo}` con la clave `whsec_…` en base64.
 */
export function verifyMailWebhook(input: { body: string; id: string | null; timestamp: string | null; signature: string | null; secret?: string; now?: number }): boolean {
  const secret = input.secret ?? process.env.MAIL_WEBHOOK_SECRET;
  if (!secret || !input.id || !input.timestamp || !input.signature) return false;
  const ts = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${input.id}.${input.timestamp}.${input.body}`).digest("base64");
  return input.signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
