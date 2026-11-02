import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import { listPendingInvoices, formatSol } from "@/lib/invoicing";
import { listPendingTransfers } from "@/lib/transfers";
import { formatDate } from "@/lib/format";
import { issueInvoiceAction, confirmTransferAction } from "./actions";

export const metadata = { title: "Operador", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OperatorPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireOperator();
  const { ok, error } = await searchParams;
  const invoices = listPendingInvoices();
  const transfers = listPendingTransfers();

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header>
        <p className="label-mono">Operador</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.03em]">Comprobantes y transferencias</h1>
      </header>

      {ok && <p className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm">Guardado.</p>}
      {error && <p className="border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-sm">{error}</p>}

      <section>
        <h2 className="font-display text-2xl">Facturas por emitir ({invoices.length})</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Emite cada factura en la SUNAT (SEE-SOL) o en tu proveedor, y registra aquí serie, número y enlace al PDF. Se envía al cliente al guardar.
        </p>
        {invoices.length === 0 && <p className="mt-4 text-sm text-ink-soft">No hay facturas pendientes.</p>}
        <ul className="mt-4 space-y-4">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="card p-5">
              <p className="font-medium">
                {invoice.buyer_name} · RUC {invoice.buyer_ruc}
              </p>
              <p className="text-sm text-ink-soft">{invoice.buyer_address || "Sin domicilio fiscal registrado"}</p>
              <p className="mt-2 text-sm">{invoice.description}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                Base {formatSol(invoice.base_amount)} · IGV {formatSol(invoice.igv_amount)} · Total {formatSol(invoice.total)} ·{" "}
                {invoice.payment_provider === "transfer"
                  ? invoice.payment_status === "pending"
                    ? "transferencia sin pagar"
                    : "transferencia pagada"
                  : "tarjeta (MercadoPago)"}{" "}
                · {formatDate(invoice.created_at)}
              </p>
              <form action={issueInvoiceAction} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={invoice.id} />
                <label className="text-sm">
                  Serie
                  <input name="series" defaultValue="F001" required maxLength={4} className="input mt-1 block w-24" />
                </label>
                <label className="text-sm">
                  Número
                  <input name="number" required inputMode="numeric" maxLength={8} className="input mt-1 block w-32" />
                </label>
                <label className="min-w-[16rem] flex-1 text-sm">
                  Enlace al PDF (https)
                  <input name="pdfUrl" type="url" className="input mt-1 block w-full" />
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  Registrar y enviar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Transferencias por confirmar ({transfers.length})</h2>
        {transfers.length === 0 && <p className="mt-4 text-sm text-ink-soft">No hay transferencias pendientes.</p>}
        <ul className="mt-4 space-y-4">
          {transfers.map((payment) => (
            <li key={payment.id} className="card p-5">
              <p className="font-medium">
                {payment.company_name} · RUC {payment.company_ruc}
              </p>
              <p className="text-sm text-ink-soft">
                Plan {payment.plan} {payment.term === "yearly" ? "anual" : "mensual"} · {formatSol(payment.amount)} · referencia{" "}
                <strong>{payment.external_reference}</strong> · {formatDate(payment.created_at)}
              </p>
              <form action={confirmTransferAction} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={payment.id} />
                <label className="text-sm">
                  N.º de operación del banco
                  <input name="operation" required maxLength={60} className="input mt-1 block w-64" />
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirmar que llegó el dinero
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Calendario de plazos</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Los plazos en días hábiles (ARCO: 10 y 20) descuentan fines de semana y feriados.
        </p>
        <p className="mt-3">
          <Link href="/operador/feriados" className="btn btn-ghost btn-sm">
            Editar feriados y días no laborables
          </Link>
        </p>
      </section>
    </main>
  );
}
