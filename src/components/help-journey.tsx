"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { JourneyStep } from "@/lib/help-content";
import { CheckIcon, ClockIcon } from "./icons";

const STORAGE_KEY = "dp-help-journey-v1";

export type JourneyItem = JourneyStep & {
  /** true/false si el avance se detecta en la cuenta; null si lo marca la persona. */
  done: boolean | null;
};

function readChecked(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Ruta de la A a la Z. Los pasos de configuración se marcan solos según el estado
 * real de la cuenta; los demás (leer, preparar) los marca la persona y se recuerdan
 * en este navegador.
 */
export function HelpJourney({ steps }: { steps: JourneyItem[] }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [opened, setOpened] = useState<string | null>(null);

  useEffect(() => {
    // localStorage solo existe en el navegador: se lee tras montar para no romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(readChecked());
  }, []);

  const isDone = (step: JourneyItem) => (step.done === null ? checked.includes(step.id) : step.done);
  const doneCount = steps.filter(isDone).length;
  const nextId = steps.find((step) => !isDone(step))?.id;
  const percent = Math.round((doneCount / steps.length) * 100);
  const remainingMinutes = useMemo(
    () => steps.filter((step) => !isDone(step)).reduce((sum, step) => sum + step.minutes, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, checked]
  );

  function toggle(id: string) {
    setChecked((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Sin almacenamiento (modo privado): el avance vive solo mientras la página esté abierta.
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 border border-line-strong bg-paper-2 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
            {doneCount} de {steps.length} pasos · {percent}%
          </p>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink/10"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance de la ruta"
          >
            <div className="h-full rounded-full bg-crimson transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="text-sm text-ink-soft sm:text-right">
          {nextId ? (
            <>
              Te faltan unos <strong className="text-ink">{remainingMinutes} min</strong> en total.
            </>
          ) : (
            <strong className="text-sage">¡Completaste la ruta! Ahora toca mantenerla al día.</strong>
          )}
        </p>
      </div>

      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line-strong">
        {steps.map((step, index) => {
          const done = isDone(step);
          const isNext = step.id === nextId;
          const open = opened === step.id || (opened === null && isNext);
          return (
            <li key={step.id} className="relative pl-14">
              <span
                aria-hidden="true"
                className={`absolute left-0 top-3 flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold ${
                  done
                    ? "border-sage bg-sage text-paper"
                    : isNext
                      ? "border-crimson bg-crimson text-paper"
                      : "border-line-strong bg-paper text-ink-soft"
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </span>

              <div className={`border bg-paper-2 ${isNext ? "border-crimson shadow-[4px_4px_0_0_var(--crimson)]" : "border-line"}`}>
                <button
                  type="button"
                  onClick={() => setOpened(open ? "" : step.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    {isNext && (
                      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-crimson">Tu siguiente paso</span>
                    )}
                    <span className={`block font-display text-[1.15rem] leading-snug tracking-[-0.01em] ${done ? "text-ink-soft line-through decoration-sage/60" : ""}`}>
                      {step.title}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 font-mono text-xs text-ink-soft sm:flex">
                    <ClockIcon className="h-3.5 w-3.5" />~{step.minutes} min
                  </span>
                  <span aria-hidden="true" className="font-mono text-lg text-ink-soft">
                    {open ? "−" : "+"}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-line px-4 pb-4 pt-3">
                    <p className="max-w-[64ch] leading-relaxed text-ink-soft">{step.why}</p>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                      <Link href={step.href} className="btn btn-primary btn-sm">
                        {step.cta}
                      </Link>
                      <Link href={`/app/ayuda/${step.topic}`} className="btn btn-ghost btn-sm">
                        Cómo se hace
                      </Link>
                      {step.done === null && (
                        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggle(step.id)}
                            className="h-4 w-4 accent-[var(--sage)]"
                          />
                          Ya lo hice
                        </label>
                      )}
                      {step.done !== null && (
                        <span className={`ml-auto font-mono text-xs uppercase tracking-[0.08em] ${done ? "text-sage" : "text-ink-soft"}`}>
                          {done ? "Detectado en tu cuenta ✓" : "Se marca solo al completarlo"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
