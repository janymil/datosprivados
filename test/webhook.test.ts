import crypto from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({
  preapprovals: new Map<string, unknown>(),
  invoices: new Map<string, unknown>(),
}));

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return {
    ...original,
    getPreapproval: async (id: string) => mp.preapprovals.get(id),
    getAuthorizedPayment: async (id: string) => mp.invoices.get(id),
  };
});

import { getDb } from "@/lib/db";
import { isCompanyActive, setSubscriptionPending } from "@/lib/billing";
import { POST as webhook } from "@/app/api/mercadopago/webhook/route";
import { getCompanyRow, makeCompany } from "./helpers/db";

/**
 * Webhook de MercadoPago: firma, idempotencia y orden de llegada.
 *
 * MercadoPago reintenta y puede entregar eventos desordenados. Lo que no puede
 * pasar nunca es que un reintento cobre dos veces, extienda el periodo dos veces
 * o deje a un cliente que pagó sin acceso.
 */

const SECRET = "secreto-de-webhook-0123456789";
const previous = process.env.MERCADOPAGO_WEBHOOK_SECRET;

beforeEach(() => {
  mp.preapprovals.clear();
  mp.invoices.clear();
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});

afterAll(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = previous;
});

function sign(dataId: string, requestId = "req-1", ts = "1730000000") {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

let run = 0;
const nextId = () => `${run += 1}`;

/** Envía un evento como lo haría MercadoPago (tipo e id en la query). */
function send(type: string, dataId: string, options: { validSignature?: boolean } = {}) {
  const requestId = `req-${nextId()}`;
  return webhook(
    new Request(`https://x.pe/api/mercadopago/webhook?type=${type}&data.id=${dataId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
        "x-signature": options.validSignature === false ? "ts=1730000000,v1=firma-falsa" : sign(dataId, requestId),
      },
      body: JSON.stringify({ type, data: { id: dataId } }),
    })
  );
}

const preapproval = (id: string, companyId: string, status = "authorized") =>
  mp.preapprovals.set(id, {
    id,
    status,
    external_reference: companyId,
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 19, currency_id: "PEN" },
  });

const charge = (id: string, preapprovalId: string, status = "processed", paymentId = `pay-${id}`) =>
  mp.invoices.set(id, {
    id,
    preapproval_id: preapprovalId,
    status,
    transaction_amount: 19,
    date_created: new Date().toISOString(),
    payment: { id: paymentId, status },
  });


describe("webhook de MercadoPago", () => {
  it("rechaza una firma inválida sin tocar nada y sin guardar el evento", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, "sub-firma", "basico", "monthly");
    preapproval("sub-firma", companyId);

    const response = await send("subscription_preapproval", "sub-firma", { validSignature: false });
    expect(response.status).toBe(401);
    expect(getCompanyRow(companyId).billing_status).toBe("pending");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM webhook_events WHERE data_id = ?").get("sub-firma")).toEqual({ n: 0 });
  });

  it("un reintento del mismo evento no activa dos veces ni extiende el periodo", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, "sub-uno", "basico", "monthly");
    preapproval("sub-uno", companyId);

    expect((await send("subscription_preapproval", "sub-uno")).status).toBe(200);
    const afterFirst = getCompanyRow(companyId);
    expect(afterFirst.billing_status).toBe("active");
    expect(isCompanyActive(afterFirst)).toBe(true);

    // El mismo evento otra vez (MercadoPago reintenta si no recibe 200 a tiempo).
    expect((await send("subscription_preapproval", "sub-uno")).status).toBe(200);
    const afterSecond = getCompanyRow(companyId);
    expect(afterSecond.paid_until).toBe(afterFirst.paid_until);
    expect(afterSecond.billing_status).toBe("active");

    // Cada entrega queda registrada, pero el efecto es uno solo.
    const events = getDb().prepare("SELECT outcome FROM webhook_events WHERE data_id = ?").all("sub-uno") as { outcome: string }[];
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.outcome === "200")).toBe(true);
  });

  it("si el cobro llega antes que la autorización, se confirma primero y no se pierde el pago", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, "sub-desorden", "basico", "monthly");
    preapproval("sub-desorden", companyId);
    charge("inv-1", "sub-desorden");

    // Evento fuera de orden: primero el cobro, después la autorización.
    expect((await send("subscription_authorized_payment", "inv-1")).status).toBe(200);
    const afterCharge = getCompanyRow(companyId);
    expect(afterCharge.billing_status).toBe("active");
    expect(afterCharge.last_payment_id).toBe("pay-inv-1");

    // Y la autorización retrasada no rompe nada ni vuelve a regalar el mes.
    expect((await send("subscription_preapproval", "sub-desorden")).status).toBe(200);
    expect(getCompanyRow(companyId).paid_until).toBe(afterCharge.paid_until);
    expect(getCompanyRow(companyId).billing_status).toBe("active");
  });

  it("el cobro repetido no extiende el periodo otra vez", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, "sub-cobro", "basico", "monthly");
    preapproval("sub-cobro", companyId);
    charge("inv-2", "sub-cobro");

    await send("subscription_authorized_payment", "inv-2");
    const granted = getCompanyRow(companyId).paid_until;
    await send("subscription_authorized_payment", "inv-2");
    expect(getCompanyRow(companyId).paid_until).toBe(granted);
  });

  it("una pausa conserva el periodo ya pagado", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, "sub-pausa", "basico", "monthly");
    preapproval("sub-pausa", companyId);
    await send("subscription_preapproval", "sub-pausa");
    const paidUntil = getCompanyRow(companyId).paid_until;

    mp.preapprovals.set("sub-pausa", { ...(mp.preapprovals.get("sub-pausa") as object), status: "paused" });
    expect((await send("subscription_preapproval", "sub-pausa")).status).toBe(200);
    const paused = getCompanyRow(companyId);
    expect(paused.subscription_status).toBe("paused");
    expect(paused.paid_until).toBe(paidUntil);
  });

  it("un evento de una suscripción ajena se ignora sin efectos", async () => {
    const a = makeCompany();
    const b = makeCompany();
    setSubscriptionPending(a.companyId, "sub-a", "basico", "monthly");
    preapproval("sub-b", b.companyId);

    const response = await send("subscription_preapproval", "sub-b");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: true });
    expect(getCompanyRow(a.companyId).billing_status).toBe("pending");
    expect(getCompanyRow(b.companyId).billing_status).toBe("pending");
  });

  it("un evento sin tipo ni id se ignora en silencio", async () => {
    const response = await webhook(new Request("https://x.pe/api/mercadopago/webhook", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: true });
  });

  it("rechaza un cuerpo desmedido antes de leerlo", async () => {
    const response = await webhook(
      new Request("https://x.pe/api/mercadopago/webhook?type=subscription_preapproval&data.id=x", {
        method: "POST",
        headers: { "content-length": "20000" },
        body: "x",
      })
    );
    expect(response.status).toBe(413);
  });
});
