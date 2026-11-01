import "server-only";

import {
  getDb,
  type Activity,
  type ArcoRequest,
  type Company,
  type DataBank,
  type DocumentRow,
  type DocumentVersionRow,
  type EvidenceRow,
  type EvidenceType,
  type Incident,
  type Provider,
} from "./db";
import { findTool, isAbroad, isOwnTool, toolCategory } from "./provider-catalog";
import { limaToday } from "./format";
import { publishBlockers } from "./document-publish";
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

/** Comprueba que un ticket pertenece a la empresa, sin cargar sus solicitudes. */
export function hasRequestTicket(companyId: string, ticket: string): boolean {
  return Boolean(one("SELECT 1 FROM arco_requests WHERE company_id = ? AND ticket = ?", companyId, ticket));
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

/**
 * Política pública: se sirve la VERSIÓN PUBLICADA (instantánea en `document_versions`),
 * no el borrador de trabajo. Regenerar o editar no cambia lo que ve el público
 * hasta que la empresa publica de nuevo.
 */
export function getPolicyBySlug(slug: string): { company: Company; doc: DocumentRow } | undefined {
  const company = getCompanyBySlug(slug);
  if (!company) return undefined;
  const doc = one<DocumentRow>(
    "SELECT * FROM documents WHERE company_id = ? AND kind = 'politica' AND published = 1 ORDER BY version DESC LIMIT 1",
    company.id
  );
  if (!doc) return undefined;
  const snapshot = doc.published_version
    ? one<DocumentVersionRow>(
        "SELECT * FROM document_versions WHERE document_id = ? AND version = ?",
        doc.id,
        doc.published_version
      )
    : undefined;
  if (!snapshot) return { company, doc };
  return {
    company,
    doc: {
      ...doc,
      title: snapshot.title,
      content: snapshot.content,
      version: snapshot.version,
      updated_at: doc.published_at ?? snapshot.published_at ?? snapshot.created_at,
    },
  };
}

/** Historial de versiones de un documento, la más nueva primero. */
export function listDocumentVersions(companyId: string, kind: string): DocumentVersionRow[] {
  return all<DocumentVersionRow>(
    "SELECT * FROM document_versions WHERE company_id = ? AND kind = ? ORDER BY version DESC",
    companyId,
    kind
  );
}

export type PublishResult = { ok: true; version: number } | { ok: false; reason: "sin_documento" | "pendientes"; placeholders?: string[] };

/** Publica la versión vigente del borrador de un documento (solo la Política de Privacidad tiene enlace público). */
export function publishDocument(companyId: string, kind: string, now = new Date()): PublishResult {
  const doc = one<DocumentRow>("SELECT * FROM documents WHERE company_id = ? AND kind = ?", companyId, kind);
  if (!doc) return { ok: false, reason: "sin_documento" };
  const blockers = publishBlockers(doc.content);
  if (blockers.length) return { ok: false, reason: "pendientes", placeholders: blockers };

  const db = getDb();
  const iso = now.toISOString();
  // Se cierra la publicación anterior (si la hubo) y se abre la de esta versión.
  db.prepare(
    "UPDATE document_versions SET unpublished_at = ? WHERE document_id = ? AND published_at IS NOT NULL AND unpublished_at IS NULL AND version <> ?"
  ).run(iso, doc.id, doc.version);
  db.prepare(
    "UPDATE document_versions SET published_at = COALESCE(published_at, ?), unpublished_at = NULL WHERE document_id = ? AND version = ?"
  ).run(iso, doc.id, doc.version);
  db.prepare("UPDATE documents SET published = 1, published_version = ?, published_at = ? WHERE id = ?").run(
    doc.version,
    iso,
    doc.id
  );
  return { ok: true, version: doc.version };
}

export function unpublishDocument(companyId: string, kind: string, now = new Date()) {
  const db = getDb();
  const doc = one<DocumentRow>("SELECT * FROM documents WHERE company_id = ? AND kind = ?", companyId, kind);
  if (!doc) return;
  db.prepare("UPDATE document_versions SET unpublished_at = ? WHERE document_id = ? AND published_at IS NOT NULL AND unpublished_at IS NULL").run(
    now.toISOString(),
    doc.id
  );
  db.prepare("UPDATE documents SET published = 0, published_version = NULL, published_at = NULL WHERE id = ?").run(doc.id);
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
  const snapshot = (documentId: string, version: number) =>
    db
      .prepare(
        `INSERT INTO document_versions (id, company_id, document_id, kind, version, title, content, template_version, built_from, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(crypto.randomUUID(), companyId, documentId, kind, version, title, content, meta?.templateVersion ?? null, meta?.builtFrom ?? null, now);

  if (existing) {
    const version = existing.version + 1;
    db.prepare(
      "UPDATE documents SET content = ?, version = ?, updated_at = ?, template_version = ?, built_from = ? WHERE id = ?"
    ).run(content, version, now, meta?.templateVersion ?? null, meta?.builtFrom ?? null, existing.id);
    snapshot(existing.id, version);
    return version;
  }
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at, template_version, built_from) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?)"
  ).run(id, companyId, kind, title, content, now, meta?.templateVersion ?? null, meta?.builtFrom ?? null);
  snapshot(id, 1);
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
