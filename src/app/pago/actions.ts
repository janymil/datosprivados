"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  activateDevPlan,
  canBypassPayment,
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

async function requestBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Crea una suscripción mensual (preapproval) y redirige a MercadoPago.
 * Si la cuenta ya está activa y el usuario cambia de plan, primero cancelamos
 * la suscripción anterior para no cobrar dos veces.
 */
export async function startSubscriptionAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  const change = String(formData.get("change") ?? "") === "1";
  if (isCompanyActive(company) && !change) redirect("/app");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const rawTerm = String(formData.get("term") ?? company.billing_term);
  const term: BillingTerm = isBillingTerm(rawTerm) ? rawTerm : "monthly";

  if (!isMercadoPagoConfigured()) {
    redirect("/pago?error=config");
  }

  if (company.subscription_id && company.subscription_status !== "cancelled") {
    try {
      await cancelPreapproval(company.subscription_id);
      markSubscriptionStatus(company.id, "cancelled");
    } catch (error) {
      console.error("[mercadopago] No se pudo cancelar la suscripción anterior:", error);
      redirect("/pago?error=cancel");
    }
  }

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
    setSubscriptionPending(company.id, checkout.id, plan, term);
  } catch (error) {
    console.error("[mercadopago] No se pudo crear la suscripción:", error);
    redirect("/pago?error=mp");
  }

  if (!checkout) redirect("/pago?error=mp");
  redirect(checkout.initPoint);
}

export async function activateDevAction(formData: FormData) {
  const { company } = await requireRole("admin");
  if (!canBypassPayment()) redirect("/pago?error=dev");

  const rawPlan = String(formData.get("plan") ?? company.plan);
  const plan = isPlanId(rawPlan) ? rawPlan : "basico";
  const rawTerm = String(formData.get("term") ?? company.billing_term);
  const term: BillingTerm = isBillingTerm(rawTerm) ? rawTerm : "monthly";
  activateDevPlan(company.id, plan, term);

  redirect(company.onboarded_at ? "/app" : "/bienvenida");
}

export async function cancelSubscriptionAction() {
  const { company } = await requireRole("admin");
  if (!company.subscription_id) {
    redirect("/app/ajustes?error=cancel");
  }

  if (isMercadoPagoConfigured()) {
    try {
      await cancelPreapproval(company.subscription_id);
    } catch (error) {
      console.error("[mercadopago] No se pudo cancelar la suscripción:", error);
      redirect("/app/ajustes?error=cancel");
    }
  }

  markSubscriptionStatus(company.id, "cancelled");
  revalidatePath("/app/ajustes");
  redirect("/app/ajustes?ok=cancel");
}
