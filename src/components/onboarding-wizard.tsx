"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { BANK_PRESETS, type BankPresetId } from "@/lib/bank-presets";
import { SECTORS, SECTOR_GROUPS, type Sector } from "@/lib/sectors";
import { Field } from "@/components/ui";
import { ToolsPicker, type PickedTool } from "@/components/tools-picker";
import { SALES_BANDS, SECTOR_FAMILY, sectorLegalProfileById } from "@/lib/sector-legal";
import { CheckIcon } from "@/components/icons";

const STEPS = ["Tu negocio", "Datos que manejas", "Herramientas", "Contacto"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// La mayoría de negocios tiene al menos un trabajador o recibe CVs.
function suggestedBanks(sector: Sector | undefined) {
  return new Set<BankPresetId>(sector ? ["trabajadores", ...sector.banks] : []);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
      {pending ? "Preparando tu plan…" : "Crear mi plan de cumplimiento"}
    </button>
  );
}

export function OnboardingWizard({
  companyName,
  initial,
  initialTools = [],
}: {
  companyName: string;
  initialTools?: PickedTool[];
  initial: {
    sector: string;
    address: string;
    phone: string;
    dpoName: string;
    dpoEmail: string;
    website?: string;
    salesBand?: string;
    complaintsUrl?: string;
  };
}) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | undefined>(() =>
    SECTORS.find((item) => item.label === initial.sector)
  );
  const [banks, setBanks] = useState<Set<BankPresetId>>(() => suggestedBanks(sector));

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SECTORS;
    return SECTORS.filter((item) => normalize(`${item.label} ${item.group} ${item.keywords ?? ""}`).includes(q));
  }, [query]);

  function chooseSector(item: Sector) {
    setSector(item);
    setBanks(suggestedBanks(item));
  }

  function toggleBank(id: BankPresetId) {
    setBanks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sectorFamily = (sector ? SECTOR_FAMILY[sector.id] : undefined) ?? "comercio";
  const sectorWeb = sector ? sectorLegalProfileById(sector.id).web : false;
  const suggested = suggestedBanks(sector);
  const orderedPresets = [
    ...BANK_PRESETS.filter((preset) => suggested.has(preset.id)),
    ...BANK_PRESETS.filter((preset) => !suggested.has(preset.id)),
  ];

  return (
    <form action={completeOnboardingAction} className="space-y-8">
      <input type="hidden" name="sector" value={sector?.label ?? ""} />
      {Array.from(banks).map((id) => (
        <input key={id} type="hidden" name="banks" value={id} />
      ))}

      <ol className="grid grid-cols-4 gap-2" aria-label="Progreso">
        {STEPS.map((label, index) => (
          <li key={label}>
            <span className={`block h-1.5 rounded-full ${index <= step ? "bg-crimson" : "bg-line-strong"}`} />
            <span
              className={`mt-2 block font-mono text-[11px] uppercase tracking-[0.08em] ${
                index === step ? "font-semibold text-ink" : "text-ink-soft"
              }`}
            >
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {/* Paso 1: rubro */}
      <section hidden={step !== 0} className="space-y-5">
        <div>
          <h1 className="font-display text-[2rem] leading-tight tracking-[-0.02em]">
            ¿A qué se dedica {companyName}?
          </h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            Con esto te mostramos solo las obligaciones que aplican a tu tipo de negocio.
          </p>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className="input"
          placeholder="Busca tu rubro: bodega, dentista, gimnasio, colegio…"
          aria-label="Buscar rubro"
        />

        {sector && (
          <p className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[15px] leading-relaxed">
            Plantilla elegida: <strong>{sector.label}</strong>. Puedes cambiarla abajo; las listas y el
            aviso de datos sensibles se adaptan a tu rubro.
          </p>
        )}

        <div className="max-h-[46vh] space-y-5 overflow-y-auto border border-line bg-paper-2 p-4">
          {matches.length === 0 && (
            <p className="text-[15px] text-ink-soft">
              No encontramos ese rubro. Elige <strong>«Otro tipo de negocio»</strong> en el grupo «Otros servicios».
            </p>
          )}
          {SECTOR_GROUPS.map((group) => {
            const items = matches.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="label-mono">{group}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {items.map((item) => {
                    const active = sector?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseSector(item)}
                        aria-pressed={active}
                        className={`border px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-line-strong bg-paper hover:border-ink"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {sector?.note && (
          <p className="border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed">{sector.note}</p>
        )}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary disabled:opacity-50" disabled={!sector} onClick={() => setStep(1)}>
            Continuar
          </button>
        </div>
      </section>

      {/* Paso 2: bancos de datos */}
      <section hidden={step !== 1} className="space-y-5">
        <div>
          <h1 className="font-display text-[2rem] leading-tight tracking-[-0.02em]">
            ¿Qué datos de personas maneja tu negocio?
          </h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            Ya marcamos lo típico de tu rubro: desmarca lo que no aplique. Cada opción es una lista de datos
            («banco de datos») que la ley te pide declarar. Es gratis y te guiamos en cada una.
          </p>
        </div>

        <div className="grid gap-2.5">
          {orderedPresets.map((preset) => {
            const checked = banks.has(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleBank(preset.id)}
                className={`flex items-start gap-3.5 border px-4 py-3.5 text-left transition-colors ${
                  checked ? "border-ink bg-paper-2" : "border-line bg-paper hover:border-line-strong"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border ${
                    checked ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper"
                  }`}
                  aria-hidden="true"
                >
                  {checked && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-base font-medium">
                    {preset.question}
                    {preset.sensitive && (
                      <span className="rounded-full bg-ochre/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ochre">
                        Puede incluir datos sensibles
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{preset.example}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
            Atrás
          </button>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-50"
            disabled={banks.size === 0}
            onClick={() => setStep(2)}
          >
            Continuar ({banks.size})
          </button>
        </div>
      </section>

      {/* Paso 3: herramientas */}
      <section hidden={step !== 2} className="space-y-5">
        <div>
          <h1 className="font-display text-[2rem] leading-tight tracking-[-0.02em]">
            ¿Qué herramientas usas con los datos de tus clientes?
          </h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            Web, correo, WhatsApp, pagos, publicidad, nube… Marca las que usas y dinos en qué país guardan los datos. Si una
            herramienta guarda datos fuera del Perú, la ley exige informarlo y firmar un contrato con ella. Si no está en
            la lista, escríbela.
          </p>
        </div>

        <ToolsPicker
          key={sectorFamily}
          family={sectorFamily}
          initial={initialTools}
          initialWeb={sectorWeb || Boolean(initial.website)}
        />

        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
            Atrás
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
            Continuar
          </button>
        </div>
      </section>

      {/* Paso 4: contacto */}
      <section hidden={step !== 3} className="space-y-5">
        <div>
          <h1 className="font-display text-[2rem] leading-tight tracking-[-0.02em]">Último paso: tus datos de contacto</h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            La ley exige que tus clientes sepan dónde ubicarte y a quién escribir sobre sus datos. Los usamos para
            redactar tu Política de Privacidad.
          </p>
        </div>

        <Field label="Dirección legal" hint="La de tu Ficha RUC.">
          <input name="address" required={step === 3} defaultValue={initial.address} className="input" placeholder="Av. La Mar 1234, Miraflores, Lima" />
        </Field>
        <Field label="Teléfono o WhatsApp del negocio">
          <input name="phone" required={step === 3} defaultValue={initial.phone} className="input" placeholder="+51 987 654 321" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsable de privacidad" hint="Puede ser el dueño o administrador.">
            <input name="dpo_name" defaultValue={initial.dpoName} className="input" />
          </Field>
          <Field label="Correo para temas de privacidad">
            <input name="dpo_email" type="email" defaultValue={initial.dpoEmail} className="input" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sitio web o tienda online" hint="Déjalo vacío si no tienes.">
            <input name="website" defaultValue={initial.website ?? ""} className="input" placeholder="https://mitienda.pe" />
          </Field>
          <Field label="Ventas anuales aproximadas" hint="Define desde cuándo te exigen designar un Oficial de Datos Personales.">
            <select name="sales_band" defaultValue={initial.salesBand ?? ""} className="input">
              <option value="">Prefiero no indicarlo</option>
              {SALES_BANDS.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Enlace de tu Libro de Reclamaciones virtual (opcional)"
          hint="Si ya usas librodigital.pe u otro, pégalo aquí; lo pondremos en tus documentos."
        >
          <input
            name="complaints_url"
            defaultValue={initial.complaintsUrl ?? ""}
            className="input"
            placeholder="https://librodigital.pe/tu-negocio"
          />
        </Field>

        <div className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[15px] leading-relaxed">
          Al terminar crearemos <strong>{banks.size} {banks.size === 1 ? "banco de datos" : "bancos de datos"} en borrador</strong>,
          tu <strong>Política de Privacidad</strong> y tus <strong>textos de consentimiento</strong>. Podrás revisarlos y
          editarlos antes de publicar nada.
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
            Atrás
          </button>
          <SubmitButton />
        </div>
      </section>
    </form>
  );
}
