import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { makeActiveCompany, makeArcoRequest, makeBank, makeIncident, makeProvider, makeEvidence } from "./helpers/db";

/** Consulta que el panel repite y el índice con el que debe resolverse. */
const HOT_QUERIES: Array<{ name: string; sql: string; params: Array<string | number>; index: string }> = [
  { name: "bancos de una empresa", sql: "SELECT * FROM data_banks WHERE company_id = ? ORDER BY updated_at DESC", params: ["c"], index: "idx_banks_company" },
  { name: "documento por tipo", sql: "SELECT * FROM documents WHERE company_id = ? AND kind = ? ORDER BY version DESC LIMIT 1", params: ["c", "politica"], index: "idx_documents_company_kind" },
  { name: "actividad del panel", sql: "SELECT * FROM activity WHERE company_id = ? ORDER BY created_at DESC LIMIT 8", params: ["c"], index: "idx_activity_company" },
  { name: "solicitudes ARCO abiertas", sql: "SELECT * FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso')", params: ["c"], index: "idx_arco_company_status" },
  { name: "ticket ARCO", sql: "SELECT 1 FROM arco_requests WHERE company_id = ? AND ticket = ?", params: ["c", "t"], index: "idx_arco_company_ticket" },
  { name: "incidentes de una empresa", sql: "SELECT * FROM incidents WHERE company_id = ? ORDER BY detected_at DESC", params: ["c"], index: "idx_incidents_company" },
  { name: "proveedores de una empresa", sql: "SELECT * FROM providers WHERE company_id = ?", params: ["c"], index: "idx_providers_company" },
  { name: "evidencias de una empresa", sql: "SELECT * FROM evidence WHERE company_id = ? ORDER BY occurred_on DESC", params: ["c"], index: "idx_evidence_company" },
  { name: "cola de correo", sql: "SELECT * FROM email_outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at LIMIT 100", params: ["2026-01-01T00:00:00.000Z"], index: "idx_outbox_due" },
  { name: "sesiones vencidas", sql: "DELETE FROM sessions WHERE expires_at <= ?", params: ["2026-01-01T00:00:00.000Z"], index: "idx_sessions_expires" },
  { name: "poda de límites", sql: "DELETE FROM rate_limits WHERE window_start < ?", params: [0], index: "idx_rate_limits_window" },
  { name: "candado de una tarea", sql: "SELECT 1 FROM job_runs WHERE job = ? AND finished_at IS NULL AND started_at > ?", params: ["send-outbox", "2026-01-01T00:00:00.000Z"], index: "idx_job_runs_job" },
  { name: "ingreso por correo", sql: "SELECT * FROM users WHERE lower(email) = lower(?)", params: ["a@b.pe"], index: "idx_users_email_lower" },
  { name: "empresa por RUC", sql: "SELECT id FROM companies WHERE ruc = ? AND billing_status IN ('active','demo') LIMIT 1", params: ["20100000001"], index: "idx_companies_ruc" },
  { name: "cobro por id de MercadoPago", sql: "SELECT 1 FROM payments WHERE payment_id = ?", params: ["123"], index: "uq_payments_payment_id" },
  { name: "comprobantes pendientes", sql: "SELECT COUNT(*) AS n FROM invoices WHERE status = 'pending' AND created_at <= ?", params: ["2026-01-01T00:00:00.000Z"], index: "idx_invoices_status" },
  { name: "consumo de IA del mes", sql: "SELECT COALESCE(SUM(input_tokens), 0) AS i FROM ai_usage WHERE company_id = ? AND created_at >= ?", params: ["c", "2026-01-01T00:00:00.000Z"], index: "idx_ai_usage_company" },
  { name: "versión de un documento", sql: "SELECT * FROM document_versions WHERE document_id = ? AND version = ?", params: ["d", 1], index: "sqlite_autoindex_document_versions_2" },
];

function plan(sql: string, params: Array<string | number>): string[] {
  const rows = getDb().prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as { detail: string }[];
  return rows.map((row) => row.detail);
}

describe("índices de las consultas calientes", () => {
  it("cada consulta del panel se resuelve con un índice, sin recorrer la tabla", () => {
    const company = makeActiveCompany();
    makeBank(company.companyId);
    makeIncident(company.companyId);
    makeArcoRequest(company.companyId);
    makeProvider(company.companyId);
    makeEvidence(company.companyId);

    const problems: string[] = [];
    for (const query of HOT_QUERIES) {
      const details = plan(query.sql, query.params);
      const joined = details.join(" | ");
      if (details.some((detail) => detail.startsWith("SCAN "))) problems.push(`${query.name}: recorre la tabla (${joined})`);
      if (!joined.includes(query.index)) problems.push(`${query.name}: no usa ${query.index} (${joined})`);
    }
    expect(problems).toEqual([]);
  });

  it("no deja tablas con company_id sin índice por empresa", () => {
    /**
     * `email_outbox` se consulta por estado y fecha (cola), nunca por empresa: su
     * único acceso por `company_id` es el borrado al eliminar una cuenta, que
     * ocurre una vez y recorre la tabla con o sin índice. Añadirlo encarecería
     * cada inserción de correo.
     */
    const SIN_INDICE_POR_EMPRESA: Record<string, string> = { email_outbox: "la cola se consulta por estado; el borrado por empresa es excepcional" };

    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    const without: string[] = [];
    for (const { name } of tables) {
      if (SIN_INDICE_POR_EMPRESA[name]) continue;
      const columns = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[];
      if (!columns.some((column) => column.name === "company_id")) continue;
      const indexes = db.prepare(`PRAGMA index_list(${name})`).all() as { name: string }[];
      const covers = indexes.some((index) => {
        const cols = db.prepare(`PRAGMA index_info(${index.name})`).all() as { name: string }[];
        return cols[0]?.name === "company_id";
      });
      if (!covers) without.push(name);
    }
    expect(without).toEqual([]);
  });
});

