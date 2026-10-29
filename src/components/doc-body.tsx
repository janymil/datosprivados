"use client";

import { useState, type ReactNode } from "react";

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

type Section = {
  id: number;
  title: string | null;
  lines: string[];
};

function renderLines(lines: string[], largeText: boolean) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered: string[] = [];
  let key = 0;

  const pSize = largeText ? "text-[17.5px]" : "text-base";

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key++}`} className="my-3.5 space-y-2 pl-5">
          {list.map((item, index) => (
            <li key={index} className={`list-disc ${pSize} leading-relaxed marker:text-crimson`}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
      list = [];
    }
    if (ordered.length) {
      blocks.push(
        <ol key={`ol-${key++}`} className="my-3.5 space-y-2 pl-5">
          {ordered.map((item, index) => (
            <li key={index} className={`list-decimal ${pSize} leading-relaxed marker:text-ink-soft`}>
              <Inline text={item} />
            </li>
          ))}
        </ol>
      );
      ordered = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${key++}`} className="mt-5 font-display text-xl tracking-[-0.01em] text-ink">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      if (ordered.length) flushList();
      list.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (list.length) flushList();
      ordered.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.startsWith("> ")) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className={`my-3.5 border-l-3 border-crimson bg-crimson/[0.04] px-4 py-2.5 ${pSize} italic leading-relaxed text-ink-soft`}
        >
          <Inline text={line.slice(2)} />
        </blockquote>
      );
    } else if (line === "---") {
      flushList();
      blocks.push(<hr key={`hr-${key++}`} className="my-6 border-line" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className={`my-3 ${pSize} leading-relaxed text-ink/95`}>
          <Inline text={line} />
        </p>
      );
    }
  }
  flushList();

  return blocks;
}

export function DocBody({ content }: { content: string }) {
  const rawLines = content.split("\n");
  const sections: Section[] = [];
  let current: Section = { id: 0, title: null, lines: [] };

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (current.title !== null || current.lines.some((l) => l.trim() !== "")) {
        sections.push(current);
      }
      current = { id: sections.length, title: line.slice(3), lines: [] };
    } else {
      current.lines.push(raw);
    }
  }
  if (current.title !== null || current.lines.some((l) => l.trim() !== "")) {
    sections.push(current);
  }

  const hasMultipleHeadings = sections.filter((s) => s.title !== null).length > 1;
  const [openIds, setOpenIds] = useState<number[]>(() =>
    sections.map((s) => s.id)
  );
  const [largeText, setLargeText] = useState(false);

  const toggleSection = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allOpen = openIds.length === sections.length;

  return (
    <div className="doc-body">
      {hasMultipleHeadings && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-line bg-paper px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
              Índice interactivo ({sections.filter((s) => s.title).length} secciones):
            </span>
            <button
              type="button"
              onClick={() =>
                setOpenIds(allOpen ? [sections[0]?.id ?? 0] : sections.map((s) => s.id))
              }
              className="rounded-[2px] border border-line-strong bg-paper-2 px-2.5 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-ink"
            >
              {allOpen ? "Compactar secciones −" : "Expandir todo +"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLargeText((v) => !v)}
            className={`rounded-[2px] border px-3 py-1 font-mono text-xs font-medium transition-colors ${
              largeText
                ? "border-crimson bg-crimson text-paper"
                : "border-line-strong bg-paper-2 text-ink hover:border-ink"
            }`}
          >
            {largeText ? "Texto grande: Activado (A+)" : "Aumentar letra (A+)"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section) => {
          if (section.title === null) {
            return (
              <div key={section.id} className="mb-4">
                {renderLines(section.lines, largeText)}
              </div>
            );
          }

          const isOpen = openIds.includes(section.id);

          return (
            <div
              key={section.id}
              className="rounded-[3px] border border-line bg-paper/35 transition-colors hover:border-line-strong print:border-0 print:bg-transparent"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left print:px-0 print:py-2"
              >
                <h2 className="font-display text-[1.45rem] leading-snug tracking-[-0.02em] text-ink">
                  {section.title}
                </h2>
                <span className="no-print shrink-0 rounded-full border border-line-strong bg-paper-2 px-2.5 py-0.5 font-mono text-xs font-semibold text-crimson">
                  {isOpen ? "Ocultar −" : "Leer +"}
                </span>
              </button>

              {/* Las secciones cerradas siguen en el DOM para que se impriman completas. */}
              <div
                className={`border-t border-line px-5 pb-5 pt-2 print:block print:border-0 print:p-0 ${isOpen ? "" : "hidden"}`}
              >
                {renderLines(section.lines, largeText)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
