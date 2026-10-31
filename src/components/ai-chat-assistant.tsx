"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { askAiAssistantAction } from "@/app/actions/ai";
import { CopyButton } from "./copy-button";
import { DocBody } from "./doc-body";
import { CheckIcon, LockIcon, ShieldIcon, SparklesIcon } from "./icons";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "¿Qué me falta para estar al día?",
  "Soy una empresa SaaS: ¿qué bancos de datos y documentos necesito?",
  "¿Cuánto tiempo tengo para responder una solicitud ARCO?",
  "¿Cómo pido permiso para enviar promociones por WhatsApp?",
  "Perdí una laptop con datos de clientes: ¿qué hago?",
];

export function AiChatAssistant({
  companyName,
  companyPlan,
  mode,
  initialOpen = false,
  embedded = false,
}: {
  companyName: string;
  companyRuc?: string;
  companyPlan: "basico" | "pro";
  complianceScore?: number;
  /** "basico" cuando no hay modelo de IA configurado en el servidor. */
  mode: "ia" | "basico";
  initialOpen?: boolean;
  embedded?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        mode === "ia"
          ? `Hola. Pregúntame lo que necesites sobre la **Ley 29733**, para **${companyName}** o en general, o pídeme que redacte un correo o una respuesta.`
          : `Hola. Estoy en **modo básico**: respondo preguntas frecuentes sobre la **Ley 29733** (plazos, consentimiento, incidentes, qué necesita cada tipo de negocio). Para preguntas abiertas y redacción libre hay que conectar la IA.`,
    },
  ]);

  function sendPrompt(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || isPending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      try {
        const history = messages
          .filter((m) => m.id !== "welcome" && !m.id.startsWith("err-"))
          .map(({ role, content }) => ({ role, content }));
        const res = await askAiAssistantAction(trimmed, history);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: res.answer,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Ocurrió un inconveniente al procesar tu consulta. Por favor, intenta nuevamente.",
          },
        ]);
      }
    });
  }

  const chatInterface = (
    <div className="flex flex-col border border-line-strong bg-paper shadow-[0_22px_60px_-25px_rgba(23,25,30,0.45)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-5 py-4 text-paper">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-crimson text-paper">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl leading-none tracking-[-0.02em]">
                Asistente Legal · Ley 29733
              </h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  mode === "ia"
                    ? "border-sage/60 bg-sage/20 text-[#8ce0b3]"
                    : "border-ochre/60 bg-ochre/20 text-[#f0c36b]"
                }`}
                title={mode === "ia" ? undefined : "No hay un modelo de IA conectado: respuestas predefinidas."}
              >
                {mode === "ia" ? "IA activa" : "Modo básico"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-paper/65">
              Resuelve tus dudas en simple y redacta tus respuestas al instante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!embedded && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[2px] border border-paper/25 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.08em] text-paper/80 hover:bg-paper hover:text-ink"
            >
              Cerrar ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="border-b border-line bg-paper-2 px-5 py-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Consultas y redactores frecuentes (1 clic):
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isPending}
              onClick={() => sendPrompt(q)}
              className="rounded-[3px] border border-line-strong bg-paper px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:border-crimson hover:text-crimson disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="max-h-[480px] min-h-[320px] flex-1 space-y-5 overflow-y-auto p-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-[3px] border p-4 ${
                m.role === "user"
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong bg-white text-ink"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] opacity-75">
                  {m.role === "user" ? "Tú" : "Asistente Legal · Ley 29733"}
                </span>
                {m.role === "assistant" && m.id !== "welcome" && (
                  <CopyButton text={m.content} label="Copiar texto" />
                )}
              </div>

              {m.role === "user" ? (
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.content}</p>
              ) : (
                <div className="text-[15px] leading-relaxed">
                  <DocBody content={m.content} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isPending && (
          <div className="flex items-center gap-3 rounded-[3px] border border-line bg-paper-2 px-4 py-3 text-sm text-ink-soft">
            <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-crimson" />
            <span>Preparando tu respuesta y recomendaciones legales...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt(input);
        }}
        className="border-t border-line bg-paper-2 p-4"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu duda sobre la Ley 29733 o pide que redacte un correo, respuesta ARCO o cláusula..."
            className="input flex-1 bg-white"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="btn btn-primary shrink-0"
          >
            <SparklesIcon className="h-4 w-4" />
            Consultar
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <ShieldIcon className="h-3.5 w-3.5 text-sage" />
            Tus datos identificables se anonimizan antes de enviarse al modelo.
          </span>
          {companyPlan === "basico" && (
            <Link
              href="/app/ajustes"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-crimson hover:underline"
            >
              <LockIcon className="h-3.5 w-3.5" />
              Desbloquear herramientas automáticas en Plan Pro →
            </Link>
          )}
        </div>
      </form>
    </div>
  );

  // La página del asistente ya muestra el chat incrustado.
  if (!embedded && pathname === "/app/asistente") return null;

  if (embedded) {
    return chatInterface;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="no-print fixed bottom-20 right-4 z-50 lg:bottom-5 lg:right-5">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir Asistente Legal"
            title="Asistente Legal"
            className="group flex h-14 items-center gap-2 overflow-hidden rounded-full bg-crimson px-4 text-paper shadow-[0_12px_30px_-10px_rgba(184,39,42,0.65)] transition-all hover:-translate-y-0.5 hover:pr-5"
          >
            <SparklesIcon className="h-5 w-5 shrink-0" />
            {/* El texto solo aparece al pasar el cursor, para no tapar contenido. */}
            <span className="max-w-0 whitespace-nowrap font-medium opacity-0 transition-all duration-200 group-hover:max-w-[160px] group-hover:opacity-100 group-focus-visible:max-w-[160px] group-focus-visible:opacity-100">
              Asistente Legal
            </span>
          </button>
        ) : (
          <div className="w-[calc(100vw-2rem)] max-w-[680px]">{chatInterface}</div>
        )}
      </div>
    </>
  );
}
