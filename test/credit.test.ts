import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb, newId, nowIso } from "@/lib/db";
import { creditDueAt, creditEligibility, getOpenCredit, isCreditOverdue, CREDIT_GRACE_DAYS } from "@/lib/credit";
import { getCompanyById } from "@/lib/billing";
import { makeCompany } from "./helpers/db";

const DAY = 24 * 60 * 60 * 1000;
const original = { ...process.env };

beforeEach(() => {
  process.env.TRANSFER_BANK_DETAILS = "BCP · Semantika TECH · 191-0000000-0-00 · CCI 002-191-000000000000-00";
});
afterEach(() => {
  process.env = { ...original };
});

/** Empresa con RUC 20 verificado en la SUNAT (lo que exige el crédito). */
function business(over: Record<string, unknown> = {}) {
  const { companyId } = makeCompany({ ruc: "20601030013", ...over });
  getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
  return getCompanyById(companyId)!;
}

function openCredit(companyId: string, dueAt: string | null) {
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO payments (id, company_id, plan, term, amount, currency, status, provider, external_reference, credit, due_at, created_at)
       VALUES (?, ?, 'basico', 'yearly', 190, 'PEN', 'pending', 'transfer', 'DP-ABC123', 1, ?, ?)`
    )
    .run(id, companyId, dueAt, nowIso());
  return id;
}

describe("pago con factura a crédito: reglas", () => {
  it("elegible: RUC 20 verificado y transferencia configurada", () => {
    expect(creditEligibility(business())).toEqual({ ok: true });
  });

  it("no elegible, con su motivo", () => {
    delete process.env.TRANSFER_BANK_DETAILS;
    expect(creditEligibility(business())).toEqual({ ok: false, reason: "El pago con factura a crédito no está disponible." });
    process.env.TRANSFER_BANK_DETAILS = "BCP";

    expect(creditEligibility(business({ billing_status: "demo" }))).toEqual({ ok: false, reason: "La cuenta de demostración no puede pagar." });

    const rucDiez = business({ ruc: "10456789012" });
    expect(creditEligibility(rucDiez)).toEqual({ ok: false, reason: "El pago a crédito es solo para empresas con RUC 20 verificado en la SUNAT." });

    const { companyId } = makeCompany({ ruc: "20601030013" }); // sin ruc_verified_at
    expect(creditEligibility(getCompanyById(companyId)!).ok).toBe(false);

    const withCredit = business();
    openCredit(withCredit.id, null);
    expect(creditEligibility(withCredit)).toEqual({ ok: false, reason: "Ya tienes una factura a crédito pendiente de pago." });

    const card = business({ subscription_id: "pre-1", subscription_status: "authorized" });
    expect(creditEligibility(card)).toEqual({
      ok: false,
      reason: "Tu cuenta ya tiene una suscripción con tarjeta. Cancélala antes de pagar por transferencia.",
    });
  });

  it("creditDueAt suma 15 días", () => {
    expect(creditDueAt("2026-11-14T15:00:00.000Z")).toBe("2026-11-29T15:00:00.000Z");
  });

  it("sin factura emitida (due_at null) nunca está vencida", () => {
    const company = business();
    openCredit(company.id, null);
    expect(getOpenCredit(company.id)?.due_at).toBeNull();
    expect(isCreditOverdue(company.id, new Date(Date.now() + 365 * DAY))).toBe(false);
  });

  it("vencida solo desde due_at + 7 días", () => {
    const company = business();
    const due = new Date("2026-11-29T15:00:00.000Z");
    openCredit(company.id, due.toISOString());
    expect(CREDIT_GRACE_DAYS).toBe(7);
    expect(isCreditOverdue(company.id, new Date(due.getTime() + 7 * DAY - 60 * 60 * 1000))).toBe(false);
    expect(isCreditOverdue(company.id, new Date(due.getTime() + 7 * DAY))).toBe(true);
  });

  it("un pago ya confirmado no cuenta como crédito abierto", () => {
    const company = business();
    const id = openCredit(company.id, new Date(Date.now() - 30 * DAY).toISOString());
    getDb().prepare("UPDATE payments SET status = 'approved' WHERE id = ?").run(id);
    expect(getOpenCredit(company.id)).toBeUndefined();
    expect(isCreditOverdue(company.id)).toBe(false);
  });

  it("la migración agrega credit y due_at con valores por defecto", () => {
    const { companyId } = makeCompany();
    const id = newId();
    getDb()
      .prepare(`INSERT INTO payments (id, company_id, plan, term, amount, status, provider, created_at) VALUES (?, ?, 'basico', 'monthly', 19, 'pending', 'mercadopago', ?)`)
      .run(id, companyId, nowIso());
    expect(getDb().prepare("SELECT credit, due_at FROM payments WHERE id = ?").get(id)).toEqual({ credit: 0, due_at: null });
  });
});
