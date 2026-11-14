import "server-only";

import crypto from "node:crypto";
import { getDb, newId, nowIso, type Company } from "./db";
import { logActivity } from "./data";
import { checkoutCharge, getCompanyById, nextPaidUntil, type PaymentRow } from "./billing";
import { CREDIT_DAYS, creditEligibility, getOpenCredit } from "./credit";
import { createInvoiceForPayment, formatSol } from "./invoicing";
import { notifyCompany } from "./notify";
import { PLANS, planPrice, termMonths, type BillingTerm, type PlanId } from "./plans";

/**
 * Pago por transferencia bancaria contra factura.
 *
 * El cliente pide pagar por transferencia: se crea un pago `pending` (proveedor
 * `transfer`) con una referencia, un comprobante pendiente y un correo con los
 * datos bancarios. El operador emite la factura y, cuando llega el dinero,
 * confirma el pago: recién entonces se activa o renueva el plan.
 *
 * Los datos bancarios salen de TRANSFER_BANK_DETAILS (texto libre: banco,
 * titular, cuenta y CCI).
 */

export function transferBankDetails() {
  return process.env.TRANSFER_BANK_DETAILS?.trim() ?? "";
}

export function isTransferConfigured() {
  return transferBankDetails().length > 0;
}

export function listPendingTransfers() {
  return getDb()
    .prepare(
      `SELECT p.*, c.name AS company_name, c.ruc AS company_ruc
       FROM payments p JOIN companies c ON c.id = p.company_id
       WHERE p.provider = 'transfer' AND p.status = 'pending' ORDER BY p.created_at`
    )
    .all() as unknown as Array<PaymentRow & { company_name: string; company_ruc: string }>;
}

export function getPendingTransfer(companyId: string) {
  return getDb()
    .prepare("SELECT * FROM payments WHERE company_id = ? AND provider = 'transfer' AND status = 'pending' AND credit = 0 ORDER BY created_at DESC LIMIT 1")
    .get(companyId) as unknown as PaymentRow | undefined;
}

export type TransferRequestResult = { ok: true; reference: string } | { ok: false; error: string };

export function requestTransfer(company: Company, plan: PlanId, term: BillingTerm): TransferRequestResult {
  if (!isTransferConfigured()) return { ok: false, error: "El pago por transferencia no está disponible." };
  if (company.billing_status === "demo") return { ok: false, error: "La cuenta de demostración no puede pagar." };
  // Un crédito abierto se paga con su propia referencia; otra transferencia no lo reemplaza (si no, regalaría el año).
  if (getOpenCredit(company.id)) return { ok: false, error: "Ya tienes una factura a crédito pendiente: págala por transferencia con su referencia." };
  // Con una suscripción de MercadoPago vigente, una transferencia cobraría dos veces.
  if (company.subscription_id && company.subscription_status === "authorized") {
    return { ok: false, error: "Tu cuenta ya tiene una suscripción con tarjeta. Cancélala antes de pagar por transferencia." };
  }

  const db = getDb();
  const open = getPendingTransfer(company.id);
  if (open) db.prepare("UPDATE payments SET status = 'cancelled' WHERE id = ?").run(open.id);

  // Anual: primer año o renovación según el historial de pagos; mensual: solo suscripciones antiguas.
  const amount = term === "yearly" ? checkoutCharge(company.id, plan).amount : planPrice(plan, term);
  const reference = `DP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const id = newId();
  db.prepare(
    `INSERT INTO payments (id, company_id, plan, term, amount, currency, status, provider, external_reference, created_at)
     VALUES (?, ?, ?, ?, ?, 'PEN', 'pending', 'transfer', ?, ?)`
  ).run(id, company.id, plan, term, amount, reference, nowIso());
  if (open) db.prepare("UPDATE invoices SET status = 'void' WHERE payment_id = ? AND status = 'pending'").run(open.id);
  createInvoiceForPayment(id);

  logActivity(company.id, "pago", `Pediste pagar el Plan ${PLANS[plan].name} (${term === "yearly" ? "anual" : "mensual"}) por transferencia. Referencia ${reference}.`);
  notifyCompany(
    company,
    "transfer_instructions",
    { plan: PLANS[plan].name, amount: formatSol(amount), reference, bankDetails: transferBankDetails() },
    { dedupeKey: `transfer:${id}` }
  );
  return { ok: true, reference };
}

/**
 * Pago con factura a crédito (src/lib/credit.ts): el plan anual se activa al pedirlo;
 * el fundador emite la factura a mano y el plazo de 15 días corre desde la emisión.
 */
export function requestCreditInvoice(company: Company, plan: PlanId): TransferRequestResult {
  const eligibility = creditEligibility(company);
  if (!eligibility.ok) return { ok: false, error: eligibility.reason };

  const db = getDb();
  // Una transferencia normal pendiente se reemplaza por el crédito (como al pedir otra transferencia).
  const open = getPendingTransfer(company.id);
  if (open) {
    db.prepare("UPDATE payments SET status = 'cancelled' WHERE id = ?").run(open.id);
    db.prepare("UPDATE invoices SET status = 'void' WHERE payment_id = ? AND status = 'pending'").run(open.id);
  }

  const term: BillingTerm = "yearly";
  const amount = checkoutCharge(company.id, plan).amount;
  const reference = `DP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const id = newId();
  const now = new Date();
  db.prepare(
    `INSERT INTO payments (id, company_id, plan, term, amount, currency, status, provider, external_reference, credit, created_at)
     VALUES (?, ?, ?, ?, ?, 'PEN', 'pending', 'transfer', ?, 1, ?)`
  ).run(id, company.id, plan, term, amount, reference, now.toISOString());
  createInvoiceForPayment(id);

  // Acceso inmediato por el año completo; confirmar el pago después no lo extiende otra vez.
  const paidUntil = nextPaidUntil(company.paid_until, now, termMonths(term));
  db.prepare("UPDATE companies SET billing_status = 'active', paid_until = ?, plan = ?, billing_term = ? WHERE id = ?").run(
    paidUntil,
    plan,
    term,
    company.id
  );

  logActivity(company.id, "pago", `Elegiste pagar el Plan ${PLANS[plan].name} (anual) con factura a ${CREDIT_DAYS} días. Referencia ${reference}.`);
  notifyCompany(
    company,
    "credit_invoice_requested",
    { plan: PLANS[plan].name, amount: formatSol(amount), reference, bankDetails: transferBankDetails(), days: String(CREDIT_DAYS) },
    { dedupeKey: `credit:${id}:requested` }
  );
  return { ok: true, reference };
}

export type ConfirmTransferResult = { ok: true; paidUntil: string } | { ok: false; error: string };

/** El operador confirma que llegó el dinero. Idempotente: un pago ya confirmado no se aplica dos veces. */
export function confirmTransferPaid(paymentRowId: string, operation: string): ConfirmTransferResult {
  const db = getDb();
  const reference = operation.trim().slice(0, 60);
  if (!reference) return { ok: false, error: "Indica el número de operación del banco." };

  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(paymentRowId) as unknown as PaymentRow | undefined;
  if (!payment || payment.provider !== "transfer") return { ok: false, error: "Pago no encontrado." };
  if (payment.status !== "pending") return { ok: false, error: "Este pago ya fue confirmado o cancelado." };

  const company = getCompanyById(payment.company_id);
  if (!company) return { ok: false, error: "Empresa no encontrada." };

  const providerId = `transfer-${reference}`;
  if (db.prepare("SELECT 1 FROM payments WHERE payment_id = ?").get(providerId)) {
    return { ok: false, error: "Ese número de operación ya se usó en otro pago." };
  }

  const term = payment.term === "yearly" ? "yearly" : "monthly";
  const paidAt = new Date();
  // Crédito: el periodo ya se otorgó al pedirlo; confirmar solo registra el cobro.
  const isCredit = payment.credit === 1;
  const paidUntil = isCredit && company.paid_until ? company.paid_until : nextPaidUntil(company.paid_until, paidAt, termMonths(term));

  db.prepare("UPDATE payments SET status = 'approved', payment_id = ?, paid_at = ? WHERE id = ? AND status = 'pending'").run(
    providerId,
    paidAt.toISOString(),
    payment.id
  );
  // La suscripción de tarjeta anterior quedó cancelada o pausada (si siguiera
  // autorizada, `requestTransfer` no habría dejado pedir la transferencia).
  const staleSubscription = Boolean(company.subscription_id) && company.subscription_status !== "authorized";

  db.prepare(
    `UPDATE companies SET billing_status = 'active', paid_until = ?, plan = ?, billing_term = ?, last_payment_id = ? WHERE id = ?`
  ).run(paidUntil, payment.plan, term, providerId, company.id);
  if (staleSubscription) {
    // Sin esto la cuenta seguiría diciendo «Suscripción cancelada» y ofreciendo cancelarla.
    db.prepare("UPDATE companies SET subscription_id = NULL, subscription_status = NULL WHERE id = ?").run(company.id);
  }
  createInvoiceForPayment(payment.id);

  const when = new Date(paidUntil).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" });
  logActivity(company.id, "pago", `Recibimos tu transferencia de ${formatSol(payment.amount)}. Plan activo hasta el ${when}.`);
  notifyCompany(
    company,
    "payment_receipt",
    { plan: PLANS[payment.plan as PlanId]?.name ?? payment.plan, amount: formatSol(payment.amount), paidUntil: when },
    { dedupeKey: `receipt:${providerId}` }
  );
  return { ok: true, paidUntil };
}
