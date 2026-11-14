import "server-only";

import { getDb, type Company } from "./db";
import { CREDIT_GRACE_DAYS, CREDIT_REMINDER_DAYS } from "./credit";
import { formatDate, limaToday } from "./format";
import { formatSol, invoiceNumber, type InvoiceRow } from "./invoicing";
import type { MailTemplate } from "./mail-templates";
import { notifyCompany } from "./notify";
import { transferBankDetails } from "./transfers";

/**
 * Recordatorios de la factura a crédito (tarea diaria `credit-reminders`). Cada etapa
 * se envía una vez por pago; si la tarea no corrió un día, la siguiente envía la etapa
 * alcanzada (no se pierde el aviso ni se mandan atrasados uno tras otro).
 */

export type CreditStage = "soon" | "today" | "overdue" | "readonly";

const STAGES: Array<{ stage: CreditStage; offset: number; template: MailTemplate }> = [
  { stage: "soon", offset: CREDIT_REMINDER_DAYS[0], template: "credit_due_soon" },
  { stage: "today", offset: CREDIT_REMINDER_DAYS[1], template: "credit_due_today" },
  { stage: "overdue", offset: CREDIT_REMINDER_DAYS[2], template: "credit_overdue" },
  { stage: "readonly", offset: CREDIT_GRACE_DAYS, template: "credit_readonly" },
];

const DAY = 24 * 60 * 60 * 1000;

/** Días de calendario de Lima entre el vencimiento y `now` (0 = el día del vencimiento). */
function limaDayOffset(dueAt: string, now: Date): number {
  return Math.round((Date.parse(limaToday(now)) - Date.parse(limaToday(new Date(dueAt)))) / DAY);
}

/** La etapa más avanzada ya alcanzada, o null si aún falta para el primer aviso. */
export function creditReminderStage(dueAt: string, now: Date): CreditStage | null {
  const offset = limaDayOffset(dueAt, now);
  const reached = STAGES.filter((s) => offset >= s.offset);
  return reached.length ? reached[reached.length - 1].stage : null;
}

export function sendCreditReminders(now: Date = new Date()): number {
  const db = getDb();
  const credits = db
    .prepare("SELECT * FROM payments WHERE credit = 1 AND status = 'pending' AND due_at IS NOT NULL")
    .all() as Array<{ id: string; company_id: string; amount: number; due_at: string; external_reference: string | null }>;
  let sent = 0;
  for (const credit of credits) {
    const stage = creditReminderStage(credit.due_at, now);
    if (!stage) continue;
    const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(credit.company_id) as unknown as Company | undefined;
    const invoice = db.prepare("SELECT * FROM invoices WHERE payment_id = ?").get(credit.id) as unknown as InvoiceRow | undefined;
    if (!company || !invoice) continue;
    const { template } = STAGES.find((s) => s.stage === stage)!;
    const ok = notifyCompany(
      company,
      template,
      {
        amount: formatSol(credit.amount),
        invoice: invoiceNumber(invoice) ?? "",
        dueDate: formatDate(credit.due_at),
        reference: credit.external_reference ?? "",
        bankDetails: transferBankDetails(),
        path: "/pago",
      },
      { dedupeKey: `credit:${credit.id}:${stage}` }
    );
    if (ok) sent += 1;
  }
  return sent;
}
