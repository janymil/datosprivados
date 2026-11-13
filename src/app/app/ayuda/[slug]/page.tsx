import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform-entity";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SECTIONS, TOPICS, topicBySlug } from "@/lib/help-content";
import { HELP_LEGAL_REVIEW, reviewState } from "@/lib/help-review";
import { HelpBlocks, slugifyHeading } from "@/components/help-blocks";
import { SparklesIcon } from "@/components/icons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  return { title: topic ? `${topic.title} · Ayuda` : "Ayuda" };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();

  const index = TOPICS.findIndex((item) => item.slug === topic.slug);
  const prev = TOPICS[index - 1];
  const next = TOPICS[index + 1];
  const section = SECTIONS.find((item) => item.id === topic.section);
  const related = topic.related.map((related) => topicBySlug(related)).filter((item) => item !== undefined);
  const headings = topic.blocks.flatMap((block) => (block.t === "h" ? [block.text] : []));
  const review = reviewState(topic.slug);
  const reviewedLabel = review
    ? new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Lima" }).format(
        new Date(`${review.reviewed}T12:00:00Z`)
      )
    : null;

  return (
    <article className="grid gap-10 lg:grid-cols-[1fr_15rem]">
      <div className="min-w-0">
        <nav aria-label="Ruta de navegación" className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
          <Link href="/app/ayuda" className="hover:text-crimson">
            Centro de ayuda
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{section?.title}</span>
        </nav>

        <h1 className="mt-3 font-display text-[2.2rem] leading-[1.06] tracking-[-0.03em] md:text-[2.8rem]">{topic.title}</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
          {topic.minutes} min de lectura
          {reviewedLabel && <> · revisado el {reviewedLabel}</>}
        </p>

        {review?.stale && (
          <p
            role="note"
            className="mt-5 border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed"
          >
            <strong>Este artículo puede estar desactualizado.</strong> Su última revisión fue hace más de un año
            ({reviewedLabel}). Si algo no coincide con lo que ves en la app, escribe a{" "}
            <a href={`mailto:${PLATFORM_CONTACT_EMAIL}`} className="link-underline font-medium text-ink">
              {PLATFORM_CONTACT_EMAIL}
            </a>
            .
          </p>
        )}

        <div className="mt-6 border-2 border-ink bg-paper-2 p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">En 30 segundos</p>
          <p className="mt-1.5 text-[1.1rem] leading-relaxed">{topic.tldr}</p>
          {topic.route && (
            <Link href={topic.route.href} className="btn btn-primary btn-sm mt-4">
              {topic.route.label} →
            </Link>
          )}
        </div>

        <div className="mt-8">
          <HelpBlocks blocks={topic.blocks} />
        </div>

        {topic.ask.length > 0 && (
          <section className="mt-12 border border-line-strong bg-paper-2 p-5" aria-labelledby="ask-title">
            <h2 id="ask-title" className="flex items-center gap-2 font-display text-[1.3rem] tracking-[-0.01em]">
              <SparklesIcon className="h-5 w-5 text-crimson" />
              ¿Sigues con dudas? Pregúntale al asistente
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.ask.map((question) => (
                <Link
                  key={question}
                  href={`/app/asistente?q=${encodeURIComponent(question)}`}
                  className="rounded-full border border-line-strong bg-paper px-3.5 py-1.5 text-sm transition-colors hover:border-crimson hover:text-crimson"
                >
                  {question}
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-title">
            <h2 id="related-title" className="label-mono">
              Te puede interesar
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} href={`/app/ayuda/${item.slug}`} className="border border-line bg-paper-2 p-4 transition-colors hover:border-ink">
                  <span className="block font-display text-[1.1rem] leading-snug">{item.title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{item.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <nav aria-label="Artículos anterior y siguiente" className="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/app/ayuda/${prev.slug}`} className="text-sm hover:text-crimson">
              <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">← Anterior</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/app/ayuda/${next.slug}`} className="text-sm hover:text-crimson sm:text-right">
              <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">Siguiente →</span>
              {next.title}
            </Link>
          )}
        </nav>
      </div>

      <aside className="no-print hidden lg:block">
        <div className="sticky top-6 space-y-5">
          {headings.length > 0 && (
            <nav aria-label="En este artículo">
              <p className="label-mono">En este artículo</p>
              <ul className="mt-2 space-y-1.5 border-l border-line pl-3 text-sm">
                {headings.map((heading) => (
                  <li key={heading}>
                    <a href={`#${slugifyHeading(heading)}`} className="text-ink-soft hover:text-crimson">
                      {heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <p className="border-t border-line pt-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.06em] text-ink-soft">
            {reviewedLabel ? `Revisado el ${reviewedLabel}` : "Sin fecha de revisión"}
            {HELP_LEGAL_REVIEW.at ? ` · revisión legal: ${HELP_LEGAL_REVIEW.by}` : " · revisión legal pendiente"}
          </p>
          <Link href="/app/ayuda" className="block font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson hover:underline">
            ← Volver al Centro de ayuda
          </Link>
        </div>
      </aside>
    </article>
  );
}
