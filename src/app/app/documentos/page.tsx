import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDocument } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { generateDocumentAction, togglePublishAction } from "@/app/actions/documents";
import { DocBody } from "@/components/doc-body";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { ConsentAiAuditor } from "@/components/consent-ai-auditor";
import { BusinessDocumentAdvisor } from "@/components/business-doc-advisor";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { GuideBox, Term } from "@/components/help";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";

export const metadata = { title: "Documentos" };

const TABS = [
  {
    key: "politica",
    label: "1. Política de privacidad (Pública)",
    short: "Política",
    where: "Se publica en tu web, pie de página, bio de Instagram o perfil de WhatsApp Business.",
  },
  {
    key: "consentimiento",
    label: "2. Textos de consentimiento (WhatsApp / Web)",
    short: "Consentimientos",
    where: "Mensajes cortos listos para copiar en tus chats de WhatsApp, formularios web o cupones físicos.",
  },
  {
    key: "seguridad",
    label: "3. Documento de seguridad (Interno)",
    short: "Seguridad",
    where: "Manual interno privado. NO se publica en internet; se guarda firmado por si la ANPD te inspecciona.",
  },
  {
    key: "clausulas",
    label: "4. Contratos, Confidencialidad y Cartel CCTV (Interno)",
    short: "Cláusulas y Actas",
    where: "Para hacer firmar a tus trabajadores y proveedores (contador/courier), y para pegar el cartel de cámaras en tu local.",
  },
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
        title="Generador de documentos legales"
        description={
          <>
            PrivadoPE redacta automáticamente tus documentos usando los datos de tu empresa y tus{" "}
            <Term k="banco">bancos de datos</Term> declarados, adaptados a la <Term k="ley29733">Ley 29733</Term> y al{" "}
            <Term k="ds016">DS 016-2024-JUS</Term>.
          </>
        }
      />

      <GuideBox
        title="¿Para qué sirve cada documento y dónde lo pongo?"
        what={
          <>
            <strong>1) Política de Privacidad:</strong> Avisa a tus clientes qué haces con sus datos.{" "}
            <strong>2) Consentimientos:</strong> Textos cortos para pedir permiso antes de mandar ofertas.{" "}
            <strong>3) <Term k="seguridad">Documento de Seguridad</Term>:</strong> Tu manual interno de protección.{" "}
            <strong>4) Contratos y cartel:</strong> Confidencialidad para tu equipo, cláusula para proveedores y cartel de cámaras.
          </>
        }
        why={
          <>
            La <Term k="anpd">ANPD</Term> sanciona tanto por no informar al público (no tener Política o consentimiento) como por no tener medidas internas escritas (no tener Documento de Seguridad).
          </>
        }
        how={
          <>
            Revisa cada pestaña abajo. En la <strong>Política</strong>, haz clic en «Publicar en la web» para obtener tu enlace público (<span className="font-mono text-[11px]">/p/{company.slug}</span>) y ponlo en tu web o WhatsApp.
          </>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-line pb-3.5">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/app/documentos?tab=${item.key}`}
            className={`border px-4 py-2.5 text-sm font-medium transition-colors ${
              active === item.key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper-2 text-ink-soft hover:border-line-strong hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="rounded-[3px] border-l-3 border-ink bg-paper-2 px-4 py-3 text-[15px] text-ink">
        <strong>¿Dónde usar este documento?</strong> {meta.where}
      </div>

      {ok && <Toast message="Documento actualizado con tus últimos datos." />}

      {!doc ? (
        <div className="space-y-5">
          <EmptyState
            title={`Aún no generas: ${meta.label}`}
            description={
              active === "politica"
                ? "La Política de Privacidad se arma automáticamente leyendo tus bancos de datos (Clientes, Trabajadores, etc.). Si ya declaraste tus bancos, haz clic abajo para generarla en 1 segundo."
                : active === "consentimiento"
                  ? "Genera las frases exactas para pedir permiso en formularios web, chats de WhatsApp, correos y formularios en papel."
                  : active === "seguridad"
                    ? "El Documento de Seguridad describe quién tiene acceso a los datos en tu empresa, tus copias de respaldo y cómo actúas ante incidentes."
                    : "Formatos de confidencialidad para tu equipo, cláusula para proveedores, cartel de cámaras y acta del responsable de privacidad."
            }
          />
          <form action={generateDocumentAction}>
            <input type="hidden" name="kind" value={active} />
            <SubmitButton pendingLabel="Generando…">Generar {meta.short.toLowerCase()} ahora</SubmitButton>
          </form>
          {active === "politica" && (
            <p className="text-sm text-ink-soft">
              ¿Aún no declaraste tus listas?{" "}
              <Link href="/app/bancos" className="link-underline text-ink">
                Declara primero tus bancos de datos aquí
              </Link>{" "}
              para que tu política salga completa.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 border border-line bg-paper-2 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusPill tone={doc.published ? "ok" : "neutral"}>
                  {doc.published ? "Publicada con enlace activo" : "Borrador privado"}
                </StatusPill>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                  versión {doc.version} · {formatDateTime(doc.updated_at)}
                </span>
              </div>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.02em]">{meta.label}</h2>
              {active === "politica" && Boolean(doc.published) && (
                <p className="mt-1.5 text-[15px] text-ink-soft">
                  Tu enlace público para compartir con clientes:{" "}
                  <Link href={`/p/${company.slug}`} target="_blank" className="link-underline font-medium text-ink">
                    /p/{company.slug} ↗
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <CopyButton text={doc.content} label="Copiar texto" />
              <DownloadButton text={doc.content} filename={`${active}-${company.slug}.txt`} />
              {active === "politica" && (
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
              <form action={generateDocumentAction}>
                <input type="hidden" name="kind" value={active} />
                <SubmitButton pendingLabel="Actualizando…" className="btn btn-ghost btn-sm">
                  Actualizar con mis últimos datos
                </SubmitButton>
              </form>
            </div>
          </div>

          <div className="border border-line bg-white p-6 md:p-10">
            <article className="mx-auto max-w-[780px]">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
                {company.name} · RUC {company.ruc}
              </p>
              <h3 className="mt-2 font-display text-[2.1rem] leading-tight tracking-[-0.03em]">{meta.short}</h3>
              <div className="mt-6">
                <DocBody key={`${doc.id}-${doc.version}`} content={doc.content} />
              </div>
            </article>
          </div>

          <p className="max-w-[80ch] text-sm leading-relaxed text-ink-soft">
            Nota: Estos documentos se arman automáticamente a partir de lo que declaraste en PrivadoPE. Si realizas tratamientos especiales o masivos, te sugerimos revisarlos con tu abogado de confianza.
          </p>
        </div>
      )}

      {active === "consentimiento" && <ConsentAiAuditor companyPlan={company.plan} />}
      {!doc && <BusinessDocumentAdvisor />}
    </div>
  );
}
