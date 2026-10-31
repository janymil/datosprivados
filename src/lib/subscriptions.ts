import "server-only";

import { activateSubscription, getCompanyBySubscriptionId, planFromCompany, companyTerm } from "./billing";
import { logActivity } from "./data";
import { cancelPreapproval, getPreapproval, preapprovalMismatch } from "./mercadopago";
import { isBillingTerm, isPlanId, planPrice, type BillingTerm, type PlanId } from "./plans";

export type ConfirmResult =
  | { ok: true; paidUntil: string; replacedSubscriptionId: string | null }
  | { ok: false; reason: string; status?: string };

/**
 * Confirma con MercadoPago una suscripción que el usuario ya autorizó.
 *
 * Es la única ruta que activa o cambia un plan: la usan el webhook y la página
 * de retorno. Nunca toma el identificador de la URL: se consulta a MercadoPago
 * y se compara con la empresa, el monto y la frecuencia esperados.
 */
export async function confirmAuthorizedSubscription(subscriptionId: string): Promise<ConfirmResult> {
  const preapproval = await getPreapproval(subscriptionId);
  if (preapproval.status !== "authorized") {
    return { ok: false, reason: `La suscripción está en estado «${preapproval.status}».`, status: preapproval.status };
  }

  const company = getCompanyBySubscriptionId(subscriptionId);
  if (!company || !preapproval.external_reference || company.id !== preapproval.external_reference) {
    return { ok: false, reason: "La suscripción no está vinculada a esta empresa." };
  }

  const isPending = company.pending_subscription_id === subscriptionId;
  const plan: PlanId = isPending && isPlanId(company.pending_plan ?? "") ? (company.pending_plan as PlanId) : planFromCompany(company);
  const term: BillingTerm =
    isPending && isBillingTerm(company.pending_term ?? "") ? (company.pending_term as BillingTerm) : companyTerm(company);

  const mismatch = preapprovalMismatch(preapproval, {
    companyId: company.id,
    amount: planPrice(plan, term),
    term,
  });
  if (mismatch) {
    logActivity(company.id, "pago", `Rechazamos una suscripción que no coincide con tu plan: ${mismatch}`);
    return { ok: false, reason: mismatch };
  }

  const activated = activateSubscription({ companyId: company.id, subscriptionId, plan, term });
  if (!activated) return { ok: false, reason: "Empresa no encontrada." };

  if (activated.replacedSubscriptionId) {
    try {
      await cancelPreapproval(activated.replacedSubscriptionId);
    } catch (error) {
      // La suscripción nueva ya está activa; la anterior queda para revisar en
      // la conciliación. No se revierte el cambio por esto.
      console.error("[mercadopago] No se pudo cancelar la suscripción reemplazada:", error);
    }
  }

  return { ok: true, paidUntil: activated.paidUntil, replacedSubscriptionId: activated.replacedSubscriptionId };
}
