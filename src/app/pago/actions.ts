"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  activateDevPlan,
  canBypassPayment,
  canRenewNow,
  checkoutCharge,
  clearPendingSubscription,
  isCompanyActive,
  markSubscriptionStatus,
  setSubscriptionPending,
} from "@/lib/billing";
import {
  cancelPreapproval,
  createSubscriptionPreapproval,
  isMercadoPagoConfigured,
  type SubscriptionCheckout,
} from "@/lib/mercadopago";
import { isPlanId, planName, type BillingTerm } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import { isDemoCompany } from "@/lib/demo";
import { getOpenCredit } from "@/lib/credit";
import type { Company } from "@/lib/db";
import { requestCreditInvoice, requestTransfer } from "@/lib/transfers";
import { recordConsents } from "@/lib/platform-legal";
import { clientIp } from "@/lib/client-ip";

/** URL de retorno de MercadoPago. En desarrollo sin NEXT_PUBLIC_APP_URL usa el host local. */
async function requestBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NODE_ENV === "production") return siteUrl();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  return `http://${host}`;
}

/** Todo checkout nuevo es anual: el plan mensual solo sigue vigente para suscripciones que ya existían. */
const CHECKOUT_TERM: BillingTerm = "yearly";

/**
 * Crea la suscripción anual y redirige a MercadoPago. El monto es el del primer año
 * (con implementación) o, si la empresa ya pagó antes, el de renovación.
 *
 * Un cambio de plan con cuenta activa no toca el plan actual: la suscripción
 * nueva queda pendiente y el webhook la activa cuando MercadoPago la autoriza.
 * La anterior se cancela entonces, nunca antes, para no perder el cobro si el
 * usuario abandona el pago.
 */
export async function startSubscriptionAction(formData: FormData) {
  const { company, user } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");
  refuseWithOpenCredit(company.id);
  const change = String(formData.get("change") ?? "") === "1";
  // Una cuenta activa solo vuelve aquí para cambiar de plan o, a menos de 60 días del vencimiento, para renovar.
  if (isCompanyActive(company) && !change && !canRenewNow(company)) redirect("/app");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const term = CHECKOUT_TERM;
  const charge = checkoutCharge(company.id, plan);

  if (!isMercadoPagoConfigured()) {
    redirect("/pago?error=config");
  }

  recordConsents({
    userId: user.id,
    companyId: company.id,
    documents: ["terms", "privacy"],
    context: "checkout",
    ip: await clientIp(),
    userAgent: (await headers()).get("user-agent") ?? "",
  });

  // Un intento anterior que quedó sin autorizar se reemplaza por este.
  const abandonedPending = company.pending_subscription_id;

  let checkout: SubscriptionCheckout | undefined;
  try {
    checkout = await createSubscriptionPreapproval({
      companyId: company.id,
      payerEmail: user.email,
      planName: planName(plan),
      amount: charge.amount,
      term,
      baseUrl: await requestBaseUrl(),
    });
  } catch (error) {
    console.error("[mercadopago] No se pudo crear la suscripción:", error);
    redirect("/pago?error=mp");
  }

  if (!checkout) redirect("/pago?error=mp");

  setSubscriptionPending(company.id, checkout.id, plan, term, charge);
  if (abandonedPending && abandonedPending !== checkout.id) {
    await cancelPreapproval(abandonedPending).catch((error) => {
      console.error("[mercadopago] No se pudo cancelar el intento anterior:", error);
    });
  }

  redirect(checkout.initPoint);
}

export async function activateDevAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");
  refuseWithOpenCredit(company.id);
  if (!canBypassPayment()) redirect("/pago?error=dev");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  activateDevPlan(company.id, plan, CHECKOUT_TERM);

  redirect(company.onboarded_at ? "/app" : "/bienvenida");
}

/** Cancela la suscripción vigente y, si hay uno, el cambio de plan pendiente. */
export async function cancelSubscriptionAction() {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");
  if (!company.subscription_id && !company.pending_subscription_id) {
    redirect("/app/ajustes?error=cancel");
  }

  if (isMercadoPagoConfigured()) {
    try {
      if (company.subscription_id) await cancelPreapproval(company.subscription_id);
      if (company.pending_subscription_id) await cancelPreapproval(company.pending_subscription_id);
    } catch (error) {
      console.error("[mercadopago] No se pudo cancelar la suscripción:", error);
      redirect("/app/ajustes?error=cancel");
    }
  }

  if (company.subscription_id) markSubscriptionStatus(company.id, company.subscription_id, "cancelled");
  if (company.pending_subscription_id) clearPendingSubscription(company.id);
  revalidatePath("/app/ajustes");
  redirect("/app/ajustes?ok=cancel");
}

/** Con una factura a crédito abierta no se paga de otra forma: se paga esa factura (ver /pago). */
function refuseWithOpenCredit(companyId: string) {
  if (getOpenCredit(companyId)) redirect("/pago");
}

/** Una suscripción creada y todavía no autorizada cobraría además de la transferencia: se cancela antes. */
async function cancelPendingSubscription(company: Company, errorKey: "transfer" | "credit") {
  if (!company.pending_subscription_id) return;
  if (!isMercadoPagoConfigured()) {
    redirect(`/pago?error=${errorKey}&detail=${encodeURIComponent("No pudimos cancelar tu suscripción pendiente de MercadoPago.")}`);
  }
  try {
    await cancelPreapproval(company.pending_subscription_id);
  } catch (error) {
    console.error("[mercadopago] No se pudo cancelar la suscripción pendiente antes de la transferencia:", error);
    redirect(`/pago?error=${errorKey}&detail=${encodeURIComponent("No pudimos cancelar tu suscripción pendiente de MercadoPago. Intenta de nuevo.")}`);
  }
  clearPendingSubscription(company.id);
}

/** Pide pagar por transferencia: crea el pago pendiente y la factura, y muestra los datos bancarios. */
export async function requestTransferAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");
  refuseWithOpenCredit(company.id);

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  await cancelPendingSubscription(company, "transfer");

  const result = requestTransfer(company, plan, CHECKOUT_TERM);
  if (!result.ok) redirect(`/pago?error=transfer&detail=${encodeURIComponent(result.error)}`);
  redirect(`/pago?transfer=${result.reference}`);
}

/** Pago con factura a crédito (empresas con RUC 20): acceso inmediato; la factura se emite a mano. */
export async function requestCreditAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  await cancelPendingSubscription(company, "credit");

  const result = requestCreditInvoice(company, plan);
  if (!result.ok) redirect(`/pago?error=credit&detail=${encodeURIComponent(result.error)}`);
  redirect("/app?credito=ok");
}
