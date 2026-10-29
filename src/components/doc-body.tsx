import Link from "next/link";
import type { ReactNode } from "react";

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

/**
 * Renderiza el formato de documento que generan las plantillas:
 * encabezados `##`, listas `-`, citas `>`, separadores `---` y párrafos.
 */
export function DocBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key++}`} className="my-3 space-y-1.5 pl-5">
          {list.map((item, index) => (
            <li key={index} className="list-disc text-[13.5px] leading-relaxed marker:text-crimson">
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
      list = [];
    }
    if (ordered.length) {
      blocks.push(
        <ol key={`ol-${key++}`} className="my-3 space-y-1.5 pl-5">
          {ordered.map((item, index) => (
            <li key={index} className="list-decimal text-[13.5px] leading-relaxed marker:text-ink-soft">
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

    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${key++}`}
          className="mt-8 border-t border-line pt-5 font-display text-[1.35rem] leading-snug tracking-[-0.02em] first:mt-0 first:border-0 first:pt-0"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${key++}`} className="mt-5 font-display text-lg tracking-[-0.01em]">
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
          className="my-3 border-l-2 border-crimson bg-crimson/[0.03] px-4 py-2 text-[13px] italic leading-relaxed text-ink-soft"
        >
          <Inline text={line.slice(2)} />
        </blockquote>
      );
    } else if (line === "---") {
      flushList();
      blocks.push(<hr key={`hr-${key++}`} className="my-7 border-line" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="my-3 text-[13.5px] leading-relaxed text-ink/90">
          <Inline text={line} />
        </p>
      );
    }
  }
  flushList();

  return <div className="doc-body">{blocks}</div>;
}
