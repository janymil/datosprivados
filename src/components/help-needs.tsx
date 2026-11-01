"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BASE_NEEDS, DOC_LABELS, NEEDS } from "@/lib/help-content";
import { CheckIcon, SparklesIcon } from "./icons";

/**
 * «¿Qué necesita mi negocio?»: la persona marca cómo trabaja y ve, al instante,
 * qué listas declarar y qué documentos usar. Pensado para quien nunca oyó de la ley.
 */
export function HelpNeeds({ bankNames }: { bankNames: Record<string, string> }) {
  const [selected, setSelected] = useState<string[]>([]);

  const result = useMemo(() => {
    const chosen = NEEDS.filter((need) => selected.includes(need.id));
    const banks = new Set<string>(BASE_NEEDS.banks);
    const docs = new Set<string>(BASE_NEEDS.docs);
    for (const need of chosen) {
      need.banks.forEach((id) => banks.add(id));
      need.docs.forEach((id) => docs.add(id));
    }
    return { chosen, banks: [...banks], docs: [...docs], notes: chosen.filter((need) => need.note) };
  }, [selected]);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const question = result.chosen.length
    ? `Mi negocio: ${result.chosen.map((need) => need.label.toLowerCase()).join("; ")}. ¿Qué bancos de datos y documentos necesito y por dónde empiezo?`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <fieldset>
        <legend className="mb-3 text-[1.02rem] text-ink-soft">Marca todo lo que se parezca a tu negocio:</legend>
        <div className="grid gap-2.5">
          {NEEDS.map((need) => {
            const on = selected.includes(need.id);
            return (
              <label
                key={need.id}
                className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors ${
                  on ? "border-crimson bg-crimson/[0.05]" : "border-line bg-paper-2 hover:border-line-strong"
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => toggle(need.id)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--crimson)]" />
                <span>
                  <span className="block font-medium leading-snug">{need.label}</span>
                  <span className="block text-sm text-ink-soft">{need.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="self-start border-2 border-ink bg-paper-2 p-5 lg:sticky lg:top-6" aria-live="polite">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-crimson">
          {result.chosen.length ? "Tu negocio necesita" : "Lo que necesita todo negocio"}
        </p>

        <h3 className="mt-3 font-display text-[1.2rem] tracking-[-0.01em]">Listas de personas (bancos de datos)</h3>
        <ul className="mt-2 space-y-1.5">
          {result.banks.map((id) => (
            <li key={id} className="flex gap-2 leading-snug">
              <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
              <span>{bankNames[id] ?? id}</span>
            </li>
          ))}
        </ul>
        <Link href="/app/bancos" className="mt-2 inline-block font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson hover:underline">
          Ir a Bancos de datos →
        </Link>

        <h3 className="mt-5 font-display text-[1.2rem] tracking-[-0.01em]">Documentos</h3>
        <ul className="mt-2 space-y-1.5">
          {result.docs.map((key) => (
            <li key={key} className="flex gap-2 leading-snug">
              <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
              <Link href={`/app/documentos?tab=${key}`} className="underline-offset-2 hover:text-crimson hover:underline">
                {DOC_LABELS[key] ?? key}
              </Link>
            </li>
          ))}
        </ul>

        {result.notes.length > 0 && (
          <div className="mt-5 space-y-2 border-l-4 border-ochre bg-ochre/[0.09] px-4 py-3 text-[0.95rem] leading-relaxed">
            {result.notes.map((need) => (
              <p key={need.id}>
                <strong>{need.label.split(",")[0]}:</strong> {need.note}
              </p>
            ))}
          </div>
        )}

        {result.chosen.length === 0 ? (
          <p className="mt-5 text-sm text-ink-soft">Marca opciones a la izquierda y esta lista se ajusta sola.</p>
        ) : (
          <Link href={`/app/asistente?q=${encodeURIComponent(question.slice(0, 300))}`} className="btn btn-primary btn-sm mt-5 w-full">
            <SparklesIcon className="h-4 w-4" />
            Pedirle un plan al asistente
          </Link>
        )}
      </div>
    </div>
  );
}
