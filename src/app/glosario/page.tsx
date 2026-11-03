import { ContentShell } from "@/components/site-chrome";
import { GLOSSARY } from "@/lib/glossary";
import { breadcrumbLd, absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Glosario de protección de datos personales en Perú",
  description:
    "Qué es un banco de datos, la ANPD, el SIPDP, los derechos ARCO, los datos sensibles, el encargado del tratamiento y el Oficial de Datos Personales, en lenguaje claro.",
  path: "/glosario",
});

export default function GlossaryPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Glosario", path: "/glosario" },
  ];
  const entries = Object.entries(GLOSSARY);
  const definedTerms = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Glosario de protección de datos personales en Perú",
    url: absoluteUrl("/glosario"),
    hasDefinedTerm: entries.map(([key, entry]) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      alternateName: entry.official,
      description: entry.plain,
      url: absoluteUrl(`/glosario#${key}`),
    })),
  };

  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs), definedTerms]}>
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <h1 className="font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
            Glosario de protección de datos
          </h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            Los términos de la Ley 29733 y el DS 016-2024-JUS que aparecen en una fiscalización, explicados con un
            ejemplo de empresa.
          </p>

          <nav aria-label="Términos" className="mt-8 flex flex-wrap gap-2">
            {entries.map(([key, entry]) => (
              <a key={key} href={`#${key}`} className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-ink">
                {entry.term}
              </a>
            ))}
          </nav>

          <dl className="mt-10 divide-y divide-line border-y border-line">
            {entries.map(([key, entry]) => (
              <div key={key} id={key} className="scroll-mt-24 py-6">
                <dt>
                  <span className="font-display text-[1.5rem] leading-tight tracking-[-0.02em]">{entry.term}</span>
                  <span className="mt-1 block font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">{entry.official}</span>
                </dt>
                <dd className="mt-3 text-[16px] leading-relaxed text-ink/90">
                  {entry.plain}
                  <span className="mt-2 block text-[15px] text-ink-soft">
                    <strong className="text-ink">Ejemplo:</strong> {entry.example}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </ContentShell>
  );
}
