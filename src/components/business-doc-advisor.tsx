"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runBusinessDocumentAdvisorAction } from "@/app/actions/ai";
import type { BusinessDocumentRecommendation } from "@/lib/ai";
import { ArrowRightIcon, CheckIcon, ShieldIcon, SparklesIcon } from "./icons";

const PRESET_BUSINESS_TYPES = [
  "Vendo por WhatsApp e Instagram, mando ofertas y hago envíos con motorizado/courier",
  "Tengo tienda física con cámaras de seguridad y 4 trabajadores en planilla",
  "Soy un consultorio dental / médico y agendo citas de pacientes por WhatsApp",
  "Tengo tienda online (web) con pagos por Yape/tarjeta y estudio contable externo",
];

export function BusinessDocumentAdvisor() {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<BusinessDocumentRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAdvisor(textToAnalyze: string) {
    const trimmed = textToAnalyze.trim();
    if (!trimmed) return;
    setDescription(trimmed);
    setError(null);
    startTransition(async () => {
      const res = await runBusinessDocumentAdvisorAction(trimmed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
    });
  }

  return (
    <section className="card border-ink bg-paper-2 p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-crimson text-paper">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl leading-none tracking-[-0.02em]">
                ¿No sabes qué documentos necesita tu negocio? Pregúntale a la IA
              </h2>
              <span className="rounded-full border border-sage/50 bg-sage/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-sage">
                Incluido en Básico y Pro
              </span>
            </div>
            <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-ink-soft">
              Escribe con tus propias palabras cómo vendes o atiendes (por ejemplo: <em>«Vendo por WhatsApp y mando pedidos con courier»</em>) y el Asistente IA te dirá qué listas debes declarar, qué documentos necesitas tener listos y cómo hacerlo paso a paso.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          O elige un ejemplo parecido a tu negocio (1 clic):
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESET_BUSINESS_TYPES.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isPending}
              onClick={() => runAdvisor(preset)}
              className="rounded-[3px] border border-line-strong bg-paper px-3 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:border-crimson hover:text-crimson disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runAdvisor(description);
        }}
        className="mt-4 flex flex-col gap-2.5 sm:flex-row"
      >
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Ej. Hago negocio por WhatsApp, emito boletas y tengo un contador externo. ¿Qué debo hacer y qué documentos necesito?"
          className="input flex-1 bg-white"
        />
        <button
          type="submit"
          disabled={!description.trim() || isPending}
          className="btn btn-crimson shrink-0"
        >
          <SparklesIcon className="h-4 w-4" />
          {isPending ? "Analizando tu negocio..." : "Ver qué documentos necesito"}
        </button>
      </form>

      {error && (
        <p className="mt-3 border-l-3 border-crimson bg-crimson/10 px-3.5 py-2 text-xs text-crimson">
          {error}
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-6 border-t border-line pt-6">
          {/* Summary Advice */}
          <div className="rounded-[3px] border-l-3 border-crimson bg-paper p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-crimson">
              Consejo de tu Asistente IA para tu forma de trabajar
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{result.summaryAdvice}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recommended Data Banks */}
            <div className="rounded-[3px] border border-line-strong bg-paper p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
                  1. Listas (Bancos de datos) que debes declarar
                </p>
                <Link
                  href="/app/bancos/nuevo"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson hover:underline"
                >
                  Declarar listas →
                </Link>
              </div>
              <ul className="mt-3.5 space-y-3">
                {result.recommendedBanks.map((b) => (
                  <li key={b.name} className="rounded-[2px] border border-line bg-paper-2 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-lg leading-snug text-ink">{b.name}</p>
                      <span className="rounded-full bg-sage/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-sage">
                        {b.legalBasisLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{b.why}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step-by-step Action Plan */}
            <div className="flex flex-col justify-between rounded-[3px] border border-line-strong bg-paper p-5">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-sage">
                  2. Cómo dejar todo listo hoy paso a paso
                </p>
                <ol className="mt-3.5 space-y-3 text-sm leading-relaxed text-ink">
                  {result.stepByStepPlan.map((step) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5 text-xs text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <ShieldIcon className="h-3.5 w-3.5 text-sage" />
                  Trámite en el portal SIPDP del Estado: 100 % gratuito (S/ 0)
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Documents with Direct Links */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
              3. Documentos exactos que necesitas generar abajo (haz clic en cada uno para abrirlo):
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {result.recommendedDocs.map((d) => (
                <div
                  key={d.tabKey}
                  className="flex flex-col justify-between rounded-[3px] border border-line-strong bg-paper p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-crimson/40 bg-crimson/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-crimson">
                        {d.priority}
                      </span>
                    </div>
                    <h3 className="mt-2.5 font-display text-lg leading-snug text-ink">
                      {d.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      <strong>¿Por qué lo necesitas?</strong> {d.whyNeeded}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      <strong>¿Dónde se pone?</strong> {d.whereToUse}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink">
                      <strong>¿Cómo hacerlo?</strong> {d.howToDoIt}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-line pt-3">
                    <Link
                      href={`/app/documentos?tab=${d.tabKey}`}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-crimson hover:underline"
                    >
                      Abrir este documento ahora
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
