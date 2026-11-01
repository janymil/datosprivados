#!/usr/bin/env node
// Informe semanal de operación (Fase 7). Solo lectura: abre la base en modo readOnly.
// Uso: node scripts/weekly-report.mjs [--json]
// Variables: DATOSPRIVADOS_DB, AI_MONTHLY_BUDGET_USD, AI_PRICE_IN_USD_PER_MTOK, AI_PRICE_OUT_USD_PER_MTOK.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const iso = (date) => date.toISOString();

export function weeklyReport(db, now = new Date(), env = process.env) {
  const week = iso(new Date(now.getTime() - 7 * 86_400_000));
  const monthStart = `${iso(now).slice(0, 7)}-01`;
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;
  const rows = (sql, ...args) => db.prepare(sql).all(...args);

  const priceIn = Number(env.AI_PRICE_IN_USD_PER_MTOK) || 3;
  const priceOut = Number(env.AI_PRICE_OUT_USD_PER_MTOK) || 15;
  const ai = db
    .prepare("SELECT COALESCE(SUM(input_tokens),0) AS i, COALESCE(SUM(output_tokens),0) AS o, COUNT(*) AS calls, COALESCE(SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END),0) AS errors FROM ai_usage WHERE created_at >= ?")
    .get(monthStart);
  const spend = (ai.i * priceIn + ai.o * priceOut) / 1_000_000;
  const budget = Number(env.AI_MONTHLY_BUDGET_USD) || null;

  return {
    generated_at: iso(now),
    billing: {
      payments_by_status: rows("SELECT status, COUNT(*) AS n FROM payments WHERE created_at >= ? GROUP BY status", week),
      active_past_due: count("SELECT COUNT(*) AS n FROM companies WHERE billing_status = 'active' AND paid_until IS NOT NULL AND paid_until < ?", iso(now).slice(0, 10)),
      expired: count("SELECT COUNT(*) AS n FROM companies WHERE billing_status = 'expired'"),
      pending_over_7d: count("SELECT COUNT(*) AS n FROM payments WHERE status = 'pending' AND created_at < ?", week),
    },
    webhooks: {
      failed: count("SELECT COUNT(*) AS n FROM webhook_events WHERE received_at >= ? AND (outcome = '500' OR error IS NOT NULL)", week),
      total: count("SELECT COUNT(*) AS n FROM webhook_events WHERE received_at >= ?", week),
    },
    email: {
      by_status: rows("SELECT status, COUNT(*) AS n FROM email_outbox WHERE created_at >= ? GROUP BY status", week),
      dead: rows("SELECT template, error, created_at FROM email_outbox WHERE status = 'dead' AND created_at >= ? ORDER BY created_at DESC LIMIT 20", week),
    },
    jobs: {
      failures: rows("SELECT job, started_at, error FROM job_runs WHERE ok = 0 AND started_at >= ? ORDER BY started_at DESC LIMIT 20", week),
    },
    ai: {
      month_calls: ai.calls,
      month_errors: ai.errors,
      month_spend_usd: Math.round(spend * 100) / 100,
      budget_usd: budget,
      budget_used_pct: budget ? Math.round((spend / budget) * 100) : null,
    },
    legal: {
      arco_overdue: count("SELECT COUNT(*) AS n FROM arco_requests WHERE responded_at IS NULL AND due_at < ?", iso(now)),
      incidents_open_past_due: count("SELECT COUNT(*) AS n FROM incidents WHERE notified_at IS NULL AND status = 'abierto' AND due_at < ?", iso(now)),
    },
  };
}

/** Líneas que requieren una persona esta semana. */
export function attentionItems(report) {
  const out = [];
  if (report.webhooks.failed) out.push(`${report.webhooks.failed} webhooks fallidos en 7 días.`);
  if (report.billing.active_past_due) out.push(`${report.billing.active_past_due} cuentas activas con paid_until vencido (¿falló billing-reconcile?).`);
  if (report.billing.pending_over_7d) out.push(`${report.billing.pending_over_7d} pagos pendientes de más de 7 días: contrastar con MercadoPago.`);
  if (report.email.dead.length) out.push(`${report.email.dead.length} correos agotaron reintentos.`);
  if (report.jobs.failures.length) out.push(`${report.jobs.failures.length} ejecuciones de tareas fallidas.`);
  if (report.ai.budget_used_pct !== null && report.ai.budget_used_pct >= 80) out.push(`IA al ${report.ai.budget_used_pct} % del presupuesto mensual.`);
  if (report.legal.arco_overdue) out.push(`${report.legal.arco_overdue} solicitudes ARCO vencidas sin respuesta.`);
  if (report.legal.incidents_open_past_due) out.push(`${report.legal.incidents_open_past_due} incidentes con plazo de 48 h vencido sin notificar.`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = path.resolve(process.env.DATOSPRIVADOS_DB ?? path.join(process.cwd(), "data", "datosprivados.db"));
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const report = weeklyReport(db);
    const items = attentionItems(report);
    if (process.argv.includes("--json")) console.log(JSON.stringify({ ...report, attention: items }, null, 2));
    else {
      console.log(`Informe semanal ${report.generated_at}`);
      console.log(JSON.stringify(report, null, 2));
      console.log(items.length ? `\nREQUIERE ATENCIÓN:\n- ${items.join("\n- ")}` : "\nSin pendientes.");
      console.log("\nRevisar a mano: rastreador de errores, bandeja de soporte, factura real del proveedor de IA.");
    }
    process.exitCode = items.length ? 2 : 0;
  } finally {
    db.close();
  }
}
