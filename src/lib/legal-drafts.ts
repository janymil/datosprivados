import "server-only";

import { recordAiUsage } from "./ai-guard";
import { getDb, newId, nowIso } from "./db";

/**
 * Cola de redacción automática de correcciones (motor legal, plan 7; diseño §8 pasos 3 y 5).
 * La alimentan la re-auditoría, el monitor de normas y el botón del operador; la consume el
 * script de root `datosprivados-draft`, que redacta en su propia copia del repositorio.
 */

export type DraftOrigin = "auditoria" | "norma" | "operador";
export type DraftStatus = "pendiente" | "redactando" | "propuesto" | "sin_solucion";
export const DRAFT_ORIGINS: DraftOrigin[] = ["auditoria", "norma", "operador"];

export type DraftRequest = { id: string; origin: DraftOrigin; ref: string; targets: string[]; context: unknown; attempts: number };

export type DraftRow = {
  id: string;
  origin: DraftOrigin;
  ref: string;
  targets: string;
  context: string;
  status: DraftStatus;
  attempts: number;
  change_id: string | null;
  reasons: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Un intento colgado (script caído a mitad) se libera pasado este tiempo. */
const STUCK_MS = 2 * 60 * 60 * 1000;
export const MAX_ATTEMPTS = 3;
/** Estados de un cambio legal que todavía puede tocar sus textos (Decisión 5). */
const OPEN_CHANGE = ["nuevo", "aprobado", "fallo", "abogado"];

const toRequest = (row: DraftRow): DraftRequest => ({
  id: row.id,
  origin: row.origin,
  ref: row.ref,
  targets: JSON.parse(row.targets) as string[],
  context: JSON.parse(row.context),
  attempts: row.attempts,
});

export function enqueueDraft(r: { origin: DraftOrigin; ref: string; targets: string[]; context: unknown }): boolean {
  const now = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO legal_draft_requests (id, origin, ref, targets, context, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pendiente', 0, ?, ?) ON CONFLICT(origin, ref) DO NOTHING`
    )
    .run(newId(), r.origin, r.ref, JSON.stringify(r.targets), JSON.stringify(r.context ?? null), now, now);
  return Number(result.changes) > 0;
}

export function getDraft(id: string): DraftRow | null {
  return (getDb().prepare("SELECT * FROM legal_draft_requests WHERE id = ?").get(id) as DraftRow | undefined) ?? null;
}

export function listDrafts(filter: { status?: DraftStatus[] } = {}): DraftRow[] {
  const where = filter.status?.length ? `WHERE status IN (${filter.status.map(() => "?").join(",")})` : "";
  return getDb()
    .prepare(`SELECT * FROM legal_draft_requests ${where} ORDER BY created_at DESC`)
    .all(...(filter.status ?? [])) as DraftRow[];
}

/** Textos que tocan los cambios legales todavía abiertos. */
function sourcesInOpenChanges(): Set<string> {
  const rows = getDb()
    .prepare(`SELECT affected FROM legal_changes WHERE status IN (${OPEN_CHANGE.map(() => "?").join(",")})`)
    .all(...OPEN_CHANGE) as Array<{ affected: string }>;
  const out = new Set<string>();
  for (const row of rows) {
    for (const a of JSON.parse(row.affected) as Array<{ source: string }>) out.add(a.source);
  }
  return out;
}

/**
 * Toma la solicitud pendiente más antigua cuyos textos no están en un cambio abierto y la
 * pasa a «redactando». Antes libera las que llevan más de 2 horas en «redactando».
 */
export function claimNextDraft(now: Date): DraftRequest | null {
  const db = getDb();
  const stamp = now.toISOString();
  db.prepare("UPDATE legal_draft_requests SET status = 'pendiente', updated_at = ? WHERE status = 'redactando' AND claimed_at < ?").run(
    stamp,
    new Date(now.getTime() - STUCK_MS).toISOString()
  );
  const busy = sourcesInOpenChanges();
  const pending = db.prepare("SELECT * FROM legal_draft_requests WHERE status = 'pendiente' ORDER BY created_at, id").all() as DraftRow[];
  const next = pending.find((row) => !(JSON.parse(row.targets) as string[]).some((t) => busy.has(t)));
  if (!next) return null;
  db.prepare("UPDATE legal_draft_requests SET status = 'redactando', attempts = attempts + 1, claimed_at = ?, updated_at = ? WHERE id = ?").run(stamp, stamp, next.id);
  return toRequest(getDraft(next.id)!);
}

export type DraftResult = {
  status: "propuesto" | "sin_solucion" | "reintentar";
  changeId?: string;
  reasons?: string[];
  usage?: { inputTokens: number; outputTokens: number };
};

export function finishDraft(id: string, r: DraftResult): DraftRow | null {
  const row = getDraft(id);
  if (!row) return null;
  const status: DraftStatus = r.status === "reintentar" ? (row.attempts >= MAX_ATTEMPTS ? "sin_solucion" : "pendiente") : r.status;
  getDb()
    .prepare("UPDATE legal_draft_requests SET status = ?, change_id = ?, reasons = ?, updated_at = ? WHERE id = ?")
    .run(status, r.changeId ?? row.change_id, r.reasons?.length ? JSON.stringify(r.reasons.slice(0, 50)) : row.reasons, nowIso(), id);
  if (r.usage && (r.usage.inputTokens > 0 || r.usage.outputTokens > 0)) {
    recordAiUsage({
      companyId: null,
      feature: "legal-draft",
      model: process.env.OPENAI_MODEL ?? process.env.ANTHROPIC_MODEL ?? "desconocido",
      inputTokens: Math.max(0, Math.round(r.usage.inputTokens)),
      outputTokens: Math.max(0, Math.round(r.usage.outputTokens)),
      latencyMs: 0,
      ok: true,
    });
  }
  return getDraft(id);
}
