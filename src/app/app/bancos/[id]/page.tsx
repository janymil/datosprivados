import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBank } from "@/lib/data";
import { formatDate, limaToday } from "@/lib/format";
import { legalBasisLabel } from "@/lib/documents";
import { markBankRegisteredAction, reopenBankAction } from "@/app/actions/company";
import { Field, PageHeader, StatusPill } from "@/components/ui";
import { FileIcon } from "@/components/icons";
import { Term } from "@/components/help";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";

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

  const rows: Array<[ReactNode, string]> = [
    ["Finalidad (para qué se usa)", bank.purpose || "—"],
    ["Categorías de datos", bank.data_categories || "—"],
    [<span key="bl"><Term k="base_legal">Base legal</Term></span>, legalBasisLabel(bank.legal_basis)],
    ["Plazo de conservación", bank.retention || "—"],
    [<span key="enc">Destinatarios / <Term k="encargado">encargados</Term></span>, bank.recipients || "—"],
    [<span key="tr"><Term k="transferencia">Transferencia internacional</Term></span>, bank.transfers === "si" ? "Sí (usa servicios en nube exterior)" : "No (solo en el Perú)"],
    ["Canal principal", bank.channel || "—"],
  ];

  return (
    <div className="space-y-7">
      <nav className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/bancos" className="hover:text-ink">
          Bancos de datos
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">{bank.name}</span>
      </nav>

      {ok && <Toast message="Banco de datos guardado." />}

      <PageHeader
        title={bank.name}
        description={bank.purpose || undefined}
        actions={
          <>
            <Link
              href={`/app/bancos/${bank.id}/ficha`}
              className={`btn btn-sm ${bank.status === "registrado" ? "btn-ghost" : "btn-primary"}`}
            >
              <FileIcon className="h-4 w-4" />
              Abrir Ficha para el SIPDP
            </Link>
            <Link
              href={`/app/bancos/${bank.id}/editar`}
              className={`btn btn-sm ${bank.status === "registrado" ? "btn-primary" : "btn-ghost"}`}
            >
              Editar datos
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-xl tracking-[-0.02em]">Información de este banco</h2>
            <StatusPill tone={bank.status === "registrado" ? "ok" : "neutral"}>
              {bank.status === "registrado" ? "Inscrito en SIPDP" : "Borrador (falta inscribir)"}
            </StatusPill>
          </div>

          <dl className="divide-y divide-line">
            {rows.map(([label, value], i) => (
              <div key={i} className="grid gap-1.5 px-6 py-4 sm:grid-cols-[220px_1fr] sm:gap-4">
                <dt className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-ink-soft">{label}</dt>
                <dd className="text-[15.5px] leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-line px-6 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
              Creado el {formatDate(bank.created_at)} · actualizado el {formatDate(bank.updated_at)}
            </p>
          </div>
        </section>

        <div className="space-y-5">
          {bank.status === "registrado" ? (
            <section className="border border-sage/40 bg-sage/[0.06] p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-sage">
                Inscrito oficialmente en el <Term k="sipdp">SIPDP</Term>
              </p>
              <p className="mt-2 font-mono text-xl font-semibold">{bank.sipdp_code}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Fecha de registro: {formatDate(bank.registered_at)}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                Guarda también en tu computadora el PDF de la constancia de inscripción que emite la{" "}
                <Term k="anpd">ANPD</Term> en el <Term k="rnpdp">RNPDP</Term>.
              </p>
              <form action={reopenBankAction} className="mt-4">
                <input type="hidden" name="id" value={bank.id} />
                <button type="submit" className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft underline hover:text-crimson">
                  Cambiar estado a borrador
                </button>
              </form>
            </section>
          ) : (
            <section className="card p-6">
              <p className="label-mono">Paso 2 · Inscripción gratuita (S/ 0)</p>
              <h2 className="mt-1.5 font-display text-2xl tracking-[-0.02em]">
                Inscríbelo en el <Term k="sipdp">SIPDP</Term> y guarda tu código
              </h2>
              <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-soft">
                <li>
                  <strong>1.</strong> Abre la{" "}
                  <Link href={`/app/bancos/${bank.id}/ficha`} className="link-underline text-ink">
                    Ficha SIPDP lista para copiar
                  </Link>
                  .
                </li>
                <li>
                  <strong>2.</strong> Entra al portal oficial del Ministerio de Justicia:{" "}
                  <a
                    href="https://sipdp.minjus.gob.pe/"
                    target="_blank"
                    rel="noreferrer"
                    className="link-underline text-ink"
                  >
                    sipdp.minjus.gob.pe
                  </a>{" "}
                  (el trámite es 100 % gratuito).
                </li>
                <li>
                  <strong>3.</strong> Cuando el portal te entregue tu código de registro, anótalo aquí abajo:
                </li>
              </ol>

              <form action={markBankRegisteredAction} className="mt-5 space-y-4 border-t border-line pt-4">
                <input type="hidden" name="id" value={bank.id} />
                <Field label="Código otorgado por el SIPDP / RNPDP">
                  <input name="sipdp_code" className="input" placeholder="Ej. RNPDP-PJP N.° 12345 / SIPDP-2026-004512" />
                </Field>
                <Field label="Fecha de inscripción">
                  <input
                    type="date"
                    name="registered_at"
                    className="input"
                    defaultValue={limaToday()}
                  />
                </Field>
                <SubmitButton className="btn btn-primary btn-sm w-full">Guardar código y marcar como inscrito</SubmitButton>
              </form>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
