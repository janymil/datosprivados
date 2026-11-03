import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ChecklistTool } from "@/components/checklist-tool";
import { DownloadButton } from "@/components/download-button";
import { PrintButton } from "@/components/print-button";
import { SIPDP_CHECKLIST, checklistText } from "@/lib/templates";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

const PATH = "/plantillas/checklist-inscripcion-sipdp";

export const metadata = pageMetadata({
  title: "Checklist para inscribir bancos de datos en el SIPDP (descargable)",
  description:
    "Lista de verificación para inscribir los bancos de datos de tu empresa en el SIPDP: qué preparar, qué datos pide la ficha y qué hacer después. Imprímela o descárgala gratis.",
  path: PATH,
});

export default function SipdpChecklistPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Plantillas", path: "/plantillas" },
    { name: "Checklist SIPDP", path: PATH },
  ];

  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[780px]">
          <p className="label-mono">Checklist gratuito · imprimible</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">
            Checklist de inscripción de bancos de datos en el SIPDP
          </h1>
          <p className="mt-5 max-w-[64ch] text-[17.5px] leading-relaxed text-ink-soft">
            La inscripción en <strong>sipdp.minjus.gob.pe</strong> es gratuita y de aprobación automática desde el 31 de
            marzo de 2025. Lo que toma tiempo es llegar con todo preparado. Marca cada punto, imprime la lista o
            descárgala para tu equipo.
          </p>

          <div className="no-print mt-6 flex flex-wrap gap-3">
            <PrintButton label="Imprimir / guardar PDF" />
            <DownloadButton text={checklistText()} filename="checklist-inscripcion-sipdp.txt" label="Descargar (.txt)" />
          </div>

          <ChecklistTool sections={SIPDP_CHECKLIST} />

          <div className="no-print mt-12 border-l-3 border-crimson bg-crimson/[0.06] px-5 py-4">
            <p className="font-display text-xl leading-tight">Salta la preparación</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
              Con DatosPrivados eliges tu sector y la ficha de cada banco ya viene redactada, lista para copiar al
              portal. Registras el código obtenido y todo queda fechado.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href="/registro" className="btn btn-primary">Preparar mis fichas</Link>
              <Link href="/guias/inscribir-banco-de-datos-personales" className="btn btn-ghost">
                Leer la guía paso a paso
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm leading-relaxed text-ink-soft">
            Lista informativa basada en la Ley 29733 y el DS 016-2024-JUS. Declara solo los bancos de datos que tu
            empresa realmente tiene. También te sirve el{" "}
            <Link href="/plantillas/politica-de-privacidad" className="link-underline text-ink">
              modelo de política de privacidad
            </Link>
            .
          </p>
        </div>
      </article>
    </ContentShell>
  );
}
