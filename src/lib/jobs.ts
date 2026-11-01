import "server-only";

import { businessDaysBetween, calculatedHolidays, getDb, newId, seedHolidays, type Company } from "./db";
import { deleteAccount } from "./account";
import { formatDate, formatDateTime, limaToday } from "./format";
import { isCompanyActive, planFromCompany } from "./billing";
import { documentFreshness } from "./document-freshness";
import { listBanks, listDocuments, listProviders } from "./data";
import { processOutbox, stuckOutboxCount } from "./mail";
import { notifyCompany } from "./notify";
import { planName } from "./plans";

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
  "billing-reconcile"({ now }: JobContext): JobResult {
    const db = getDb();
    const expired = db
      .prepare("UPDATE companies SET billing_status = 'expired' WHERE billing_status = 'active' AND paid_until IS NOT NULL AND paid_until <= ?")
      .run(now.toISOString());
    let notices = 0;
    for (const company of activeCompanies()) {
      if (!company.paid_until) continue;
      const daysLeft = (new Date(company.paid_until).getTime() - now.getTime()) / DAY;
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
    return { expired: Number(expired.changes), notices };
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
    const usage = db.prepare("DELETE FROM ai_usage WHERE created_at <= ?").run(new Date(now.getTime() - 400 * DAY).toISOString());
    return { accounts, signups, outbox: Number(outbox.changes), job_runs: Number(runs.changes), ai_usage: Number(usage.changes) };
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
  "document-staleness-notice": 8 * 24,
  "lapsed-account-notices": 26,
  "purge-old-data": 26,
  "holidays-check": 8 * 24,
};

export type RunOutcome =
  | { job: JobName; status: "ok"; detail: JobResult }
  | { job: JobName; status: "locked" }
  | { job: JobName; status: "error"; error: string };

/** Ejecuta una tarea con candado y registro en `job_runs`. */
export async function runJob(job: JobName, now = new Date()): Promise<RunOutcome> {
  const db = getDb();
  const running = db
    .prepare("SELECT 1 FROM job_runs WHERE job = ? AND finished_at IS NULL AND started_at > ?")
    .get(job, new Date(now.getTime() - LOCK_TTL_MS).toISOString());
  if (running) return { job, status: "locked" };

  const id = newId();
  db.prepare("INSERT INTO job_runs (id, job, started_at) VALUES (?, ?, ?)").run(id, job, now.toISOString());
  try {
    const detail = await JOBS[job]({ now });
    db.prepare("UPDATE job_runs SET finished_at = ?, ok = 1, detail = ? WHERE id = ?").run(new Date().toISOString(), JSON.stringify(detail), id);
    return { job, status: "ok", detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.prepare("UPDATE job_runs SET finished_at = ?, ok = 0, error = ? WHERE id = ?").run(new Date().toISOString(), message.slice(0, 500), id);
    console.error(`[jobs] ${job} falló:`, error);
    return { job, status: "error", error: message };
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
  const jobs = JOB_NAMES.map((job) => {
    const ok = db.prepare("SELECT finished_at FROM job_runs WHERE job = ? AND ok = 1 ORDER BY finished_at DESC LIMIT 1").get(job) as { finished_at: string } | undefined;
    const failed = db.prepare("SELECT error FROM job_runs WHERE job = ? AND ok = 0 ORDER BY started_at DESC LIMIT 1").get(job) as { error: string } | undefined;
    const reference = ok ? new Date(ok.finished_at) : origin;
    const overdue = now.getTime() - reference.getTime() > JOB_MAX_AGE_HOURS[job] * 3_600_000;
    return { job, lastOk: ok?.finished_at ?? null, lastError: failed?.error ?? null, overdue };
  });
  const outboxStuck = stuckOutboxCount(60, now);
  return { healthy: jobs.every((job) => !job.overdue) && outboxStuck === 0, jobs, outboxStuck };
}
