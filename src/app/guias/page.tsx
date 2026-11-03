import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ArrowRightIcon } from "@/components/icons";
import { GUIDES } from "@/lib/guides";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Guías de la Ley 29733 para empresas",
  description:
    "Guías prácticas de protección de datos personales en Perú: inscripción de bancos de datos, multas, DS 016-2024-JUS, derechos ARCO, incidentes, trabajadores y cámaras.",
  path: "/guias",
});

export default function GuidesIndex() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
  ];
  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <section className="container-page py-12 md:py-16">
        <h1 className="max-w-[24ch] font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
          Guías de protección de datos para empresas peruanas
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          Lo que exigen la Ley 29733 y su reglamento, el DS 016-2024-JUS, explicado para quien administra la empresa:
          gerencia, RR.HH., administración o el contador.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/guias/${guide.slug}`} className="card group flex h-full flex-col p-6 hover:border-ink">
                <h2 className="font-display text-xl leading-tight tracking-[-0.01em]">{guide.h1}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{guide.description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-crimson">
                  Leer la guía <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ContentShell>
  );
}
