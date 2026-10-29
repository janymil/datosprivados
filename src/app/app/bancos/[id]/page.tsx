import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBank } from "@/lib/data";
import { formatDate, limaToday } from "@/lib/format";
import { legalBasisLabel } from "@/lib/documents";
import { markBankRegisteredAction, reopenBankAction } from "@/app/actions/company";
import { Field, PageHeader, StatusPill } from "@/components/ui";
import { FileIcon } from "@/components/icons";

export const metadata = { title: "Banco de datos" };

export default async function BankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { company } = await requireSession();
  const { id } = await params;
  const { ok } = await searchParams;
  const bank = getBank(company.id, id);
  if (!bank) notFound();

  const rows: Array<[string, string]> = [
    ["Finalidad", bank.purpose || "—"],
    ["Categorías de datos", bank.data_categories || "—"],
    ["Base legal", legalBasisLabel(bank.legal_basis)],
    ["Conservación", bank.retention || "—"],
    ["Destinatarios / encargados", bank.recipients || "—"],
    ["Transferencias internacionales", bank.transfers === "si" ? "Sí" : "No"],
    ["Canal de recolección", bank.channel || "—"],
  ];

  return (
    <div className="space-y-7">
      <nav className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/bancos" className="hover:text-ink">
          Bancos de datos
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">{bank.name}</span>
      </nav>

      {ok && (
        <p className="border-l-2 border-sage bg-sage/[0.07] px-4 py-3 text-[13px]">
          Banco actualizado correctamente.
        </p>
      )}

      <PageHeader
        eyebrow="Ficha del banco"
        title={bank.name}
        description={bank.purpose || undefined}
        actions={
          <>
            <Link href={`/app/bancos/${bank.id}/ficha`} className="btn btn-ghost btn-sm">
              <FileIcon className="h-3.5 w-3.5" />
              Ficha SIPDP
            </Link>
            <Link href={`/app/bancos/${bank.id}/editar`} className="btn btn-primary btn-sm">
              Editar
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-lg tracking-[-0.02em]">Detalle declarado</h2>
            <StatusPill tone={bank.status === "registrado" ? "ok" : "neutral"}>
              {bank.status === "registrado" ? "Registrado en SIPDP" : "Borrador"}
            </StatusPill>
          </div>

          <dl className="divide-y divide-line">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-6 py-4 sm:grid-cols-[190px_1fr] sm:gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
                <dd className="text-[13px] leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-line px-6 py-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
              Creado el {formatDate(bank.created_at)} · actualizado el {formatDate(bank.updated_at)}
            </p>
          </div>
        </section>

        <div className="space-y-5">
          {bank.status === "registrado" ? (
            <section className="border border-sage/40 bg-sage/[0.05] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sage">
                Registro en el SIPDP
              </p>
              <p className="mt-2 font-mono text-lg">{bank.sipdp_code}</p>
              <p className="mt-1 text-[12px] text-ink-soft">
                Registrado el {formatDate(bank.registered_at)}
              </p>
              <p className="mt-4 text-[12px] leading-relaxed text-ink-soft">
                Guarda también el comprobante o constancia que emite la ANPD. Puedes adjuntarlo a tu
                expediente interno.
              </p>
              <form action={reopenBankAction} className="mt-4">
                <input type="hidden" name="id" value={bank.id} />
                <button type="submit" className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft underline hover:text-crimson">
                  Volver a borrador
                </button>
              </form>
            </section>
          ) : (
            <section className="card p-5">
              <p className="label-mono">Registrar en el SIPDP</p>
              <h2 className="mt-1 font-display text-xl tracking-[-0.02em]">Guarda tu código</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                Declara este banco en la plataforma de la ANPD usando la ficha imprimible. Cuando
                obtengas el código, anótalo aquí.
              </p>

              <form action={markBankRegisteredAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={bank.id} />
                <Field label="Código SIPDP">
                  <input name="sipdp_code" className="input" placeholder="SIPDP-2026-000000" />
                </Field>
                <Field label="Fecha de registro">
                  <input
                    type="date"
                    name="registered_at"
                    className="input"
                    defaultValue={limaToday()}
                  />
                </Field>
                <button type="submit" className="btn btn-primary btn-sm w-full">
                  Marcar como registrado
                </button>
              </form>
            </section>
          )}

          <section className="border border-line bg-paper p-5">
            <p className="label-mono">Checklist rápido</p>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                La finalidad debe ser concreta y estar vinculada a una base legal.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                Si tratas datos sensibles, revisa si necesitas consentimiento expreso.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                Actualiza el banco si cambias de proveedor o de plazo de conservación.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
