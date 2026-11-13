import "server-only";

import { getDb, newId, nowIso, type Company } from "./db";
import { logActivity } from "./data";
import { notifyCompany } from "./notify";
import { enqueueEmail } from "./mail";
import { createInvoiceForPayment, getInvoiceByPayment, markCreditNotePending, voidPendingInvoice } from "./invoicing";
import {
  PLANS,
  firstYearPrice,
  isBillingTerm,
  isPlanId,
  planPrice,
  renewalPrice,
  termMonths,
  termLabel,
  type BillingTerm,
  type PlanId,
} from "./plans";

/**
 * Estado de la suscripción mensual o anual de MercadoPago.
 *
 * Regla de acceso:
 * - demo: siempre activo.
 * - active con paid_until futuro (o null, cuentas legacy): activo.
 * - pending / expired / active con paid_until vencido: debe suscribirse.
 *
 * Campos de la suscripción:
 * - subscription_id: la suscripción autorizada que cobra hoy.
 * - pending_subscription_id (+ pending_plan / pending_term): un cambio de plan
 *   creado en MercadoPago que todavía no está autorizado. Hasta que se autoriza,
 *   el plan y el acceso actuales no cambian.
 *
 * Modelo anual (primer año con implementación, renovaciones más baratas):
 * - La suscripción del primer año se crea con el monto del primer año
 *   (`pending_amount`/`subscription_amount`, con `*_intro = 1`). Tras su primer cobro
 *   aprobado se cierra en MercadoPago para que no vuelva a cobrar ese monto, y queda en
 *   `subscription_status = 'completed'` (acceso activo hasta `paid_until`, sin correo
 *   de cancelación).
 * - La renovación crea una suscripción anual nueva con el precio de renovación, que se
 *   renueva sola cada año. El plan es siempre anual: la validación del monto usa el
 *   monto acordado al crear la suscripción, no la lista de precios vigente.
 *
 * Marcadores de `last_payment_id`:
 * - `auth-<id>`: la suscripción <id> recibió el periodo inicial al autorizarse y
 *   su primer cobro no debe volver a extenderlo.
 */

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

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
  company: Pick<Company, "billing_status" | "paid_until">,
  now: Date = new Date()
) {
  if (company.billing_status === "demo") return true;
  if (company.billing_status !== "active") return false;
  if (!company.paid_until) return true;
  return new Date(company.paid_until).getTime() > now.getTime();
}

export function canBypassPayment() {
  return process.env.NODE_ENV !== "production" && process.env.PAYMENTS_DEV_BYPASS === "1";
}

export function billingLabel(
  company: Pick<Company, "billing_status" | "paid_until" | "subscription_status" | "billing_term" | "subscription_id">
) {
  if (company.billing_status === "demo") return "Cuenta de demostración";
  if (company.billing_status === "pending") return "Pendiente de pago";
  if (company.billing_status === "expired") return "Plan vencido";
  if (company.paid_until && new Date(company.paid_until).getTime() <= Date.now()) {
    return "Plan vencido";
  }
  // Sin suscripción de MercadoPago (transferencia o activación manual): el plan está pagado.
  if (!company.subscription_id) return `Plan ${termLabel(company.billing_term).toLowerCase()} activo`;
  if (company.subscription_status === "completed") return "Plan anual activo";
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

/** Suma meses de calendario (31 ene + 1 mes = 28/29 feb), para no desfasarse de la renovación de MercadoPago. */
export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function nextPaidUntil(currentPaidUntil: string | null, paidAt: Date, months = 1) {
  const current = currentPaidUntil ? new Date(currentPaidUntil) : null;
  const base = current && current.getTime() > paidAt.getTime() ? current : paidAt;
  return addMonths(base, months).toISOString();
}

export function getPaymentsForCompany(companyId: string, limit = 8) {
  return getDb()
    .prepare("SELECT * FROM payments WHERE company_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(companyId, limit) as unknown as PaymentRow[];
}

export function getCompanyById(companyId: string) {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as
    | Company
    | undefined;
}

/** Empresa cuya suscripción actual o pendiente tiene este identificador. */
export function getCompanyBySubscriptionId(subscriptionId: string) {
  return getDb()
    .prepare("SELECT * FROM companies WHERE subscription_id = ? OR pending_subscription_id = ?")
    .get(subscriptionId, subscriptionId) as unknown as Company | undefined;
}

function hasApprovedPayments(subscriptionId: string) {
  return Boolean(
    getDb()
      .prepare("SELECT 1 FROM payments WHERE subscription_id = ? AND status = 'approved' LIMIT 1")
      .get(subscriptionId)
  );
}

/** ¿La empresa ya pagó algo (tarjeta o transferencia)? Define si le toca el precio de primer año o el de renovación. */
export function hasApprovedPayment(companyId: string) {
  return Boolean(getDb().prepare("SELECT 1 FROM payments WHERE company_id = ? AND status = 'approved' LIMIT 1").get(companyId));
}

export type CheckoutCharge = { amount: number; intro: boolean };

/**
 * Cuánto cobrar hoy por un plan anual: el primer año (con implementación) si la empresa
 * nunca pagó; la renovación en cualquier otro caso. Es la única fuente del monto de
 * checkout, para tarjeta y para transferencia.
 */
export function checkoutCharge(companyId: string, plan: PlanId): CheckoutCharge {
  return hasApprovedPayment(companyId)
    ? { amount: renewalPrice(plan), intro: false }
    : { amount: firstYearPrice(plan), intro: true };
}

/**
 * Monto que debe tener en MercadoPago la suscripción `subscriptionId`: el acordado al
 * crearla. Las cuentas anteriores al modelo anual no lo guardaron y usan el precio del plan.
 */
export function expectedSubscriptionAmount(
  company: Pick<Company, "pending_subscription_id" | "pending_amount" | "subscription_amount">,
  subscriptionId: string,
  plan: PlanId,
  term: BillingTerm
) {
  const agreed = company.pending_subscription_id === subscriptionId ? company.pending_amount : company.subscription_amount;
  return typeof agreed === "number" && agreed > 0 ? agreed : planPrice(plan, term);
}

/** ¿Es la suscripción de primer año ya cobrada, que hay que cerrar en MercadoPago? */
export function introNeedsClose(company: Company, subscriptionId: string) {
  return (
    company.subscription_id === subscriptionId &&
    company.subscription_intro === 1 &&
    company.subscription_status !== "completed" &&
    hasApprovedPayments(subscriptionId)
  );
}

/**
 * ¿Puede renovar ahora? Activa, sin una suscripción que se renueve sola, y a menos de 60
 * días del vencimiento (o sin fecha). Habilita el pago anticipado desde /pago.
 */
export function canRenewNow(
  company: Pick<Company, "billing_status" | "paid_until" | "subscription_id" | "subscription_status" | "subscription_intro">,
  now: Date = new Date()
) {
  if (!isCompanyActive(company) || company.billing_status === "demo" || !company.paid_until) return false;
  const selfRenewing =
    Boolean(company.subscription_id) && company.subscription_status === "authorized" && company.subscription_intro !== 1;
  if (selfRenewing) return false;
  return new Date(company.paid_until).getTime() - now.getTime() <= 60 * 86_400_000;
}

/**
 * Se creó una suscripción nueva en MercadoPago y espera autorización.
 * Si la cuenta ya tiene un plan activo, ese plan sigue vigente.
 */
export function setSubscriptionPending(
  companyId: string,
  subscriptionId: string,
  plan: PlanId,
  term: BillingTerm,
  agreed?: CheckoutCharge
) {
  const db = getDb();
  const company = getCompanyById(companyId);
  if (!company) return;

  const keepActive = isCompanyActive(company) ? 1 : 0;
  db.prepare(
    `UPDATE companies SET pending_subscription_id = ?, pending_plan = ?, pending_term = ?,
       pending_amount = ?, pending_intro = ?,
       billing_status = CASE WHEN ? = 1 THEN billing_status ELSE 'pending' END
     WHERE id = ?`
  ).run(subscriptionId, plan, term, agreed?.amount ?? null, agreed?.intro ? 1 : 0, keepActive, companyId);

  logActivity(
    companyId,
    "pago",
    `Iniciaste la suscripción ${term === "yearly" ? "anual" : "mensual"} del Plan ${PLANS[plan].name} con MercadoPago.`
  );
}

/** Descarta un cambio de plan que no se autorizó (abandonado o cancelado). */
export function clearPendingSubscription(companyId: string) {
  getDb()
    .prepare(
      "UPDATE companies SET pending_subscription_id = NULL, pending_plan = NULL, pending_term = NULL, pending_amount = NULL, pending_intro = 0 WHERE id = ?"
    )
    .run(companyId);
}

export type ActivationResult = {
  paidUntil: string;
  /** Suscripción anterior que debe cancelarse en MercadoPago tras el cambio de plan. */
  replacedSubscriptionId: string | null;
};

/**
 * La suscripción quedó autorizada (primera vez o tras una pausa). Si es la
 * suscripción pendiente, reemplaza a la anterior.
 *
 * El periodo inicial se concede solo una vez por suscripción y solo si no hay
 * pagos aprobados de esa suscripción: re-autorizar una suscripción vencida no
 * regala un mes.
 */
export function activateSubscription(input: {
  companyId: string;
  subscriptionId: string;
  plan: PlanId;
  term: BillingTerm;
}): ActivationResult | null {
  const db = getDb();
  const company = getCompanyById(input.companyId);
  if (!company) return null;

  const isPending = company.pending_subscription_id === input.subscriptionId;
  const replaced =
    isPending && company.subscription_id && company.subscription_id !== input.subscriptionId
      ? company.subscription_id
      : null;

  const now = new Date();
  const periodFuture = Boolean(company.paid_until && new Date(company.paid_until).getTime() > now.getTime());
  const alreadyGranted = company.last_payment_id === `auth-${input.subscriptionId}`;
  const grant = !alreadyGranted && !periodFuture && !hasApprovedPayments(input.subscriptionId);

  const paidUntil = grant ? addMonths(now, termMonths(input.term)).toISOString() : (company.paid_until ?? now.toISOString());
  const lastPaymentId = grant ? `auth-${input.subscriptionId}` : company.last_payment_id;

  db.prepare(
    `UPDATE companies SET subscription_id = ?, subscription_status = 'authorized',
       billing_status = 'active', paid_until = ?, plan = ?, billing_term = ?, last_payment_id = ?,
       subscription_amount = CASE WHEN ? = 1 THEN pending_amount ELSE subscription_amount END,
       subscription_intro = CASE WHEN ? = 1 THEN pending_intro ELSE subscription_intro END,
       pending_subscription_id = CASE WHEN ? = 1 THEN NULL ELSE pending_subscription_id END,
       pending_plan = CASE WHEN ? = 1 THEN NULL ELSE pending_plan END,
       pending_term = CASE WHEN ? = 1 THEN NULL ELSE pending_term END,
       pending_amount = CASE WHEN ? = 1 THEN NULL ELSE pending_amount END,
       pending_intro = CASE WHEN ? = 1 THEN 0 ELSE pending_intro END
     WHERE id = ?`
  ).run(
    input.subscriptionId,
    paidUntil,
    input.plan,
    input.term,
    lastPaymentId,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    isPending ? 1 : 0,
    input.companyId
  );

  logActivity(
    input.companyId,
    "pago",
    `Pago ${input.term === "yearly" ? "anual" : "mensual"} autorizado. Tu plan está activo hasta el ${new Date(
      paidUntil
    ).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}.`
  );

  if (grant) {
    const owner = db.prepare("SELECT name FROM users WHERE company_id = ? ORDER BY created_at LIMIT 1").get(input.companyId) as
      | { name: string }
      | undefined;
    notifyCompany(company, "welcome", { name: owner?.name ?? company.name }, { dedupeKey: `welcome:${input.companyId}` });
  }

  return { paidUntil, replacedSubscriptionId: replaced };
}

/**
 * Cada cobro mensual aprobado extiende el periodo desde el final del periodo
 * actual (o desde la fecha del cobro si ya venció). Solo cobros de la
 * suscripción vigente; un cobro de otra suscripción se ignora.
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
  const company = getCompanyById(input.companyId);
  if (!company) return null;
  if (company.subscription_id !== input.subscriptionId) return { paidUntil: company.paid_until, ignored: true };

  const alreadyRecorded = db.prepare("SELECT id FROM payments WHERE payment_id = ?").get(input.paymentId);
  if (alreadyRecorded) {
    return { paidUntil: company.paid_until, already: true };
  }

  const term = companyTerm(company);
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

  // Una suscripción de primer año solo debe cobrar una vez: se cierra tras su primer cobro. Un segundo
  // cobro distinto significa que no se cerró a tiempo y se cobró el monto del primer año otra vez.
  if (company.subscription_intro === 1 && hasApprovedPayments(input.subscriptionId)) {
    const message = `${company.name} (${company.id}) recibió un segundo cobro de S/ ${input.amount.toFixed(2)} en la suscripción de primer año ${input.subscriptionId}. Cierra esa suscripción en MercadoPago y revisa si corresponde reembolsar la diferencia con el precio de renovación.`;
    logActivity(company.id, "pago", "Detectamos un segundo cobro del primer año; lo estamos revisando.");
    console.error(`[billing] ${message}`);
    const alertTo = process.env.ALERT_EMAIL?.trim();
    if (alertTo) {
      enqueueEmail({
        to: alertTo,
        template: "ops_alert",
        payload: { subject: "DatosPrivados: cobro duplicado del primer año", message },
        dedupeKey: `intro-double-charge:${input.paymentId}`,
      });
    }
  }
  // El primer cobro tras la autorización ya quedó cubierto por el periodo inicial.
  const firstAfterAuthorization = company.last_payment_id === `auth-${input.subscriptionId}`;
  const paidUntil = firstAfterAuthorization
    ? company.paid_until && new Date(company.paid_until).getTime() > paidAt.getTime()
      ? company.paid_until
      : addMonths(paidAt, termMonths(term)).toISOString()
    : nextPaidUntil(company.paid_until, paidAt, termMonths(term));
  const plan = isPlanId(company.plan) ? company.plan : "basico";

  db.prepare(
    `UPDATE companies SET billing_status = 'active', paid_until = ?, last_payment_id = ?,
       subscription_status = 'authorized', plan = ?, billing_term = ?
     WHERE id = ?`
  ).run(paidUntil, input.paymentId, plan, term, input.companyId);

  const rowId = newId();
  db.prepare(
    `INSERT INTO payments
       (id, company_id, plan, term, amount, currency, status, provider, payment_id,
        external_reference, subscription_id, paid_at, raw, created_at)
     VALUES (?, ?, ?, ?, ?, 'PEN', 'approved', 'mercadopago', ?, ?, ?, ?, ?, ?)`
  ).run(
    rowId,
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

  createInvoiceForPayment(rowId);

  notifyCompany(
    company,
    "payment_receipt",
    {
      plan: PLANS[plan].name,
      amount: `S/ ${input.amount.toFixed(2)}`,
      paidUntil: new Date(paidUntil).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" }),
    },
    { dedupeKey: `receipt:${input.paymentId}` }
  );

  logActivity(
    input.companyId,
    "pago",
    `Cobro confirmado: S/ ${input.amount.toFixed(2)}. Plan activo hasta el ${new Date(
      paidUntil
    ).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}.`
  );

  return { paidUntil };
}

/**
 * Cambia el estado de una suscripción. Un evento de una suscripción anterior
 * (ya reemplazada) no afecta a la cuenta.
 */
export function markSubscriptionStatus(
  companyId: string,
  subscriptionId: string,
  status: "authorized" | "paused" | "cancelled"
) {
  const company = getCompanyById(companyId);
  if (!company) return;

  if (company.pending_subscription_id === subscriptionId && status === "cancelled") {
    clearPendingSubscription(companyId);
    logActivity(companyId, "pago", "El cambio de plan no se completó; tu plan actual sigue vigente.");
    return;
  }
  if (company.subscription_id !== subscriptionId) return;

  if (status === "cancelled") {
    // Cierre previsto del primer año: ya cobró y no debe volver a cobrar ese monto. No es una
    // cancelación del cliente, así que no se le avisa como tal. También cubre el evento de
    // MercadoPago que llega después de que lo cerramos nosotros.
    if (company.subscription_status === "completed") return;
    if (company.subscription_intro === 1 && hasApprovedPayments(subscriptionId)) {
      getDb().prepare("UPDATE companies SET subscription_status = 'completed' WHERE id = ?").run(companyId);
      const plan = planFromCompany(company);
      logActivity(
        companyId,
        "pago",
        `Tu primer año está pagado${company.paid_until ? ` hasta el ${new Date(company.paid_until).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}` : ""}. Renueva por S/ ${renewalPrice(plan)} al año desde Plan y pago, unas semanas antes de que venza.`
      );
      return;
    }
  }

  getDb()
    .prepare("UPDATE companies SET subscription_status = ? WHERE id = ?")
    .run(status, companyId);

  if (status === "cancelled") {
    notifyCompany(
      company,
      "subscription_cancelled",
      { paidUntil: company.paid_until ? new Date(company.paid_until).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" }) : "hoy" },
      { dedupeKey: `cancelled:${subscriptionId}` }
    );
  }

  const label =
    status === "cancelled"
      ? "Cancelaste la suscripción."
      : status === "paused"
        ? "Tu suscripción quedó pausada."
        : "Tu suscripción quedó activa.";
  logActivity(companyId, "pago", label);
}

export function activateDevPlan(companyId: string, plan: PlanId, term: BillingTerm = "monthly") {
  const paidUntil = addMonths(new Date(), termMonths(term)).toISOString();
  getDb()
    .prepare(
      `UPDATE companies SET plan = ?, billing_term = ?, billing_status = 'active', paid_until = ?,
         last_payment_id = ?, subscription_id = NULL, subscription_status = 'dev',
         pending_subscription_id = NULL, pending_plan = NULL, pending_term = NULL
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

/**
 * Un cobro fue reembolsado o contracargado: se descuenta del plan el periodo
 * que cubría y se anula su comprobante si aún no se emitió. Si ya se emitió,
 * queda en la actividad para que el operador emita la nota de crédito.
 * Idempotente: un cobro ya reembolsado no vuelve a descontarse.
 */
export function recordRefund(input: { providerPaymentId: string }) {
  const db = getDb();
  const payment = db.prepare("SELECT * FROM payments WHERE payment_id = ?").get(input.providerPaymentId) as unknown as
    | PaymentRow
    | undefined;
  if (!payment || payment.status !== "approved") return { refunded: false };

  const company = getCompanyById(payment.company_id);
  if (!company) return { refunded: false };

  const term = isBillingTerm(payment.term) ? payment.term : "monthly";
  db.prepare("UPDATE payments SET status = 'refunded' WHERE id = ?").run(payment.id);
  if (company.paid_until) {
    const reduced = addMonths(new Date(company.paid_until), -termMonths(term)).toISOString();
    db.prepare("UPDATE companies SET paid_until = ? WHERE id = ?").run(reduced, company.id);
  }

  const invoice = getInvoiceByPayment(payment.id);
  if (invoice?.status === "pending") voidPendingInvoice(payment.id);
  // Una factura ya emitida no se anula sola: la SUNAT exige una nota de crédito y
  // eso lo emite una persona. Queda en la cola del operador hasta que la cierre.
  const needsCreditNote = markCreditNotePending(payment.id);
  logActivity(
    company.id,
    "pago",
    needsCreditNote
      ? `Reembolsamos S/ ${payment.amount.toFixed(2)}. La factura ${invoice?.series}-${invoice?.number} requiere una nota de crédito (ver /operador).`
      : `Reembolsamos S/ ${payment.amount.toFixed(2)} y descontamos el periodo que cubría.`
  );
  notifyCompany(
    company,
    "payment_refunded",
    { plan: isPlanId(payment.plan) ? PLANS[payment.plan].name : payment.plan, amount: `S/ ${payment.amount.toFixed(2)}` },
    { dedupeKey: `refund:${payment.id}` }
  );
  return { refunded: true, needsCreditNote };
}
