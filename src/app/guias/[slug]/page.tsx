import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell, RichText } from "@/components/site-chrome";
import { CheckIcon } from "@/components/icons";
import { GUIDES, getGuide } from "@/lib/guides";
import { absoluteUrl, breadcrumbLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return pageMetadata({ title: guide.title, description: guide.description, path: `/guias/${guide.slug}` });
}

const stripMarkup = (text: string) => text.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const path = `/guias/${guide.slug}`;
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
    { name: guide.h1, path },
  ];
  const structuredData: unknown[] = [
    breadcrumbLd(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.h1,
      description: guide.description,
      dateModified: guide.updated,
      inLanguage: "es-PE",
      mainEntityOfPage: absoluteUrl(path),
      author: { "@type": "Organization", name: "DatosPrivados", url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: "DatosPrivados", url: absoluteUrl("/") },
    },
  ];
  if (guide.faq?.length) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: stripMarkup(item.a) },
      })),
    });
  }
  const related = guide.related.map(getGuide).filter((item) => item !== undefined);

  return (
    <ContentShell crumbs={crumbs} structuredData={structuredData}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[760px]">
          <p className="label-mono">Guía · Ley 29733 · Actualizada el {guide.updated.split("-").reverse().join("/")}</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">{guide.h1}</h1>

          <div className="mt-8 border-l-3 border-crimson bg-crimson/[0.06] px-5 py-4">
            <p className="label-mono text-crimson">Respuesta corta</p>
            <p className="mt-2 text-[17px] leading-relaxed">
              <RichText text={guide.answer} />
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-[1.65rem] leading-snug tracking-[-0.02em]">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[16.5px] leading-relaxed text-ink/90">
                    <RichText text={paragraph} />
                  </p>
                ))}
                {section.table && (
                  <div className="mt-4 overflow-x-auto border border-line">
                    <table className="w-full min-w-[520px] text-left text-[15px]">
                      <thead className="bg-paper-2">
                        <tr>
                          {section.table.head.map((cell) => (
                            <th key={cell} scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {section.table.rows.map((row) => (
                          <tr key={row.join("|")}>
                            {row.map((cell, index) => (
                              <td key={index} className={`px-4 py-3 align-top ${index === 0 ? "font-medium" : ""}`}>
                                <RichText text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.bullets && (
                  <ul className="mt-4 space-y-2.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-[16px] leading-relaxed text-ink/90">
                        <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                        <span><RichText text={bullet} /></span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.steps && (
                  <ol className="mt-4 space-y-3">
                    {section.steps.map((step, index) => (
                      <li key={step} className="flex gap-4 text-[16px] leading-relaxed text-ink/90">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line-strong font-mono text-sm text-crimson">
                          {index + 1}
                        </span>
                        <span className="pt-0.5"><RichText text={step} /></span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>

          {guide.faq && (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Preguntas frecuentes</h2>
              <dl className="mt-4 divide-y divide-line">
                {guide.faq.map((item) => (
                  <div key={item.q} className="py-4">
                    <dt className="text-[17px] font-medium">{item.q}</dt>
                    <dd className="mt-1.5 text-[16px] leading-relaxed text-ink-soft"><RichText text={item.a} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <p className="mt-10 text-sm leading-relaxed text-ink-soft">
            Esta guía es informativa y resume la Ley 29733 y el DS 016-2024-JUS. No reemplaza la asesoría legal para
            casos concretos.
          </p>

          {related.length > 0 && (
            <section className="mt-10 border-t border-line pt-8">
              <h2 className="label-mono">Sigue leyendo</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/guias/${item.slug}`} className="card block h-full p-4 text-[15px] font-medium leading-snug hover:border-ink">
                      {item.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </ContentShell>
  );
}
