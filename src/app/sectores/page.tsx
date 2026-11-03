import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ArrowRightIcon } from "@/components/icons";
import { INDUSTRIES } from "@/lib/industries";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Protección de datos por sector: clínicas, colegios, e-commerce y más",
  description:
    "Qué bancos de datos inscribir, qué normas aplican y cuánto conservar cada dato en clínicas, colegios, software, tiendas online, financieras, inmobiliarias, hoteles, estudios y agencias de empleo.",
  path: "/sectores",
});

export default function IndustriesIndex() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Sectores", path: "/sectores" },
  ];
  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <section className="container-page py-12 md:py-16">
        <h1 className="max-w-[24ch] font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
          La Ley 29733 aplicada a tu sector
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          Cada sector trata datos distintos y tiene normas propias. Estas páginas resumen qué inscribir, qué conservar y
          qué riesgos vigilar. Dentro de la plataforma hay más de 60 plantillas de rubro.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((industry) => (
            <li key={industry.slug}>
              <Link href={`/sectores/${industry.slug}`} className="card flex h-full flex-col p-6 hover:border-ink">
                <h2 className="font-display text-xl leading-tight tracking-[-0.01em]">{industry.name}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{industry.intro}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-crimson">
                  Ver el detalle <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-[15.5px] text-ink-soft">
          ¿Tu empresa tiene trabajadores en planilla? Lee también{" "}
          <Link href="/guias/datos-personales-de-trabajadores" className="link-underline text-ink">
            protección de datos de trabajadores y postulantes
          </Link>
          .
        </p>
      </section>
    </ContentShell>
  );
}
