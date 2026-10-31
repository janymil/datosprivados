import { getDb, newId, nowIso, type Company } from "@/lib/db";

/** Crea una empresa con cuenta de administrador lista para usar. Devuelve sus ids. */
export function makeCompany(overrides: Partial<Company> = {}) {
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
  db.prepare(
    "INSERT INTO users (id, company_id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'x', 'admin', ?)"
  ).run(userId, id, "Responsable", base.email, now);

  return { companyId: id, userId, email: base.email };
}

export function getCompanyRow(companyId: string) {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as Company;
}
