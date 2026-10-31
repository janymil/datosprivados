"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { respondArcoAction } from "@/app/actions/arco";
import { runArcoAiCopilotAction } from "@/app/actions/ai";
import type { ArcoAiAnalysis } from "@/lib/ai";
import type { SectorArcoNotes } from "@/lib/sector-legal";
import { SubmitButton } from "@/components/submit-button";
import { CheckIcon, LockIcon, SparklesIcon } from "./icons";

// Fecha fija en hora de Lima para que el texto inicial coincida entre servidor y navegador.
function todayEsPe() {
  return new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
}

const TEMPLATES: Record<string, (name: string, company: string) => string> = {
  acceso: (name, company) =>
    `Estimado(a) ${name}:

En atención a su solicitud de ejercicio del Derecho de Acceso, presentada al amparo de la Ley N.° 29733 (Ley de Protección de Datos Personales) y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS, cumplimos con informarle dentro del plazo legal (20 días hábiles) lo siguiente:

1. Datos personales suyos que obran en nuestros bancos de datos: [detallar datos: p. ej., nombres, DNI, correo, teléfono e historial de pedidos].
2. Origen de los datos: Recopilados directamente de usted a través de [indicar canal: p. ej., formulario web / WhatsApp / compra en tienda].
3. Finalidad del tratamiento y base legal: [indicar finalidad, p. ej., gestión de su compra y facturación electrónica conforme al art. 14 de la Ley N.° 29733].
4. Destinatarios o encargados: [indicar proveedores que acceden para operar el servicio, p. ej., courier y facturación].
5. Plazo de conservación: [indicar plazo, p. ej., durante la relación comercial y por 5 años adicionales por mandato tributario de SUNAT].

Este trámite es totalmente gratuito. En caso de no encontrarse conforme con la presente respuesta, le informamos que tiene derecho a interponer una reclamación (Procedimiento de Tutela de Derechos) ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir a la vía judicial (Hábeas Data).

Atentamente,
Área de Privacidad y Protección de Datos
${company}`,
  rectificacion: (name, company) =>
    `Estimado(a) ${name}:

En atención a su solicitud de ejercicio del Derecho de Rectificación, presentada conforme a la Ley N.° 29733 y su Reglamento (DS N.° 016-2024-JUS), le informamos dentro del plazo legal (10 días hábiles) que hemos verificado la información remitida y procedimos a actualizar y rectificar sus datos personales en nuestro banco de datos de la siguiente manera:

- Dato rectificado / actualizado: [especificar el dato corregido, p. ej., nueva dirección de entrega / correo electrónico].
- Fecha de ejecución del cambio: ${todayEsPe()}.

Este trámite es totalmente gratuito. En caso de no encontrarse conforme con la presente atención, le informamos que puede presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir al Poder Judicial mediante hábeas data.

Atentamente,
Área de Privacidad y Protección de Datos
${company}`,
  cancelacion: (name, company) =>
    `Estimado(a) ${name}:

En atención a su solicitud de ejercicio del Derecho de Cancelación (Supresión), presentada al amparo de la Ley N.° 29733 y su Reglamento (DS N.° 016-2024-JUS), cumplimos con informarle dentro del plazo legal (10 días hábiles) que hemos procedido con lo siguiente:

1. Eliminación inmediata de sus datos de contacto de nuestras listas comerciales, publicitarias y de difusión por WhatsApp/correo electrónico.
2. Bloqueo de sus datos personales en nuestros registros operativos. De existir comprobantes de pago (boletas/facturas), contratos o registros laborales previos, dichos datos se conservarán únicamente bloqueados e inaccesibles para fines comerciales durante el plazo de prescripción legal exigido por la normativa peruana (SUNAT / normativa laboral), tras lo cual serán eliminados definitivamente.

Este trámite es totalmente gratuito. En caso de no encontrarse conforme con la presente respuesta, le informamos que tiene derecho a presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir al Poder Judicial mediante hábeas data.

Atentamente,
Área de Privacidad y Protección de Datos
${company}`,
  oposicion: (name, company) =>
    `Estimado(a) ${name}:

En atención a su solicitud de ejercicio del Derecho de Oposición (y/o revocación de consentimiento), presentada al amparo de la Ley N.° 29733 y su Reglamento (DS N.° 016-2024-JUS), le confirmamos dentro del plazo legal (10 días hábiles) que hemos registrado su oposición de manera efectiva:

- A partir de la fecha (${todayEsPe()}), sus datos personales han sido excluidos de todo tratamiento vinculado a [indicar finalidad objetada, p. ej., envío de promociones, publicidad y campañas comerciales].
- Únicamente se mantendrán vigentes aquellos tratamientos estrictamente indispensables para la ejecución de contratos en curso o el cumplimiento de obligaciones legales aplicables.

Este trámite es totalmente gratuito. En caso de no encontrarse conforme con la presente respuesta, le informamos que tiene derecho a presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir al Poder Judicial mediante hábeas data.

Atentamente,
Área de Privacidad y Protección de Datos
${company}`,
};

/** Inserta el párrafo propio del rubro justo antes de la frase de gratuidad y reclamo. */
function withNote(template: string, note: string | undefined) {
  if (!template || !note) return template;
  const marker = "Este trámite es totalmente gratuito";
  return template.includes(marker) ? template.replace(marker, `${note}

${marker}`) : `${template}

${note}`;
}

export function ArcoResponseForm({
  id,
  companyName,
  companyPlan = "pro",
  requesterName,
  type,
  response,
  status,
  sectorTitle,
  notes,
  denial,
}: {
  sectorTitle?: string;
  notes?: SectorArcoNotes;
  denial?: string;
  id: string;
  companyName: string;
  companyPlan?: "basico" | "pro";
  requesterName: string;
  type: string;
  response: string | null;
  status: string;
}) {
  const note = notes?.[type as keyof SectorArcoNotes];
  const template = withNote(TEMPLATES[type]?.(requesterName, companyName) ?? "", note?.letter);
  const [text, setText] = useState(response?.trim() ? response : template);
  const [copied, setCopied] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ArcoAiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = companyPlan === "pro";

  function handleRunAiCopilot() {
    setAiError(null);
    startTransition(async () => {
      const res = await runArcoAiCopilotAction(id);
      if (!res.ok) {
        setAiError(res.error);
        return;
      }
      setAiAnalysis(res.data);
      setText(res.data.tailoredResponseDraft);
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form action={respondArcoAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      {isPro ? (
        <div className="rounded-[3px] border border-line-strong bg-paper-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] bg-crimson text-paper">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-lg leading-none">Copiloto IA</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Analiza el pedido, te dice qué hacer y redacta la respuesta.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={handleRunAiCopilot}
              className="btn btn-crimson btn-sm whitespace-nowrap"
            >
              <SparklesIcon className="h-4 w-4" />
              {isPending ? "Preparando respuesta…" : "Redactar con IA"}
            </button>
          </div>

          {aiError && (
            <p className="mt-3 border-l-3 border-crimson bg-crimson/10 px-3 py-2 text-xs text-crimson">
              {aiError}
            </p>
          )}

          {aiAnalysis && (
            <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
              <div className="rounded-[2px] border-l-3 border-ink bg-paper px-3.5 py-2.5">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-crimson">
                  Derecho detectado: {aiAnalysis.detectedRight.toUpperCase()} ({aiAnalysis.legalDeadlineDays} días hábiles)
                </p>
                <p className="mt-1 text-ink-soft">{aiAnalysis.legalAdvice}</p>
              </div>

              <div className="rounded-[2px] border border-line bg-paper p-3.5">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                  Antes de enviar:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
                  {aiAnalysis.internalActionSteps.map((step) => (
                    <li key={step} className="flex items-start gap-2">
                      <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <LockIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            ¿Quieres que la IA redacte la respuesta por ti?{" "}
            <Link href="/app/ajustes" className="font-medium text-crimson underline">
              Disponible en el Plan Pro
            </Link>
          </span>
        </p>
      )}

      {(note?.letter || note?.tip) && (
        <div className="border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[14.5px] leading-relaxed">
          <p className="font-semibold">Para tu rubro{sectorTitle ? ` (${sectorTitle})` : ""}</p>
          {note.letter && <p className="mt-1">Agregamos a la carta un párrafo propio de tu actividad. Revísalo y completa lo que está entre [corchetes].</p>}
          {note.tip && <p className="mt-1">Antes de enviar: {note.tip}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {denial && (
          <button
            type="button"
            onClick={() => setText((current) => `${current.trimEnd()}

${denial}`)}
            className="btn btn-ghost btn-sm whitespace-nowrap"
          >
            Insertar texto de denegatoria
          </button>
        )}
        <button
          type="button"
          onClick={() => setText(template)}
          disabled={!template || text === template}
          className="btn btn-ghost btn-sm whitespace-nowrap"
        >
          Restaurar plantilla
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text.trim()}
          className="btn btn-ghost btn-sm whitespace-nowrap"
        >
          {copied ? "Copiado ✓" : "Copiar respuesta"}
        </button>
        <span className="ml-auto font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
          {text.length} caracteres
        </span>
      </div>

      <textarea
        name="response"
        rows={14}
        value={text}
        required
        onChange={(event) => setText(event.target.value)}
        className="input resize-y font-sans leading-relaxed"
        placeholder="Escribe aquí tu respuesta o pulsa «Restaurar plantilla». Incluye siempre que la persona puede reclamar ante la ANPD."
      />

      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">Se guarda con fecha y hora como evidencia.</p>
        <div className="flex flex-wrap gap-2.5 sm:flex-nowrap">
          {status !== "respondido" && (
            <SubmitButton
              name="status"
              value="en_proceso"
              pendingLabel="Guardando…"
              className="btn btn-ghost btn-sm whitespace-nowrap"
            >
              Guardar borrador
            </SubmitButton>
          )}
          <SubmitButton
            name="status"
            value="respondido"
            pendingLabel="Guardando…"
            className="btn btn-primary btn-sm whitespace-nowrap"
          >
            {status === "respondido" ? "Actualizar respuesta" : "Marcar como respondida"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
