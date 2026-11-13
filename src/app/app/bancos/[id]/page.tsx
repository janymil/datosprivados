import Link from "next/link";
import { HelpTip } from "@/components/help-tip";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBank } from "@/lib/data";
import { formatDate, limaToday } from "@/lib/format";
import { legalBasisLabel } from "@/lib/documents";
import {
  cancelBankRegistrationAction,
  deleteDraftBankAction,
  markBankRegisteredAction,
  reopenBankAction,
} from "@/app/actions/company";
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
  searchParams: Promise<{ ok?: string; cancelado?: string; error?: string }>;
}) {
  const { company } = await requireSession();
  const { id } = await params;
  const { ok, cancelado, error } = await searchParams;
  const bank = getBank(company.id, id);
  if (!bank) notFound();
  const registered = bank.status === "registrado";
  const cancelled = bank.status === "cancelado";

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
      {cancelado && <Toast message="Registraste la cancelación de la inscripción." />}
      {error === "fecha" && (
        <p role="alert" className="border border-crimson/40 bg-crimson/[0.06] px-4 py-3 text-sm">
          Revisa la fecha de cancelación: no puede ser futura ni anterior a la fecha de inscripción.
        </p>
      )}

      <PageHeader
        title={bank.name}
        description={bank.purpose || undefined}
        actions={
          cancelled ? undefined : (
            <>
              <Link
                href={`/app/bancos/${bank.id}/ficha`}
                className={`btn btn-sm ${registered ? "btn-ghost" : "btn-primary"}`}
              >
                <FileIcon className="h-4 w-4" />
                Abrir Ficha para el SIPDP
              </Link>
              <Link
                href={`/app/bancos/${bank.id}/editar`}
                className={`btn btn-sm ${registered ? "btn-primary" : "btn-ghost"}`}
              >
                Editar datos
              </Link>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-xl tracking-[-0.02em]">Información de este banco</h2>
            <StatusPill tone={registered ? "ok" : "neutral"}>
              {registered ? "Inscrito en SIPDP" : cancelled ? "Inscripción cancelada" : "Borrador (falta inscribir)"}
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
          {cancelled ? (
            <section className="card p-6">
              <p className="label-mono">Inscripción cancelada ante la ANPD</p>
              <p className="mt-2 text-[15px] leading-relaxed">
                Inscrito con el código <span className="font-mono">{bank.sipdp_code}</span> el{" "}
                {formatDate(bank.registered_at)}; cancelado el {formatDate(bank.cancelled_at)}
                {bank.cancel_reference ? ` (${bank.cancel_reference})` : ""}.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Ya no aparece en tus documentos, en tu puntaje ni en los avisos. Se conserva aquí como constancia; guarda
                también la resolución de cancelación que emite la ANPD.
              </p>
            </section>
          ) : registered ? (
            <section className="border border-sage/40 bg-sage/[0.06] p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-sage">
                Inscrito oficialmente en el <Term k="sipdp">SIPDP</Term> <HelpTip k="banco_estado" className="ml-1.5" />
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
                  Lo marqué por error: volver a borrador
                </button>
              </form>
            </section>
          ) : null}

          {registered && (
            <details className="border border-line px-5 py-4 text-sm">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-crimson">
                Dejé de usar este banco
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Un banco inscrito no se elimina: pide a la ANPD la cancelación de la inscripción (en el mismo portal del{" "}
                <Term k="sipdp">SIPDP</Term>) y, cuando te la confirmen, regístrala aquí. Antes, borra o devuelve los datos
                según tu plazo de conservación.
              </p>
              <form action={cancelBankRegistrationAction} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={bank.id} />
                <Field label="Fecha de la cancelación">
                  <input type="date" name="cancelled_at" className="input" defaultValue={limaToday()} max={limaToday()} required />
                </Field>
                <Field label="N.° de resolución o trámite (opcional)">
                  <input name="cancel_reference" className="input" maxLength={200} placeholder="Ej. Resolución N.° 1234-2026-JUS/DGTAIPD" />
                </Field>
                <SubmitButton className="btn btn-ghost btn-sm text-crimson">Registrar la cancelación</SubmitButton>
                <p className="text-xs text-ink-soft">Es definitivo: el banco queda en el historial y ya no se puede editar.</p>
              </form>
            </details>
          )}

          {bank.status === "borrador" && (
            <section className="card p-6">
              <p className="label-mono">
                Paso 2 · Inscripción gratuita (S/ 0) <HelpTip k="ficha_sipdp" className="ml-1.5" />
              </p>
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

          {bank.status === "borrador" && (
            <details className="border border-line px-5 py-4 text-sm">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-crimson">
                Este banco no aplica a mi empresa
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Se elimina este borrador y su ficha. Si en realidad ya lo inscribiste en el SIPDP, no lo borres: anota su
                código arriba y, si dejaste de usarlo, registra la cancelación de la inscripción.
              </p>
              <form action={deleteDraftBankAction} className="mt-3">
                <input type="hidden" name="id" value={bank.id} />
                <SubmitButton className="btn btn-ghost btn-sm text-crimson">Eliminar borrador</SubmitButton>
              </form>
            </details>
          )}

        </div>
      </div>
    </div>
  );
}
