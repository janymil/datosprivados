"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  activateDevPlan,
  canBypassPayment,
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
import { isBillingTerm, isPlanId, planName, planPrice, type BillingTerm } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import { isDemoCompany } from "@/lib/demo";
import { requestTransfer } from "@/lib/transfers";
import { recordConsents } from "@/lib/platform-legal";
import { clientIp } from "@/lib/client-ip";

/** URL de retorno de MercadoPago. En desarrollo sin NEXT_PUBLIC_APP_URL usa el host local. */
async function requestBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NODE_ENV === "production") return siteUrl();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  return `http://${host}`;
}

/**
 * Crea una suscripción mensual o anual y redirige a MercadoPago.
 *
 * Un cambio de plan con cuenta activa no toca el plan actual: la suscripción
 * nueva queda pendiente y el webhook la activa cuando MercadoPago la autoriza.
 * La anterior se cancela entonces, nunca antes, para no perder el cobro si el
 * usuario abandona el pago.
 */
export async function startSubscriptionAction(formData: FormData) {
  const { company, user } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");
  const change = String(formData.get("change") ?? "") === "1";
  if (isCompanyActive(company) && !change) redirect("/app");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const rawTerm = String(formData.get("term") ?? company.billing_term);
  const term: BillingTerm = isBillingTerm(rawTerm) ? rawTerm : "monthly";

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
      amount: planPrice(plan, term),
      term,
      baseUrl: await requestBaseUrl(),
    });
  } catch (error) {
    console.error("[mercadopago] No se pudo crear la suscripción:", error);
    redirect("/pago?error=mp");
  }

  if (!checkout) redirect("/pago?error=mp");

  setSubscriptionPending(company.id, checkout.id, plan, term);
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
  if (!canBypassPayment()) redirect("/pago?error=dev");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const rawTerm = String(formData.get("term") ?? company.billing_term);
  const term: BillingTerm = isBillingTerm(rawTerm) ? rawTerm : "monthly";
  activateDevPlan(company.id, plan, term);

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

/** Pide pagar por transferencia: crea el pago pendiente y la factura, y muestra los datos bancarios. */
export async function requestTransferAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app?demo=lectura");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const rawTerm = String(formData.get("term") ?? company.billing_term);
  const term: BillingTerm = isBillingTerm(rawTerm) ? rawTerm : "monthly";

  // Una suscripción creada y todavía no autorizada cobraría además de la transferencia.
  if (company.pending_subscription_id) {
    if (!isMercadoPagoConfigured()) {
      redirect(`/pago?error=transfer&detail=${encodeURIComponent("No pudimos cancelar tu suscripción pendiente de MercadoPago.")}`);
    }
    try {
      await cancelPreapproval(company.pending_subscription_id);
    } catch (error) {
      console.error("[mercadopago] No se pudo cancelar la suscripción pendiente antes de la transferencia:", error);
      redirect(
        `/pago?error=transfer&detail=${encodeURIComponent("No pudimos cancelar tu suscripción pendiente de MercadoPago. Intenta de nuevo.")}`
      );
    }
    clearPendingSubscription(company.id);
  }

  const result = requestTransfer(company, plan, term);
  if (!result.ok) redirect(`/pago?error=transfer&detail=${encodeURIComponent(result.error)}`);
  redirect(`/pago?transfer=${result.reference}`);
}
