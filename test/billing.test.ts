import { beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({
  preapprovals: new Map<string, unknown>(),
  cancelled: [] as string[],
}));

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return {
    ...original,
    getPreapproval: async (id: string) => mp.preapprovals.get(id),
    cancelPreapproval: async (id: string) => {
      mp.cancelled.push(id);
    },
  };
});

import { getDb } from "@/lib/db";
import {
  addMonths,
  isCompanyActive,
  markSubscriptionStatus,
  recordSubscriptionCharge,
  setSubscriptionPending,
} from "@/lib/billing";
import { confirmAuthorizedSubscription } from "@/lib/subscriptions";
import { getCompanyRow, makeCompany } from "./helpers/db";

function preapproval(id: string, companyId: string, amount: number, months = 1, status = "authorized") {
  mp.preapprovals.set(id, {
    id,
    status,
    external_reference: companyId,
    auto_recurring: { frequency: months, frequency_type: "months", transaction_amount: amount, currency_id: "PEN" },
  });
}

const DAY = 24 * 60 * 60 * 1000;

// Los ids de MercadoPago son únicos; cada prueba usa los suyos para no cruzarse en la misma base.
let run = 0;
const S = (name: string) => `${name}-t${run}`;

beforeEach(() => {
  run += 1;
  mp.preapprovals.clear();
  mp.cancelled.length = 0;
});

describe("alta de suscripción nueva", () => {
  it("activa al autorizarse y es idempotente ante repeticiones", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub-1"), "basico", "monthly");
    expect(isCompanyActive(getCompanyRow(companyId))).toBe(false);

    preapproval(S("sub-1"), companyId, 19);
    const first = await confirmAuthorizedSubscription(S("sub-1"));
    expect(first.ok).toBe(true);
    const after = getCompanyRow(companyId);
    expect(after.billing_status).toBe("active");
    expect(after.subscription_id).toBe(S("sub-1"));
    expect(after.pending_subscription_id).toBeNull();
    expect(isCompanyActive(after)).toBe(true);

    await confirmAuthorizedSubscription(S("sub-1"));
    expect(getCompanyRow(companyId).paid_until).toBe(after.paid_until);
  });

  it("el primer cobro tras la autorización no extiende el periodo; el segundo sí", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub-1"), "basico", "monthly");
    preapproval(S("sub-1"), companyId, 19);
    await confirmAuthorizedSubscription(S("sub-1"));
    const granted = getCompanyRow(companyId).paid_until!;

    recordSubscriptionCharge({ companyId, subscriptionId: S("sub-1"), paymentId: S("pay-1"), amount: 19 });
    expect(getCompanyRow(companyId).paid_until).toBe(granted);

    recordSubscriptionCharge({ companyId, subscriptionId: S("sub-1"), paymentId: S("pay-2"), amount: 19 });
    expect(getCompanyRow(companyId).paid_until).toBe(addMonths(new Date(granted), 1).toISOString());

    // El mismo cobro repetido no extiende otra vez.
    const before = getCompanyRow(companyId).paid_until;
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub-1"), paymentId: S("pay-2"), amount: 19 });
    expect(getCompanyRow(companyId).paid_until).toBe(before);
  });

  it("rechaza una suscripción con monto distinto al del plan pedido", async () => {
    const { companyId } = makeCompany();
    setSubscriptionPending(companyId, S("sub-1"), "pro", "monthly");
    preapproval(S("sub-1"), companyId, 1);
    const result = await confirmAuthorizedSubscription(S("sub-1"));
    expect(result.ok).toBe(false);
    expect(getCompanyRow(companyId).billing_status).toBe("pending");
  });

  it("rechaza una suscripción que pertenece a otra empresa", async () => {
    const a = makeCompany();
    const b = makeCompany();
    setSubscriptionPending(a.companyId, S("sub-a"), "basico", "monthly");
    preapproval(S("sub-a"), b.companyId, 19);
    const result = await confirmAuthorizedSubscription(S("sub-a"));
    expect(result.ok).toBe(false);
    expect(getCompanyRow(a.companyId).billing_status).toBe("pending");
    expect(getCompanyRow(b.companyId).billing_status).toBe("pending");
  });

  it("no activa un id que nadie pidió", async () => {
    const { companyId } = makeCompany();
    preapproval(S("ajena"), companyId, 19);
    expect((await confirmAuthorizedSubscription(S("ajena"))).ok).toBe(false);
    expect(getCompanyRow(companyId).billing_status).toBe("pending");
  });
});

describe("cambio de plan con cuenta activa", () => {
  function activeCompany() {
    const paidUntil = new Date(Date.now() + 10 * DAY).toISOString();
    return makeCompany({
      billing_status: "active",
      plan: "basico",
      paid_until: paidUntil,
      subscription_id: S("old"),
      subscription_status: "authorized",
      last_payment_id: S("pay-old"),
    });
  }

  it("no cambia el plan hasta que se autoriza la nueva", () => {
    const { companyId } = activeCompany();
    setSubscriptionPending(companyId, S("new"), "pro", "monthly");
    const row = getCompanyRow(companyId);
    expect(row.plan).toBe("basico");
    expect(row.subscription_id).toBe(S("old"));
    expect(row.pending_subscription_id).toBe(S("new"));
    expect(isCompanyActive(row)).toBe(true);
  });

  it("al autorizarse cambia el plan, conserva el periodo y cancela la anterior", async () => {
    const { companyId } = activeCompany();
    const periodBefore = getCompanyRow(companyId).paid_until;
    setSubscriptionPending(companyId, S("new"), "pro", "monthly");
    preapproval(S("new"), companyId, 39);
    const result = await confirmAuthorizedSubscription(S("new"));
    expect(result.ok).toBe(true);
    const row = getCompanyRow(companyId);
    expect(row.plan).toBe("pro");
    expect(row.subscription_id).toBe(S("new"));
    expect(row.pending_subscription_id).toBeNull();
    expect(row.paid_until).toBe(periodBefore);
    expect(mp.cancelled).toEqual([S("old")]);
  });

  it("si se abandona el pago, el plan y la suscripción actuales siguen igual", () => {
    const { companyId } = activeCompany();
    setSubscriptionPending(companyId, S("new"), "pro", "monthly");
    markSubscriptionStatus(companyId, S("new"), "cancelled");
    const row = getCompanyRow(companyId);
    expect(row.plan).toBe("basico");
    expect(row.subscription_id).toBe(S("old"));
    expect(row.pending_subscription_id).toBeNull();
  });

  it("el evento de cancelación de la suscripción reemplazada no toca la cuenta", async () => {
    const { companyId } = activeCompany();
    setSubscriptionPending(companyId, S("new"), "pro", "monthly");
    preapproval(S("new"), companyId, 39);
    await confirmAuthorizedSubscription(S("new"));
    markSubscriptionStatus(companyId, S("old"), "cancelled");
    expect(getCompanyRow(companyId).subscription_status).toBe("authorized");
  });

  it("un cobro de la suscripción reemplazada se ignora", async () => {
    const { companyId } = activeCompany();
    setSubscriptionPending(companyId, S("new"), "pro", "monthly");
    preapproval(S("new"), companyId, 39);
    await confirmAuthorizedSubscription(S("new"));
    const before = getCompanyRow(companyId).paid_until;
    recordSubscriptionCharge({ companyId, subscriptionId: S("old"), paymentId: S("pay-late"), amount: 19 });
    expect(getCompanyRow(companyId).paid_until).toBe(before);
    expect(getDb().prepare("SELECT 1 FROM payments WHERE payment_id = ?").get(S("pay-late"))).toBeUndefined();
  });
});

describe("re-autorización de una suscripción vencida", () => {
  it("no regala un periodo nuevo si ya tuvo pagos", async () => {
    const { companyId } = makeCompany({
      billing_status: "active",
      paid_until: new Date(Date.now() - 2 * DAY).toISOString(),
      subscription_id: S("sub-1"),
      subscription_status: "paused",
      last_payment_id: S("pay-1"),
    });
    getDb()
      .prepare(
        `INSERT INTO payments (id, company_id, plan, term, amount, status, payment_id, subscription_id, created_at)
         VALUES (?, ?, 'basico', 'monthly', 19, 'approved', ?, ?, ?)`
      )
      .run(S("p"), companyId, S("pay-1"), S("sub-1"), new Date().toISOString());
    preapproval(S("sub-1"), companyId, 19);
    const before = getCompanyRow(companyId).paid_until;
    const result = await confirmAuthorizedSubscription(S("sub-1"));
    expect(result.ok).toBe(true);
    expect(getCompanyRow(companyId).paid_until).toBe(before);
    expect(isCompanyActive(getCompanyRow(companyId))).toBe(false);
  });
});
