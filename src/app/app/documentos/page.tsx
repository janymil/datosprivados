import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDocument } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { generateDocumentAction, togglePublishAction } from "@/app/actions/documents";
import { DocBody } from "@/components/doc-body";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Documentos" };

const TABS = [
  { key: "politica", label: "Política de privacidad", short: "Política" },
  { key: "consentimiento", label: "Consentimientos", short: "Consentimientos" },
  { key: "seguridad", label: "Documento de seguridad", short: "Seguridad" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string }>;
}) {
  const { company } = await requireSession();
  const { tab, ok } = await searchParams;
  const active: TabKey = TABS.some((item) => item.key === tab) ? (tab as TabKey) : "politica";
  const meta = TABS.find((item) => item.key === active)!;
  const doc = getDocument(company.id, active);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Expediente · Documentación"
        title="Documentos"
        description="Textos generados con los datos de tu empresa. Revísalos antes de publicar y actualízalos cuando cambie un proceso."
      />

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/app/documentos?tab=${item.key}`}
            className={`border px-3 py-2 text-[12px] transition-colors ${
              active === item.key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper-2 text-ink-soft hover:border-line-strong hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {ok && (
        <p className="border-l-2 border-sage bg-sage/[0.07] px-4 py-3 text-[13px]">
          Documento generado. Revisa el texto y publícalo cuando esté listo.
        </p>
      )}

      {!doc ? (
        <div className="space-y-5">
          <EmptyState
            title={`Aún no generas ${meta.label.toLowerCase()}`}
            description={
              active === "politica"
                ? "La política se arma con tus bancos de datos: finalidades, categorías, plazos y encargados. Si aún no declaraste bancos, el texto saldrá incompleto."
                : active === "consentimiento"
                  ? "Genera los textos de consentimiento para web, WhatsApp, correo y formularios físicos."
                  : "El documento de seguridad describe tus medidas técnicas y organizativas. Es la base de tu expediente interno."
            }
          />
          <form action={generateDocumentAction}>
            <input type="hidden" name="kind" value={active} />
            <button type="submit" className="btn btn-primary">
              Generar {meta.label.toLowerCase()}
            </button>
          </form>
          {active === "politica" && (
            <p className="text-[12px] text-ink-soft">
              ¿Faltan bancos?{" "}
              <Link href="/app/bancos" className="link-underline text-ink">
                Revísalos antes de generar
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 border border-line bg-paper-2 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={doc.published ? "ok" : "neutral"}>
                  {doc.published ? "Publicada" : "Borrador"}
                </StatusPill>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
                  versión {doc.version} · {formatDateTime(doc.updated_at)}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl tracking-[-0.02em]">{meta.label}</h2>
              {active === "politica" && doc.published && (
                <p className="mt-1 text-[12px] text-ink-soft">
                  URL pública:{" "}
                  <Link href={`/p/${company.slug}`} className="link-underline text-ink">
                    /p/{company.slug}
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={doc.content} label="Copiar texto" />
              <DownloadButton text={doc.content} filename={`${active}-${company.slug}.txt`} />
              {active === "politica" && (
                <form action={togglePublishAction}>
                  <input type="hidden" name="kind" value={active} />
                  <input type="hidden" name="publish" value={doc.published ? "0" : "1"} />
                  <button type="submit" className={`btn btn-sm ${doc.published ? "btn-ghost" : "btn-primary"}`}>
                    {doc.published ? "Despublicar" : "Publicar en la web"}
                  </button>
                </form>
              )}
              <form action={generateDocumentAction}>
                <input type="hidden" name="kind" value={active} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  Regenerar
                </button>
              </form>
            </div>
          </div>

          <div className="border border-line bg-white p-6 md:p-10">
            <article className="mx-auto max-w-[720px]">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
                {company.name} · RUC {company.ruc}
              </p>
              <h3 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.03em]">{meta.label}</h3>
              <div className="mt-6">
                <DocBody content={doc.content} />
              </div>
            </article>
          </div>

          <p className="max-w-[80ch] text-[11.5px] leading-relaxed text-ink-soft">
            Estos documentos son borradores generados automáticamente y no constituyen asesoría legal.
            Un abogado debe validar el texto antes de publicarlo o presentarlo ante la ANPD.
          </p>
        </div>
      )}
    </div>
  );
}
