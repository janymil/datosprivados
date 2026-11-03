import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import { mailProvider, stuckOutboxCount } from "./mail";
import { jobsHealth } from "./jobs";
import { dailyAlertThresholdUsd, dailySpendUsd } from "./ai-guard";

/**
 * Comprobaciones de salud (P6-OBS). `dbCheck` y `readiness` alimentan los endpoints
 * públicos /api/health y /api/ready (solo booleanos, nunca valores de configuración).
 * `operationalAlerts` alimenta el monitor autenticado /api/cron/health.
 */

export function dbCheck(): { ok: boolean; error?: string } {
  try {
    const db = getDb();
    db.prepare("SELECT 1 AS ok").get();
    // Prueba de escritura sin dejar rastro: toma el candado de escritura y lo suelta.
    db.exec("BEGIN IMMEDIATE");
    db.exec("ROLLBACK");
    const tables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('companies','users','sessions','job_runs')").get() as { n: number };
    return tables.n === 4 ? { ok: true } : { ok: false, error: "faltan tablas (migraciones sin aplicar)" };
  } catch (error) {
    try {
      getDb().exec("ROLLBACK");
    } catch {
      /* no había transacción abierta */
    }
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "error" };
  }
}

export type DbIntegrity = { ok: boolean; checkpointed: number; error?: string };

/**
 * Integridad del archivo SQLite y traslado del WAL al archivo principal.
 *
 * `quick_check` recorre las páginas de la base, así que se llama desde el monitor
 * autenticado (`GET /api/cron/health`), no desde `/api/health`: ese endpoint lo
 * sondea cualquiera y debe seguir siendo barato.
 * `wal_checkpoint(PASSIVE)` no bloquea a los escritores; si hay uno activo, la
 * siguiente pasada termina el trabajo.
 */
export function dbIntegrity(): DbIntegrity {
  try {
    const db = getDb();
    const rows = db.prepare("PRAGMA quick_check").all() as Array<Record<string, unknown>>;
    const problems = rows.map((row) => String(Object.values(row)[0] ?? "")).filter((value) => value !== "ok");
    const checkpoint = db.prepare("PRAGMA wal_checkpoint(PASSIVE)").get() as { checkpointed?: number } | undefined;
    const result: DbIntegrity = { ok: problems.length === 0, checkpointed: Number(checkpoint?.checkpointed ?? 0) };
    if (problems.length) result.error = problems.join("; ").slice(0, 200);
    return result;
  } catch (error) {
    return { ok: false, checkpointed: 0, error: error instanceof Error ? error.message.slice(0, 200) : "error" };
  }
}

/** Presencia (no valor) de las integraciones. */
export function configPresence() {
  return {
    mail: mailProvider() === "resend",
    mercadopago: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() && process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()),
    llm: Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    cron: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16),
  };
}

/** GET /api/health: el proceso responde y la base lee y escribe. */
export function health() {
  const db = dbCheck();
  return { ok: db.ok, checks: { db: db.ok }, config: configPresence(), uptime_s: Math.round(process.uptime()) };
}

/** GET /api/ready: además, la configuración mínima para cobrar y enviar correos. En producción exige las tres. */
export function readiness() {
  const base = health();
  const config = base.config;
  const needsConfig = process.env.NODE_ENV === "production";
  const configOk = !needsConfig || (config.mail && config.mercadopago && config.cron);
  return { ...base, ok: base.ok && configOk, checks: { ...base.checks, config: configOk } };
}

/** Edad en horas del respaldo más reciente de `dir`, o null si no hay ninguno. */
export function backupAgeHours(dir: string, now = new Date()): number | null {
  let newest = 0;
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!/^datosprivados-.*\.db\.gz(\.enc)?$/.test(name)) continue;
      newest = Math.max(newest, fs.statSync(path.join(dir, name)).mtimeMs);
    }
  } catch {
    return null;
  }
  return newest ? (now.getTime() - newest) / 3_600_000 : null;
}

/** Porcentaje de uso del disco que contiene `target`, o null si no se puede medir. */
export function diskUsedPercent(target: string): number | null {
  try {
    const stat = fs.statfsSync(target);
    return stat.blocks ? Math.round((1 - stat.bavail / stat.blocks) * 100) : null;
  } catch {
    return null;
  }
}

export type OpsAlert = { code: string; message: string };

/**
 * Alertas de negocio y de infraestructura. Cada una es una condición que alguien debe
 * atender: webhooks fallidos, correos atascados, tareas atrasadas, respaldo viejo, disco lleno.
 */
export function operationalAlerts(now = new Date(), env: Record<string, string | undefined> = process.env): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  const db = getDb();

  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const failedWebhooks = (db.prepare("SELECT COUNT(*) AS n FROM webhook_events WHERE received_at >= ? AND (outcome = '500' OR error IS NOT NULL)").get(since) as { n: number }).n;
  const threshold = Math.max(1, Number(env.ALERT_WEBHOOK_FAILURES) || 3);
  if (failedWebhooks >= threshold) alerts.push({ code: "webhook_failures", message: `${failedWebhooks} webhooks fallidos en 24 h (umbral ${threshold}).` });

  const jobs = jobsHealth(now);
  for (const job of jobs.jobs) if (job.overdue) alerts.push({ code: "job_missed", message: `La tarea ${job.job} no corre a tiempo.` });
  const stuck = stuckOutboxCount(60, now);
  if (stuck > 0) alerts.push({ code: "outbox_backlog", message: `${stuck} correos sin salir hace más de una hora.` });

  // Correo muerto: el proveedor lo rechazó definitivamente (rebote duro, dirección
  // inválida). Se cuentan todos, sin importar la edad, porque no se reintentan solos.
  const dead = (
    db.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE status = 'dead'").get() as { n: number }
  ).n;
  if (dead > 0) {
    alerts.push({
      code: "outbox_dead",
      message: `${dead} correo(s) quedaron en la lista de descartados: revisa las direcciones y la bandeja en /app/ajustes.`,
    });
  }

  const backupDir = env.BACKUP_DIR?.trim();
  if (backupDir) {
    const age = backupAgeHours(backupDir, now);
    if (age === null) alerts.push({ code: "backup_missing", message: `No hay respaldos en ${backupDir}.` });
    else if (age > 26) alerts.push({ code: "backup_old", message: `El último respaldo tiene ${Math.round(age)} h (límite 26 h).` });
  }

  const used = diskUsedPercent(env.DATOSPRIVADOS_DB ? path.dirname(env.DATOSPRIVADOS_DB) : process.cwd());
  if (used !== null && used > 80) alerts.push({ code: "disk_full", message: `Disco al ${used} % (límite 80 %).` });

  // Reembolsos con factura emitida: la nota de crédito es una obligación ante la SUNAT
  // y no debe quedarse en una línea de la actividad.
  const staleCreditNotes = (
    db
      .prepare("SELECT COUNT(*) AS n FROM invoices WHERE status = 'credit_note_pending' AND created_at <= ?")
      .get(new Date(now.getTime() - 3 * 24 * 3_600_000).toISOString()) as { n: number }
  ).n;
  if (staleCreditNotes > 0) {
    alerts.push({
      code: "credit_note_pending",
      message: `${staleCreditNotes} factura(s) reembolsada(s) llevan más de 3 días sin nota de crédito. Emítelas en /operador.`,
    });
  }

  // Gasto de IA del día: el tope mensual ya existe; esto avisa antes de agotarlo.
  const dailyLimit = dailyAlertThresholdUsd(env);
  if (dailyLimit > 0) {
    const spent = dailySpendUsd(now);
    if (spent >= dailyLimit) {
      alerts.push({
        code: "ai_spend_daily",
        message: `La IA lleva ${spent.toFixed(2)} USD hoy (umbral diario ${dailyLimit} USD). Revisa el uso en /operador o ajusta AI_DAILY_ALERT_USD.`,
      });
    }
  }

  return alerts;
}
