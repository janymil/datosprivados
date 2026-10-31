import {
  activateSubscription,
  companyTerm,
  getCompanyBySubscriptionId,
  markSubscriptionStatus,
  recordSubscriptionCharge,
} from "@/lib/billing";
import {
  getAuthorizedPayment,
  getPreapproval,
  validateMercadoPagoSignature,
} from "@/lib/mercadopago";
import { planPrice } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function isPaid(status: string | undefined) {
  return status === "approved" || status === "processed";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: WebhookBody = {};
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    // MercadoPago también puede enviar solo query params.
  }

  const type = url.searchParams.get("type") ?? body.type;
  const dataId = url.searchParams.get("data.id") ?? String(body.data?.id ?? "");

  if (!type || !dataId) {
    return Response.json({ ok: true, ignored: true });
  }

  const valid = validateMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    if (type === "subscription_preapproval") {
      const preapproval = await getPreapproval(dataId);
      const companyId =
        preapproval.external_reference ||
        getCompanyBySubscriptionId(dataId)?.id ||
        "";

      if (!companyId) {
        return Response.json({ ok: false, error: "Suscripción sin empresa." }, { status: 200 });
      }

      if (preapproval.status === "authorized") {
        activateSubscription({ companyId, subscriptionId: dataId });
      } else if (
        preapproval.status === "paused" ||
        preapproval.status === "cancelled" ||
        preapproval.status === "canceled"
      ) {
        markSubscriptionStatus(companyId, preapproval.status === "paused" ? "paused" : "cancelled");
      }

      return Response.json({ ok: true, type, status: preapproval.status });
    }

    if (type === "subscription_authorized_payment") {
      const invoice = await getAuthorizedPayment(dataId);
      const subscriptionId = invoice.preapproval_id ?? "";
      const company = subscriptionId ? getCompanyBySubscriptionId(subscriptionId) : undefined;
      if (!company) {
        return Response.json({ ok: false, error: "Cobro sin suscripción." }, { status: 200 });
      }

      const paymentStatus = invoice.payment?.status ?? invoice.status;
      if (isPaid(paymentStatus)) {
        recordSubscriptionCharge({
          companyId: company.id,
          subscriptionId,
          paymentId: String(invoice.payment?.id ?? invoice.id),
          amount: invoice.transaction_amount ?? planPrice(company.plan, companyTerm(company)),
          paidAt: invoice.date_created ?? new Date().toISOString(),
          raw: JSON.stringify(invoice),
        });
      }

      return Response.json({ ok: true, type, status: paymentStatus });
    }

    // Los eventos de pago simple no extienden la suscripción por sí solos.
    return Response.json({ ok: true, ignored: true, type });
  } catch (error) {
    console.error("[mercadopago] Error en webhook:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true });
}
