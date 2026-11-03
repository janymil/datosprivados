"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon } from "./icons";
import {
  FINE_TIERS,
  LEVE_EXAMPLES,
  UIT_2026,
  clampCount,
  fineRange,
  formatSoles,
  formatUit,
  type FineTier,
} from "@/lib/fines";

/**
 * Calculadora pública de multas de la Ley 29733. Todo ocurre en el navegador: no se
 * envía ni se guarda nada.
 */
export function FineCalculator() {
  const [uitText, setUitText] = useState(String(UIT_2026));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [grave, setGrave] = useState("0");
  const [muyGrave, setMuyGrave] = useState("0");

  const leve = LEVE_EXAMPLES.filter((item) => checked[item.id]).length;
  const range = fineRange(
    { leve, grave: clampCount(Number(grave)), muy_grave: clampCount(Number(muyGrave)) },
    Number(uitText)
  );
  const tierLabel: Record<FineTier, string> = {
    leve: "Leves",
    grave: "Graves",
    muy_grave: "Muy graves",
  };

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card p-6 md:p-7">
        <fieldset>
          <legend className="font-display text-xl leading-tight">1. ¿Qué infracciones leves podrías tener?</legend>
          <div className="mt-4 space-y-2.5">
            {LEVE_EXAMPLES.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 border border-line-strong bg-paper px-4 py-3 text-[15.5px] leading-snug has-[:checked]:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson"
              >
                <input
                  type="checkbox"
                  checked={checked[item.id] ?? false}
                  onChange={(event) => setChecked((prev) => ({ ...prev, [item.id]: event.target.checked }))}
                  className="mt-1 h-4 w-4 accent-crimson"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 border-t border-line pt-6">
          <p className="font-display text-xl leading-tight">2. Otras infracciones, si ya sabes cómo se clasifican</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fine-grave" className="text-sm font-medium">
                Infracciones graves
              </label>
              <input
                id="fine-grave"
                type="number"
                inputMode="numeric"
                min={0}
                max={20}
                value={grave}
                onChange={(event) => setGrave(event.target.value)}
                className="input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="fine-muy-grave" className="text-sm font-medium">
                Infracciones muy graves
              </label>
              <input
                id="fine-muy-grave"
                type="number"
                inputMode="numeric"
                min={0}
                max={20}
                value={muyGrave}
                onChange={(event) => setMuyGrave(event.target.value)}
                className="input mt-1.5"
              />
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            ¿No sabes cómo se clasificaría tu caso? Haz el{" "}
            <Link href="/diagnostico" className="link-underline text-ink">
              diagnóstico gratuito
            </Link>{" "}
            o consulta a un abogado.
          </p>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <label htmlFor="fine-uit" className="font-display text-xl leading-tight">
            3. Valor de la UIT (S/)
          </label>
          <input
            id="fine-uit"
            type="number"
            inputMode="decimal"
            min={1}
            value={uitText}
            onChange={(event) => setUitText(event.target.value)}
            className="input mt-3 max-w-[200px]"
          />
          <p className="mt-2 text-sm text-ink-soft">La UIT 2026 es de S/ 5,500.</p>
        </div>
      </div>

      <section aria-live="polite" className="h-fit border border-ink bg-paper p-6 md:p-8">
        <p className="label-mono">Exposición teórica</p>
        {range.total === 0 ? (
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
            Marca al menos una situación para ver el rango de multa que prevé la ley.
          </p>
        ) : (
          <>
            <p className="mt-3 font-display text-[2.2rem] leading-[1.05] tracking-[-0.03em]" data-testid="fine-result">
              {formatSoles(range.minSoles)} <span className="text-ink-soft">a</span> {formatSoles(range.maxSoles)}
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
              {formatUit(range.minUit)} a {formatUit(range.maxUit)} · {range.total}{" "}
              {range.total === 1 ? "infracción" : "infracciones"}
            </p>
            <ul className="mt-5 divide-y divide-line border-y border-line text-[15px]">
              {range.byTier
                .filter((row) => row.count > 0)
                .map((row) => (
                  <li key={row.tier} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span>
                      {row.count} {tierLabel[row.tier].toLowerCase()}{" "}
                      <span className="text-ink-soft">
                        ({FINE_TIERS[row.tier].minUit} a {FINE_TIERS[row.tier].maxUit} UIT c/u)
                      </span>
                    </span>
                    <span className="font-mono text-xs">
                      {formatSoles(row.minSoles)} – {formatSoles(row.maxSoles)}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
        <p className="mt-5 flex gap-2.5 text-sm leading-relaxed text-ink-soft">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
          Es una referencia, no una predicción. La ANPD fija el monto real en cada procedimiento, dentro de la escala del
          art. 39 de la Ley 29733.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/guias/multas-ley-29733" className="btn btn-ghost">
            Cómo se aplican las multas
          </Link>
          <Link href="/registro" className="btn btn-primary">
            Ordenar mi expediente
          </Link>
        </div>
      </section>
    </div>
  );
}
