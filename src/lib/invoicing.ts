import "server-only";

import { getDb, newId, nowIso, type Company } from "./db";
import { logActivity } from "./data";
import { notifyCompany } from "./notify";
import { PLANS, isPlanId, termLabel, isBillingTerm } from "./plans";

/**
 * Comprobantes electrónicos (facturas) de las suscripciones.
 *
 * Cada pago aprobado crea un comprobante `pending` con los datos del cliente
 * (RUC, razón social, domicilio fiscal) y el desglose de IGV. Hoy se emite a
 * mano en el portal de la SUNAT (o en el panel de un PSE/OSE) y el operador
 * registra serie, número y enlace al PDF. Cuando exista un proveedor con API,
 * solo cambia quién pasa el comprobante de `pending` a `issued`.
 *
 * Los precios del catálogo incluyen IGV.
 */

export const IGV_RATE = 0.18;

export type InvoiceStatus = "pending" | "issued" | "void" | "credit_note_pending";

export type InvoiceRow = {
  id: string;
  company_id: string;
  payment_id: string;
  status: InvoiceStatus;
  doc_type: string;
  buyer_ruc: string;
  buyer_name: string;
  buyer_address: string;
  description: string;
  base_amount: number;
  igv_amount: number;
  total: number;
  currency: string;
  series: string | null;
  number: string | null;
  pdf_url: string | null;
  issued_at: string | null;
  emailed_at: string | null;
  created_at: string;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Separa un total con IGV incluido en base imponible e IGV. */
export function splitIgv(total: number) {
  const base = round2(total / (1 + IGV_RATE));
  return { base, igv: round2(total - base), total: round2(total) };
}

export function formatSol(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

export function invoiceNumber(invoice: Pick<InvoiceRow, "series" | "number">) {
  return invoice.series && invoice.number ? `${invoice.series}-${invoice.number}` : null;
}

const SERIES = /^[FB][A-Z0-9]{3}$/;
const NUMBER = /^\d{1,8}$/;

/** Solo enlaces https: el enlace se muestra al cliente y se envía por correo. */
export function isSafePdfUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Crea (una sola vez por pago) el comprobante pendiente con los datos fiscales actuales de la empresa. */
export function createInvoiceForPayment(paymentRowId: string): InvoiceRow | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM invoices WHERE payment_id = ?").get(paymentRowId) as unknown as InvoiceRow | undefined;
  if (existing) return existing;

  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(paymentRowId) as
    | { id: string; company_id: string; plan: string; term: string; amount: number; currency: string }
    | undefined;
  if (!payment) return null;
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(payment.company_id) as unknown as Company | undefined;
  if (!company) return null;

  const plan = isPlanId(payment.plan) ? PLANS[payment.plan].name : payment.plan;
  const term = isBillingTerm(payment.term) ? termLabel(payment.term).toLowerCase() : payment.term;
  const { base, igv, total } = splitIgv(payment.amount);
  const id = newId();

  db.prepare(
    `INSERT INTO invoices
       (id, company_id, payment_id, status, doc_type, buyer_ruc, buyer_name, buyer_address, description,
        base_amount, igv_amount, total, currency, created_at)
     VALUES (?, ?, ?, 'pending', 'factura', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    company.id,
    payment.id,
    company.ruc,
    company.name,
    company.address ?? "",
    `Suscripción ${term} DatosPrivados Plan ${plan}`,
    base,
    igv,
    total,
    payment.currency,
    nowIso()
  );

  return db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as unknown as InvoiceRow;
}

export function getInvoiceByPayment(paymentRowId: string) {
  return getDb().prepare("SELECT * FROM invoices WHERE payment_id = ?").get(paymentRowId) as unknown as InvoiceRow | undefined;
}

export function listInvoicesForCompany(companyId: string) {
  return getDb()
    .prepare("SELECT * FROM invoices WHERE company_id = ? AND status != 'void' ORDER BY created_at DESC LIMIT 24")
    .all(companyId) as unknown as InvoiceRow[];
}

export function listPendingInvoices() {
  return getDb()
    .prepare(
      `SELECT i.*, p.status AS payment_status, p.provider AS payment_provider
       FROM invoices i JOIN payments p ON p.id = i.payment_id
       WHERE i.status = 'pending' ORDER BY i.created_at`
    )
    .all() as unknown as Array<InvoiceRow & { payment_status: string; payment_provider: string }>;
}

/**
 * Comprobantes ya emitidos cuyo pago se reembolsó: hace falta una **nota de
 * crédito** en la SUNAT. Quedan aquí hasta que el operador la emita y confirme.
 */
export function listCreditNotes() {
  return getDb()
    .prepare(
      `SELECT i.*, p.status AS payment_status, p.provider AS payment_provider, p.amount AS payment_amount,
              c.name AS company_name, c.ruc AS company_ruc
       FROM invoices i
       JOIN payments p ON p.id = i.payment_id
       JOIN companies c ON c.id = i.company_id
       WHERE i.status = 'credit_note_pending' ORDER BY i.created_at`
    )
    .all() as unknown as Array<InvoiceRow & { payment_status: string; payment_provider: string; payment_amount: number; company_name: string; company_ruc: string }>;
}

/**
 * Marca un comprobante emitido como «pendiente de nota de crédito» (su pago se
 * reembolsó). No se anula sola: una factura ya emitida ante la SUNAT solo se
 * corrige con una nota de crédito, y eso lo hace una persona. Conserva serie y
 * número para que la nota pueda referenciarlos.
 */
export function markCreditNotePending(paymentRowId: string): boolean {
  const invoice = getInvoiceByPayment(paymentRowId);
  if (invoice?.status !== "issued") return false;
  const db = getDb();
  db.prepare("UPDATE invoices SET status = 'credit_note_pending' WHERE id = ? AND status = 'issued'").run(invoice.id);
  logActivity(invoice.company_id, "pago", `El pago de la factura ${invoice.series}-${invoice.number} se reembolsó: hay que emitir una nota de crédito.`);
  return true;
}

/** Cierra la nota de crédito: el operador ya la emitió en la SUNAT y el comprobante queda anulado. */
export function closeCreditNote(invoiceId: string): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as unknown as InvoiceRow | undefined;
  if (!invoice) return { ok: false, error: "Comprobante no encontrado." };
  if (invoice.status !== "credit_note_pending") return { ok: false, error: "Ese comprobante no está pendiente de nota de crédito." };
  db.prepare("UPDATE invoices SET status = 'void' WHERE id = ? AND status = 'credit_note_pending'").run(invoiceId);
  logActivity(invoice.company_id, "pago", `Emitimos la nota de crédito de la factura ${invoice.series}-${invoice.number}.`);
  return { ok: true };
}

export type IssueResult = { ok: true } | { ok: false; error: string };

/**
 * Registra el comprobante emitido (a mano o por un proveedor) y avisa al cliente.
 * Es idempotente: un comprobante ya emitido no se reemite ni se vuelve a enviar.
 */
export function markInvoiceIssued(invoiceId: string, input: { series: string; number: string; pdfUrl: string }): IssueResult {
  const series = input.series.trim().toUpperCase();
  const number = input.number.trim();
  const pdfUrl = input.pdfUrl.trim();
  if (!SERIES.test(series)) return { ok: false, error: "La serie debe ser como F001 (cuatro caracteres, empieza con F)." };
  if (!NUMBER.test(number)) return { ok: false, error: "El número debe tener hasta 8 dígitos." };
  if (pdfUrl && !isSafePdfUrl(pdfUrl)) return { ok: false, error: "El enlace al PDF debe empezar con https://." };

  const db = getDb();
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as unknown as InvoiceRow | undefined;
  if (!invoice) return { ok: false, error: "Comprobante no encontrado." };
  if (invoice.status !== "pending") return { ok: false, error: "Este comprobante ya fue emitido o anulado." };

  const duplicate = db.prepare("SELECT 1 FROM invoices WHERE series = ? AND number = ? AND id != ?").get(series, number, invoiceId);
  if (duplicate) return { ok: false, error: `Ya existe un comprobante ${series}-${number}.` };

  try {
    db.prepare("UPDATE invoices SET status = 'issued', series = ?, number = ?, pdf_url = ?, issued_at = ? WHERE id = ? AND status = 'pending'").run(
      series,
      number,
      pdfUrl || null,
      nowIso(),
      invoiceId
    );
  } catch (error) {
    // Dos operadores a la vez: la base rechaza la serie+número repetidos (uq_invoices_number).
    console.error("[invoicing] No se pudo registrar el comprobante:", error);
    return { ok: false, error: `Ya existe un comprobante ${series}-${number}.` };
  }

  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(invoice.company_id) as unknown as Company | undefined;
  const payment = db.prepare("SELECT status FROM payments WHERE id = ?").get(invoice.payment_id) as { status: string } | undefined;
  if (company) {
    const unpaid = payment?.status === "pending";
    const sent = notifyCompany(
      company,
      "invoice_issued",
      {
        number: `${series}-${number}`,
        amount: formatSol(invoice.total),
        ...(pdfUrl ? { pdfUrl } : {}),
        ...(unpaid ? { dueNote: "Te la enviamos antes del pago para que puedas pagarla por transferencia. Activaremos tu plan al recibirlo." } : {}),
      },
      { dedupeKey: `invoice:${invoiceId}` }
    );
    if (sent) db.prepare("UPDATE invoices SET emailed_at = ? WHERE id = ?").run(nowIso(), invoiceId);
    logActivity(company.id, "pago", `Emitimos la factura ${series}-${number} por ${formatSol(invoice.total)}.`);
  }
  return { ok: true };
}

/** Anula un comprobante todavía pendiente (por ejemplo, de un pago reembolsado antes de emitirlo). */
export function voidPendingInvoice(paymentRowId: string) {
  getDb().prepare("UPDATE invoices SET status = 'void' WHERE payment_id = ? AND status = 'pending'").run(paymentRowId);
}
