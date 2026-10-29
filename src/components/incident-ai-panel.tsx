"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runIncidentAiTriageAction } from "@/app/actions/ai";
import type { IncidentAiTriage } from "@/lib/ai";
import { CopyButton } from "./copy-button";
import { CheckIcon, LockIcon, ShieldIcon, SparklesIcon } from "./icons";

export function IncidentAiPanel({
  incidentId,
  companyPlan,
}: {
  incidentId: string;
  companyPlan: "basico" | "pro";
}) {
  const [triage, setTriage] = useState<IncidentAiTriage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = companyPlan === "pro";

  function handleEvaluate() {
    setError(null);
    startTransition(async () => {
      const res = await runIncidentAiTriageAction(incidentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTriage(res.data);
    });
  }

  if (!isPro) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
        <LockIcon className="h-3.5 w-3.5 shrink-0" />
        <span>La evaluación con IA de este incidente está en el Plan Pro.</span>
        <Link href="/app/ajustes" className="font-medium text-ink underline underline-offset-2 hover:text-crimson">
          Ver planes
        </Link>
      </p>
    );
  }

  return (
    <section className="card p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-crimson text-paper">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl leading-none tracking-[-0.02em]">
                Evaluador 48 h con IA
              </h2>
              <span className="rounded-full border border-crimson/40 bg-crimson/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-crimson">
                Plan Pro
              </span>
            </div>
            <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-ink-soft">
              ¿Debes avisar a la <strong>ANPD</strong> o al <strong>CNSD</strong>? Obtén el análisis y el aviso para los afectados.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleEvaluate}
          className="btn btn-crimson btn-sm"
        >
          <SparklesIcon className="h-4 w-4" />
          {isPending ? "Evaluando incidente..." : "Evaluar obligación de 48 h"}
        </button>
      </div>

      {error && (
        <p className="mt-4 border-l-3 border-crimson bg-crimson/10 px-4 py-2.5 text-sm text-crimson">
          {error}
        </p>
      )}

      {triage && (
        <div className="mt-5 space-y-5 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-sage/40 bg-sage/10 px-3.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.06em] text-sage">
              <ShieldIcon className="h-4 w-4" />
              Resultado de evaluación legal
            </span>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase">
              <span className={triage.requiresAnpdNotification ? "font-bold text-crimson" : "text-sage"}>
                ANPD 48h: {triage.requiresAnpdNotification ? "OBLIGATORIO" : "Solo Bitácora"}
              </span>
              <span>·</span>
              <span className={triage.requiresCnsdNotification ? "font-bold text-crimson" : "text-ink-soft"}>
                CNSD Digital: {triage.requiresCnsdNotification ? "SÍ APLICA" : "No aplica"}
              </span>
            </div>
          </div>

          <div className="rounded-[3px] border-l-3 border-ink bg-paper-2 p-4 text-[15px] leading-relaxed">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-crimson">
              Dictamen de Riesgo (DS N.° 016-2024-JUS)
            </p>
            <p className="mt-1 text-ink">{triage.riskAssessmentSummary}</p>
          </div>

          <div className="rounded-[3px] border border-line bg-paper p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
              Plan de contención hora por hora (0 a 48 h):
            </p>
            <ul className="mt-2.5 space-y-2 text-sm text-ink-soft">
              {triage.immediateChecklist.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border border-line bg-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
                  1. Informe Técnico Mejorado para ANPD / CNSD
                </p>
                <CopyButton text={triage.anpdEnhancedReport} label="Copiar informe" />
              </div>
              <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap border border-line bg-white p-3 font-mono text-[11.5px] leading-relaxed text-ink">
                {triage.anpdEnhancedReport}
              </pre>
            </div>

            <div className="border border-line bg-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
                  2. Comunicado en lenguaje claro a afectados
                </p>
                <CopyButton text={triage.affectedUsersMessageDraft} label="Copiar correo" />
              </div>
              <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap border border-line bg-white p-3 font-mono text-[11.5px] leading-relaxed text-ink">
                {triage.affectedUsersMessageDraft}
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
