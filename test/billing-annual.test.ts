import crypto from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({
  preapprovals: new Map<string, Record<string, unknown>>(),
  invoices: new Map<string, unknown>(),
  cancelled: [] as string[],
  cancelFails: false,
}));

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return {
    ...original,
    isMercadoPagoConfigured: () => true,
    getPreapproval: async (id: string) => mp.preapprovals.get(id),
    getAuthorizedPayment: async (id: string) => mp.invoices.get(id),
    cancelPreapproval: async (id: string) => {
      if (mp.cancelFails) throw new Error("MercadoPago no responde");
      mp.cancelled.push(id);
      mp.preapprovals.set(id, { ...mp.preapprovals.get(id), id, status: "cancelled" });
      return { id, status: "cancelled" };
    },
  };
});

import { getDb } from "@/lib/db";
import {
  billingLabel,
  canRenewNow,
  checkoutCharge,
  hasApprovedPayment,
  markSubscriptionStatus,
  recordSubscriptionCharge,
  setSubscriptionPending,
} from "@/lib/billing";
import { PLANS, firstYearPrice, renewalPrice } from "@/lib/plans";
import { confirmAuthorizedSubscription } from "@/lib/subscriptions";
import { POST as webhook } from "@/app/api/mercadopago/webhook/route";
import { runJob } from "@/lib/jobs";
import { getPendingTransfer, requestTransfer } from "@/lib/transfers";
import { getCompanyRow, makeCompany } from "./helpers/db";

/**
 * Modelo anual: el primer año incluye la implementación y la renovación cuesta menos.
 *
 * Lo que no puede pasar: cobrar el monto del primer año por segunda vez, rechazar una
 * suscripción legítima porque cambió la lista de precios, o decirle al cliente que
 * «canceló» cuando solo se cerró el primer año previsto.
 */

const SECRET = "secreto-de-webhook-0123456789";
const previousSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
const DAY = 24 * 60 * 60 * 1000;

let run = 0;
const S = (name: string) => `${name}-a${run}`;

beforeEach(() => {
  run += 1;
  mp.preapprovals.clear();
  mp.invoices.clear();
  mp.cancelled.length = 0;
  mp.cancelFails = false;
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});

afterAll(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = previousSecret;
});

function send(type: string, dataId: string) {
  const requestId = `req-${crypto.randomUUID()}`;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:1730000000;`;
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  return webhook(
    new Request(`https://x.pe/api/mercadopago/webhook?type=${type}&data.id=${dataId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=1730000000,v1=${v1}` },
      body: JSON.stringify({ type, data: { id: dataId } }),
    })
  );
}

const preapproval = (id: string, companyId: string, amount: number, status = "authorized") =>
  mp.preapprovals.set(id, {
    id,
    status,
    external_reference: companyId,
    auto_recurring: { frequency: 12, frequency_type: "months", transaction_amount: amount, currency_id: "PEN" },
  });

const charge = (id: string, preapprovalId: string, amount: number) =>
  mp.invoices.set(id, {
    id,
    preapproval_id: preapprovalId,
    status: "processed",
    transaction_amount: amount,
    date_created: new Date().toISOString(),
    payment: { id: `pay-${id}`, status: "approved" },
  });

const emails = (companyId: string) =>
  (getDb().prepare("SELECT template FROM email_outbox WHERE company_id = ?").all(companyId) as { template: string }[]).map(
    (row) => row.template
  );

describe("precio de primer año y de renovación", () => {
  it("los planes cumplen lo acordado: la renovación cuesta menos que el primer año", () => {
    expect([firstYearPrice("basico"), renewalPrice("basico")]).toEqual([290, 120]);
    expect([firstYearPrice("pro"), renewalPrice("pro")]).toEqual([390, 190]);
    for (const plan of Object.values(PLANS)) expect(plan.renewal).toBeLessThan(plan.prices.yearly);
  });

  it("cobra el primer año a quien nunca pagó y la renovación a quien ya pagó", () => {
    const { companyId } = makeCompany();
    expect(hasApprovedPayment(companyId)).toBe(false);
    expect(checkoutCharge(companyId, "basico")).toEqual({ amount: 290, intro: true });
    expect(checkoutCharge(companyId, "pro")).toEqual({ amount: 390, intro: true });

    setSubscriptionPending(companyId, S("sub"), "basico", "yearly", { amount: 290, intro: true });
    preapproval(S("sub"), companyId, 290);
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 290 });
    // sin activar la suscripción el cobro se ignora: hace falta que sea la vigente
    expect(hasApprovedPayment(companyId)).toBe(false);
  });
});

describe("el monto se valida contra lo acordado, no contra la lista de precios de hoy", () => {
  it("acepta el monto acordado y rechaza cualquier otro", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub"), "basico", "yearly", { amount: 250, intro: false });

    preapproval(S("sub"), companyId, 290);
    const wrong = await confirmAuthorizedSubscription(S("sub"));
    expect(wrong.ok).toBe(false);
    expect(wrong.ok === false && wrong.reason).toMatch(/monto/);

    preapproval(S("sub"), companyId, 250);
    expect((await confirmAuthorizedSubscription(S("sub"))).ok).toBe(true);
    expect(getCompanyRow(companyId)).toMatchObject({ subscription_amount: 250, pending_amount: null });
  });

  it("una re-autorización posterior sigue pasando aunque el precio de lista sea otro", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub"), "basico", "yearly", { amount: 250, intro: false });
    preapproval(S("sub"), companyId, 250);
    expect((await confirmAuthorizedSubscription(S("sub"))).ok).toBe(true);
    expect((await confirmAuthorizedSubscription(S("sub"))).ok).toBe(true);
  });

  it("una suscripción anterior sin monto guardado usa el precio del plan", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub"), "basico", "monthly");
    mp.preapprovals.set(S("sub"), {
      id: S("sub"),
      status: "authorized",
      external_reference: companyId,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 19, currency_id: "PEN" },
    });
    expect((await confirmAuthorizedSubscription(S("sub"))).ok).toBe(true);
  });
});

describe("el primer año se cobra una vez y se cierra", () => {
  async function payFirstYear(plan: "basico" | "pro" = "basico") {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const amount = firstYearPrice(plan);
    const sub = S("sub-y1");
    setSubscriptionPending(companyId, sub, plan, "yearly", checkoutCharge(companyId, plan));
    preapproval(sub, companyId, amount);
    expect((await send("subscription_preapproval", sub)).status).toBe(200);
    charge(S("inv-1"), sub, amount);
    return { companyId, sub, amount };
  }

  it("tras el primer cobro cierra la suscripción en MercadoPago, sin avisar de una cancelación", async () => {
    const { companyId, sub, amount } = await payFirstYear();
    const after = getCompanyRow(companyId);
    expect(after).toMatchObject({ subscription_amount: amount, subscription_intro: 1, billing_status: "active" });

    expect((await send("subscription_authorized_payment", S("inv-1"))).status).toBe(200);
    expect(mp.cancelled).toEqual([sub]);
    const done = getCompanyRow(companyId);
    expect(done.subscription_status).toBe("completed");
    expect(billingLabel(done)).toBe("Plan anual activo");
    expect(emails(companyId)).not.toContain("subscription_cancelled");

    const payments = getDb().prepare("SELECT amount, status FROM payments WHERE company_id = ?").all(companyId);
    expect(payments).toEqual([{ amount: 290, status: "approved" }]);
    expect(hasApprovedPayment(companyId)).toBe(true);
    expect(checkoutCharge(companyId, "basico")).toEqual({ amount: 120, intro: false });
  });

  it("si MercadoPago no deja cerrarla responde 500 y el reintento la cierra sin duplicar el cobro", async () => {
    const { companyId, sub } = await payFirstYear();
    mp.cancelFails = true;
    expect((await send("subscription_authorized_payment", S("inv-1"))).status).toBe(500);
    expect(getCompanyRow(companyId).subscription_status).toBe("authorized");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM payments WHERE company_id = ?").get(companyId)).toEqual({ n: 1 });

    mp.cancelFails = false;
    expect((await send("subscription_authorized_payment", S("inv-1"))).status).toBe(200);
    expect(mp.cancelled).toEqual([sub]);
    expect(getCompanyRow(companyId).subscription_status).toBe("completed");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM payments WHERE company_id = ?").get(companyId)).toEqual({ n: 1 });
  });

  it("el evento de cancelación que MercadoPago envía después no cambia nada ni escribe al cliente", async () => {
    const { companyId, sub } = await payFirstYear();
    await send("subscription_authorized_payment", S("inv-1"));
    preapproval(sub, companyId, 290, "cancelled");
    expect((await send("subscription_preapproval", sub)).status).toBe(200);
    expect(getCompanyRow(companyId).subscription_status).toBe("completed");
    expect(emails(companyId)).not.toContain("subscription_cancelled");
  });

  it("cancelar un primer año ya pagado no manda el correo de cancelación", async () => {
    const { companyId, sub } = await payFirstYear();
    mp.cancelFails = true; // el cierre automático falla…
    await send("subscription_authorized_payment", S("inv-1"));
    markSubscriptionStatus(companyId, sub, "cancelled"); // …y el cliente cancela a mano
    expect(getCompanyRow(companyId).subscription_status).toBe("completed");
    expect(emails(companyId)).not.toContain("subscription_cancelled");
  });

  it("un primer año sin cobrar que se cancela sí es una cancelación normal", async () => {
    const { companyId } = makeCompany({ billing_status: "pending" });
    setSubscriptionPending(companyId, S("sub"), "basico", "yearly", { amount: 290, intro: true });
    preapproval(S("sub"), companyId, 290);
    await send("subscription_preapproval", S("sub"));
    markSubscriptionStatus(companyId, S("sub"), "cancelled");
    expect(getCompanyRow(companyId).subscription_status).toBe("cancelled");
    expect(emails(companyId)).toContain("subscription_cancelled");
  });
});

describe("renovación", () => {
  async function firstYearDone() {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const sub = S("sub-y1");
    setSubscriptionPending(companyId, sub, "basico", "yearly", checkoutCharge(companyId, "basico"));
    preapproval(sub, companyId, 290);
    await send("subscription_preapproval", sub);
    charge(S("inv-1"), sub, 290);
    await send("subscription_authorized_payment", S("inv-1"));
    return { companyId, sub };
  }

  it("solo se puede renovar a menos de 60 días del vencimiento y sin una suscripción que se renueve sola", async () => {
    const { companyId } = await firstYearDone();
    expect(canRenewNow(getCompanyRow(companyId))).toBe(false); // faltan ~365 días

    getDb().prepare("UPDATE companies SET paid_until = ? WHERE id = ?").run(new Date(Date.now() + 40 * DAY).toISOString(), companyId);
    expect(canRenewNow(getCompanyRow(companyId))).toBe(true);

    getDb().prepare("UPDATE companies SET subscription_status = 'authorized', subscription_intro = 0 WHERE id = ?").run(companyId);
    expect(canRenewNow(getCompanyRow(companyId))).toBe(false); // ya se renueva sola
  });

  it("renovar a tiempo suma 12 meses al plazo actual, al precio de renovación, y esa suscripción sigue sola", async () => {
    const { companyId } = await firstYearDone();
    const expires = new Date(Date.now() + 20 * DAY);
    getDb().prepare("UPDATE companies SET paid_until = ? WHERE id = ?").run(expires.toISOString(), companyId);

    const renewal = checkoutCharge(companyId, "basico");
    expect(renewal).toEqual({ amount: 120, intro: false });
    const sub = S("sub-r1");
    setSubscriptionPending(companyId, sub, "basico", "yearly", renewal);
    preapproval(sub, companyId, 120);
    expect((await send("subscription_preapproval", sub)).status).toBe(200);
    // Autorizar no regala tiempo: el periodo sigue siendo el que ya estaba pagado.
    expect(getCompanyRow(companyId).paid_until).toBe(expires.toISOString());

    charge(S("inv-2"), sub, 120);
    expect((await send("subscription_authorized_payment", S("inv-2"))).status).toBe(200);
    const renewed = getCompanyRow(companyId);
    const extra = new Date(renewed.paid_until!).getTime() - expires.getTime();
    expect(extra).toBeGreaterThan(364 * DAY);
    expect(extra).toBeLessThan(367 * DAY);
    expect(renewed).toMatchObject({ subscription_id: sub, subscription_amount: 120, subscription_intro: 0, subscription_status: "authorized" });
    // La renovación NO se cierra: es la que se cobra sola cada año.
    expect(mp.cancelled).not.toContain(sub);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM payments WHERE company_id = ?").get(companyId)).toEqual({ n: 2 });
  });
});

describe("transferencia", () => {
  it("el primer año y la renovación también se cobran distinto por transferencia", async () => {
    process.env.TRANSFER_BANK_DETAILS = "Banco X · Cuenta 123";
    const first = makeCompany({ billing_status: "pending" });
    expect(requestTransfer(getCompanyRow(first.companyId), "basico", "yearly").ok).toBe(true);
    expect(getPendingTransfer(first.companyId)).toMatchObject({ amount: 290 });

    // Una empresa que ya pagó con tarjeta y cerró su primer año renueva por transferencia al precio de renovación.
    const { companyId } = makeCompany({ billing_status: "pending" });
    const sub = S("sub-t");
    setSubscriptionPending(companyId, sub, "basico", "yearly", checkoutCharge(companyId, "basico"));
    preapproval(sub, companyId, 290);
    await send("subscription_preapproval", sub);
    charge(S("inv-t"), sub, 290);
    await send("subscription_authorized_payment", S("inv-t"));
    expect(requestTransfer(getCompanyRow(companyId), "basico", "yearly").ok).toBe(true);
    expect(getPendingTransfer(companyId)).toMatchObject({ amount: 120 });
  });
});

describe("red de seguridad del primer año", () => {
  const ALERT = "ops@example.com";
  const previousAlert = process.env.ALERT_EMAIL;
  const alerts = () =>
    (getDb().prepare("SELECT payload FROM email_outbox WHERE template = 'ops_alert' AND to_email = ?").all(ALERT) as { payload: string }[]).map(
      (row) => JSON.parse(row.payload) as { subject: string; message: string }
    );

  beforeEach(() => {
    process.env.ALERT_EMAIL = ALERT;
    getDb().prepare("DELETE FROM email_outbox WHERE to_email = ?").run(ALERT);
  });
  afterAll(() => {
    if (previousAlert === undefined) delete process.env.ALERT_EMAIL;
    else process.env.ALERT_EMAIL = previousAlert;
  });

  async function firstYearUnclosed() {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const sub = S("sub-b");
    setSubscriptionPending(companyId, sub, "basico", "yearly", checkoutCharge(companyId, "basico"));
    preapproval(sub, companyId, 290);
    await send("subscription_preapproval", sub);
    charge(S("inv-b1"), sub, 290);
    mp.cancelFails = true;
    expect((await send("subscription_authorized_payment", S("inv-b1"))).status).toBe(500);
    return { companyId, sub };
  }

  it("el job reintenta el cierre que falló y deja la suscripción completada", async () => {
    const { companyId, sub } = await firstYearUnclosed();
    expect(getCompanyRow(companyId).subscription_status).toBe("authorized");

    mp.cancelFails = false;
    const outcome = await runJob("billing-reconcile", new Date());
    expect(outcome.status).toBe("ok");
    expect(mp.cancelled).toContain(sub);
    expect(getCompanyRow(companyId).subscription_status).toBe("completed");
    expect(emails(companyId)).not.toContain("subscription_cancelled");
  });

  it("si el cierre sigue fallando, avisa al operador con la empresa y la suscripción", async () => {
    const { companyId, sub } = await firstYearUnclosed();
    const outcome = await runJob("billing-reconcile", new Date());
    expect(outcome.status).toBe("ok");
    expect(getCompanyRow(companyId).subscription_status).toBe("authorized");
    const sentAlerts = alerts();
    expect(sentAlerts.length).toBeGreaterThan(0);
    expect(sentAlerts.map((a) => a.message).join(" ")).toContain(sub);
  });

  it("avisa de un primer año autorizado hace días sin ningún cobro aprobado", async () => {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const sub = S("sub-c");
    setSubscriptionPending(companyId, sub, "basico", "yearly", checkoutCharge(companyId, "basico"));
    preapproval(sub, companyId, 290);
    await send("subscription_preapproval", sub);
    expect(getCompanyRow(companyId).subscription_status).toBe("authorized");

    await runJob("billing-reconcile", new Date());
    expect(alerts().map((a) => a.message).join(" ")).not.toContain(sub); // recién autorizado: todavía es pronto

    await runJob("billing-reconcile", new Date(Date.now() + 5 * DAY));
    expect(alerts().map((a) => a.message).join(" ")).toContain(sub);
  });

  it("un segundo cobro de la suscripción de primer año dispara una alerta de cobro duplicado", async () => {
    const { companyId, sub } = await firstYearUnclosed();
    charge(S("inv-b2"), sub, 290);
    await send("subscription_authorized_payment", S("inv-b2"));
    const subjects = alerts().map((a) => a.subject);
    expect(subjects).toContain("DatosPrivados: cobro duplicado del primer año");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM activity WHERE company_id = ? AND message LIKE '%segundo cobro%'").get(companyId)).toEqual({ n: 1 });
  });
});

describe("avisos de renovación", () => {
  const NOW = new Date("2026-11-04T17:00:00Z");
  const sent = (companyId: string) =>
    (getDb().prepare("SELECT template, payload FROM email_outbox WHERE company_id = ? AND template = 'renewal_manual'").all(companyId) as {
      template: string;
      payload: string;
    }[]);

  it("avisa a los 30 y a los 7 días, una vez cada vez, con el precio de renovación", async () => {
    const { companyId } = makeCompany({
      billing_status: "active",
      subscription_id: S("sub"),
      subscription_status: "completed",
      plan: "pro",
      paid_until: new Date(NOW.getTime() + 25 * DAY).toISOString(),
    });
    await runJob("billing-reconcile", NOW);
    await runJob("billing-reconcile", NOW);
    expect(sent(companyId)).toHaveLength(1);
    expect(JSON.parse(sent(companyId)[0].payload).amount).toBe("S/ 190");

    await runJob("billing-reconcile", new Date(NOW.getTime() + 19 * DAY)); // quedan 6 días
    await runJob("billing-reconcile", new Date(NOW.getTime() + 19 * DAY));
    expect(sent(companyId)).toHaveLength(2);
  });

  it("no avisa con más de 30 días de margen", async () => {
    const { companyId } = makeCompany({
      billing_status: "active",
      subscription_id: S("sub"),
      subscription_status: "completed",
      paid_until: new Date(NOW.getTime() + 90 * DAY).toISOString(),
    });
    await runJob("billing-reconcile", NOW);
    expect(sent(companyId)).toHaveLength(0);
  });

  it("una suscripción que se renueva sola no recibe este aviso", async () => {
    const { companyId } = makeCompany({
      billing_status: "active",
      subscription_id: S("sub"),
      subscription_status: "authorized",
      paid_until: new Date(NOW.getTime() + 2 * DAY).toISOString(),
    });
    await runJob("billing-reconcile", NOW);
    expect(sent(companyId)).toHaveLength(0);
  });
});
