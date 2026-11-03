"use client";

import { useState } from "react";

export type ChecklistSection = { title: string; hint?: string; items: string[] };

/**
 * Checklist interactivo e imprimible. El estado vive solo en la página: no se envía ni
 * se guarda nada (al imprimir, el navegador conserva las casillas marcadas).
 */
export function ChecklistTool({ sections }: { sections: ChecklistSection[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <div className="mt-8">
      <p className="no-print font-mono text-xs uppercase tracking-[0.08em] text-ink-soft" aria-live="polite">
        {completed} de {total} completados
      </p>
      <div className="mt-2 h-[6px] w-full bg-line no-print">
        <div className="h-full bg-sage transition-[width]" style={{ width: `${(completed / total) * 100}%` }} />
      </div>

      <div className="mt-8 space-y-10">
        {sections.map((section, sectionIndex) => (
          <fieldset key={section.title}>
            <legend className="font-display text-[1.5rem] leading-snug tracking-[-0.02em]">
              {sectionIndex + 1}. {section.title}
            </legend>
            {section.hint && <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{section.hint}</p>}
            <ul className="mt-4 space-y-2">
              {section.items.map((item, itemIndex) => {
                const key = `${sectionIndex}-${itemIndex}`;
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-3 border border-line bg-paper px-4 py-3 text-[15.5px] leading-snug has-[:checked]:border-sage has-[:checked]:bg-sage/[0.06] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson">
                      <input
                        type="checkbox"
                        checked={done[key] ?? false}
                        onChange={(event) => setDone((prev) => ({ ...prev, [key]: event.target.checked }))}
                        className="mt-1 h-4 w-4 shrink-0 accent-crimson"
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
