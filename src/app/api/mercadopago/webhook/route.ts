import {
  companyTerm,
  getCompanyById,
  getCompanyBySubscriptionId,
  markSubscriptionStatus,
  planFromCompany,
  recordRefund,
  recordSubscriptionCharge,
} from "@/lib/billing";
import { confirmAuthorizedSubscription } from "@/lib/subscriptions";
import { getAuthorizedPayment, getPreapproval, validateMercadoPagoSignature } from "@/lib/mercadopago";
import { planName, planPrice } from "@/lib/plans";
import { notifyCompany } from "@/lib/notify";
import { getDb, newId, nowIso } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

type WebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function isPaid(status: string | undefined) {
  return status === "approved" || status === "processed";
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const url = new URL(request.url);
  let body: WebhookBody = {};
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
    body = text ? (JSON.parse(text) as WebhookBody) : {};
  } catch {
    // MercadoPago también puede enviar solo query params.
  }

  const type = url.searchParams.get("type") ?? body.type;
  const dataId = url.searchParams.get("data.id") ?? String(body.data?.id ?? "");

  if (!type || !dataId) {
    return Response.json({ ok: true, ignored: true });
  }

  // La firma se valida antes de consultar nada, con el id que llegó en la petición.
  const valid = validateMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const eventId = newId();
  getDb()
    .prepare(
      "INSERT INTO webhook_events (id, provider, type, data_id, request_id, payload, received_at) VALUES (?, 'mercadopago', ?, ?, ?, ?, ?)"
    )
    .run(eventId, type, dataId, request.headers.get("x-request-id"), JSON.stringify(body).slice(0, 4000), nowIso());

  try {
    const response = await handleEvent(type, dataId);
    getDb()
      .prepare("UPDATE webhook_events SET processed_at = ?, outcome = ? WHERE id = ?")
      .run(nowIso(), String(response.status), eventId);
    return response;
  } catch (error) {
    console.error("[mercadopago] Error en webhook:", error);
    getDb()
      .prepare("UPDATE webhook_events SET processed_at = ?, outcome = '500', error = ? WHERE id = ?")
      .run(nowIso(), String(error instanceof Error ? error.message : error).slice(0, 400), eventId);
    return Response.json({ ok: false }, { status: 500 });
  }
}

async function handleEvent(type: string, dataId: string): Promise<Response> {
  if (type === "subscription_preapproval") {
    const preapproval = await getPreapproval(dataId);
    const company = preapproval.external_reference ? getCompanyById(preapproval.external_reference) : undefined;

    // Solo la suscripción actual o la pendiente de la empresa cambian su estado.
    const linked =
      company && (company.subscription_id === dataId || company.pending_subscription_id === dataId);
    if (!company || !linked) {
      return Response.json({ ok: true, ignored: true, type });
    }

    if (preapproval.status === "authorized") {
      const result = await confirmAuthorizedSubscription(dataId);
      if (!result.ok) {
        console.warn(`[mercadopago] Autorización no aplicada: ${result.reason}`);
      }
      return Response.json({ ok: result.ok, type, status: preapproval.status });
    }

    if (preapproval.status === "cancelled" || preapproval.status === "canceled") {
      markSubscriptionStatus(company.id, dataId, "cancelled");
    } else if (preapproval.status === "paused") {
      markSubscriptionStatus(company.id, dataId, "paused");
    }

    return Response.json({ ok: true, type, status: preapproval.status });
  }

  if (type === "subscription_authorized_payment") {
    const invoice = await getAuthorizedPayment(dataId);
    const subscriptionId = invoice.preapproval_id ?? "";
    const company = subscriptionId ? getCompanyBySubscriptionId(subscriptionId) : undefined;
    if (!company) {
      return Response.json({ ok: true, ignored: true, type });
    }

    const paymentStatus = invoice.payment?.status ?? invoice.status;
    if (isPaid(paymentStatus)) {
      // Un cobro de la suscripción pendiente implica que ya fue autorizada:
      // se confirma primero (con verificación) y luego se registra el cobro.
      if (company.pending_subscription_id === subscriptionId) {
        const confirmed = await confirmAuthorizedSubscription(subscriptionId);
        if (!confirmed.ok) {
          // 500 para que MercadoPago reintente más tarde.
          return Response.json({ ok: false, error: confirmed.reason }, { status: 500 });
        }
      }
      recordSubscriptionCharge({
        companyId: company.id,
        subscriptionId,
        paymentId: String(invoice.payment?.id ?? invoice.id),
        amount: invoice.transaction_amount ?? planPrice(planFromCompany(company), companyTerm(company)),
        paidAt: invoice.date_created ?? new Date().toISOString(),
        raw: JSON.stringify(invoice),
      });
    }

    if (paymentStatus === "refunded" || paymentStatus === "charged_back") {
      recordRefund({ providerPaymentId: String(invoice.payment?.id ?? invoice.id) });
    }

    if (paymentStatus === "rejected" && company.subscription_id === subscriptionId) {
      notifyCompany(company, "payment_failed", { plan: planName(planFromCompany(company)) }, { dedupeKey: `failed:${dataId}` });
    }

    return Response.json({ ok: true, type, status: paymentStatus });
  }

  // Los eventos de pago simple no extienden la suscripción por sí solos.
  return Response.json({ ok: true, ignored: true, type });
}

export async function GET() {
  return Response.json({ ok: true });
}
