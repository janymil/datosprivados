"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchDocs, type SearchDoc } from "@/lib/help-content";
import { SearchIcon, SparklesIcon } from "./icons";

const KIND_LABEL = { articulo: "Artículo", pregunta: "Pregunta", glosario: "Glosario" } as const;
const KIND_STYLE = {
  articulo: "border-crimson/40 bg-crimson/10 text-crimson",
  pregunta: "border-ochre/40 bg-ochre/10 text-ochre",
  glosario: "border-sage/40 bg-sage/10 text-sage",
} as const;

const SUGGESTIONS = ["¿Por dónde empiezo?", "plazo solicitud ARCO", "48 horas incidente", "inscribir en el SIPDP", "cámaras de seguridad", "multas"];

function truncate(text: string, max = 190) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Buscador del Centro de ayuda: artículos, preguntas y glosario, sin salir de la página. */
export function HelpSearch({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchDocs(docs, query, 8), [docs, query]);
  const searching = query.trim().length > 1;

  // «/» enfoca el buscador desde cualquier parte de la página.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const askHref = `/app/asistente?q=${encodeURIComponent(query.trim().slice(0, 300))}`;

  return (
    <div role="search" className="relative">
      <label htmlFor="help-search" className="sr-only">
        Buscar en el Centro de ayuda
      </label>
      <div className="flex items-center gap-3 border-2 border-ink bg-white px-4 py-3.5 shadow-[6px_6px_0_0_var(--ink)] focus-within:border-crimson focus-within:shadow-[6px_6px_0_0_var(--crimson)]">
        <SearchIcon className="h-5 w-5 shrink-0 text-ink-soft" />
        <input
          id="help-search"
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
            if (event.key === "ArrowDown" && hits.length) {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, hits.length - 1));
            }
            if (event.key === "ArrowUp" && hits.length) {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            }
            if (event.key === "Enter" && hits[active]) {
              window.location.assign(hits[active].doc.href);
            }
          }}
          placeholder="Escribe tu duda: «cámaras», «responder un reclamo», «cuánto cuesta»…"
          className="min-w-0 flex-1 appearance-none bg-transparent text-[1.05rem] !outline-none placeholder:text-ink-soft/70 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-crimson"
          >
            Borrar
          </button>
        ) : (
          <kbd className="hidden rounded-[2px] border border-line-strong px-2 py-0.5 font-mono text-xs text-ink-soft sm:block" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      {!searching && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">Prueba con:</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-line-strong bg-paper-2 px-3 py-1 text-sm transition-colors hover:border-crimson hover:text-crimson"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {searching && (
        <div id="help-results" className="mt-5 border border-line-strong bg-paper-2" aria-live="polite">
          <p className="border-b border-line px-5 py-3 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
            {hits.length ? `${hits.length} resultado${hits.length === 1 ? "" : "s"} para «${query.trim()}»` : `Sin resultados para «${query.trim()}»`}
          </p>
          {hits.length > 0 && (
            <ul className="divide-y divide-line">
              {hits.map(({ doc }, index) => (
                <li key={doc.id}>
                  <Link
                    href={doc.href}
                    onMouseEnter={() => setActive(index)}
                    className={`block px-5 py-3.5 transition-colors ${index === active ? "bg-crimson/[0.05]" : "hover:bg-ink/[0.03]"}`}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${KIND_STYLE[doc.kind]}`}>
                        {KIND_LABEL[doc.kind]}
                      </span>
                      <span className="font-display text-[1.1rem] leading-snug tracking-[-0.01em]">{doc.title}</span>
                    </span>
                    <span className="mt-1 block text-[0.95rem] leading-relaxed text-ink-soft">{truncate(doc.snippet)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-3 border-t border-line bg-ink px-5 py-4 text-paper sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.95rem]">
              {hits.length ? "¿No es lo que buscabas?" : "No encontramos algo igual."} El asistente conoce toda la app y responde en tus palabras.
            </p>
            <Link href={askHref} className="btn btn-crimson btn-sm shrink-0">
              <SparklesIcon className="h-4 w-4" />
              Preguntar al asistente
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
