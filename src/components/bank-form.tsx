"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { DataBank } from "@/lib/db";
import { runBankAiWizardAction } from "@/app/actions/ai";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Term } from "@/components/help";
import { LockIcon, SparklesIcon } from "@/components/icons";
import { BANK_PRESETS as PRESETS, type BankPreset } from "@/lib/bank-presets";

const LEGAL_BASIS = [
  [
    "consentimiento",
    "Consentimiento del titular — cuando te dio permiso (ej. suscribirse a ofertas / WhatsApp marketing)",
  ],
  [
    "ejecucion_contrato",
    "Ejecución de contrato — necesario para venderle, entregarle su pedido o prestarle el servicio",
  ],
  [
    "obligacion_legal",
    "Obligación legal — cuando una ley te obliga (ej. SUNAT boletas/facturas, planilla PLAME, libro de reclamaciones)",
  ],
  [
    "interes_legitimo",
    "Interés legítimo — seguridad del local (ej. cámaras de videovigilancia o prevención de fraude)",
  ],
  [
    "interes_publico",
    "Interés público — solo para entidades o encargos de interés público",
  ],
];

const CHANNELS = [
  "Web",
  "WhatsApp",
  "Correo electrónico",
  "Presencial",
  "Teléfono",
  "Aplicación móvil",
];

export function BankForm({
  bank,
  companyPlan = "pro",
  action,
}: {
  bank?: DataBank;
  companyPlan?: "basico" | "pro";
  action: (formData: FormData) => Promise<void>;
}) {
  const [name, setName] = useState(bank?.name ?? "");
  const [purpose, setPurpose] = useState(bank?.purpose ?? "");
  const [categories, setCategories] = useState(bank?.data_categories ?? "");
  const [legalBasis, setLegalBasis] = useState(bank?.legal_basis ?? "consentimiento");
  const [channel, setChannel] = useState(bank?.channel ?? "Web");
  const [retention, setRetention] = useState(bank?.retention ?? "");
  const [transfers, setTransfers] = useState(bank?.transfers ?? "no");
  const [recipients, setRecipients] = useState(bank?.recipients ?? "");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = companyPlan === "pro";

  function applyPreset(preset: BankPreset) {
    setSelectedPreset(preset.id);
    setName(preset.name);
    setPurpose(preset.purpose);
    setCategories(preset.data_categories);
    setLegalBasis(preset.legal_basis);
    setChannel(preset.channel);
    setRetention(preset.retention);
    setTransfers(preset.transfers);
    setRecipients(preset.recipients);
  }

  function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiError(null);
    startTransition(async () => {
      const res = await runBankAiWizardAction(aiPrompt);
      if (!res.ok) {
        setAiError(res.error);
        return;
      }
      const d = res.data;
      setSelectedPreset(null);
      setName(d.name);
      setPurpose(d.purpose);
      setCategories(d.data_categories);
      setLegalBasis(d.legal_basis);
      setChannel(d.channel);
      setRetention(d.retention);
      setTransfers(d.transfers);
      setRecipients(d.recipients);
      setAiWarnings(d.aiWarnings);
    });
  }

  return (
    <form action={action} className="space-y-6">
      {bank && <input type="hidden" name="id" value={bank.id} />}

      {!bank && (
        <div className="rounded-[3px] border border-line-strong bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-crimson">
              Plantillas listas con 1 clic (incluidas en Básico y Pro)
            </p>
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
              Puedes editar todo después
            </span>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            Elige una de las listas típicas de una MYPE peruana y rellenaremos todos los campos legales por ti:
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-[3px] border px-3.5 py-2 text-left text-sm font-medium transition-colors ${
                  selectedPreset === preset.id
                    ? "border-crimson bg-crimson text-paper shadow-sm"
                    : "border-line-strong bg-paper-2 text-ink hover:border-ink"
                }`}
              >
                {preset.badge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Autocompletado con IA (Plan Pro); en Básico, una sola línea informativa */}
      {isPro ? (
        <div className="rounded-[3px] border border-ink bg-paper-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] bg-crimson text-paper">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink">
                Autocompletado Inteligente de Ficha SIPDP
              </p>
              <span className="rounded-full border border-crimson/40 bg-crimson/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-crimson">
                Plan Pro
              </span>
            </div>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Describe en una frase qué lista manejas (ej. <em>«Tengo un consultorio odontológico y agendo pacientes por WhatsApp y Google Calendar»</em>) y completaremos los 7 campos exigidos por la ANPD:
          </p>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={!isPro || isPending}
              placeholder={
                isPro
                  ? "Ej. Hago sorteos por Instagram y mando promociones por WhatsApp Business..."
                  : "Disponible en Plan Pro — activa el Plan Pro en Ajustes para autocompletar"
              }
              className="input flex-1 bg-white"
            />
            {isPro ? (
              <button
                type="button"
                disabled={!aiPrompt.trim() || isPending}
                onClick={handleAiGenerate}
                className="btn btn-crimson btn-sm shrink-0"
              >
                <SparklesIcon className="h-4 w-4" />
                {isPending ? "Completando..." : "Rellenar ficha"}
              </button>
            ) : (
              <Link href="/app/ajustes" className="btn btn-ghost btn-sm shrink-0">
                <LockIcon className="h-3.5 w-3.5" />
                Desbloquear en Plan Pro
              </Link>
            )}
          </div>

          {aiError && (
            <p className="mt-2.5 border-l-3 border-crimson bg-crimson/10 px-3 py-2 text-xs text-crimson">
              {aiError}
            </p>
          )}

          {aiWarnings.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-[2px] border-l-3 border-ochre bg-ochre/[0.08] p-3 text-xs text-ink">
              {aiWarnings.map((w) => (
                <p key={w}>• {w}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <LockIcon className="h-3.5 w-3.5 shrink-0" />
          Con el Plan Pro puedes describir tu lista en una frase y la IA completa la ficha.{" "}
          <Link href="/app/ajustes" className="link-underline text-ink">
            Ver Plan Pro
          </Link>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={
            <>
              Nombre del <Term k="banco">banco de datos</Term> (tu lista)
            </>
          }
          className="sm:col-span-2"
        >
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Ej. Clientes y compradores por WhatsApp y Web"
          />
        </Field>

        <Field
          label="Finalidad (¿Para qué pides y usas estos datos?)"
          className="sm:col-span-2"
          hint={
            <>
              Sé específico: «vender y entregar pedidos», no «fines comerciales».
            </>
          }
        >
          <textarea
            name="purpose"
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="input resize-y"
            placeholder="Gestión de pedidos, entregas a domicilio, facturación electrónica y atención posventa."
          />
        </Field>

        <Field
          label={
            <>
              Categorías de datos (¿Qué datos pides al <Term k="titular">titular</Term>?)
            </>
          }
          className="sm:col-span-2"
          hint={
            <>
              Si incluye <Term k="sensibles">datos sensibles</Term> (salud, huella), menciónalo.
            </>
          }
        >
          <textarea
            name="data_categories"
            rows={3}
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className="input resize-y"
            placeholder="Nombres y apellidos, DNI, dirección de entrega, correo electrónico, teléfono/WhatsApp, historial de compras."
          />
        </Field>

        <Field
          label={
            <>
              <Term k="base_legal">Base legal</Term> (¿Por qué tienes permiso de usarlos?)
            </>
          }
          hint="Si es para entregar lo que compró, usa «Ejecución de contrato». Si es para mandarle publicidad, usa «Consentimiento»."
        >
          <select
            name="legal_basis"
            className="input"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
          >
            {LEGAL_BASIS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Canal principal de recolección (¿Por dónde te dan sus datos?)"
        >
          <select
            name="channel"
            className="input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Plazo de conservación (¿Cuánto tiempo los guardas?)"
        >
          <input
            name="retention"
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            className="input"
            placeholder="Ej. 5 años desde la última compra (por SUNAT)"
          />
        </Field>

        <Field
          label={
            <>
              <Term k="transferencia">Transferencia internacional</Term> (¿Usas nube extranjera?)
            </>
          }
          hint="«Sí» si usas Google, WhatsApp, Shopify, Mailchimp u otros servicios con servidores fuera del Perú."
        >
          <select
            name="transfers"
            className="input"
            value={transfers}
            onChange={(e) => setTransfers(e.target.value)}
          >
            <option value="no">No — solo en equipos o servidores dentro del Perú</option>
            <option value="si">Sí — uso servicios en la nube (Google, Meta/WhatsApp, Shopify, AWS, etc.)</option>
          </select>
        </Field>

        <Field
          label={
            <>
              Destinatarios o <Term k="encargado">encargados</Term> externos (¿Quién más los ve?)
            </>
          }
          className="sm:col-span-2"
        >
          <input
            name="recipients"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            className="input"
            placeholder="Ej. Courier Olva, pasarela de pagos Culqi, estudio contable externo"
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link href={bank ? `/app/bancos/${bank.id}` : "/app/bancos"} className="btn btn-ghost">
          Cancelar
        </Link>
        <SubmitButton>{bank ? "Guardar cambios" : "Guardar banco de datos"}</SubmitButton>
      </div>
    </form>
  );
}
