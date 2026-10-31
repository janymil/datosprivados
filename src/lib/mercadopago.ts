import "server-only";

import crypto from "node:crypto";
import type { BillingTerm } from "./plans";

/**
 * Suscripciones recurrentes con MercadoPago.
 *
 * Flujo "sin plan asociado, con pago pendiente":
 * POST /preapproval con status "pending" y auto_recurring → init_point.
 * El usuario autoriza en MercadoPago; el webhook subscription_preapproval
 * confirma la suscripción y subscription_authorized_payment confirma cada cobro.
 *
 * No usamos SDK: son llamadas REST con el access token del servidor.
 */

/** Se puede apuntar a un servidor simulado (pruebas E2E) con MERCADOPAGO_API_BASE. */
const API = (process.env.MERCADOPAGO_API_BASE || "https://api.mercadopago.com").replace(/\/$/, "");

export type MercadoPagoPreapproval = {
  id: string;
  status: string;
  external_reference?: string | null;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  next_payment_date?: string | null;
  payer_id?: number | string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
};

export type MercadoPagoAuthorizedPayment = {
  id: number | string;
  preapproval_id?: string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  payment?: {
    id?: number | string;
    status?: string;
  } | null;
  date_created?: string;
  last_modified?: string;
};

export type SubscriptionCheckout = {
  id: string;
  initPoint: string;
};

function accessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "";
}

export function isMercadoPagoConfigured() {
  return accessToken().length > 0;
}

export function isMercadoPagoSandbox() {
  return process.env.MERCADOPAGO_SANDBOX === "1" || accessToken().startsWith("TEST-");
}

async function mpFetch(path: string, init?: RequestInit) {
  const token = accessToken();
  if (!token) throw new Error("MercadoPago no está configurado.");

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`MercadoPago ${response.status}: ${detail}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export async function createSubscriptionPreapproval(input: {
  companyId: string;
  payerEmail: string;
  planName: string;
  amount: number;
  term: BillingTerm;
  baseUrl: string;
}): Promise<SubscriptionCheckout> {
  const termName = input.term === "yearly" ? "anual" : "mensual";
  const data = await mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `DatosPrivados ${input.planName} — suscripción ${termName}`,
      external_reference: input.companyId,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: input.term === "yearly" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "PEN",
      },
      back_url: `${input.baseUrl}/pago/resultado`,
      status: "pending",
    }),
  });

  const id = typeof data.id === "string" ? data.id : "";
  const initPoint =
    (isMercadoPagoSandbox() ? data.sandbox_init_point : data.init_point) ??
    data.init_point ??
    data.sandbox_init_point;

  if (!id || typeof initPoint !== "string") {
    throw new Error("MercadoPago no devolvió una URL de suscripción.");
  }

  return { id, initPoint };
}

export async function getPreapproval(id: string): Promise<MercadoPagoPreapproval> {
  return (await mpFetch(`/preapproval/${encodeURIComponent(id)}`)) as unknown as MercadoPagoPreapproval;
}

export async function cancelPreapproval(id: string) {
  try {
    return (await mpFetch(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    })) as unknown as MercadoPagoPreapproval;
  } catch {
    // MercadoPago usa "canceled" en algunas versiones de la API.
    return (await mpFetch(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "canceled" }),
    })) as unknown as MercadoPagoPreapproval;
  }
}

export async function getAuthorizedPayment(id: string): Promise<MercadoPagoAuthorizedPayment> {
  return (await mpFetch(
    `/authorized_payments/${encodeURIComponent(id)}`
  )) as unknown as MercadoPagoAuthorizedPayment;
}

/**
 * Comprueba que una suscripción de MercadoPago corresponde a lo que la empresa
 * pidió: misma empresa (external_reference), mismo monto, moneda y frecuencia.
 * Devuelve el motivo del rechazo, o null si todo coincide.
 */
export function preapprovalMismatch(
  preapproval: MercadoPagoPreapproval,
  expected: { companyId: string; amount: number; term: BillingTerm }
): string | null {
  if (preapproval.external_reference !== expected.companyId) {
    return "La suscripción no pertenece a esta empresa.";
  }
  const recurring = preapproval.auto_recurring;
  if (Number(recurring?.transaction_amount) !== expected.amount) {
    return "El monto de la suscripción no coincide con el plan.";
  }
  if (recurring?.currency_id !== "PEN") {
    return "La moneda de la suscripción no es soles.";
  }
  const months = expected.term === "yearly" ? 12 : 1;
  if (Number(recurring?.frequency) !== months || recurring?.frequency_type !== "months") {
    return "La frecuencia de la suscripción no coincide con el plan.";
  }
  return null;
}

/**
 * Valida el header x-signature de MercadoPago. En producción el secreto es
 * obligatorio: sin él se rechaza todo (fallo cerrado). En desarrollo, sin
 * secreto, se acepta para poder probar el flujo.
 */
export function validateMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!input.signature || !input.requestId || !input.dataId) return false;

  const parts = Object.fromEntries(
    input.signature
      .split(",")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
