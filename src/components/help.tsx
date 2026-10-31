"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

export type GlossaryKey =
  | "ley29733"
  | "ds016"
  | "anpd"
  | "sipdp"
  | "rnpdp"
  | "arco"
  | "banco"
  | "titular"
  | "responsable"
  | "encargado"
  | "sensibles"
  | "base_legal"
  | "transferencia"
  | "odp"
  | "uit"
  | "dias_habiles"
  | "incidente"
  | "seguridad";

export type GlossaryEntry = {
  term: string;
  official: string;
  plain: string;
  example: string;
};

export const GLOSSARY: Record<GlossaryKey, GlossaryEntry> = {
  ley29733: {
    term: "Ley 29733",
    official: "Ley N.° 29733 — Ley de Protección de Datos Personales del Perú",
    plain:
      "Es la ley peruana que obliga a todo negocio (con RUC 10 o RUC 20) a cuidar la información personal de sus clientes, trabajadores y proveedores, pedirles permiso antes de usarla para publicidad y registrar sus listas ante el Estado.",
    example:
      "Si guardas nombres y celulares de clientes en Excel o WhatsApp para venderles, esta ley ya aplica para tu negocio.",
  },
  ds016: {
    term: "DS 016-2024-JUS",
    official: "Decreto Supremo N.° 016-2024-JUS — Nuevo Reglamento de la Ley 29733",
    plain:
      "Es el reglamento actualizado que detalla cómo cumplir la Ley 29733. Hizo 100 % gratuito el registro de bancos de datos, fijó el plazo máximo de 48 horas para reportar robos o filtraciones de datos y definió fechas límite para el Oficial de Datos Personales.",
    example:
      "Si te hackean el correo o envías por error la lista de clientes a todos, este reglamento te exige avisar a la ANPD en 48 horas.",
  },
  anpd: {
    term: "ANPD",
    official: "Autoridad Nacional de Protección de Datos Personales (MINJUSDH)",
    plain:
      "Es la entidad del Ministerio de Justicia que fiscaliza y sanciona a las empresas que no cuidan los datos personales. Así como la SUNAT ve impuestos e INDECOPI ve reclamos de consumo, la ANPD vigila la privacidad.",
    example:
      "Si un cliente te pide borrar su teléfono de tus promociones y lo ignoras, ese cliente te denuncia ante la ANPD.",
  },
  sipdp: {
    term: "SIPDP",
    official: "Sistema Integrado de Protección de Datos Personales (sipdp.minjus.gob.pe)",
    plain:
      "Es la página web oficial del Ministerio de Justicia donde inscribes por internet tus bancos de datos. El trámite es 100 % virtual, gratuito (S/ 0) y de aprobación automática.",
    example:
      "En DatosPrivados armas tu ficha lista y luego copias y pegas esos datos en el portal SIPDP para recibir tu código oficial.",
  },
  rnpdp: {
    term: "RNPDP",
    official: "Registro Nacional de Protección de Datos Personales",
    plain:
      "Es el padrón público oficial donde figuran todas las empresas peruanas que han declarado legalmente sus bases de datos ante la ANPD.",
    example:
      "Cualquier persona o inspector puede buscar tu RUC en el RNPDP para comprobar si cumpliste con registrar tus bases de clientes y trabajadores.",
  },
  arco: {
    term: "ARCO",
    official: "Derechos de Acceso, Rectificación, Cancelación y Oposición",
    plain:
      "Son los 4 derechos gratuitos que tiene toda persona sobre sus datos en tu negocio: Acceso (saber qué tienes de él), Rectificación (corregir un dato mal escrito), Cancelación (borrar sus datos) y Oposición (prohibirte usarlos para cierto fin, como publicidad).",
    example:
      "Cuando un cliente te escribe: «Ya no me manden ofertas por WhatsApp, borren mi número», está ejerciendo su derecho ARCO de Cancelación/Oposición.",
  },
  banco: {
    term: "Banco de datos",
    official: "Banco de Datos Personales (físico o automatizado)",
    plain:
      "No tiene nada que ver con bancos financieros (como BCP o Interbank). Significa simplemente cualquier «lista o grupo ordenado de datos de personas» que maneja tu negocio, ya sea en Excel, un sistema web, WhatsApp o archivadores de papel.",
    example:
      "Tu Excel de clientes, tu carpeta con CVs y contratos de trabajadores, y las grabaciones de tus cámaras de seguridad son 3 bancos de datos distintos.",
  },
  titular: {
    term: "Titular del dato",
    official: "Titular de los datos personales (persona natural)",
    plain:
      "Es el dueño real de la información: la persona de carne y hueso (tu cliente, tu trabajador, tu paciente o un postulante). Tu empresa NO es dueña de esos datos; solo los tiene prestados.",
    example:
      "Si María compra en tu tienda y te deja su DNI y celular, María es la «titular del dato».",
  },
  responsable: {
    term: "Responsable",
    official: "Titular del banco de datos / Responsable del tratamiento",
    plain:
      "Es tu negocio (persona jurídica con RUC 20 o persona natural con negocio RUC 10) que decide qué datos pedir a la gente y para qué usarlos.",
    example:
      "Tu empresa es el «Responsable» porque tú decides pedir nombre, DNI y dirección para entregar los pedidos.",
  },
  encargado: {
    term: "Encargado",
    official: "Encargado del tratamiento de datos personales",
    plain:
      "Es cualquier proveedor externo o empresa tercera a la que le entregas o das acceso a los datos de tus clientes o empleados para que te ayude a operar.",
    example:
      "Tu estudio contable externo, el courier (Olva, Urbano), la pasarela de pagos (Culqi, Niubiz) o donde alojas tu web son tus «Encargados».",
  },
  sensibles: {
    term: "Datos sensibles",
    official: "Datos personales sensibles (Art. 2.5 de la Ley 29733)",
    plain:
      "Son datos muy delicados e íntimos de una persona: estado de salud, descansos médicos, huella digital o rostro (biometría), ingresos económicos, religión, afiliación sindical o vida sexual. La ley exige protegerlos con máximo cuidado y consentimiento por escrito.",
    example:
      "Una clínica dental que guarda historias médicas o una empresa que guarda descansos médicos de su planilla maneja «datos sensibles».",
  },
  base_legal: {
    term: "Base legal",
    official: "Principio de consentimiento y supuestos de licitud (Art. 5 y 14 de la Ley 29733)",
    plain:
      "Es el motivo legal que te da permiso para tener y usar los datos de alguien. No siempre necesitas pedir permiso si los usas solo para cumplir una compra o una ley (como emitir factura en SUNAT), pero SÍ necesitas consentimiento expreso para mandar publicidad.",
    example:
      "Para enviar el producto que te compraron la base es «Ejecución de contrato». Para mandarle ofertas por WhatsApp el mes siguiente, la base es «Consentimiento».",
  },
  transferencia: {
    term: "Transferencia internacional",
    official: "Flujo transfronterizo de datos personales",
    plain:
      "Ocurre cuando los datos de tus clientes o trabajadores se guardan en servidores o plataformas tecnológicas ubicados fuera del Perú. Es completamente legal, pero debes declararlo en tu ficha SIPDP y en tu Política de Privacidad.",
    example:
      "Si usas Google Workspace, Gmail, Mailchimp, Shopify, Meta/WhatsApp Cloud o servidores en EE. UU., haces transferencia internacional de datos.",
  },
  odp: {
    term: "ODP / OPD",
    official: "Oficial de Datos Personales (DS 016-2024-JUS)",
    plain:
      "Es la persona designada para supervisar que la empresa cumpla la Ley 29733 y atender a la ANPD. Solo es obligatorio si tratas grandes volúmenes de datos o datos sensibles (salud, biometría) como parte de tu actividad; aun así, las microempresas recién deben designarlo desde el 30 de noviembre de 2028. Mientras tanto, basta con indicar una persona y un correo de contacto para privacidad.",
    example:
      "En una MYPE, el mismo dueño o administrador puede figurar como responsable de contacto de privacidad sin gastar en un consultor externo.",
  },
  uit: {
    term: "UIT",
    official: "Unidad Impositiva Tributaria (Perú)",
    plain:
      "Es el valor de referencia en soles que usa el Estado peruano para calcular multas e impuestos (S/ 5,500 por cada UIT en 2026). La ANPD aplica multas leves (0.5 a 5 UIT), graves (5 a 50 UIT) y muy graves (50 a 100 UIT).",
    example:
      "No inscribir tus bancos de datos o responder tarde una solicitud ARCO son infracciones leves: multa de 0.5 a 5 UIT (de S/ 2,750 a S/ 27,500 en 2026).",
  },
  dias_habiles: {
    term: "Días hábiles",
    official: "Cómputo de plazos en días hábiles administrativos",
    plain:
      "Son los días laborables de lunes a viernes, sin contar sábados, domingos ni feriados nacionales oficiales del Perú. Los plazos de la ley para solicitudes ARCO se cuentan en días hábiles desde el día siguiente de recibida la solicitud.",
    example:
      "Plazos legales ARCO (DS 016-2024-JUS): 20 días hábiles para Acceso, y 10 días hábiles para Rectificación, Cancelación u Oposición.",
  },
  incidente: {
    term: "Incidente de seguridad",
    official: "Incidente de seguridad de datos personales (Brecha de datos)",
    plain:
      "Cualquier accidente, robo, hackeo o error humano donde los datos personales que guardas quedan expuestos, se pierden o los ve alguien que no debía. Si expone muchos datos, puede afectar a muchas personas, involucra datos sensibles o causa un daño evidente, debes avisar a la ANPD en máximo 48 horas. Todos los incidentes deben quedar registrados, aunque no se notifiquen.",
    example:
      "Te roban la laptop del negocio sin clave, hackean tu tienda web o mandas un correo masivo dejando visibles los correos de todos tus clientes en «Para:».",
  },
  seguridad: {
    term: "Documento de Seguridad",
    official: "Documento de Seguridad y medidas técnicas/organizativas",
    plain:
      "Es un manual interno obligatorio donde dejas por escrito quién tiene acceso a los datos en tu empresa, cómo creas contraseñas, cada cuánto haces copias de seguridad y qué haces si hay un incidente. No se publica en tu web; se guarda para mostrarlo si la ANPD te inspecciona.",
    example:
      "Si la ANPD te pide demostrar que cuidas tus bases de datos, les entregas tu Documento de Seguridad firmado con fecha cierta.",
  },
};

export function Term({
  k,
  children,
  className = "",
}: {
  k: GlossaryKey;
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[k];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span
      ref={ref}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        title="Ver qué significa"
        className="inline cursor-help border-b border-dotted border-ink-soft/60 text-inherit transition-colors hover:border-crimson hover:text-crimson"
      >
        {children ?? entry.term}
      </button>

      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-1/2 z-50 mb-2.5 w-[340px] -translate-x-1/2 rounded-[3px] border border-ink bg-paper-2 p-4 text-left font-sans text-ink shadow-[0_18px_45px_-10px_rgba(23,25,30,0.48)] sm:w-[400px]"
        >
          <span className="flex items-center justify-between gap-2 border-b border-line pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">
              {entry.term}
            </span>
            <span className="rounded-sm bg-crimson/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-crimson">
              En simple
            </span>
          </span>
          <span className="mt-2 block font-mono text-[11.5px] leading-snug text-ink-soft">
            {entry.official}
          </span>
          <span className="mt-2.5 block text-[14.5px] font-normal leading-relaxed text-ink">
            {entry.plain}
          </span>
          <span className="mt-3 block rounded-[2px] border-l-3 border-sage bg-sage/[0.1] px-3 py-2 text-[13.5px] font-normal leading-snug text-ink">
            <strong className="font-mono text-[11px] uppercase tracking-[0.06em] text-sage">
              Ejemplo real:{" "}
            </strong>
            {entry.example}
          </span>
        </span>
      )}
    </span>
  );
}

export function GuideBox({
  title = "Guía rápida para entender esta sección",
  what,
  why,
  how,
  defaultOpen = false,
}: {
  title?: string;
  what: ReactNode;
  why: ReactNode;
  how: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"what" | "why" | "how">("what");

  const tabs = [
    {
      id: "what" as const,
      num: "01",
      label: "¿Qué es en simple?",
      badgeColor: "text-crimson border-crimson bg-crimson/10",
      content: what,
    },
    {
      id: "why" as const,
      num: "02",
      label: "¿Por qué lo exige la ley?",
      badgeColor: "text-ochre border-ochre bg-ochre/10",
      content: why,
    },
    {
      id: "how" as const,
      num: "03",
      label: "¿Qué tienes que hacer aquí?",
      badgeColor: "text-sage border-sage bg-sage/10",
      content: how,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="rounded-[3px] border border-line-strong bg-paper-2 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={isOpen}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crimson font-mono text-xs font-bold text-paper">
            ?
          </span>
          <span className="font-display text-[1.05rem] leading-snug tracking-[-0.01em] text-ink sm:text-lg">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className={`${isOpen ? "sm:flex" : ""} hidden items-center gap-1`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsOpen(true);
                }}
                className={`rounded-[2px] border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors ${
                  isOpen && activeTab === tab.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {tab.num}. {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="ml-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson hover:underline"
          >
            <span className="hidden sm:inline">{isOpen ? "Ocultar " : "Ver explicación "}</span>
            <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            <span className="sr-only sm:hidden">{isOpen ? "Ocultar" : "Ver explicación"}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-line bg-paper p-5">
          <div className="mb-3 flex flex-wrap gap-1.5 sm:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[2px] border px-2.5 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] ${
                  activeTab === tab.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper-2 text-ink-soft"
                }`}
              >
                {tab.num}. {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${currentTab.badgeColor}`}
              >
                Paso {currentTab.num} · {currentTab.label}
              </span>
              <div className="mt-2.5 max-w-[78ch] text-base leading-relaxed text-ink">
                {currentTab.content}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.label}
                  className={`h-2.5 rounded-full transition-all ${
                    activeTab === tab.id ? "w-7 bg-crimson" : "w-2.5 bg-line-strong hover:bg-ink/40"
                  }`}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const idx = tabs.findIndex((t) => t.id === activeTab);
                  setActiveTab(tabs[(idx + 1) % tabs.length].id);
                }}
                className="ml-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink hover:text-crimson"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
