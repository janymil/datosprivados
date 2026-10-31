import "server-only";

import { getDb, newId, nowIso, type Company } from "./db";
import { logActivity } from "./data";
import {
  PLANS,
  isBillingTerm,
  isPlanId,
  termDays,
  termLabel,
  type BillingTerm,
  type PlanId,
} from "./plans";

/**
 * Estado de la suscripción mensual de MercadoPago.
 *
 * Regla de acceso:
 * - demo: siempre activo.
 * - active con paid_until futuro (o null, cuentas legacy): activo.
 * - pending / expired / active con paid_until vencido: debe suscribirse.
 *
 * La suscripción (preapproval) es la fuente de cobro; los pagos mensuales
 * (subscription_authorized_payment) extienden el período.
 */

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled";

export type PaymentRow = {
  id: string;
  company_id: string;
  plan: PlanId;
  term: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  preference_id: string | null;
  payment_id: string | null;
  external_reference: string | null;
  subscription_id: string | null;
  paid_at: string | null;
  raw: string | null;
  created_at: string;
};

export function isCompanyActive(
  company: Pick<Company, "billing_status" | "paid_until">
) {
  if (company.billing_status === "demo") return true;
  if (company.billing_status !== "active") return false;
  if (!company.paid_until) return true;
  return new Date(company.paid_until).getTime() > Date.now();
}

export function canBypassPayment() {
  return process.env.NODE_ENV !== "production" && process.env.PAYMENTS_DEV_BYPASS !== "0";
}

export function billingLabel(
  company: Pick<Company, "billing_status" | "paid_until" | "subscription_status" | "billing_term">
) {
  if (company.billing_status === "demo") return "Cuenta de demostración";
  if (company.billing_status === "pending") return "Pendiente de pago";
  if (company.billing_status === "expired") return "Plan vencido";
  if (company.paid_until && new Date(company.paid_until).getTime() <= Date.now()) {
    return "Plan vencido";
  }
  if (company.subscription_status === "cancelled") return "Suscripción cancelada";
  if (company.subscription_status === "paused") return "Suscripción pausada";
  return `Suscripción ${termLabel(company.billing_term).toLowerCase()} activa`;
}

export function companyTerm(company: Pick<Company, "billing_term">): BillingTerm {
  return isBillingTerm(company.billing_term) ? company.billing_term : "monthly";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextPaidUntil(currentPaidUntil: string | null, paidAt: Date, days = 30) {
  const current = currentPaidUntil ? new Date(currentPaidUntil) : null;
  const base = current && current.getTime() > paidAt.getTime() ? current : paidAt;
  return addDays(base, days).toISOString();
}

export function getPaymentsForCompany(companyId: string, limit = 8) {
  return getDb()
    .prepare("SELECT * FROM payments WHERE company_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(companyId, limit) as unknown as PaymentRow[];
}

export function getCompanyBySubscriptionId(subscriptionId: string) {
  return getDb()
    .prepare("SELECT * FROM companies WHERE subscription_id = ?")
    .get(subscriptionId) as unknown as Company | undefined;
}

/**
 * La suscripción fue creada pero todavía no está autorizada.
 * En una cuenta activa (cambio de plan) no le quitamos el acceso actual.
 */
export function setSubscriptionPending(
  companyId: string,
  subscriptionId: string,
  plan: PlanId,
  term: BillingTerm
) {
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as
    | Company
    | undefined;
  if (!company) return;

  const keepActive = isCompanyActive(company);
  db.prepare(
    `UPDATE companies SET subscription_id = ?, subscription_status = 'pending', plan = ?,
       billing_term = ?, billing_status = CASE WHEN ? = 1 THEN billing_status ELSE 'pending' END
     WHERE id = ?`
  ).run(subscriptionId, plan, term, keepActive ? 1 : 0, companyId);

  logActivity(
    companyId,
    "pago",
    `Iniciaste la suscripción ${term === "yearly" ? "anual" : "mensual"} del Plan ${PLANS[plan].name} con MercadoPago.`
  );
}

/**
 * La suscripción quedó autorizada. Si la cuenta todavía no tiene un período
 * pagado, otorgamos el primer mes. Los cobros siguientes extienden el período.
 */
export function activateSubscription(input: {
  companyId: string;
  subscriptionId: string;
  plan?: PlanId;
  term?: BillingTerm;
}) {
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(input.companyId) as unknown as
    | Company
    | undefined;
  if (!company) return null;

  const term = input.term ?? companyTerm(company);
  const paidAt = new Date();
  const paidUntil =
    company.paid_until && new Date(company.paid_until).getTime() > paidAt.getTime()
      ? company.paid_until
      : addDays(paidAt, termDays(term)).toISOString();
  // Sentinel para que el primer cobro mensual no duplique el período que ya
  // otorgamos al autorizar la suscripción. Si ya hay un pago real, se conserva.
  const lastPaymentId =
    company.last_payment_id && !company.last_payment_id.startsWith("auth-")
      ? company.last_payment_id
      : `auth-${input.subscriptionId}`;

  db.prepare(
    `UPDATE companies SET subscription_id = ?, subscription_status = 'authorized',
       billing_status = 'active', paid_until = ?, plan = ?, billing_term = ?, last_payment_id = ?
     WHERE id = ?`
  ).run(
    input.subscriptionId,
    paidUntil,
    input.plan ?? company.plan,
    term,
    lastPaymentId,
    input.companyId
  );

  logActivity(
    input.companyId,
    "pago",
    `Suscripción ${term === "yearly" ? "anual" : "mensual"} autorizada. Tu plan está activo hasta el ${new Date(
      paidUntil
    ).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}.`
  );

  return { paidUntil };
}

/**
 * Cada cobro mensual aprobado extiende 30 días desde el final del período
 * actual (o desde la fecha del cobro si ya venció).
 */
export function recordSubscriptionCharge(input: {
  companyId: string;
  subscriptionId: string;
  paymentId: string;
  amount: number;
  paidAt?: string;
  raw?: string;
}) {
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(input.companyId) as unknown as
    | Company
    | undefined;
  if (!company) return null;

  const alreadyRecorded = db
    .prepare("SELECT id FROM payments WHERE payment_id = ?")
    .get(input.paymentId);
  if (alreadyRecorded) {
    return { paidUntil: company.paid_until, already: true };
  }

  const term = companyTerm(company);
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  const firstAfterAuthorization = company.last_payment_id === `auth-${input.subscriptionId}`;
  const paidUntil = firstAfterAuthorization
    ? company.paid_until && new Date(company.paid_until).getTime() > paidAt.getTime()
      ? company.paid_until
      : addDays(paidAt, termDays(term)).toISOString()
    : nextPaidUntil(company.paid_until, paidAt, termDays(term));
  const plan = isPlanId(company.plan) ? company.plan : "basico";

  db.prepare(
    `UPDATE companies SET billing_status = 'active', paid_until = ?, last_payment_id = ?,
       subscription_id = ?, subscription_status = 'authorized', plan = ?, billing_term = ?
     WHERE id = ?`
  ).run(paidUntil, input.paymentId, input.subscriptionId, plan, term, input.companyId);

  db.prepare(
    `INSERT INTO payments
       (id, company_id, plan, term, amount, currency, status, provider, payment_id,
        external_reference, subscription_id, paid_at, raw, created_at)
     VALUES (?, ?, ?, ?, ?, 'PEN', 'approved', 'mercadopago', ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    input.companyId,
    plan,
    term,
    input.amount,
    input.paymentId,
    input.subscriptionId,
    input.subscriptionId,
    paidAt.toISOString(),
    input.raw ?? null,
    nowIso()
  );

  logActivity(
    input.companyId,
    "pago",
    `Cobro mensual confirmado: S/ ${input.amount.toFixed(2)}. Plan activo hasta el ${new Date(
      paidUntil
    ).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}.`
  );

  return { paidUntil };
}

export function markSubscriptionStatus(
  companyId: string,
  status: "authorized" | "paused" | "cancelled"
) {
  getDb()
    .prepare("UPDATE companies SET subscription_status = ? WHERE id = ?")
    .run(status, companyId);

  const label =
    status === "cancelled"
      ? "Cancelaste la suscripción mensual."
      : status === "paused"
        ? "Tu suscripción mensual quedó pausada."
        : "Tu suscripción mensual quedó activa.";
  logActivity(companyId, "pago", label);
}

export function activateDevPlan(companyId: string, plan: PlanId, term: BillingTerm = "monthly") {
  const paidUntil = addDays(new Date(), termDays(term)).toISOString();
  getDb()
    .prepare(
      `UPDATE companies SET plan = ?, billing_term = ?, billing_status = 'active', paid_until = ?,
         last_payment_id = ?, subscription_id = NULL, subscription_status = 'dev'
       WHERE id = ?`
    )
    .run(plan, term, paidUntil, `dev-${newId()}`, companyId);
  logActivity(
    companyId,
    "pago",
    `Activaste el Plan ${PLANS[plan].name} ${term === "yearly" ? "anual" : "mensual"} en modo desarrollo.`
  );
  return { paidUntil };
}

export function planFromCompany(company: Pick<Company, "plan">): PlanId {
  return isPlanId(company.plan) ? company.plan : "basico";
}
