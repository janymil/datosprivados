"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";
import { FAQ, SECTIONS, normalizeText, type SectionId } from "@/lib/help-content";

export type TopicCard = { slug: string; title: string; summary: string; minutes: number; section: SectionId };

/** Artículos agrupados por sección, con filtro por sección. */
export function HelpTopics({ topics }: { topics: TopicCard[] }) {
  const [section, setSection] = useState<SectionId | "todos">("todos");
  const visible = section === "todos" ? SECTIONS : SECTIONS.filter((item) => item.id === section);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar artículos por sección">
        {[{ id: "todos" as const, title: "Todos" }, ...SECTIONS].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              section === item.id ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper-2 hover:border-ink"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="space-y-9">
        {visible.map((group) => (
          <section key={group.id} aria-labelledby={`sec-${group.id}`}>
            <h3 id={`sec-${group.id}`} className="font-display text-[1.45rem] tracking-[-0.02em]">
              {group.title}
            </h3>
            <p className="mb-3 text-sm text-ink-soft">{group.blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {topics
                .filter((topic) => topic.section === group.id)
                .map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/app/ayuda/${topic.slug}`}
                    className="group flex flex-col justify-between border border-line bg-paper-2 p-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[4px_4px_0_0_var(--ink)]"
                  >
                    <span>
                      <span className="block font-display text-[1.15rem] leading-snug tracking-[-0.01em] group-hover:text-crimson">{topic.title}</span>
                      <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-ink-soft">{topic.summary}</span>
                    </span>
                    <span className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                      <span>{topic.minutes} min de lectura</span>
                      <span className="text-crimson" aria-hidden="true">
                        Leer →
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Glosario con filtro; abre solo el término al que apunta el enlace (#glosario-…). */
export function HelpGlossary() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const match = /^#glosario-(.+)$/.exec(window.location.hash);
      if (match && match[1] in GLOSSARY) {
        setOpenKey(match[1]);
        document.getElementById(`glosario-${match[1]}`)?.scrollIntoView({ block: "center" });
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const entries = useMemo(() => {
    const q = normalizeText(query.trim());
    return (Object.entries(GLOSSARY) as Array<[string, GlossaryEntry]>).filter(
      ([, entry]) => !q || normalizeText(`${entry.term} ${entry.official} ${entry.plain}`).includes(q)
    );
  }, [query]);

  return (
    <div>
      <label htmlFor="glossary-filter" className="sr-only">
        Filtrar el glosario
      </label>
      <input
        id="glossary-filter"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filtrar términos: ANPD, ARCO, UIT…"
        className="input mb-4 w-full max-w-md bg-white"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, entry]) => {
          const open = openKey === key;
          return (
            <div key={key} id={`glosario-${key}`} className={`scroll-mt-24 border bg-paper-2 ${open ? "border-ink" : "border-line"}`}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenKey(open ? null : key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span>
                  <span className="block font-mono text-sm font-bold uppercase tracking-[0.06em] text-crimson">{entry.term}</span>
                  <span className="block text-[0.9rem] leading-snug text-ink-soft">{entry.official}</span>
                </span>
                <span aria-hidden="true" className="font-mono text-lg text-ink-soft">
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                  <p className="leading-relaxed">{entry.plain}</p>
                  <p className="border-l-4 border-sage bg-sage/[0.09] px-3 py-2 text-[0.95rem] leading-relaxed">
                    <strong className="font-mono text-[11px] uppercase tracking-[0.06em] text-sage">Ejemplo real: </strong>
                    {entry.example}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-ink-soft">No hay términos con esa búsqueda.</p>}
      </div>
    </div>
  );
}

/** Preguntas frecuentes con filtro; cada una enlaza a su artículo completo. */
export function HelpFaq() {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const q = normalizeText(query.trim());
    return FAQ.filter((faq) => !q || normalizeText(`${faq.q} ${faq.a}`).includes(q));
  }, [query]);

  return (
    <div>
      <label htmlFor="faq-filter" className="sr-only">
        Filtrar preguntas frecuentes
      </label>
      <input
        id="faq-filter"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filtrar preguntas…"
        className="input mb-4 w-full max-w-md bg-white"
      />
      <div className="divide-y divide-line border border-line bg-paper-2">
        {items.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[1.1rem] leading-snug tracking-[-0.01em] hover:text-crimson [&::-webkit-details-marker]:hidden">
              {faq.q}
              <span aria-hidden="true" className="font-mono text-lg text-ink-soft group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden font-mono text-lg text-ink-soft group-open:inline">
                −
              </span>
            </summary>
            <div className="px-5 pb-5">
              <p className="max-w-[70ch] leading-relaxed text-ink/90">{faq.a}</p>
              {faq.topic && (
                <Link href={`/app/ayuda/${faq.topic}`} className="mt-2 inline-block font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson hover:underline">
                  Ver la explicación completa →
                </Link>
              )}
            </div>
          </details>
        ))}
        {items.length === 0 && <p className="px-5 py-4 text-ink-soft">No hay preguntas con esa búsqueda.</p>}
      </div>
    </div>
  );
}
