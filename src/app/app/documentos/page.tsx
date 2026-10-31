import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDocument, listBanks, listDocuments, listProviders, listSecurityChecks } from "@/lib/data";
import { documentFit, sectorLegalProfile } from "@/lib/sector-legal";
import { STALE_REASON_LABELS, TEMPLATE_VERSIONS, documentFreshness, type Freshness } from "@/lib/document-freshness";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  generateDocumentAction,
  regenerateOutdatedAction,
  togglePublishAction,
  toggleSecurityCheckAction,
} from "@/app/actions/documents";
import {
  DOCUMENT_ACTIONS,
  DOCUMENT_TABS,
  documentTab,
  isDocumentKind,
  type DocumentTab,
} from "@/lib/document-catalog";
import type { Company, DocumentRow } from "@/lib/db";
import { SECURITY_CHECKS } from "@/lib/security-checks";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { DocBody } from "@/components/doc-body";
import { CopyButton } from "@/components/copy-button";
import { demoPreview, isDemoCompany } from "@/lib/demo";
import { DownloadButton } from "@/components/download-button";
import { ConsentAiAuditor } from "@/components/consent-ai-auditor";
import { BusinessDocumentAdvisor } from "@/components/business-doc-advisor";
import { PageHeader, StatusPill } from "@/components/ui";
import { GuideBox, Term } from "@/components/help";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";
import { companyIdentityLine, appUrl } from "@/lib/documents";

export const metadata = { title: "Documentos" };

/** Estado de un documento en una palabra, según lo que el dueño tiene que hacer con él. */
function documentStatus(meta: DocumentTab, doc: DocumentRow | undefined, freshness?: Freshness) {
  if (!doc) return { tone: "neutral" as const, label: "Falta" };
  if (freshness?.stale) return { tone: "warn" as const, label: "Desactualizado" };
  if (meta.shareable) {
    return doc.published
      ? { tone: "ok" as const, label: "Publicado" }
      : { tone: "warn" as const, label: "Borrador" };
  }
  const ready = meta.action === "firmar" ? "Listo para firmar" : meta.action === "guardar" ? "Listo" : "Listo para pegar";
  return { tone: "ok" as const, label: ready };
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; regen?: string }>;
}) {
  const { company } = await requireSession();
  const { tab, ok, regen } = await searchParams;

  if (!tab || !isDocumentKind(tab)) {
    return <DocumentsOverview company={company} regenerated={regen} />;
  }

  const active = tab;
  const meta = documentTab(active)!;
  const banks = listBanks(company.id);
  const fit = documentFit(active, company, banks);
  const storedDoc = getDocument(company.id, active);
  // En la demo el texto se recorta en el servidor: el documento completo no llega al navegador.
  const demo = isDemoCompany(company);
  const doc = storedDoc && demo ? { ...storedDoc, content: demoPreview(storedDoc.content) } : storedDoc;
  const freshness = doc ? documentFreshness(doc, company, banks, listProviders(company.id)) : undefined;
  const status = documentStatus(meta, doc, freshness);
  const canPublish = meta.shareable === true;
  const securityDone = active === "seguridad" ? listSecurityChecks(company.id) : new Map<string, string>();
  const securityDoneCount = SECURITY_CHECKS.filter((item) => securityDone.has(item.id)).length;

  return (
    <div className="space-y-6">
      <Link
        href="/app/documentos"
        className="inline-flex items-center gap-1.5 text-[15px] font-medium text-ink-soft hover:text-ink"
      >
        ← Todos los documentos
      </Link>

      {ok && <Toast message="Documento actualizado con tus últimos datos." />}

      <section className="card p-6 md:p-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {doc && (
            <span className="text-sm text-ink-soft">
              Versión {doc.version} · plantilla{" "}
              {doc.template_version != null ? `v${doc.template_version}` : "anterior"} · {formatDateTime(doc.updated_at)}
            </span>
          )}
        </div>
        {doc && freshness?.stale && (
          <div className="mt-4 border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed">
            <strong>Este documento está desactualizado.</strong>{" "}
            {freshness.reasons.map((reason) => STALE_REASON_LABELS[reason]).join(" · ")}. Actualízalo para que refleje la
            plantilla vigente (v{TEMPLATE_VERSIONS[active]}) y tus datos actuales.
            {meta.action === "firmar" && " Si ya lo imprimiste o lo firmaron, deberás volver a firmarlo."}
            {doc.published ? " Seguirá publicado mientras tanto." : ""}
            <form action={generateDocumentAction} className="mt-3">
              <input type="hidden" name="kind" value={active} />
              <SubmitButton pendingLabel="Actualizando…" className="btn btn-primary btn-sm">
                Actualizar ahora
              </SubmitButton>
            </form>
          </div>
        )}
        <h1 className="mt-3 font-display text-[2rem] leading-tight tracking-[-0.03em]">{meta.label}</h1>
        <p className="mt-2 max-w-[68ch] text-base leading-relaxed text-ink-soft">{meta.description}</p>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed">
          <strong>Dónde va:</strong> {meta.where}
        </p>
        <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
          <strong className="text-ink">Para tu rubro ({sectorLegalProfile(company).title}):</strong>{" "}
          {fit.level === "esencial" ? "esencial" : fit.level === "recomendado" ? "recomendado" : "opcional"}. {fit.reason}
        </p>

        {!doc ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={generateDocumentAction}>
              <input type="hidden" name="kind" value={active} />
              <SubmitButton pendingLabel="Generando…">Generar con mis datos</SubmitButton>
            </form>
            {active === "politica" && (
              <p className="text-sm text-ink-soft">
                Antes,{" "}
                <Link href="/app/bancos" className="link-underline text-ink">
                  declara tus bancos de datos
                </Link>{" "}
                para que la política salga completa.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
            {canPublish && (
              <form action={togglePublishAction}>
                <input type="hidden" name="kind" value={active} />
                <input type="hidden" name="publish" value={doc.published ? "0" : "1"} />
                <SubmitButton
                  pendingLabel={doc.published ? "Ocultando…" : "Publicando…"}
                  className={`btn btn-sm ${doc.published ? "btn-ghost" : "btn-primary"}`}
                >
                  {doc.published ? "Ocultar enlace público" : "Publicar enlace público"}
                </SubmitButton>
              </form>
            )}
            <CopyButton text={doc.content} label="Copiar texto" locked={demo} />
            <DownloadButton text={doc.content} filename={`${active}-${company.slug}.txt`} locked={demo} />
            <form action={generateDocumentAction}>
              <input type="hidden" name="kind" value={active} />
              <SubmitButton pendingLabel="Actualizando…" className="btn btn-ghost btn-sm">
                Actualizar con mis últimos datos
              </SubmitButton>
            </form>
          </div>
        )}

        {canPublish && doc?.published ? (
          <p className="mt-4 text-[15px] text-ink-soft">
            Tu enlace:{" "}
            <Link href={`/p/${company.slug}`} target="_blank" className="link-underline font-medium text-ink">
              {appUrl().replace(/^https?:\/\//, "")}/p/{company.slug} ↗
            </Link>
          </p>
        ) : null}
      </section>

      {active === "seguridad" && doc && (
        <section className="card p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-[-0.02em]">Medidas que ya aplicas</h2>
              <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                La ley no pide solo el texto: pide que las medidas existan (arts. 46 y 47). Marca las que ya aplicas y
                queda la fecha como prueba.
              </p>
            </div>
            <StatusPill tone={securityDoneCount === SECURITY_CHECKS.length ? "ok" : "neutral"}>
              {securityDoneCount} de {SECURITY_CHECKS.length}
            </StatusPill>
          </div>

          <ul className="mt-5 divide-y divide-line border-t border-line">
            {SECURITY_CHECKS.map((item) => {
              const doneAt = securityDone.get(item.id);
              return (
                <li key={item.id} className="flex items-start gap-3.5 py-4">
                  <form action={toggleSecurityCheckAction} className="mt-0.5 shrink-0">
                    <input type="hidden" name="item" value={item.id} />
                    <button
                      type="submit"
                      role="checkbox"
                      aria-checked={Boolean(doneAt)}
                      aria-label={`${doneAt ? "Desmarcar" : "Marcar"} «${item.label}»`}
                      className={`flex h-5 w-5 items-center justify-center border transition-colors ${
                        doneAt
                          ? "border-sage bg-sage text-paper"
                          : "border-line-strong bg-paper text-transparent hover:border-ink"
                      }`}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[15.5px] font-medium leading-snug ${doneAt ? "" : "text-ink-soft"}`}>
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-ink-soft">{item.detail}</p>
                  </div>
                  {doneAt && (
                    <span className="shrink-0 font-mono text-xs uppercase tracking-[0.06em] text-sage">
                      {formatDate(doneAt, "short")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {active === "consentimiento" && <ConsentAiAuditor companyPlan={company.plan} />}

      {doc && (
        <details className="group border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-[15.5px] font-medium [&::-webkit-details-marker]:hidden">
            <span>Ver el texto completo</span>
            <span className="text-sm text-ink-soft group-open:hidden">Mostrar ↓</span>
            <span className="hidden text-sm text-ink-soft group-open:inline">Ocultar ↑</span>
          </summary>
          <div className="border-t border-line p-6 md:p-10">
            <article className="mx-auto max-w-[780px]">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
                {companyIdentityLine(company)}
              </p>
              <h2 className="mt-2 font-display text-[2.1rem] leading-tight tracking-[-0.03em]">{meta.short}</h2>
              <div className="mt-6">
                <DocBody key={`${doc.id}-${doc.version}`} content={doc.content} />
              </div>
            </article>
          </div>
        </details>
      )}

      <p className="max-w-[80ch] text-sm leading-relaxed text-ink-soft">
        Es un borrador armado con lo que declaraste. Si manejas datos sensibles a gran escala, haz que lo revise tu
        abogado.
      </p>
    </div>
  );
}

function DocumentsOverview({ company, regenerated }: { company: Company; regenerated?: string }) {
  const docs = new Map(listDocuments(company.id).map((d) => [d.kind, d]));
  const banks = listBanks(company.id);
  const providers = listProviders(company.id);
  const fits = new Map(DOCUMENT_TABS.map((t) => [t.key, documentFit(t.key, company, banks)]));
  const freshness = new Map(
    [...docs.values()].map((d) => [d.kind, documentFreshness(d, company, banks, providers)] as const)
  );
  const outdated = [...docs.values()].filter((d) => freshness.get(d.kind)?.stale);
  const needsResign = outdated.filter((d) => documentTab(d.kind)?.action === "firmar").length;
  const regeneratedCount = regenerated === undefined ? undefined : Number(regenerated);
  const essentials = DOCUMENT_TABS.filter((t) => fits.get(t.key)?.level === "esencial");
  const essentialsDone = essentials.filter((t) => {
    const d = docs.get(t.key);
    return t.shareable ? Boolean(d?.published) : Boolean(d);
  }).length;

  return (
    <div className="space-y-7">
      {regeneratedCount !== undefined && Number.isFinite(regeneratedCount) && (
        <Toast
          message={
            regeneratedCount > 0
              ? `${regeneratedCount} ${regeneratedCount === 1 ? "documento actualizado" : "documentos actualizados"}.`
              : "No había documentos desactualizados."
          }
        />
      )}
      {outdated.length > 0 && (
        <section className="card border-l-3 border-ochre p-6">
          <h2 className="font-display text-xl tracking-[-0.02em]">
            {outdated.length} {outdated.length === 1 ? "documento desactualizado" : "documentos desactualizados"}
          </h2>
          <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
            Mejoramos las plantillas legales o cambiaron los datos de tu empresa, tu rubro o tus bancos de datos desde que
            los generaste.
            {needsResign > 0 &&
              ` ${needsResign} ${needsResign === 1 ? "es de los que se firman" : "son de los que se firman"}: tendrás que volver a firmarlos.`}
          </p>
          <ul className="mt-3 space-y-1 text-[15px]">
            {outdated.map((d) => (
              <li key={d.kind}>
                <Link href={`/app/documentos?tab=${d.kind}`} className="link-underline font-medium">
                  {documentTab(d.kind)?.label ?? d.kind}
                </Link>{" "}
                <span className="text-ink-soft">
                  — {freshness.get(d.kind)!.reasons.map((r) => STALE_REASON_LABELS[r].toLowerCase()).join("; ")}
                </span>
              </li>
            ))}
          </ul>
          <form action={regenerateOutdatedAction} className="mt-4">
            <SubmitButton pendingLabel="Actualizando…" className="btn btn-primary btn-sm">
              Actualizar {outdated.length === 1 ? "el documento" : `los ${outdated.length} documentos`}
            </SubmitButton>
          </form>
        </section>
      )}
      <PageHeader
        title="Documentos"
        description={
          <>
            Se arman solos con los datos de tu empresa y tus <Term k="banco">bancos de datos</Term>. Empieza por los{" "}
            <strong>esenciales</strong>: llevas {essentialsDone} de {essentials.length}.
          </>
        }
      />

      <GuideBox
        title="¿Para qué sirve cada documento?"
        what={
          <>
            Unos los lee tu cliente (política, avisos, consentimientos) y otros son internos: los firma tu equipo o se
            guardan por si la <Term k="anpd">ANPD</Term> fiscaliza.
          </>
        }
        why={
          <>
            La ANPD sanciona tanto por no informar al público como por no tener medidas internas escritas.
          </>
        }
        how={
          <>
            Abre cada documento marcado como <strong>Esencial</strong>, revísalo y haz lo que dice su grupo: publicar,
            hacer firmar o guardar. Los demás, solo si aplican a tu caso.
          </>
        }
      />

      {DOCUMENT_ACTIONS.map((group) => {
        const rank = { esencial: 0, recomendado: 1, opcional: 2 } as const;
        const items = DOCUMENT_TABS.filter((t) => t.action === group.key).sort(
          (a, b) => rank[fits.get(a.key)!.level] - rank[fits.get(b.key)!.level]
        );
        return (
          <section key={group.key} className="card overflow-hidden">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-display text-xl tracking-[-0.02em]">{group.title}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{group.hint}</p>
            </div>
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const doc = docs.get(item.key);
                const status = documentStatus(item, doc, freshness.get(item.key));
                const fit = fits.get(item.key)!;
                return (
                  <li key={item.key}>
                    <Link
                      href={`/app/documentos?tab=${item.key}`}
                      className="group flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-ink/[0.02] sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-base font-medium group-hover:text-crimson">
                          {item.label}
                          {fit.level === "esencial" && (
                            <span className="rounded-full bg-crimson/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-crimson">
                              Esencial
                            </span>
                          )}
                          {fit.level === "recomendado" && (
                            <span className="rounded-full bg-ochre/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">
                              Recomendado
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-ink-soft">{fit.reason}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        <ArrowRightIcon className="h-4 w-4 text-ink-soft group-hover:text-crimson" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <BusinessDocumentAdvisor />
    </div>
  );
}
