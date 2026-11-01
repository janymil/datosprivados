import type { ReactNode } from "react";
import type { Block } from "@/lib/help-content";

export function slugifyHeading(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Inline({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

const CALLOUT = {
  tip: { label: "Consejo", box: "border-sage bg-sage/[0.08]", tag: "text-sage" },
  warn: { label: "Ojo", box: "border-ochre bg-ochre/[0.09]", tag: "text-ochre" },
  law: { label: "Lo que dice la norma", box: "border-ink bg-ink/[0.04]", tag: "text-ink" },
  example: { label: "Ejemplo", box: "border-crimson bg-crimson/[0.05]", tag: "text-crimson" },
} as const;

/** Dibuja el contenido de un artículo de la Ayuda. Es solo presentación: sin estado. */
export function HelpBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        switch (block.t) {
          case "h":
            return (
              <h2
                key={index}
                id={slugifyHeading(block.text)}
                className="scroll-mt-24 border-b border-line pb-2 pt-4 font-display text-[1.5rem] leading-tight tracking-[-0.02em]"
              >
                {block.text}
              </h2>
            );
          case "p":
            return (
              <p key={index} className="max-w-[72ch] text-[1.05rem] leading-[1.7] text-ink/95">
                <Inline text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={index} className="max-w-[72ch] space-y-2.5 pl-1">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[1.02rem] leading-relaxed">
                    <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={index} className="max-w-[78ch] space-y-3">
                {block.items.map((item, i) => (
                  <li key={item.title} className="flex gap-4 border border-line bg-paper-2 p-4">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-sm font-semibold text-paper"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[1.12rem] leading-snug tracking-[-0.01em]">
                        <Inline text={item.title.replace(/^\d+\.\s*/, "")} />
                      </p>
                      <p className="mt-1 text-[1rem] leading-relaxed text-ink-soft">
                        <Inline text={item.text} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "callout": {
            const style = CALLOUT[block.tone];
            return (
              <aside key={index} className={`max-w-[78ch] border-l-4 px-5 py-4 ${style.box}`}>
                <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${style.tag}`}>
                  {block.title ?? style.label}
                </p>
                <p className="mt-1.5 text-[1.02rem] leading-relaxed">
                  <Inline text={block.text} />
                </p>
              </aside>
            );
          }
          case "facts":
            return (
              <dl key={index} className="max-w-[78ch] divide-y divide-line border border-line bg-paper-2">
                {block.items.map((item) => (
                  <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-5">
                    <dt className="font-semibold leading-snug">
                      <Inline text={item.label} />
                    </dt>
                    <dd className="leading-relaxed text-ink-soft">
                      <Inline text={item.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            );
        }
      })}
    </div>
  );
}
