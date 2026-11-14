import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb, nowIso } from "@/lib/db";
import { getCompanyById } from "@/lib/billing";
import { creditDueAt, getOpenCredit } from "@/lib/credit";
import { getInvoiceByPayment, markInvoiceIssued } from "@/lib/invoicing";
import { confirmTransferPaid, requestCreditInvoice } from "@/lib/transfers";
import { makeCompany } from "./helpers/db";

const original = { ...process.env };
beforeEach(() => {
  process.env.TRANSFER_BANK_DETAILS = "BCP · Semantika TECH · CCI 002-191-000000000000-00";
});
afterEach(() => {
  process.env = { ...original };
});

function business(ruc = "20601030013") {
  const { companyId } = makeCompany({ ruc });
  getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
  return getCompanyById(companyId)!;
}
const outbox = (companyId: string, template: string) =>
  getDb().prepare("SELECT payload FROM email_outbox WHERE company_id = ? AND template = ?").all(companyId, template) as Array<{ payload: string }>;
const monthsBetween = (a: Date, b: Date) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

describe("pago con factura a crédito: pedir, emitir, confirmar", () => {
  it("pedir crédito activa la cuenta al instante por 12 meses y deja la factura pendiente", () => {
    const company = business();
    const result = requestCreditInvoice(company, "basico");
    expect(result.ok).toBe(true);

    const after = getCompanyById(company.id)!;
    expect(after.billing_status).toBe("active");
    expect(after.billing_term).toBe("yearly");
    expect(monthsBetween(new Date(), new Date(after.paid_until!))).toBe(12);

    const credit = getOpenCredit(company.id)!;
    expect(credit).toMatchObject({ provider: "transfer", status: "pending", credit: 1, term: "yearly", due_at: null });
    expect(getInvoiceByPayment(credit.id)?.status).toBe("pending");
    expect(outbox(company.id, "credit_invoice_requested")).toHaveLength(1);
  });

  it("no elegible (RUC 10): no crea pago ni activa", () => {
    const company = business("10456789012");
    expect(requestCreditInvoice(company, "basico")).toEqual({ ok: false, error: "El pago a crédito es solo para empresas con RUC 20 verificado en la SUNAT." });
    expect(getCompanyById(company.id)!.billing_status).toBe("pending");
    expect(getOpenCredit(company.id)).toBeUndefined();
  });

  it("no se puede pedir un segundo crédito con uno abierto", () => {
    const company = business();
    expect(requestCreditInvoice(company, "basico").ok).toBe(true);
    expect(requestCreditInvoice(getCompanyById(company.id)!, "pro")).toEqual({ ok: false, error: "Ya tienes una factura a crédito pendiente de pago." });
  });

  it("registrar la factura fija el vencimiento a 15 días de la emisión y lo dice en el correo", () => {
    const company = business();
    requestCreditInvoice(company, "basico");
    const credit = getOpenCredit(company.id)!;
    const invoice = getInvoiceByPayment(credit.id)!;
    expect(markInvoiceIssued(invoice.id, { series: "F001", number: "123", pdfUrl: "" })).toEqual({ ok: true });

    const issuedAt = getInvoiceByPayment(credit.id)!.issued_at!;
    expect(getOpenCredit(company.id)!.due_at).toBe(creditDueAt(issuedAt));
    const mail = JSON.parse(outbox(company.id, "invoice_issued")[0].payload) as { dueNote: string };
    expect(mail.dueNote).toMatch(/^Factura a crédito: vence el /);
  });

  it("confirmar el pago de un crédito no extiende paid_until", () => {
    const company = business();
    requestCreditInvoice(company, "basico");
    const paidUntil = getCompanyById(company.id)!.paid_until;
    const credit = getOpenCredit(company.id)!;

    const result = confirmTransferPaid(credit.id, "OP-998877");
    expect(result).toEqual({ ok: true, paidUntil });
    expect(getCompanyById(company.id)!.paid_until).toBe(paidUntil);
    expect(getDb().prepare("SELECT status FROM payments WHERE id = ?").get(credit.id)).toEqual({ status: "approved" });
    expect(getOpenCredit(company.id)).toBeUndefined();
  });

  it("confirmar dos veces no aplica dos veces", () => {
    const company = business();
    requestCreditInvoice(company, "basico");
    const credit = getOpenCredit(company.id)!;
    expect(confirmTransferPaid(credit.id, "OP-1").ok).toBe(true);
    expect(confirmTransferPaid(credit.id, "OP-2")).toEqual({ ok: false, error: "Este pago ya fue confirmado o cancelado." });
  });
});
