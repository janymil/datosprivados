import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import PagoPage from "@/app/pago/page";
import OperatorPage from "@/app/operador/page";
import { activateDevAction, requestCreditAction, requestTransferAction, startSubscriptionAction } from "@/app/pago/actions";
import { createSession } from "@/lib/auth";
import { getCompanyById } from "@/lib/billing";
import { getOpenCredit } from "@/lib/credit";
import { getDb, nowIso } from "@/lib/db";
import { requestCreditInvoice } from "@/lib/transfers";
import { makeActiveCompany, makeCompany } from "./helpers/db";
import { jar } from "./helpers/next";

const DAY = 24 * 60 * 60 * 1000;
const original = { ...process.env };
const html = async (page: Promise<React.ReactElement>) => renderToStaticMarkup(await page);
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

async function loginBusiness(ruc = "20601030013") {
  const { companyId, userId } = makeCompany({ ruc });
  getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
  jar.store.clear();
  await createSession(userId);
  return companyId;
}

beforeEach(() => {
  jar.store.clear();
  process.env.TRANSFER_BANK_DETAILS = "BCP · Semantika TECH · CCI 002-191-000000000000-00";
});
afterEach(() => {
  process.env = { ...original };
});

describe("/pago: factura a crédito", () => {
  it("muestra la opción solo a una empresa con RUC 20 verificado", async () => {
    await loginBusiness();
    expect(await html(PagoPage({ searchParams: Promise.resolve({}) }))).toContain("Pagar con factura a 15 días (empresas)");
    await loginBusiness("10456789012");
    expect(await html(PagoPage({ searchParams: Promise.resolve({}) }))).not.toContain("Pagar con factura a 15 días");
  });

  it("requestCreditAction activa la cuenta y lleva a /app?credito=ok", async () => {
    const companyId = await loginBusiness();
    await expect(requestCreditAction(form({ plan: "basico" }))).rejects.toThrow("REDIRECT:/app?credito=ok");
    expect(getCompanyById(companyId)!.billing_status).toBe("active");
    expect(getOpenCredit(companyId)).toBeDefined();
  });

  it("con un crédito abierto no se puede pagar con tarjeta, transferencia ni modo desarrollo (ni con ?change=1)", async () => {
    const companyId = await loginBusiness();
    requestCreditInvoice(getCompanyById(companyId)!, "basico");
    const page = await html(PagoPage({ searchParams: Promise.resolve({ change: "1" }) }));
    expect(page).toContain("Factura a crédito pendiente");
    expect(page).not.toContain("Prefiero pagar por transferencia");
    for (const action of [startSubscriptionAction, requestTransferAction, activateDevAction]) {
      await expect(action(form({ plan: "pro", change: "1" }))).rejects.toThrow("REDIRECT:/pago");
    }
    expect(getOpenCredit(companyId)).toBeDefined();
  });

  it("con un crédito abierto, /pago muestra cómo pagarlo en vez de redirigir al panel", async () => {
    const companyId = await loginBusiness();
    requestCreditInvoice(getCompanyById(companyId)!, "basico");
    const page = await html(PagoPage({ searchParams: Promise.resolve({}) }));
    expect(page).toContain("Factura a crédito pendiente");
    expect(page).toContain(getOpenCredit(companyId)!.external_reference!);
    expect(page).toContain("CCI 002-191-000000000000-00");
  });
});

describe("/operador: créditos por cobrar", () => {
  beforeEach(async () => {
    const email = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
    process.env.OPERATOR_EMAILS = email;
  });

  it("marca el crédito con su vencimiento, «sin emitir» y «VENCIDA»", async () => {
    const companyId = await loginBusiness();
    requestCreditInvoice(getCompanyById(companyId)!, "basico");
    const credit = getOpenCredit(companyId)!;

    jar.store.clear();
    await createSession(makeActiveCompany({ email: process.env.OPERATOR_EMAILS }).userId);
    let page = await html(OperatorPage({ searchParams: Promise.resolve({}) }));
    expect(page).toContain("Crédito");
    expect(page).toContain("factura sin emitir");

    getDb().prepare("UPDATE payments SET due_at = ? WHERE id = ?").run(new Date(Date.now() - 8 * DAY).toISOString(), credit.id);
    page = await html(OperatorPage({ searchParams: Promise.resolve({}) }));
    expect(page).toContain("VENCIDA");
  });
});
