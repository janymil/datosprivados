"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "./icons";

/**
 * Diagnóstico público de 10 preguntas. Todo ocurre en el navegador: no se envía
 * ni se guarda nada, así que no crea un banco de datos propio.
 */

type Question = {
  id: string;
  text: string;
  /** Qué falta si la respuesta es «No», y dónde aprender a resolverlo. */
  gap: string;
  guide: string;
  weight: number;
};

const QUESTIONS: Question[] = [
  {
    id: "bancos",
    text: "¿Inscribiste en el SIPDP todos los bancos de datos de la empresa (clientes, trabajadores, cámaras, proveedores)?",
    gap: "Inscribir los bancos de datos en el SIPDP (gratuito).",
    guide: "/guias/inscribir-banco-de-datos-personales",
    weight: 15,
  },
  {
    id: "politica",
    text: "¿Tienes una Política de Privacidad publicada que menciona esos mismos bancos y finalidades?",
    gap: "Publicar una Política de Privacidad coherente con tus bancos inscritos.",
    guide: "/guias/inscribir-banco-de-datos-personales",
    weight: 10,
  },
  {
    id: "seguridad",
    text: "¿Tienes un Documento de Seguridad que dice quién accede a qué datos y cómo se protegen?",
    gap: "Redactar el Documento de Seguridad interno.",
    guide: "/plantillas",
    weight: 10,
  },
  {
    id: "trabajadores",
    text: "¿Tus trabajadores recibieron un aviso de privacidad y firmaron confidencialidad?",
    gap: "Entregar el aviso de privacidad a trabajadores y firmar confidencialidad.",
    guide: "/guias/datos-personales-de-trabajadores",
    weight: 10,
  },
  {
    id: "sensibles",
    text: "Si tratas datos de salud o biométricos (descansos médicos, huella, historias clínicas), ¿tienes consentimiento por escrito? Si no tratas, responde «Sí».",
    gap: "Obtener consentimiento por escrito para datos sensibles.",
    guide: "/guias/datos-personales-de-trabajadores",
    weight: 10,
  },
  {
    id: "publicidad",
    text: "¿Pides consentimiento separado, opcional y sin marcar antes de enviar publicidad por WhatsApp o correo?",
    gap: "Separar el consentimiento para publicidad y guardar la evidencia.",
    guide: "/guias/consentimiento-publicidad-whatsapp",
    weight: 10,
  },
  {
    id: "arco",
    text: "¿Tienes un canal para solicitudes ARCO y alguien que controle los plazos de 8, 10 y 20 días hábiles?",
    gap: "Definir el canal ARCO y controlar los plazos.",
    guide: "/guias/derechos-arco-plazos",
    weight: 10,
  },
  {
    id: "incidentes",
    text: "¿Sabes qué hacer y a quién avisar si se filtran datos, con el plazo de 48 horas?",
    gap: "Tener un procedimiento de incidentes con el plazo de 48 horas.",
    guide: "/guias/incidente-de-seguridad-48-horas",
    weight: 10,
  },
  {
    id: "encargados",
    text: "¿Firmaste cláusulas de encargo con proveedores que ven datos (contador, nube, planillas, courier)?",
    gap: "Firmar cláusulas de encargo con tus proveedores.",
    guide: "/plantillas",
    weight: 8,
  },
  {
    id: "camaras",
    text: "Si tienes cámaras, ¿hay cartel visible y borras las grabaciones a los 30–60 días? Si no tienes, responde «Sí».",
    gap: "Colocar el cartel de videovigilancia y fijar el plazo de borrado.",
    guide: "/guias/videovigilancia-camaras-de-seguridad",
    weight: 7,
  },
];

type Answer = "si" | "no" | "nose";

export function SelfCheck() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [showResult, setShowResult] = useState(false);
  const answered = Object.keys(answers).length;
  const complete = answered === QUESTIONS.length;

  const score = QUESTIONS.reduce((total, q) => total + (answers[q.id] === "si" ? q.weight : 0), 0);
  const gaps = QUESTIONS.filter((q) => answers[q.id] !== "si");
  const level = score >= 85 ? "Bien encaminada" : score >= 50 ? "Riesgo medio" : "Riesgo alto";

  return (
    <div className="mt-10">
      <ol className="space-y-4">
        {QUESTIONS.map((q, index) => (
          <li key={q.id} className="card p-5">
            <fieldset>
              <legend className="flex gap-3 text-[16px] font-medium leading-snug">
                <span className="font-mono text-crimson">{index + 1}.</span>
                {q.text}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2 pl-7">
                {(
                  [
                    ["si", "Sí"],
                    ["no", "No"],
                    ["nose", "No sé"],
                  ] as Array<[Answer, string]>
                ).map(([value, label]) => {
                  const active = answers[q.id] === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer border px-4 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-crimson ${
                        active ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper hover:border-ink"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={value}
                        checked={active}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!complete}
          onClick={() => setShowResult(true)}
          className="btn btn-primary h-12 px-6 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ver mi resultado
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <span className="text-sm text-ink-soft" aria-live="polite">
          {answered} de {QUESTIONS.length} respondidas
        </span>
      </div>

      {showResult && complete && (
        <section aria-live="polite" className="mt-10 border border-ink bg-paper p-6 md:p-8">
          <p className="label-mono">Tu resultado</p>
          <p className="mt-2 font-display text-[3.2rem] leading-none tracking-[-0.04em]">
            {score}
            <span className="text-2xl text-ink-soft">/100</span>
          </p>
          <p className={`mt-2 font-display text-xl ${score >= 85 ? "text-sage" : "text-crimson"}`}>{level}</p>

          {gaps.length > 0 ? (
            <>
              <h2 className="mt-6 font-display text-[1.5rem] leading-snug">Lo que te falta</h2>
              <ul className="mt-3 space-y-2.5">
                {gaps.map((q) => (
                  <li key={q.id} className="flex gap-3 text-[15.5px] leading-relaxed">
                    <AlertIcon className="mt-1 h-4 w-4 shrink-0 text-crimson" />
                    <span>
                      {q.gap}{" "}
                      <Link href={q.guide} className="link-underline text-ink">
                        Cómo hacerlo
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-6 flex gap-3 text-[15.5px]">
              <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
              Cubres los puntos básicos. Lo siguiente es poder demostrarlo con evidencia fechada.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/registro" className="btn btn-primary h-12 px-6 text-base">
              Resolverlo con DatosPrivados
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/demo" prefetch={false} className="btn btn-ghost h-12 px-6 text-base">
              Ver la demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Resultado orientativo. Tus respuestas no se envían ni se guardan.
          </p>
        </section>
      )}
    </div>
  );
}
