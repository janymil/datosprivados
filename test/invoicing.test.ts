import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return { ...original, getPreapproval: async () => ({ status: "authorized" }) };
});

import { getDb } from "@/lib/db";
import { addMonths, billingLabel, nextPaidUntil, recordRefund, recordSubscriptionCharge } from "@/lib/billing";
import { getInvoiceByPayment, isSafePdfUrl, markInvoiceIssued, splitIgv } from "@/lib/invoicing";
import { closeCreditNote, listCreditNotes } from "@/lib/invoicing";
import { PLANS } from "@/lib/plans";
import { confirmTransferPaid, getPendingTransfer, requestTransfer } from "@/lib/transfers";
import { isOperatorEmail, isOperatorUser } from "@/lib/operator";
import { getCompanyRow, makeCompany } from "./helpers/db";
import type { Company } from "@/lib/db";

let run = 0;
const S = (name: string) => `${name}-i${run}`;

beforeEach(() => {
  run += 1;
  process.env.TRANSFER_BANK_DETAILS = "Banco X · Titular DatosPrivados SAC · CCI 00212345678901234567";
});

const outboxFor = (companyId: string) =>
  getDb().prepare("SELECT template FROM email_outbox WHERE company_id = ?").all(companyId) as { template: string }[];

function subscribed() {
  const { companyId } = makeCompany({
    billing_status: "active",
    paid_until: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    subscription_id: S("sub"),
    subscription_status: "authorized",
    last_payment_id: null,
  });
  return companyId;
}

describe("IGV", () => {
  it("separa base e IGV de un precio con IGV incluido", () => {
    expect(splitIgv(19)).toEqual({ base: 16.1, igv: 2.9, total: 19 });
    expect(splitIgv(390)).toEqual({ base: 330.51, igv: 59.49, total: 390 });
  });

  it("para cada precio del catálogo, base + IGV suma el total al céntimo", () => {
    // Se leen los precios reales: si cambia la lista, esta prueba lo cubre sola.
    const prices = Object.values(PLANS).flatMap((plan) => [plan.prices.monthly, plan.prices.yearly]);
    expect(prices.length).toBeGreaterThanOrEqual(4);
    for (const price of prices) {
      const { base, igv, total } = splitIgv(price);
      expect(Math.round((base + igv) * 100) / 100, String(price)).toBe(total);
      expect(total, String(price)).toBe(Math.round(price * 100) / 100);
      // El IGV es el 18 % de la base, con el redondeo al céntimo.
      expect(Math.round(igv * 100), String(price)).toBe(Math.round(base * 0.18 * 100));
      expect(base + igv - total, String(price)).toBeLessThan(0.005);
    }
  });
});

describe("meses de calendario", () => {
  it("31 de enero + 1 mes cae a fin de febrero, no en marzo", () => {
    expect(addMonths(new Date("2027-01-31T10:00:00Z"), 1).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe("2028-02-29T10:00:00.000Z");
  });
  it("un año son 12 meses exactos", () => {
    expect(addMonths(new Date("2026-11-15T10:00:00Z"), 12).toISOString()).toBe("2027-11-15T10:00:00.000Z");
    expect(nextPaidUntil(null, new Date("2026-11-15T10:00:00Z"), 12)).toBe("2027-11-15T10:00:00.000Z");
  });
});

describe("comprobante de un cobro con tarjeta", () => {
  it("se crea pendiente, una sola vez, con los datos fiscales y el desglose", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 39 });
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 39 });

    const rows = getDb().prepare("SELECT * FROM invoices WHERE company_id = ?").all(companyId) as unknown as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "pending", doc_type: "factura", buyer_ruc: "20604567891", total: 39, base_amount: 33.05, igv_amount: 5.95 });
  });

  it("al registrarse el comprobante se envía al cliente y no se puede emitir dos veces", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 19 });
    const payment = getDb().prepare("SELECT id FROM payments WHERE payment_id = ?").get(S("pay")) as { id: string };
    const invoice = getInvoiceByPayment(payment.id)!;

    expect(markInvoiceIssued(invoice.id, { series: "f001", number: "42", pdfUrl: "https://x.pe/f.pdf" })).toEqual({ ok: true });
    const issued = getInvoiceByPayment(payment.id)!;
    expect(issued).toMatchObject({ status: "issued", series: "F001", number: "42" });
    expect(outboxFor(companyId).map((m) => m.template)).toContain("invoice_issued");

    const again = markInvoiceIssued(invoice.id, { series: "F001", number: "43", pdfUrl: "" });
    expect(again.ok).toBe(false);
  });

  it("valida serie, número, enlace y duplicados", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 19 });
    const payment = getDb().prepare("SELECT id FROM payments WHERE payment_id = ?").get(S("pay")) as { id: string };
    const invoice = getInvoiceByPayment(payment.id)!;

    expect(markInvoiceIssued(invoice.id, { series: "X1", number: "1", pdfUrl: "" }).ok).toBe(false);
    expect(markInvoiceIssued(invoice.id, { series: "F001", number: "abc", pdfUrl: "" }).ok).toBe(false);
    expect(markInvoiceIssued(invoice.id, { series: "F001", number: "1", pdfUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(isSafePdfUrl("http://x.pe/a.pdf")).toBe(false);
    expect(getInvoiceByPayment(payment.id)!.status).toBe("pending");
  });
});

describe("reembolso", () => {
  it("descuenta el periodo, anula la factura pendiente y es idempotente", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 19 });
    const before = getCompanyRow(companyId).paid_until!;

    expect(recordRefund({ providerPaymentId: S("pay") }).refunded).toBe(true);
    expect(getCompanyRow(companyId).paid_until).toBe(addMonths(new Date(before), -1).toISOString());
    const payment = getDb().prepare("SELECT id, status FROM payments WHERE payment_id = ?").get(S("pay")) as { id: string; status: string };
    expect(payment.status).toBe("refunded");
    expect(getInvoiceByPayment(payment.id)!.status).toBe("void");

    const after = getCompanyRow(companyId).paid_until;
    expect(recordRefund({ providerPaymentId: S("pay") }).refunded).toBe(false);
    expect(getCompanyRow(companyId).paid_until).toBe(after);
  });

  it("si la factura ya se emitió, queda en la cola de nota de crédito del operador", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 19 });
    const payment = getDb().prepare("SELECT id FROM payments WHERE payment_id = ?").get(S("pay")) as { id: string };
    const invoiceId = getInvoiceByPayment(payment.id)!.id;
    expect(markInvoiceIssued(invoiceId, { series: "F001", number: String(100 + run), pdfUrl: "" }).ok).toBe(true);

    expect(recordRefund({ providerPaymentId: S("pay") })).toMatchObject({ refunded: true, needsCreditNote: true });

    // No se anula sola: la SUNAT exige la nota de crédito, y la emite una persona.
    const invoice = getInvoiceByPayment(payment.id)!;
    expect(invoice.status).toBe("credit_note_pending");
    expect(invoice.series).toBe("F001"); // se conserva para poder referenciarla

    const queue = listCreditNotes();
    expect(queue.some((row) => row.id === invoiceId)).toBe(true);

    // El operador la emite en la SUNAT y la cierra aquí.
    expect(closeCreditNote(invoiceId)).toEqual({ ok: true });
    expect(getInvoiceByPayment(payment.id)!.status).toBe("void");
    expect(listCreditNotes().some((row) => row.id === invoiceId)).toBe(false);
    expect(closeCreditNote(invoiceId)).toMatchObject({ ok: false });
  });

  it("un reembolso repetido no vuelve a mover la factura", () => {
    const companyId = subscribed();
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub"), paymentId: S("pay"), amount: 19 });
    const payment = getDb().prepare("SELECT id FROM payments WHERE payment_id = ?").get(S("pay")) as { id: string };
    const invoiceId = getInvoiceByPayment(payment.id)!.id;
    markInvoiceIssued(invoiceId, { series: "F001", number: String(200 + run), pdfUrl: "" });

    recordRefund({ providerPaymentId: S("pay") });
    expect(recordRefund({ providerPaymentId: S("pay") }).refunded).toBe(false);
    expect(getInvoiceByPayment(payment.id)!.status).toBe("credit_note_pending");
  });
});

describe("transferencia con factura", () => {
  function pendingCompany(overrides: Partial<Company> = {}) {
    return getCompanyRow(makeCompany({ billing_status: "pending", ...overrides }).companyId);
  }

  it("no se ofrece sin datos bancarios ni con una suscripción de tarjeta vigente", () => {
    delete process.env.TRANSFER_BANK_DETAILS;
    expect(requestTransfer(pendingCompany(), "basico", "yearly").ok).toBe(false);
    process.env.TRANSFER_BANK_DETAILS = "Banco X";
    const withCard = pendingCompany({ subscription_id: S("sub"), subscription_status: "authorized" });
    expect(requestTransfer(withCard, "basico", "yearly").ok).toBe(false);
  });

  it("flujo completo: pedido → factura → pago confirmado activa el plan una sola vez", () => {
    const company = pendingCompany();
    const request = requestTransfer(company, "pro", "yearly");
    expect(request.ok).toBe(true);
    expect(getCompanyRow(company.id).billing_status).toBe("pending");
    expect(outboxFor(company.id).map((m) => m.template)).toContain("transfer_instructions");

    const payment = getPendingTransfer(company.id)!;
    expect(payment).toMatchObject({ amount: 390, status: "pending", provider: "transfer" });
    const invoice = getInvoiceByPayment(payment.id)!;
    expect(invoice).toMatchObject({ status: "pending", total: 390 });

    // La factura se emite antes del pago y el correo lo indica.
    expect(markInvoiceIssued(invoice.id, { series: "F001", number: String(200 + run), pdfUrl: "" }).ok).toBe(true);

    const paid = confirmTransferPaid(payment.id, `OP-${run}`);
    expect(paid.ok).toBe(true);
    const active = getCompanyRow(company.id);
    expect(active).toMatchObject({ billing_status: "active", plan: "pro", billing_term: "yearly" });
    expect(new Date(active.paid_until!).getTime()).toBeGreaterThan(Date.now() + 360 * 86_400_000);

    expect(confirmTransferPaid(payment.id, `OP-${run}`).ok).toBe(false);
    expect(getCompanyRow(company.id).paid_until).toBe(active.paid_until);
  });

  it("un número de operación no se puede usar en dos pagos", () => {
    const a = pendingCompany();
    const b = pendingCompany();
    requestTransfer(a, "basico", "monthly");
    requestTransfer(b, "basico", "monthly");
    expect(confirmTransferPaid(getPendingTransfer(a.id)!.id, `DUP-${run}`).ok).toBe(true);
    expect(confirmTransferPaid(getPendingTransfer(b.id)!.id, `DUP-${run}`).ok).toBe(false);
  });

  it("pedir de nuevo reemplaza el pedido anterior y anula su factura", () => {
    const company = pendingCompany();
    requestTransfer(company, "basico", "monthly");
    const first = getPendingTransfer(company.id)!;
    requestTransfer(company, "pro", "yearly");
    const second = getPendingTransfer(company.id)!;
    expect(second.id).not.toBe(first.id);
    expect(getInvoiceByPayment(first.id)!.status).toBe("void");
  });
});

describe("operadores", () => {
  it("solo los correos de OPERATOR_EMAILS, sin distinguir mayúsculas", () => {
    expect(isOperatorEmail("Yo@Empresa.pe", "yo@empresa.pe, otro@x.pe")).toBe(true);
    expect(isOperatorEmail("intruso@x.pe", "yo@empresa.pe")).toBe(false);
    expect(isOperatorEmail("a@x.pe", "")).toBe(false);
  });

  it("con el correo del operador pero sin verificar, no es operador (registro hecho por otro)", () => {
    const sinVerificar = makeCompany({}, { email_verified_at: null });
    const verificado = makeCompany();
    expect(isOperatorUser({ id: sinVerificar.userId, email: sinVerificar.email }, sinVerificar.email)).toBe(false);
    expect(isOperatorUser({ id: verificado.userId, email: verificado.email }, verificado.email)).toBe(true);
  });
});

describe("unicidad del comprobante", () => {
  it("la base rechaza dos comprobantes con la misma serie y número", () => {
    const { companyId } = makeCompany({ subscription_id: S("sub-u"), subscription_status: "authorized" });
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub-u"), paymentId: S("pay-u1"), amount: 19 });
    recordSubscriptionCharge({ companyId, subscriptionId: S("sub-u"), paymentId: S("pay-u2"), amount: 19 });
    const rows = getDb()
      .prepare("SELECT id FROM invoices WHERE company_id = ? ORDER BY created_at, id")
      .all(companyId) as { id: string }[];
    expect(rows).toHaveLength(2);

    expect(markInvoiceIssued(rows[0].id, { series: "F001", number: "1", pdfUrl: "" }).ok).toBe(true);
    // El índice único de la base impide el número repetido aunque dos operadores
    // pasen a la vez el chequeo previo.
    expect(() => getDb().prepare("UPDATE invoices SET series = 'F001', number = '1' WHERE id = ?").run(rows[1].id)).toThrow();
    // Y la función devuelve un error de negocio, no una excepción.
    expect(markInvoiceIssued(rows[1].id, { series: "F001", number: "1", pdfUrl: "" })).toEqual({
      ok: false,
      error: "Ya existe un comprobante F001-1.",
    });
  });
});

describe("suscripción anterior cancelada", () => {
  it("confirmar la transferencia deja la cuenta pagada y limpia la suscripción cancelada", () => {
    const { companyId } = makeCompany({
      billing_status: "active",
      paid_until: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      subscription_id: S("sub-vieja"),
      subscription_status: "cancelled",
    });
    expect(billingLabel(getCompanyRow(companyId))).toBe("Suscripción cancelada");

    const request = requestTransfer(getCompanyRow(companyId), "pro", "yearly");
    expect(request.ok).toBe(true);
    expect(confirmTransferPaid(getPendingTransfer(companyId)!.id, S("op")).ok).toBe(true);

    const after = getCompanyRow(companyId);
    expect(after.subscription_id).toBeNull();
    expect(after.subscription_status).toBeNull();
    expect(billingLabel(after)).toBe("Plan anual activo");
  });
});
