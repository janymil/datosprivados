import { getDb, newId, nowIso, type Company } from "@/lib/db";

/** Crea una empresa con cuenta de administrador lista para usar. Devuelve sus ids. */
export function makeCompany(overrides: Partial<Company> = {}, user: { email_verified_at?: string | null } = {}) {
  const db = getDb();
  const id = overrides.id ?? newId();
  const now = nowIso();
  const base = {
    name: "Empresa Prueba S.A.C.",
    ruc: "20604567891",
    sector: "Tienda online / e-commerce",
    slug: `empresa-${id.slice(0, 8)}`,
    email: `owner-${id.slice(0, 8)}@example.com`,
    phone: "+51 999 999 999",
    address: "Av. Principal 100, Lima",
    plan: "basico",
    billing_term: "monthly",
    billing_status: "pending",
    paid_until: null,
    subscription_id: null,
    subscription_status: null,
    pending_subscription_id: null,
    pending_plan: null,
    pending_term: null,
    last_payment_id: null,
    onboarded_at: now,
    ...overrides,
  };

  db.prepare(
    `INSERT INTO companies (id, name, ruc, sector, slug, email, phone, address, plan, billing_term, billing_status,
       paid_until, subscription_id, subscription_status, pending_subscription_id, pending_plan, pending_term,
       last_payment_id, dpo_name, dpo_email, onboarded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    base.name,
    base.ruc,
    base.sector,
    base.slug,
    base.email,
    base.phone,
    base.address,
    base.plan,
    base.billing_term,
    base.billing_status,
    base.paid_until,
    base.subscription_id,
    base.subscription_status,
    base.pending_subscription_id,
    base.pending_plan,
    base.pending_term,
    base.last_payment_id,
    "Responsable",
    base.email,
    base.onboarded_at,
    now
  );

  const userId = newId();
  // Las cuentas de prueba se crean con el correo ya confirmado (lo normal tras
  // registrarse y abrir el enlace); la verificación se prueba aparte pasando null.
  db.prepare(
    "INSERT INTO users (id, company_id, name, email, password_hash, role, email_verified_at, created_at) VALUES (?, ?, ?, ?, 'x', 'admin', ?, ?)"
  ).run(userId, id, "Responsable", base.email, user.email_verified_at === undefined ? now : user.email_verified_at, now);

  return { companyId: id, userId, email: base.email };
}

export function getCompanyRow(companyId: string) {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as Company;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Empresa con suscripción vigente: la que usan las pruebas de acciones. */
export function makeActiveCompany(overrides: Partial<Company> = {}, user: { email_verified_at?: string | null } = {}) {
  return makeCompany({ billing_status: "active", paid_until: new Date(Date.now() + 30 * DAY_MS).toISOString(), ...overrides }, user);
}

export function getCompany(companyId: string): Company {
  return getCompanyRow(companyId);
}

export function makeBank(companyId: string, overrides: Record<string, string> = {}) {
  const id = newId();
  const now = nowIso();
  const v = { name: "Clientes", purpose: "Vender y entregar pedidos", data_categories: "nombre, DNI, correo, teléfono", legal_basis: "contrato", retention: "5 años", recipients: "Courier", transfers: "no", channel: "web", status: "borrador", ...overrides };
  getDb()
    .prepare(
      `INSERT INTO data_banks (id, company_id, name, purpose, data_categories, legal_basis, retention, recipients, transfers, channel, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, companyId, v.name, v.purpose, v.data_categories, v.legal_basis, v.retention, v.recipients, v.transfers, v.channel, v.status, now, now);
  return id;
}

export function makeIncident(companyId: string, overrides: Record<string, string | number | null> = {}) {
  const id = newId();
  const v = { title: "Fuga de correos", status: "abierto", criteria: "", detected_at: nowIso(), due_at: new Date(Date.now() + 2 * DAY_MS).toISOString(), notified_at: null, ...overrides };
  getDb()
    .prepare(
      "INSERT INTO incidents (id, company_id, title, status, criteria, detected_at, due_at, notified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, companyId, v.title, v.status, v.criteria, v.detected_at, v.due_at, v.notified_at, nowIso());
  return id;
}

export function makeArcoRequest(companyId: string, overrides: Record<string, string> = {}) {
  const id = newId();
  const v = { ticket: `ARCO-T-${id.slice(0, 6)}`, type: "acceso", status: "nuevo", received_at: "2026-10-01", due_at: "2026-10-29", ...overrides };
  getDb()
    .prepare(
      "INSERT INTO arco_requests (id, company_id, ticket, type, requester_name, email, description, status, received_at, due_at, created_at) VALUES (?, ?, ?, ?, 'Ana Torres', 'ana@example.com', 'Quiero mis datos', ?, ?, ?, ?)"
    )
    .run(id, companyId, v.ticket, v.type, v.status, v.received_at, v.due_at, nowIso());
  return id;
}

export function makeProvider(companyId: string, overrides: Record<string, string> = {}) {
  const id = newId();
  const now = nowIso();
  const v = { category: "correo", name: "Gmail", country: "Estados Unidos", ...overrides };
  getDb()
    .prepare("INSERT INTO providers (id, company_id, category, name, country, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, companyId, v.category, v.name, v.country, now, now);
  return id;
}

export function makeEvidence(companyId: string) {
  const id = newId();
  getDb()
    .prepare("INSERT INTO evidence (id, company_id, type, occurred_on, created_at) VALUES (?, ?, 'capacitacion', '2026-10-01', ?)")
    .run(id, companyId, nowIso());
  return id;
}
