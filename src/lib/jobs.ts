import "server-only";

import { businessDaysBetween, calculatedHolidays, getDb, newId, resetDemoCompany, seedHolidays, type Company } from "./db";
import { deleteAccount } from "./account";
import { formatDate, formatDateTime, limaToday } from "./format";
import { addMonths, introNeedsClose, isCompanyActive, markSubscriptionStatus, planFromCompany } from "./billing";
import { confirmAuthorizedSubscription } from "./subscriptions";
import { cancelPreapproval, getPreapproval, isMercadoPagoConfigured } from "./mercadopago";
import { documentFreshness } from "./document-freshness";
import { listBanks, listDocuments, listProviders } from "./data";
import { enqueueEmail, processOutbox, stuckOutboxCount } from "./mail";
import { logEvent } from "./log";
import { notifyCompany } from "./notify";
import { planName, renewalPrice } from "./plans";

/**
 * Tareas programadas. Cada una es idempotente (repetirla no duplica correos ni
 * efectos: los avisos usan `dedupeKey`) y está protegida por un candado en
 * `job_runs`, de modo que dos disparos simultáneos no corren a la vez.
 * Las dispara `POST /api/cron/[job]` desde cron/systemd (ver docs/RUNBOOK.md).
 */

const DAY = 86_400_000;
export const LAPSED_RETENTION_DAYS = () => Math.max(45, Number(process.env.LAPSED_RETENTION_DAYS) || 90);
/** Un candado más viejo que esto se considera de un proceso que murió. */
const LOCK_TTL_MS = 15 * 60_000;

type JobContext = { now: Date };
type JobResult = Record<string, number | string>;

function realCompanies(): Company[] {
  return getDb()
    .prepare("SELECT * FROM companies WHERE billing_status NOT IN ('demo', 'deleted', 'pending') ORDER BY created_at")
    .all() as unknown as Company[];
}

function activeCompanies(): Company[] {
  return realCompanies().filter((company) => isCompanyActive(company));
}

const longDate = (iso: string) => formatDate(iso);

/**
 * Red de seguridad del primer año. La suscripción del primer año se cierra en MercadoPago al
 * confirmar su primer cobro (webhook); si ese cierre falló o el webhook nunca llegó, la
 * suscripción seguiría abierta y cobraría el monto del primer año otra vez. Aquí se reintenta
 * el cierre y se avisa de lo que no se pueda resolver solo: cierres fallidos y primeros años
 * autorizados hace días sin un cobro aprobado (acceso concedido sin pago confirmado).
 */
async function closeFirstYearSubscriptions(now: Date): Promise<{ closed: number; alerts: string[] }> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM companies WHERE subscription_intro = 1 AND subscription_status = 'authorized' AND billing_status NOT IN ('demo', 'deleted')")
    .all() as unknown as Company[];
  const alerts: string[] = [];
  let closed = 0;

  for (const company of rows) {
    const subscriptionId = company.subscription_id;
    if (!subscriptionId) continue;

    if (introNeedsClose(company, subscriptionId)) {
      try {
        if (!isMercadoPagoConfigured()) throw new Error("MercadoPago no está configurado");
        const result = await cancelPreapproval(subscriptionId);
        if (result.status !== "cancelled" && result.status !== "canceled") throw new Error(`estado «${result.status}» tras cancelar`);
        markSubscriptionStatus(company.id, subscriptionId, "cancelled");
        closed += 1;
      } catch (error) {
        alerts.push(`${company.name}: no se pudo cerrar la suscripción del primer año ${subscriptionId} (${error instanceof Error ? error.message : error}). Ciérrala en MercadoPago antes de que cobre de nuevo.`);
      }
      continue;
    }

    // Sin cobro aprobado: la autorización dio el periodo completo, así que el acceso va por delante del pago.
    if (company.paid_until) {
      const authorizedAt = addMonths(new Date(company.paid_until), -12);
      if (now.getTime() - authorizedAt.getTime() > 3 * DAY) {
        alerts.push(`${company.name}: primer año autorizado el ${authorizedAt.toISOString().slice(0, 10)} sin ningún cobro aprobado (${subscriptionId}). Verifica el cobro en MercadoPago.`);
      }
    }
  }

  const to = process.env.ALERT_EMAIL?.trim();
  if (alerts.length && to) {
    enqueueEmail({
      to,
      template: "ops_alert",
      payload: { subject: `DatosPrivados: ${alerts.length} suscripción(es) del primer año por revisar`, message: alerts.join(" | ") },
      dedupeKey: `intro-subscriptions:${limaToday(now)}`,
    });
  }
  for (const alert of alerts) logEvent("warn", "intro_subscription", { message: alert });
  return { closed, alerts };
}

/* ------------------------------ las tareas -------------------------------- */

const JOBS = {
  "expire-sessions"({ now }: JobContext): JobResult {
    const db = getDb();
    const iso = now.toISOString();
    const sessions = db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(iso);
    const tokens = db.prepare("DELETE FROM auth_tokens WHERE expires_at <= ? OR used_at IS NOT NULL").run(iso);
    const limits = db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(now.getTime() - DAY);
    return { sessions: Number(sessions.changes), tokens: Number(tokens.changes), rate_limits: Number(limits.changes) };
  },

  async "send-outbox"({ now }: JobContext): Promise<JobResult> {
    const result = await processOutbox({ now, limit: 100 });
    return { ...result };
  },

  /** Avisa 3 días hábiles antes del plazo y cuando ya venció. */
  "arco-deadline-reminders"({ now }: JobContext): JobResult {
    const today = limaToday(now);
    let dueSoon = 0;
    let overdue = 0;
    const db = getDb();
    for (const company of activeCompanies()) {
      const open = db
        .prepare("SELECT id, ticket, due_at FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso')")
        .all(company.id) as { id: string; ticket: string; due_at: string }[];
      for (const request of open) {
        const path = `/app/arco/${request.id}`;
        if (request.due_at < today) {
          if (notifyCompany(company, "arco_overdue", { ticket: request.ticket, dueAt: longDate(request.due_at), path }, { to: "responsable", dedupeKey: `arco-overdue:${request.id}` })) overdue += 1;
        } else {
          const left = businessDaysBetween(today, request.due_at);
          if (left <= 3 && notifyCompany(company, "arco_due_soon", { ticket: request.ticket, dueAt: longDate(request.due_at), days: left, path }, { to: "responsable", dedupeKey: `arco-due:${request.id}` })) dueSoon += 1;
        }
      }
    }
    return { due_soon: dueSoon, overdue };
  },

  /** Incidentes con criterios del art. 34.1 aún sin notificar: avisos a 12 h y 2 h. */
  "incident-deadline-reminders"({ now }: JobContext): JobResult {
    const db = getDb();
    let sent = 0;
    for (const company of activeCompanies()) {
      const open = db
        .prepare("SELECT id, title, due_at, criteria FROM incidents WHERE company_id = ? AND status IN ('abierto','en_analisis') AND notified_at IS NULL")
        .all(company.id) as { id: string; title: string; due_at: string; criteria: string }[];
      for (const incident of open) {
        if (!incident.criteria.trim()) continue; // sin criterios solo se documenta: no hay reloj de 48 h
        const hoursLeft = (new Date(incident.due_at).getTime() - now.getTime()) / 3_600_000;
        if (hoursLeft <= 0) continue;
        const stage = hoursLeft <= 2 ? 2 : hoursLeft <= 12 ? 12 : 0;
        if (!stage) continue;
        const ok = notifyCompany(
          company,
          "incident_deadline",
          { title: incident.title, dueAt: formatDateTime(incident.due_at), hours: stage, path: `/app/incidentes/${incident.id}` },
          { to: "responsable", dedupeKey: `incident-deadline:${incident.id}:${stage}` }
        );
        if (ok) sent += 1;
      }
    }
    return { sent };
  },

  /** Marca vencidas las cuentas cuyo periodo terminó y avisa de renovación o vencimiento próximos. */
  "billing-reconcile": async ({ now }: JobContext): Promise<JobResult> => {
    const db = getDb();
    const introIssues = await closeFirstYearSubscriptions(now);
    const expired = db
      .prepare("UPDATE companies SET billing_status = 'expired' WHERE billing_status = 'active' AND paid_until IS NOT NULL AND paid_until <= ?")
      .run(now.toISOString());
    let notices = 0;
    for (const company of activeCompanies()) {
      if (!company.paid_until) continue;
      const daysLeft = (new Date(company.paid_until).getTime() - now.getTime()) / DAY;
      // Plan anual de primer año (cerrado tras su cobro) o pagado por transferencia: no se renueva solo,
      // así que se avisa con tiempo, a los 30 y a los 7 días, con el precio de renovación.
      const manual = company.subscription_status === "completed" || (!company.subscription_id && company.subscription_status !== "cancelled");
      if (manual) {
        if (daysLeft > 30) continue;
        const stage = daysLeft <= 7 ? "7" : "30";
        const plan = planFromCompany(company);
        if (
          notifyCompany(
            company,
            "renewal_manual",
            { plan: planName(plan), paidUntil: longDate(company.paid_until), amount: `S/ ${renewalPrice(plan)}` },
            { dedupeKey: `renewal_manual:${company.id}:${company.paid_until}:${stage}` }
          )
        ) {
          notices += 1;
        }
        continue;
      }
      if (daysLeft > 3) continue;
      const cancelling = company.subscription_status === "cancelled" || company.subscription_status === "paused" || !company.subscription_id;
      const template = cancelling ? "subscription_expiring" : "renewal_soon";
      if (
        notifyCompany(
          company,
          template,
          { plan: planName(planFromCompany(company)), paidUntil: longDate(company.paid_until) },
          { dedupeKey: `${template}:${company.id}:${company.paid_until}` }
        )
      ) {
        notices += 1;
      }
    }
    return { expired: Number(expired.changes), notices, primer_ano_cerrado: introIssues.closed, primer_ano_alertas: introIssues.alerts.length };
  },

  /**
   * Concilia con MercadoPago: corrige suscripciones que se cancelaron o pausaron sin que
   * llegara el webhook, activa las que se autorizaron sin webhook (o cuyo webhook se perdió)
   * y avisa al operador de comprobantes sin emitir con más de 3 días.
   */
  async "billing-sync"({ now }: JobContext): Promise<JobResult> {
    const db = getDb();
    let checked = 0;
    let corrected = 0;
    let activated = 0;
    let failed = 0;
    if (isMercadoPagoConfigured()) {
      for (const company of realCompanies()) {
        if (!company.subscription_id || company.subscription_status === "dev") continue;
        checked += 1;
        try {
          const remote = await getPreapproval(company.subscription_id);
          const status = remote.status === "canceled" ? "cancelled" : remote.status;
          if ((status === "cancelled" || status === "paused") && company.subscription_status !== status) {
            markSubscriptionStatus(company.id, company.subscription_id, status);
            corrected += 1;
          }
        } catch (error) {
          failed += 1;
          console.error(`[billing-sync] No se pudo consultar ${company.subscription_id}:`, error);
        }
      }

      // Autorizaciones cuyo webhook no llegó: MercadoPago ya autorizó y la empresa sigue sin acceso.
      const waiting = db
        .prepare("SELECT * FROM companies WHERE pending_subscription_id IS NOT NULL AND deleted_at IS NULL")
        .all() as unknown as Company[];
      for (const company of waiting) {
        const subscriptionId = company.pending_subscription_id;
        if (!subscriptionId) continue;
        checked += 1;
        try {
          const remote = await getPreapproval(subscriptionId);
          if (remote.status !== "authorized") continue;
          const result = await confirmAuthorizedSubscription(subscriptionId);
          if (result.ok) activated += 1;
          else console.warn(`[billing-sync] Autorización no aplicada: ${result.reason}`);
        } catch (error) {
          failed += 1;
          console.error(`[billing-sync] No se pudo confirmar ${subscriptionId}:`, error);
        }
      }
    }

    const overdue = db
      .prepare("SELECT COUNT(*) AS n FROM invoices WHERE status = 'pending' AND created_at <= ?")
      .get(new Date(now.getTime() - 3 * DAY).toISOString()) as { n: number };
    const alertTo = process.env.ALERT_EMAIL?.trim();
    if (overdue.n > 0 && alertTo) {
      enqueueEmail({
        to: alertTo,
        template: "ops_alert",
        payload: {
          subject: `${overdue.n} factura(s) sin emitir hace más de 3 días`,
          message: "Emítelas y regístralas en /operador. El plazo para enviar facturas a la SUNAT es corto.",
        },
        dedupeKey: `invoices-overdue:${limaToday(now)}`,
      });
    }
    return { checked, corrected, activated, failed, facturas_atrasadas: overdue.n };
  },

  /** Un aviso semanal por empresa con documentos desactualizados (se omite si desactivó los no esenciales). */
  "document-staleness-notice"({ now }: JobContext): JobResult {
    const week = Math.floor(now.getTime() / (7 * DAY));
    let sent = 0;
    for (const company of activeCompanies()) {
      const banks = listBanks(company.id);
      const providers = listProviders(company.id);
      const stale = listDocuments(company.id).filter((doc) => documentFreshness(doc, company, banks, providers).stale).length;
      if (stale && notifyCompany(company, "document_outdated", { count: stale }, { dedupeKey: `doc-stale:${company.id}:${week}` })) sent += 1;
    }
    return { sent };
  },

  /** Avisos de borrado de cuentas vencidas: a los 30 y 60 días, y 7 días antes del borrado. */
  "lapsed-account-notices"({ now }: JobContext): JobResult {
    const retention = LAPSED_RETENTION_DAYS();
    const stages: Array<[number, number]> = [
      [1, 30],
      [2, 60],
      [3, retention - 7],
    ];
    const db = getDb();
    let sent = 0;
    for (const company of realCompanies()) {
      if (!company.paid_until || isCompanyActive(company)) continue;
      const lapsedDays = (now.getTime() - new Date(company.paid_until).getTime()) / DAY;
      const stage = stages.filter(([, day]) => lapsedDays >= day).map(([n]) => n).pop() ?? 0;
      if (stage <= company.lapsed_notice) continue;
      const deleteOn = new Date(new Date(company.paid_until).getTime() + retention * DAY).toISOString();
      notifyCompany(company, "lapsed_notice", { deleteOn: longDate(deleteOn), stage }, { dedupeKey: `lapsed:${company.id}:${stage}` });
      db.prepare("UPDATE companies SET lapsed_notice = ? WHERE id = ?").run(stage, company.id);
      sent += 1;
    }
    return { sent };
  },

  /** Retención: cuentas vencidas más allá del plazo (ya avisadas), registros de alta sin pago y datos técnicos viejos. */
  "purge-old-data"({ now }: JobContext): JobResult {
    const db = getDb();
    const retention = LAPSED_RETENTION_DAYS();
    let accounts = 0;
    for (const company of realCompanies()) {
      if (!company.paid_until || isCompanyActive(company)) continue;
      // Solo se borra a quien recibió el último aviso: nadie pierde datos sin haber sido advertido.
      if (company.lapsed_notice < 3) continue;
      const lapsedDays = (now.getTime() - new Date(company.paid_until).getTime()) / DAY;
      if (lapsedDays >= retention && deleteAccount(company.id).deleted) accounts += 1;
    }
    // Altas que nunca pagaron: no hay expediente, solo nombre, correo y contraseña.
    const abandoned = db
      .prepare("SELECT id FROM companies WHERE billing_status = 'pending' AND paid_until IS NULL AND created_at <= ?")
      .all(new Date(now.getTime() - 30 * DAY).toISOString()) as { id: string }[];
    let signups = 0;
    for (const { id } of abandoned) if (deleteAccount(id).deleted) signups += 1;

    const outbox = db.prepare("DELETE FROM email_outbox WHERE status IN ('sent','skipped','suppressed') AND created_at <= ?").run(new Date(now.getTime() - 90 * DAY).toISOString());
    const runs = db.prepare("DELETE FROM job_runs WHERE started_at <= ?").run(new Date(now.getTime() - 180 * DAY).toISOString());
    const events = db.prepare("DELETE FROM webhook_events WHERE received_at <= ?").run(new Date(now.getTime() - 180 * DAY).toISOString());
    const usage = db.prepare("DELETE FROM ai_usage WHERE created_at <= ?").run(new Date(now.getTime() - 400 * DAY).toISOString());
    return { accounts, signups, outbox: Number(outbox.changes), job_runs: Number(runs.changes), webhook_events: Number(events.changes), ai_usage: Number(usage.changes) };
  },

  /**
   * Auto-monitorización (P6-OBS): si una tarea se atrasó, hay correos atascados,
   * webhooks fallando, el respaldo envejeció o el disco se llenó, avisa a
   * `ALERT_EMAIL` y lo deja en el registro estructurado.
   *
   * Existe porque el host del cron no tiene MTA (la salida solo va a syslog) y
   * todavía no hay monitor externo: sin esta tarea, un fallo se descubre por
   * casualidad. Un correo por hora como máximo con todas las alertas juntas.
   */
  async "ops-alert"({ now }: JobContext): Promise<JobResult> {
    // Import diferido: `ops.ts` ya importa `jobsHealth` de este módulo; así no se
    // cierra el ciclo al cargar los módulos.
    const { operationalAlerts } = await import("./ops");
    const alerts = operationalAlerts(now);
    if (!alerts.length) return { alertas: 0, enviado: 0 };
    for (const alert of alerts) logEvent("warn", "ops_alert", { code: alert.code, message: alert.message });

    const to = process.env.ALERT_EMAIL?.trim();
    if (!to) return { alertas: alerts.length, enviado: 0, falta: "ALERT_EMAIL" };
    const sent = enqueueEmail({
      to,
      template: "ops_alert",
      payload: {
        subject: `DatosPrivados: ${alerts.length} alerta(s) operativa(s)`,
        message: alerts.map((alert) => `· ${alert.message}`).join("\n"),
      },
      dedupeKey: `ops-alert:${now.toISOString().slice(0, 13)}`,
    });
    return { alertas: alerts.length, enviado: sent ? 1 : 0 };
  },

  /** Reafirma la demo pública: solo lectura, sin correos, sin cobros y sin IA. */
  "demo-reset"(): JobResult {
    const result = resetDemoCompany();
    if (!result.found) return { demo: "no existe" };
    return {
      demo: "reafirmada",
      outbox_borrados: result.outbox,
      ia_borrados: result.aiUsage,
      pagos: result.payments,
      documentos: result.documents,
    };
  },

  /**
   * Resumen semanal por cuenta (opcional, apagado por defecto: `WEEKLY_DIGEST=1`).
   * Solo cuenta lo que está pendiente; si no hay nada, no se manda correo.
   */
  "weekly-digest"({ now }: JobContext): JobResult {
    const week = Math.floor(now.getTime() / (7 * DAY));
    const today = limaToday(now);
    const db = getDb();
    let sent = 0;
    let skipped = 0;
    for (const company of activeCompanies()) {
      const openArco = db
        .prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso')")
        .get(company.id) as { n: number };
      const overdueArco = db
        .prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso') AND due_at < ?")
        .get(company.id, today) as { n: number };
      const openIncidents = db
        .prepare("SELECT COUNT(*) AS n FROM incidents WHERE company_id = ? AND status != 'cerrado'")
        .get(company.id) as { n: number };
      const banks = listBanks(company.id);
      const providers = listProviders(company.id);
      const staleDocs = listDocuments(company.id).filter((doc) => documentFreshness(doc, company, banks, providers).stale).length;
      const unregisteredBanks = banks.filter((bank) => bank.status !== "registrado").length;

      const pending: string[] = [];
      if (openArco.n) pending.push(`${openArco.n} solicitud(es) ARCO sin responder${overdueArco.n ? `, ${overdueArco.n} fuera de plazo` : ""}`);
      if (openIncidents.n) pending.push(`${openIncidents.n} incidente(s) sin cerrar`);
      if (staleDocs) pending.push(`${staleDocs} documento(s) desactualizado(s)`);
      if (unregisteredBanks) pending.push(`${unregisteredBanks} banco(s) de datos sin inscribir en el SIPDP`);

      if (!pending.length) {
        skipped += 1;
        continue;
      }
      const ok = notifyCompany(
        company,
        "weekly_digest",
        { pending: pending.join(" | ") },
        { to: "responsable", dedupeKey: `weekly-digest:${company.id}:${week}` }
      );
      if (ok) sent += 1;
    }
    return { sent, al_dia: skipped };
  },

  /** Verifica que los dos próximos años tengan feriados cargados y avisa cuáles siguen sin decreto confirmado. */
  "holidays-check"({ now }: JobContext): JobResult {
    const year = Number(limaToday(now).slice(0, 4));
    const db = getDb();
    seedHolidays(db);
    const pending: number[] = [];
    for (const target of [year, year + 1]) {
      const rows = db.prepare("SELECT source FROM holidays WHERE date LIKE ?").all(`${target}-%`) as { source: string }[];
      if (!rows.length) {
        const insert = db.prepare("INSERT OR IGNORE INTO holidays (date, name, source) VALUES (?, ?, 'calculado')");
        for (const holiday of calculatedHolidays(target)) insert.run(holiday.date, holiday.name);
      }
      if (rows.every((row) => row.source === "calculado")) pending.push(target);
    }
    return { sin_decreto_confirmado: pending.join(",") || "ninguno" };
  },
} satisfies Record<string, (context: JobContext) => JobResult | Promise<JobResult>>;

export type JobName = keyof typeof JOBS;
export const JOB_NAMES = Object.keys(JOBS) as JobName[];

export function isJobName(value: string): value is JobName {
  return value in JOBS;
}

/** Horas máximas sin una ejecución correcta antes de considerarla atrasada. */
export const JOB_MAX_AGE_HOURS: Record<JobName, number> = {
  "expire-sessions": 26,
  "send-outbox": 1,
  "arco-deadline-reminders": 26,
  "incident-deadline-reminders": 2,
  "billing-reconcile": 26,
  "billing-sync": 26,
  "document-staleness-notice": 8 * 24,
  "lapsed-account-notices": 26,
  "purge-old-data": 26,
  "ops-alert": 1,
  "demo-reset": 8 * 24,
  "weekly-digest": 8 * 24,
  "holidays-check": 8 * 24,
};

/**
 * Tareas opcionales: existen en el código, pero solo se esperan (y solo hacen algo)
 * si la bandera está encendida. Así una función apagada no puede poner `/api/health`
 * en rojo ni disparar alertas por «no ejecutada».
 */
export function jobEnabled(job: JobName, env: NodeJS.ProcessEnv = process.env): boolean {
  if (job === "weekly-digest") return env.WEEKLY_DIGEST === "1";
  return true;
}

export type RunOutcome =
  | { job: JobName; status: "ok"; detail: JobResult }
  | { job: JobName; status: "locked" }
  | { job: JobName; status: "error"; error: string };

/** Ejecuta una tarea con candado y registro en `job_runs`. */
export async function runJob(job: JobName, now = new Date()): Promise<RunOutcome> {
  const db = getDb();
  // Tarea apagada: no se ejecuta, pero tampoco se registra un fallo (no lo es).
  if (!jobEnabled(job)) return { job, status: "ok", detail: { saltado: "desactivada" } };
  const running = db
    .prepare("SELECT 1 FROM job_runs WHERE job = ? AND finished_at IS NULL AND started_at > ?")
    .get(job, new Date(now.getTime() - LOCK_TTL_MS).toISOString());
  if (running) return { job, status: "locked" };

  const id = newId();
  const started = Date.now();
  db.prepare("INSERT INTO job_runs (id, job, started_at) VALUES (?, ?, ?)").run(id, job, now.toISOString());
  try {
    const detail = await JOBS[job]({ now });
    db.prepare("UPDATE job_runs SET finished_at = ?, ok = 1, detail = ? WHERE id = ?").run(new Date().toISOString(), JSON.stringify(detail), id);
    // `id` es el mismo que queda en job_runs: permite cruzar registro y ejecución.
    logEvent("info", "job_ok", { job, id, ms: Date.now() - started });
    return { job, status: "ok", detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.prepare("UPDATE job_runs SET finished_at = ?, ok = 0, error = ? WHERE id = ?").run(new Date().toISOString(), message.slice(0, 500), id);
    console.error(`[jobs] ${job} falló:`, error);
    logEvent("error", "job_failed", { job, id, message });
    alertJobFailure(job, id, message, now);
    return { job, status: "error", error: message };
  }
}

/**
 * Aviso inmediato de una tarea fallida. Sin esto, el fallo solo quedaría en
 * syslog (el host del cron no tiene MTA). Un correo por tarea y hora.
 */
function alertJobFailure(job: JobName, runId: string, message: string, now: Date) {
  const to = process.env.ALERT_EMAIL?.trim();
  if (!to) return;
  try {
    enqueueEmail({
      to,
      template: "ops_alert",
      payload: {
        subject: `DatosPrivados: la tarea ${job} falló`,
        message: `${message.slice(0, 300)}\n\nEjecución: ${runId} (tabla job_runs).`,
      },
      dedupeKey: `job-failed:${job}:${now.toISOString().slice(0, 13)}`,
    });
  } catch (error) {
    // Si ni siquiera se puede encolar, queda el log; nunca se enmascara el fallo original.
    console.error("[jobs] no se pudo encolar el aviso de fallo:", error);
  }
}

export type JobHealth = {
  healthy: boolean;
  jobs: Array<{ job: JobName; lastOk: string | null; lastError: string | null; overdue: boolean }>;
  outboxStuck: number;
};

/**
 * Estado de salud para un monitor externo: una tarea atrasada o correos que
 * llevan más de una hora sin salir hacen que `healthy` sea false.
 * Una tarea que nunca corrió se considera atrasada recién pasado su plazo desde `since`.
 */
export function jobsHealth(now = new Date(), since?: Date): JobHealth {
  const db = getDb();
  const origin = since ?? new Date(now.getTime() - 365 * DAY);
  const jobs = JOB_NAMES.filter((job) => jobEnabled(job)).map((job) => {
    const ok = db.prepare("SELECT finished_at FROM job_runs WHERE job = ? AND ok = 1 ORDER BY finished_at DESC LIMIT 1").get(job) as { finished_at: string } | undefined;
    const failed = db.prepare("SELECT error FROM job_runs WHERE job = ? AND ok = 0 ORDER BY started_at DESC LIMIT 1").get(job) as { error: string } | undefined;
    const reference = ok ? new Date(ok.finished_at) : origin;
    const overdue = now.getTime() - reference.getTime() > JOB_MAX_AGE_HOURS[job] * 3_600_000;
    return { job, lastOk: ok?.finished_at ?? null, lastError: failed?.error ?? null, overdue };
  });
  const outboxStuck = stuckOutboxCount(60, now);
  return { healthy: jobs.every((job) => !job.overdue) && outboxStuck === 0, jobs, outboxStuck };
}
