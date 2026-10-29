import "server-only";

import { getDb, type Activity, type ArcoRequest, type Company, type DataBank, type DocumentRow, type Incident } from "./db";

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

export function logActivity(companyId: string, kind: string, message: string) {
  getDb()
    .prepare("INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), companyId, kind, message, new Date().toISOString());
}

export function nextTicketNumber(companyId: string): string {
  const year = new Date().getFullYear();
  const row = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ? AND ticket LIKE ?",
    companyId,
    `ARCO-${year}-%`
  );
  return `ARCO-${year}-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
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
  const today = new Date().toISOString().slice(0, 10);
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
