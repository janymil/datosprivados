"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runTextComplianceAuditAction } from "@/app/actions/ai";
import type { AuditedTextResult } from "@/lib/ai";
import { CopyButton } from "./copy-button";
import { CheckIcon, LockIcon, SparklesIcon } from "./icons";

export function ConsentAiAuditor({
  companyPlan,
}: {
  companyPlan: "basico" | "pro";
}) {
  const [channelType, setChannelType] = useState<"whatsapp" | "formulario_web" | "sorteo_redes">(
    "whatsapp"
  );
  const [rawText, setRawText] = useState(
    "Hola, gracias por comprar en nuestra tienda. A partir de ahora te enviaremos nuestras promociones y descuentos semanales por WhatsApp."
  );
  const [result, setResult] = useState<AuditedTextResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = companyPlan === "pro";

  function handleAudit() {
    if (!rawText.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await runTextComplianceAuditAction({ rawText, channelType });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
    });
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
                Revisor Automático de Textos para WhatsApp, Formularios y Sorteos
              </h2>
              <span className="rounded-full border border-crimson/40 bg-crimson/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-crimson">
                Plan Pro
              </span>
            </div>
            <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
              Pega el texto que usas hoy en tu checkout web, mensaje de bienvenida de WhatsApp o publicación de sorteo en Instagram. Revisamos que cumpla con el <strong>Art. 5 y 18 de la Ley 29733</strong> y te damos la versión corregida lista para usar.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[240px_1fr]">
        <div>
          <label className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Canal a revisar
          </label>
          <div className="mt-2 flex flex-col gap-2">
            {[
              ["whatsapp", "Mensaje de WhatsApp / Redes"],
              ["formulario_web", "Checkout / Formulario Web"],
              ["sorteo_redes", "Sorteo en Instagram / TikTok"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setChannelType(val as typeof channelType)}
                className={`rounded-[3px] border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  channelType === val
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink hover:border-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Texto actual de tu negocio
          </label>
          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={!isPro || isPending}
            className="input resize-y bg-white text-sm"
            placeholder="Pega aquí tu texto de WhatsApp, pie de formulario o bases de sorteo..."
          />

          <div className="flex justify-end">
            {isPro ? (
              <button
                type="button"
                disabled={!rawText.trim() || isPending}
                onClick={handleAudit}
                className="btn btn-crimson btn-sm"
              >
                <SparklesIcon className="h-4 w-4" />
                {isPending ? "Revisando texto..." : "Revisar y corregir texto"}
              </button>
            ) : (
              <Link href="/app/ajustes" className="btn btn-ghost btn-sm">
                <LockIcon className="h-3.5 w-3.5" />
                Activar Plan Pro en Ajustes para revisar
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 border-l-3 border-crimson bg-crimson/10 px-4 py-2.5 text-sm text-crimson">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
                Diagnóstico según la Ley 29733
              </span>
              <span
                className={`rounded-full px-3 py-0.5 font-mono text-xs font-bold uppercase ${
                  result.verdict === "cumple"
                    ? "bg-sage/15 text-ink"
                    : result.verdict === "observado"
                      ? "bg-ochre/15 text-ochre-dark"
                      : "bg-crimson/15 text-crimson"
                }`}
              >
                Puntaje: {result.score}/100 ·{" "}
                {result.verdict === "cumple"
                  ? "Cumple"
                  : result.verdict === "observado"
                    ? "Observado"
                    : "Riesgo de Multa"}
              </span>
            </div>

            <ul className="space-y-2.5 text-sm">
              {result.findings.map((f) => (
                <li
                  key={f.rule}
                  className={`rounded-[2px] border p-3 ${
                    f.severity === "ok"
                      ? "border-sage/35 bg-sage/[0.06]"
                      : f.severity === "alta"
                        ? "border-crimson/40 bg-crimson/[0.05]"
                        : "border-ochre/40 bg-ochre/[0.06]"
                  }`}
                >
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.06em]">
                    {f.severity === "ok" ? "✓ " : "⚠ "}
                    {f.rule}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-between rounded-[3px] border border-line-strong bg-paper-2 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-sage">
                  <CheckIcon className="h-4 w-4" />
                  Versión corregida lista para copiar
                </span>
                <CopyButton text={result.rewrittenCompliantText} label="Copiar texto corregido" />
              </div>
              <pre className="mt-3 whitespace-pre-wrap border border-line bg-white p-3.5 font-sans text-sm leading-relaxed text-ink">
                {result.rewrittenCompliantText}
              </pre>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
              Incluye tu RUC, enlace público de Política y canal gratuito ARCO.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
