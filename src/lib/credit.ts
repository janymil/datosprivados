import "server-only";

import { getDb, type Company } from "./db";
import type { PaymentRow } from "./billing";
import type { BillingTerm } from "./plans";
import { isTransferConfigured } from "./transfers";

/**
 * Pago con factura a crédito (decisión del fundador, 14.11.2026).
 *
 * Una empresa con RUC 20 verificado en la SUNAT puede pagar el plan anual con
 * factura a 15 días: el acceso es inmediato y el fundador emite la factura a mano
 * en la SUNAT. El plazo corre desde la emisión (`due_at`); 7 días después del
 * vencimiento sin pago, la cuenta queda en solo lectura hasta confirmar el pago.
 * Es un pago `transfer` con `credit = 1` (ver src/lib/transfers.ts).
 */

export const CREDIT_DAYS = 15;
export const CREDIT_GRACE_DAYS = 7;
/** Días respecto del vencimiento en que se recuerda el pago (además del aviso de solo lectura). */
export const CREDIT_REMINDER_DAYS = [-3, 0, 3] as const;
export const CREDIT_TERMS: BillingTerm[] = ["yearly"];

const DAY = 24 * 60 * 60 * 1000;

export type CreditEligibility = { ok: true } | { ok: false; reason: string };

export function creditEligibility(company: Company): CreditEligibility {
  if (!isTransferConfigured()) return { ok: false, reason: "El pago con factura a crédito no está disponible." };
  if (company.billing_status === "demo") return { ok: false, reason: "La cuenta de demostración no puede pagar." };
  if (!company.ruc.startsWith("20") || !company.ruc_verified_at) {
    return { ok: false, reason: "El pago a crédito es solo para empresas con RUC 20 verificado en la SUNAT." };
  }
  if (getOpenCredit(company.id)) return { ok: false, reason: "Ya tienes una factura a crédito pendiente de pago." };
  if (company.subscription_id && company.subscription_status === "authorized") {
    return { ok: false, reason: "Tu cuenta ya tiene una suscripción con tarjeta. Cancélala antes de pagar por transferencia." };
  }
  return { ok: true };
}

/** Vencimiento de la factura: `CREDIT_DAYS` días desde su emisión. */
export function creditDueAt(issuedAt: string): string {
  return new Date(new Date(issuedAt).getTime() + CREDIT_DAYS * DAY).toISOString();
}

/** El crédito pendiente de pago de la empresa, si lo hay. */
export function getOpenCredit(companyId: string): PaymentRow | undefined {
  return getDb()
    .prepare("SELECT * FROM payments WHERE company_id = ? AND credit = 1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
    .get(companyId) as unknown as PaymentRow | undefined;
}

/** Solo lectura: hay un crédito sin pagar con factura emitida y pasaron `CREDIT_GRACE_DAYS` días del vencimiento. */
export function isCreditOverdue(companyId: string, now: Date = new Date()): boolean {
  const credit = getOpenCredit(companyId);
  if (!credit?.due_at) return false;
  return now.getTime() >= new Date(credit.due_at).getTime() + CREDIT_GRACE_DAYS * DAY;
}
