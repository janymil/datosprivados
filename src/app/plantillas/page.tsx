import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ArrowRightIcon, FileIcon } from "@/components/icons";
import { DOCUMENT_ACTIONS, DOCUMENT_TABS } from "@/lib/document-catalog";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Plantillas Ley 29733: política de privacidad, consentimiento y más",
  description:
    "Modelos de política de privacidad, cláusula de consentimiento para trabajadores, documento de seguridad, cartel de videovigilancia, procedimiento ARCO y contrato de encargo para empresas en Perú.",
  path: "/plantillas",
});

export default function TemplatesPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Plantillas", path: "/plantillas" },
  ];

  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <section className="container-page py-12 md:py-16">
        <h1 className="max-w-[24ch] font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
          Plantillas de protección de datos para empresas
        </h1>
        <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
          Cada documento se genera con los datos de tu empresa, tus bancos de datos y las normas de tu sector, en lugar
          de un modelo genérico que hay que rellenar a mano. Así la política, la ficha SIPDP y el documento de seguridad
          dicen lo mismo.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/demo" prefetch={false} className="btn btn-primary h-12 px-6 text-base">
            Ver las plantillas en la demo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link href="/registro" className="btn btn-ghost h-12 px-6 text-base">
            Generarlas para mi empresa
          </Link>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Descarga gratis</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            <li>
              <Link href="/plantillas/politica-de-privacidad" className="card block h-full p-5 hover:border-ink">
                <p className="font-display text-lg leading-tight">Modelo de política de privacidad</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  El texto completo conforme a la Ley 29733, con tus datos entre corchetes.
                </p>
              </Link>
            </li>
            <li>
              <Link href="/plantillas/checklist-inscripcion-sipdp" className="card block h-full p-5 hover:border-ink">
                <p className="font-display text-lg leading-tight">Checklist de inscripción en el SIPDP</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Qué preparar antes de inscribir tus bancos de datos. Imprimible.
                </p>
              </Link>
            </li>
          </ul>
        </section>

        {DOCUMENT_ACTIONS.map((action) => {
          const docs = DOCUMENT_TABS.filter((tab) => tab.action === action.key);
          if (!docs.length) return null;
          return (
            <section key={action.key} className="mt-14">
              <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">{action.title}</h2>
              <p className="mt-1 text-[15.5px] text-ink-soft">{action.hint}</p>
              <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <li key={doc.key} className="card flex flex-col p-5">
                    <p className="flex items-start gap-2.5 font-display text-lg leading-tight">
                      <FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-crimson" />
                      {doc.label}
                    </p>
                    <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{doc.description}</p>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                      {doc.essential ? "Obligatorio para toda empresa" : doc.when ?? "Según tu caso"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="mt-12 max-w-[80ch] text-sm leading-relaxed text-ink-soft">
          Los documentos son borradores de trabajo basados en lo que declaras; recomendamos que un abogado los revise en
          casos complejos o con datos sensibles a gran escala.
        </p>
      </section>
    </ContentShell>
  );
}
