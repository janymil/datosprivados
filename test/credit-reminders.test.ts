import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb, nowIso } from "@/lib/db";
import { getCompanyById } from "@/lib/billing";
import { getOpenCredit } from "@/lib/credit";
import { creditReminderStage, sendCreditReminders } from "@/lib/credit-reminders";
import { getInvoiceByPayment, markInvoiceIssued } from "@/lib/invoicing";
import { runJob } from "@/lib/jobs";
import { confirmTransferPaid, requestCreditInvoice } from "@/lib/transfers";
import { makeCompany } from "./helpers/db";

const DAY = 24 * 60 * 60 * 1000;
const original = { ...process.env };
beforeEach(() => {
  process.env.TRANSFER_BANK_DETAILS = "BCP · CCI 002";
});
afterEach(() => {
  process.env = { ...original };
});

/** Crédito con factura emitida y vencimiento fijado a `due` (15:00 Lima = 20:00 UTC). */
function creditDue(due: string) {
  const { companyId } = makeCompany({ ruc: "20601030013" });
  getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
  requestCreditInvoice(getCompanyById(companyId)!, "basico");
  const credit = getOpenCredit(companyId)!;
  markInvoiceIssued(getInvoiceByPayment(credit.id)!.id, { series: "F001", number: String(Math.floor(Math.random() * 1e7)), pdfUrl: "" });
  getDb().prepare("UPDATE payments SET due_at = ? WHERE id = ?").run(due, credit.id);
  return { companyId, creditId: credit.id };
}
const sent = (companyId: string) =>
  (getDb().prepare("SELECT template FROM email_outbox WHERE company_id = ? AND template LIKE 'credit_%' AND template != 'credit_invoice_requested' ORDER BY created_at").all(companyId) as Array<{ template: string }>).map((r) => r.template);
/** 09:00 de Lima del día `offset` respecto del vencimiento (2026-12-10). */
const at9 = (offset: number) => new Date(Date.parse("2026-12-10T14:00:00.000Z") + offset * DAY);
const DUE = "2026-12-10T20:00:00.000Z";

describe("recordatorios de la factura a crédito", () => {
  it("etapa según el día de Lima respecto del vencimiento", () => {
    expect(creditReminderStage(DUE, at9(-4))).toBeNull();
    expect(creditReminderStage(DUE, at9(-3))).toBe("soon");
    expect(creditReminderStage(DUE, at9(0))).toBe("today"); // 09:00 del día del vencimiento, aunque vence a las 15:00
    expect(creditReminderStage(DUE, at9(3))).toBe("overdue");
    expect(creditReminderStage(DUE, at9(7))).toBe("readonly");
  });

  it("envía cada etapa una vez y en su día (de −4 a +8: 4 correos)", () => {
    const { companyId } = creditDue(DUE);
    for (let d = -4; d <= 8; d++) sendCreditReminders(at9(d));
    expect(sent(companyId)).toEqual(["credit_due_soon", "credit_due_today", "credit_overdue", "credit_readonly"]);
  });

  it("correr dos veces el mismo día no duplica", () => {
    const { companyId } = creditDue(DUE);
    sendCreditReminders(at9(0));
    sendCreditReminders(new Date(at9(0).getTime() + 60 * 60 * 1000));
    expect(sent(companyId)).toEqual(["credit_due_today"]);
  });

  it("un día sin correr no pierde el aviso: al día siguiente sale la etapa alcanzada", () => {
    const { companyId } = creditDue(DUE);
    sendCreditReminders(at9(4)); // no corrió el +3
    expect(sent(companyId)).toEqual(["credit_overdue"]);
  });

  it("sin factura emitida no envía nada", () => {
    const { companyId } = makeCompany({ ruc: "20601030013" });
    getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
    requestCreditInvoice(getCompanyById(companyId)!, "basico");
    sendCreditReminders(new Date(Date.now() + 60 * DAY));
    expect(sent(companyId)).toEqual([]);
  });

  it("un crédito pagado no recibe recordatorios", () => {
    const { companyId, creditId } = creditDue(DUE);
    expect(confirmTransferPaid(creditId, "OP-1").ok).toBe(true);
    sendCreditReminders(at9(3));
    expect(sent(companyId)).toEqual([]);
  });

  it("la tarea credit-reminders corre y lo registra", async () => {
    creditDue(DUE);
    const outcome = await runJob("credit-reminders", at9(0));
    expect(outcome.status).toBe("ok");
  });
});
