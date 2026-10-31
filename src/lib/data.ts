import "server-only";

import {
  getDb,
  type Activity,
  type ArcoRequest,
  type Company,
  type DataBank,
  type DocumentRow,
  type EvidenceRow,
  type EvidenceType,
  type Incident,
  type Provider,
} from "./db";
import { findTool, isAbroad, isOwnTool, toolCategory } from "./provider-catalog";
import { limaToday } from "./format";
import { buildDocument, documentTitle } from "./document-catalog";
import { TEMPLATE_VERSIONS, fingerprint, serializeBuiltFrom } from "./document-freshness";
import type { DocumentKind } from "./db";

function all<T>(sql: string, ...params: Array<string | number | null>): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

function one<T>(sql: string, ...params: Array<string | number | null>): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return one<Company>("SELECT * FROM companies WHERE slug = ?", slug);
}

export function listBanks(companyId: string): DataBank[] {
  return all<DataBank>(
    `SELECT * FROM data_banks WHERE company_id = ?
     ORDER BY CASE status WHEN 'registrado' THEN 0 ELSE 1 END, updated_at DESC`,
    companyId
  );
}

export function getBank(companyId: string, id: string): DataBank | undefined {
  return one<DataBank>("SELECT * FROM data_banks WHERE id = ? AND company_id = ?", id, companyId);
}

export function listRequests(companyId: string): ArcoRequest[] {
  return all<ArcoRequest>(
    `SELECT * FROM arco_requests WHERE company_id = ?
     ORDER BY CASE status WHEN 'nuevo' THEN 0 WHEN 'en_proceso' THEN 1 ELSE 2 END, due_at ASC`,
    companyId
  );
}

export function getRequest(companyId: string, id: string): ArcoRequest | undefined {
  return one<ArcoRequest>(
    "SELECT * FROM arco_requests WHERE id = ? AND company_id = ?",
    id,
    companyId
  );
}

export function listIncidents(companyId: string): Incident[] {
  return all<Incident>(
    "SELECT * FROM incidents WHERE company_id = ? ORDER BY detected_at DESC",
    companyId
  );
}

export function getIncident(companyId: string, id: string): Incident | undefined {
  return one<Incident>(
    "SELECT * FROM incidents WHERE id = ? AND company_id = ?",
    id,
    companyId
  );
}

export function listDocuments(companyId: string): DocumentRow[] {
  return all<DocumentRow>(
    "SELECT * FROM documents WHERE company_id = ? ORDER BY kind ASC",
    companyId
  );
}

export function getDocument(companyId: string, kind: string): DocumentRow | undefined {
  return one<DocumentRow>(
    "SELECT * FROM documents WHERE company_id = ? AND kind = ? ORDER BY version DESC LIMIT 1",
    companyId,
    kind
  );
}

export function getPolicyBySlug(slug: string): { company: Company; doc: DocumentRow } | undefined {
  const company = getCompanyBySlug(slug);
  if (!company) return undefined;
  const doc = one<DocumentRow>(
    "SELECT * FROM documents WHERE company_id = ? AND kind = 'politica' AND published = 1 ORDER BY version DESC LIMIT 1",
    company.id
  );
  if (!doc) return undefined;
  return { company, doc };
}

export function listActivity(companyId: string, limit = 6): Activity[] {
  return all<Activity>(
    "SELECT * FROM activity WHERE company_id = ? ORDER BY created_at DESC LIMIT ?",
    companyId,
    limit
  );
}

/** Medidas del Documento de Seguridad ya implementadas, con su fecha. */
export function listSecurityChecks(companyId: string): Map<string, string> {
  const rows = all<{ item: string; done_at: string }>(
    "SELECT item, done_at FROM security_checks WHERE company_id = ?",
    companyId
  );
  return new Map(rows.map((row) => [row.item, row.done_at]));
}

export function logActivity(companyId: string, kind: string, message: string) {
  getDb()
    .prepare("INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), companyId, kind, message, new Date().toISOString());
}

/** Guarda una nueva versión del documento y devuelve el número de versión. */
/**
 * Genera un documento con la plantilla vigente y los datos actuales de la
 * empresa, y lo guarda con su versión de plantilla y su huella de origen.
 * Devuelve el número de versión del documento.
 */
export function generateAndSaveDocument(company: Company, banks: DataBank[], kind: DocumentKind): number {
  const providers = listProviders(company.id);
  return upsertDocument(
    company.id,
    kind,
    documentTitle(kind),
    buildDocument(kind, company, banks, providers),
    {
      templateVersion: TEMPLATE_VERSIONS[kind],
      builtFrom: serializeBuiltFrom(fingerprint(kind, company, banks, providers)),
    }
  );
}

export function upsertDocument(
  companyId: string,
  kind: string,
  title: string,
  content: string,
  meta?: { templateVersion: number; builtFrom: string }
): number {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = one<{ id: string; version: number }>(
    "SELECT id, version FROM documents WHERE company_id = ? AND kind = ? ORDER BY version DESC LIMIT 1",
    companyId,
    kind
  );
  if (existing) {
    db.prepare(
      "UPDATE documents SET content = ?, version = ?, updated_at = ?, template_version = ?, built_from = ? WHERE id = ?"
    ).run(content, existing.version + 1, now, meta?.templateVersion ?? null, meta?.builtFrom ?? null, existing.id);
    return existing.version + 1;
  }
  db.prepare(
    "INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at, template_version, built_from) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?)"
  ).run(crypto.randomUUID(), companyId, kind, title, content, now, meta?.templateVersion ?? null, meta?.builtFrom ?? null);
  return 1;
}

export function nextTicketNumber(companyId: string): string {
  const year = limaToday().slice(0, 4);
  const prefix = `ARCO-${year}-`;
  // MAX del correlativo (no COUNT), para no repetir tickets si hay huecos.
  const row = one<{ n: number | null }>(
    "SELECT MAX(CAST(substr(ticket, ?) AS INTEGER)) AS n FROM arco_requests WHERE company_id = ? AND ticket LIKE ?",
    prefix.length + 1,
    companyId,
    `${prefix}%`
  );
  return `${prefix}${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

export type CompanyStats = {
  banks: number;
  banksRegistered: number;
  openRequests: number;
  overdueRequests: number;
  incidentsOpen: number;
  documentsPublished: number;
};

export function getStats(companyId: string): CompanyStats {
  const today = limaToday();
  return {
    banks: one<{ n: number }>("SELECT COUNT(*) AS n FROM data_banks WHERE company_id = ?", companyId)?.n ?? 0,
    banksRegistered:
      one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM data_banks WHERE company_id = ? AND status = 'registrado'",
        companyId
      )?.n ?? 0,
    openRequests:
      one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso')",
        companyId
      )?.n ?? 0,
    overdueRequests:
      one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ? AND status IN ('nuevo','en_proceso') AND due_at < ?",
        companyId,
        today
      )?.n ?? 0,
    incidentsOpen:
      one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM incidents WHERE company_id = ? AND status != 'cerrado'",
        companyId
      )?.n ?? 0,
    documentsPublished:
      one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM documents WHERE company_id = ? AND published = 1",
        companyId
      )?.n ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Herramientas y proveedores                                                */
/* -------------------------------------------------------------------------- */

export function listProviders(companyId: string): Provider[] {
  return all<Provider>(
    "SELECT * FROM providers WHERE company_id = ? ORDER BY category, name COLLATE NOCASE",
    companyId
  );
}

export type ProviderInput = { category: string; name: string; country: string; custom: boolean };

/**
 * Reemplaza la lista de herramientas por la que envía el dueño, conservando el
 * estado de contrato y de comunicación de las que siguen en la lista.
 */
export function syncProviders(companyId: string, inputs: ProviderInput[]): void {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = listProviders(companyId);
  const key = (category: string, name: string) => `${category}\u0001${name.trim().toLowerCase()}`;
  const byKey = new Map(existing.map((p) => [key(p.category, p.name), p]));
  const seen = new Set<string>();

  for (const input of inputs) {
    const k = key(input.category, input.name);
    if (seen.has(k)) continue;
    seen.add(k);
    const catalog = toolCategory(input.category);
    if (!catalog) continue;
    const tool = findTool(input.category, input.name);
    const own = isOwnTool(input.category, input.name);
    const abroad = isAbroad(input.country);
    const prev = byKey.get(k);
    const transfer = abroad ? (prev && prev.transfer_status !== "no_aplica" ? prev.transfer_status : "pendiente") : "no_aplica";
    const dpa = own ? "no_aplica" : prev && prev.dpa_status !== "no_aplica" ? prev.dpa_status : "pendiente";
    const purpose = tool?.purpose ?? catalog.purpose;
    const cookies = tool?.cookies ?? "";
    if (prev) {
      const changed = prev.country !== input.country;
      db.prepare(
        `UPDATE providers SET country = ?, purpose = ?, data = ?, cookies = ?, dpa_status = ?, transfer_status = ?,
         updated_at = ? WHERE id = ?`
      ).run(input.country, purpose, catalog.data, cookies, dpa, transfer, changed ? now : prev.updated_at, prev.id);
    } else {
      db.prepare(
        `INSERT INTO providers (id, company_id, category, name, country, is_custom, purpose, data, cookies, dpa_status, transfer_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(crypto.randomUUID(), companyId, input.category, input.name.trim(), input.country, input.custom ? 1 : 0, purpose, catalog.data, cookies, dpa, transfer, now, now);
    }
  }

  for (const prev of existing) {
    if (!seen.has(key(prev.category, prev.name))) {
      db.prepare("DELETE FROM providers WHERE id = ? AND company_id = ?").run(prev.id, companyId);
    }
  }
  db.prepare("UPDATE companies SET tools_declared_at = ? WHERE id = ?").run(now, companyId);
}

export function updateProviderStatus(
  companyId: string,
  id: string,
  patch: { dpa_status?: string; transfer_status?: string }
): void {
  const row = one<Provider>("SELECT * FROM providers WHERE id = ? AND company_id = ?", id, companyId);
  if (!row) return;
  const dpa = ["pendiente", "firmado", "no_aplica"].includes(patch.dpa_status ?? "") ? patch.dpa_status! : row.dpa_status;
  let transfer = ["no_aplica", "pendiente", "comunicado"].includes(patch.transfer_status ?? "")
    ? patch.transfer_status!
    : row.transfer_status;
  if (!isAbroad(row.country)) transfer = "no_aplica";
  getDb()
    .prepare("UPDATE providers SET dpa_status = ?, transfer_status = ? WHERE id = ? AND company_id = ?")
    .run(dpa, transfer, id, companyId);
}

/* -------------------------------------------------------------------------- */
/*  Evidencias                                                                */
/* -------------------------------------------------------------------------- */

export function listEvidence(companyId: string): EvidenceRow[] {
  return all<EvidenceRow>(
    "SELECT * FROM evidence WHERE company_id = ? ORDER BY occurred_on DESC, created_at DESC",
    companyId
  );
}

export function addEvidence(
  companyId: string,
  entry: { type: EvidenceType; occurred_on: string; detail: string; reference: string }
): void {
  getDb()
    .prepare(
      "INSERT INTO evidence (id, company_id, type, occurred_on, detail, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(crypto.randomUUID(), companyId, entry.type, entry.occurred_on, entry.detail, entry.reference, new Date().toISOString());
}

export function deleteEvidence(companyId: string, id: string): void {
  getDb().prepare("DELETE FROM evidence WHERE id = ? AND company_id = ?").run(id, companyId);
}
