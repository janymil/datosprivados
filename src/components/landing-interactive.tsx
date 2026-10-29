"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Term } from "./help";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  DatabaseIcon,
  FileIcon,
  InboxIcon,
  ShieldIcon,
} from "./icons";

const BUSINESS_TYPES = [
  {
    id: "tienda",
    badge: "Tienda / WhatsApp / Redes",
    title: "Tienda online, Instagram o ventas por WhatsApp",
    summary:
      "Anotas nombres, DNI, teléfonos y direcciones para enviar pedidos con motorizado o courier, y luego les mandas ofertas por difusión.",
    banks: ["Clientes y compradores", "Prospectos / Ofertas WhatsApp", "Proveedores y couriers"],
    tip: "Vender te da permiso para entregar el pedido, pero necesitas consentimiento aparte para mandarles ofertas después.",
  },
  {
    id: "salud",
    badge: "Consultorio / Salud / Estética",
    title: "Consultorio médico, dental, estética o gimnasio",
    summary:
      "Guardas fichas de pacientes, recetas, fotos del antes/después o estado de salud (estos son Datos Sensibles y son los más vigilados).",
    banks: ["Pacientes e historias de atención", "Colaboradores y personal", "Cámaras de seguridad"],
    tip: "Por manejar datos sensibles de salud, la ley exige consentimiento expreso y por escrito.",
  },
  {
    id: "local",
    badge: "Restaurante / Hotel / Tienda física",
    title: "Restaurante, hotel, academia o tienda física",
    summary:
      "Pides datos para reservas, sorteos, Wi-Fi de clientes, libro de reclamaciones, planilla de empleados o tienes cámaras de seguridad grabando.",
    banks: ["Clientes y reservas", "Colaboradores en planilla", "Videovigilancia (Cámaras)"],
    tip: "Si tienes cámaras grabando tu local, debes inscribir ese banco de datos y pegar el cartel informativo.",
  },
  {
    id: "b2b",
    badge: "Agencia / Estudio / Inmobiliaria",
    title: "Agencia, estudio contable, inmobiliaria o B2B",
    summary:
      "Manejas bases de prospectos, contactos de clientes, currículums de postulantes y contratos con proveedores.",
    banks: ["Prospectos comerciales", "Clientes y contratos", "Postulantes y colaboradores"],
    tip: "Si recibes bases de datos de tus clientes para prestarles un servicio, actúas como Encargado del tratamiento.",
  },
];

const MYTHS: Array<{
  n: string;
  short: string;
  title: string;
  body: ReactNode;
  highlight: string;
}> = [
  {
    n: "01",
    short: "Mito 1: «Banco de datos»",
    title: "Crees que «Banco de Datos» es solo para bancos financieros",
    body: (
      <>
        ¡Error común! Para la ley, tu archivo de Excel de clientes, tus contactos de WhatsApp Business y la carpeta de tus trabajadores son{" "}
        <Term k="banco">bancos de datos</Term>. No inscribirlos en el portal <Term k="sipdp">SIPDP</Term> (aunque el trámite estatal es gratis) es una infracción sancionable.
      </>
    ),
    highlight: "Trámite estatal 100 % gratuito (S/ 0) en el portal SIPDP.",
  },
  {
    n: "02",
    short: "Mito 2: Promociones y ARCO",
    title: "Mandas promociones sin permiso o ignoras el «bórrame de tu lista»",
    body: (
      <>
        Si alguien te compra un producto, tienes permiso para entregárselo, pero <strong>no</strong> para meterlo a listas publicitarias sin su <Term k="base_legal">consentimiento</Term>. Y si te pide borrar sus datos (<Term k="arco">Derecho ARCO</Term> de Cancelación), tienes solo <strong>10 <Term k="dias_habiles">días hábiles</Term></strong> para responderle y demostrarlo.
      </>
    ),
    highlight: "Plazo máximo legal: 10 días hábiles para borrar o corregir datos.",
  },
  {
    n: "03",
    short: "Mito 3: Denuncias por internet",
    title: "La fiscalización ya no necesita que vaya un inspector a tu local",
    body: (
      <>
        Cualquier cliente molesto o ex-trabajador puede entrar a la web de la <Term k="anpd">ANPD</Term>, verificar en 10 segundos si tu RUC tiene registrados sus bancos en el <Term k="rnpdp">RNPDP</Term> o si tu web no tiene Política de Privacidad, y presentar una denuncia digital.
      </>
    ),
    highlight: "El padrón RNPDP es público: cualquiera puede consultar tu RUC en segundos.",
  },
];

export function InteractiveProblem() {
  const [selectedBiz, setSelectedBiz] = useState(0);
  const [selectedMyth, setSelectedMyth] = useState(0);

  const biz = BUSINESS_TYPES[selectedBiz];
  const myth = MYTHS[selectedMyth];

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      {/* Left Interactive Card: Business Type Selector */}
      <div className="card flex flex-col justify-between p-6 md:p-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">
            1. Haz clic en tu tipo de negocio:
          </span>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedBiz(idx)}
                className={`rounded-[3px] border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                  selectedBiz === idx
                    ? "border-crimson bg-crimson text-paper shadow-sm"
                    : "border-line-strong bg-paper text-ink hover:border-ink"
                }`}
              >
                {item.badge}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[3px] border border-line bg-paper p-5">
            <h3 className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
              {biz.title}
            </h3>
            <p className="mt-2.5 text-base leading-relaxed text-ink-soft">
              {biz.summary}
            </p>

            <div className="mt-4 border-t border-line pt-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Listas (Bancos de datos) que debes declarar:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {biz.banks.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/10 px-3 py-1 font-mono text-xs font-medium text-sage"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-4 rounded-[2px] border-l-3 border-ochre bg-ochre/[0.08] px-3.5 py-2.5 text-sm leading-snug text-ink">
              <strong>Clave legal:</strong> {biz.tip}
            </p>
          </div>
        </div>
      </div>

      {/* Right Interactive Card: 3 Common Mistakes Explorer */}
      <div className="card flex flex-col justify-between p-6 md:p-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">
            2. Los 3 errores que generan multas (toca cada uno):
          </span>

          <div className="mt-3.5 flex flex-wrap gap-2">
            {MYTHS.map((m, idx) => (
              <button
                key={m.n}
                type="button"
                onClick={() => setSelectedMyth(idx)}
                className={`flex-1 rounded-[3px] border px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                  selectedMyth === idx
                    ? "border-ink bg-ink text-paper shadow-sm"
                    : "border-line-strong bg-paper text-ink hover:border-ink"
                }`}
              >
                {m.short}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[3px] border border-line bg-paper p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-crimson">
                ERROR COMÚN #{myth.n}
              </span>
              <span className="font-mono text-xs text-ink-soft">
                {selectedMyth + 1} de {MYTHS.length}
              </span>
            </div>

            <h3 className="mt-2 font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
              {myth.title}
            </h3>

            <div className="mt-3 text-base leading-relaxed text-ink-soft">
              {myth.body}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[2px] border border-line-strong bg-paper-2 px-4 py-3">
              <span className="text-sm font-medium text-ink">{myth.highlight}</span>
              <button
                type="button"
                onClick={() => setSelectedMyth((prev) => (prev + 1) % MYTHS.length)}
                className="shrink-0 font-mono text-xs font-bold uppercase tracking-[0.08em] text-crimson hover:underline"
              >
                Siguiente error →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: "sipdp",
    num: "01",
    short: "1. Fichas SIPDP",
    icon: DatabaseIcon,
    title: "Inventario de Listas y Ficha para el SIPDP",
    tag: "Plantillas con 1 clic",
    body: (
      <>
        Elige con 1 clic las listas que tienes (Clientes, Planilla, Proveedores, Cámaras, Pacientes). PrivadoPE genera la ficha exacta para que la inscribas gratis (S/ 0) en el portal <Term k="sipdp">SIPDP</Term> y guarda tu código oficial.
      </>
    ),
    previewTitle: "Vista previa: Ficha lista para copiar al SIPDP",
    previewItems: [
      ["Denominación del banco", "Clientes y compradores (Web / WhatsApp)"],
      ["Finalidad declarada", "Gestión de ventas, envíos con courier y facturación SUNAT"],
      ["Tasa estatal en MINJUSDH", "S/ 0.00 (100 % gratuito — aprobación automática)"],
    ],
  },
  {
    id: "politica",
    num: "02",
    short: "2. Política y WhatsApp",
    icon: FileIcon,
    title: "Política de Privacidad y Textos para WhatsApp",
    tag: "Enlace público propio",
    body: (
      <>
        Redacta automáticamente tu Política de Privacidad (con un enlace público listo para tu web o Instagram) y los mensajitos cortos para pedir permiso legal por WhatsApp, web o papel.
      </>
    ),
    previewTitle: "Vista previa: Tus textos listos para copiar",
    previewItems: [
      ["Enlace público alojado", "privadope.pe/p/tu-empresa (listo para bio o pie de web)"],
      ["Mensaje corto WhatsApp", "«Hola, para enviarte nuestras ofertas confirma con un SÍ...»"],
      ["Cláusula para formularios", "Casilla de consentimiento libre, previo, expreso e informado"],
    ],
  },
  {
    id: "arco",
    num: "03",
    short: "3. Canal ARCO",
    icon: InboxIcon,
    title: "Canal Público y Bandeja de Reclamos ARCO",
    tag: "Reloj 10 y 20 días hábiles",
    body: (
      <>
        Te damos un formulario público propio. Cuando alguien pide ver sus datos (20 <Term k="dias_habiles">días hábiles</Term>) o corregirlos/borrarlos (10 días hábiles), el reloj te avisa y respondes con plantillas listas.
      </>
    ),
    previewTitle: "Vista previa: Reloj legal en días hábiles",
    previewItems: [
      ["Derecho de Acceso", "Plazo legal: 20 días hábiles (descuenta feriados de Perú)"],
      ["Rectificación / Cancelación / Oposición", "Plazo legal: 10 días hábiles (plantilla legal incluida)"],
      ["Ticket de constancia", "Código automático para demostrar que respondiste a tiempo"],
    ],
  },
  {
    id: "incidentes",
    num: "04",
    short: "4. Reloj 48h Incidentes",
    icon: AlertIcon,
    title: "Reloj de 48 horas para Incidentes de Seguridad",
    tag: "Regla DS 016-2024-JUS",
    body: (
      <>
        Si pierdes un equipo o filtras datos por error, registras el <Term k="incidente">incidente</Term>, ves el contador de 48 horas que exige el <Term k="ds016">DS 016-2024-JUS</Term> y descargas el reporte oficial para la <Term k="anpd">ANPD</Term>.
      </>
    ),
    previewTitle: "Vista previa: Bitácora y reporte ANPD",
    previewItems: [
      ["Contador regresivo", "48 horas exactas desde la detección del robo o filtración"],
      ["Reporte oficial ANPD", "Borrador completo con cronología y medidas de mitigación"],
      ["Evidencia interna", "Registro auditable aunque el incidente no requiera notificación"],
    ],
  },
  {
    id: "seguridad",
    num: "05",
    short: "5. Doc. de Seguridad",
    icon: ShieldIcon,
    title: "Documento de Seguridad y Contratos Internos",
    tag: "Manual obligatorio",
    body: (
      <>
        Genera tu <Term k="seguridad">Documento de Seguridad</Term> con tus medidas de contraseñas, copias de respaldo y accesos, además de cláusulas para trabajadores y cartel de cámaras CCTV.
      </>
    ),
    previewTitle: "Vista previa: Documentación interna de auditoría",
    previewItems: [
      ["Documento de Seguridad", "Control de accesos, respaldos y gestión de contraseñas"],
      ["Acuerdos de confidencialidad", "Cláusulas para empleados en planilla y estudio contable"],
      ["Aviso de videovigilancia", "Formato oficial de cartel para locales con cámaras"],
    ],
  },
  {
    id: "semaforo",
    num: "06",
    short: "6. Asistente IA",
    icon: ClockIcon,
    title: "Asistente Legal con IA y Semáforo de Plazos",
    tag: "Asesoría y redacción con IA · 24/7",
    body: (
      <>
        ¿No sabes qué responder a un cliente o qué exige la <Term k="anpd">ANPD</Term>? Tu <strong>Asistente Legal con IA</strong> te explica qué hacer y cuándo en palabras simples, calcula tus días hábiles y redacta respuestas <Term k="arco">ARCO</Term>, correos y documentos a medida manteniendo la información de tus clientes 100 % privada.
      </>
    ),
    previewTitle: "Vista previa: Asesoría y redacción con IA al instante",
    previewItems: [
      ["Asistente IA de consultas 24/7", "Te explica qué hacer, cuándo hacerlo y te da consejos prácticos para tu rubro"],
      ["Redactor IA de respuestas y correos", "Prepara cartas ARCO, cláusulas y descargos listos para enviar"],
      ["Semáforo de días hábiles", "Calcula vencimientos de 10 y 20 días hábiles descontando feriados peruanos"],
    ],
  },
];

export function InteractiveProduct() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];
  const Icon = feat.icon;

  return (
    <div className="mt-10">
      {/* Interactive Tab Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {FEATURES.map((item, idx) => {
          const ItemIcon = item.icon;
          const isSelected = idx === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(idx)}
              className={`flex flex-col items-start justify-between gap-3 rounded-[3px] border p-4 text-left transition-all ${
                isSelected
                  ? "border-ink bg-ink text-paper shadow-md"
                  : "border-line-strong bg-paper text-ink hover:border-ink"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <ItemIcon className={`h-6 w-6 ${isSelected ? "text-[#e2574c]" : "text-ink"}`} />
                <span
                  className={`font-mono text-xs font-bold ${
                    isSelected ? "text-paper/60" : "text-ink-soft"
                  }`}
                >
                  {item.num}
                </span>
              </div>
              <span className="font-display text-base font-medium leading-snug">
                {item.short}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Feature Interactive Stage */}
      <div className="mt-4 grid gap-6 rounded-[3px] border border-ink bg-paper p-6 md:p-9 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] bg-crimson text-paper">
              <Icon className="h-6 w-6" />
            </span>
            <span className="rounded-full border border-crimson/40 bg-crimson/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson">
              Obligación #{feat.num} · {feat.tag}
            </span>
          </div>

          <h3 className="mt-5 font-display text-[1.85rem] leading-tight tracking-[-0.02em] text-ink md:text-[2.15rem]">
            {feat.title}
          </h3>

          <div className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">
            {feat.body}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/demo" prefetch={false} className="btn btn-primary">
              Probar esta función en la demo
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev + 1) % FEATURES.length)}
              className="btn btn-ghost"
            >
              Ver obligación #{FEATURES[(active + 1) % FEATURES.length].num} →
            </button>
          </div>
        </div>

        <div className="rounded-[3px] border border-line-strong bg-paper-2 p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-sage">
            {feat.previewTitle}
          </p>
          <dl className="mt-4 divide-y divide-line border-t border-line">
            {feat.previewItems.map(([label, val]) => (
              <div key={label} className="py-3.5">
                <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                  {label}
                </dt>
                <dd className="mt-1 text-base font-medium text-ink">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Elige qué listas tienes",
    time: "10 minutos",
    body: "Ingresa tu RUC y selecciona con 1 clic si tienes clientes, trabajadores en planilla, proveedores o cámaras. Nosotros llenamos el detalle por ti.",
    checklist: [
      "Plantillas pre-redactadas y autocompletado inteligente",
      "Identifica datos personales y sensibles sin abogañol",
      "Define plazos de conservación (SUNAT 5 años, etc.)",
    ],
  },
  {
    n: "2",
    title: "Publica tus textos e inscribe en SIPDP",
    time: "15 minutos",
    body: "Con un clic generas tu Política de Privacidad, tus textos de WhatsApp y tu ficha para el portal gratuito SIPDP del Ministerio de Justicia.",
    checklist: [
      "Enlace público /p/tu-empresa listo para compartir",
      "Ficha exacta para copiar en sipdp.minjus.gob.pe",
      "Trámite estatal 100 % gratuito (S/ 0)",
    ],
  },
  {
    n: "3",
    title: "Duerme tranquilo todo el año",
    time: "5 min / semana",
    body: "Si un cliente pide borrar o ver sus datos (ARCO) o pasa un imprevisto, tu Asistente Legal te explica qué hacer paso a paso, calcula los días hábiles y redacta la respuesta.",
    checklist: [
      "Asistente Legal 24/7 para resolver dudas y redactar correos",
      "Reloj automático de 10 y 20 días hábiles peruanos",
      "Guía de acción de 48 horas ante incidentes de seguridad",
    ],
  },
];

export function InteractiveSteps() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="mt-10">
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const isSelected = activeStep === index;
          return (
            <button
              key={step.n}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`group relative rounded-[3px] border p-6 text-left transition-all ${
                isSelected
                  ? "border-crimson bg-paper-2 shadow-md ring-1 ring-crimson"
                  : "border-line-strong bg-paper hover:border-ink"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`font-display text-4xl leading-none tracking-[-0.04em] ${
                    isSelected ? "text-crimson" : "text-ink"
                  }`}
                >
                  Paso {step.n}
                </span>
                <span className="rounded-full border border-line-strong bg-paper px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                  {step.time}
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl tracking-[-0.02em] text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-ink-soft">{step.body}</p>

              <div className="mt-4 border-t border-line pt-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson">
                  {isSelected ? "✓ Viendo detalles abajo" : "Ver qué incluye →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col justify-between gap-4 rounded-[3px] border border-line-strong bg-paper-2 p-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-sage">
            Lo que logras en el Paso {STEPS[activeStep].n} ({STEPS[activeStep].time}):
          </span>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-3">
            {STEPS[activeStep].checklist.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[15px] text-ink">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function InteractivePricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="mt-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-line-strong bg-paper p-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-medium text-ink">
            Elige cómo prefieres pagar:
          </span>
          <span className="rounded-full bg-sage/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-sage">
            Plan anual ahorra 2 meses gratis
          </span>
        </div>

        <div className="inline-flex rounded-[3px] border border-ink bg-paper-2 p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-[2px] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
              !annual ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Pago Mensual
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`rounded-[2px] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
              annual ? "bg-crimson text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Pago Anual (−17 %)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col p-7 md:p-8">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-3xl tracking-[-0.02em]">Básico</h3>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
              Para microempresas y RUC 10
            </span>
          </div>
          <p className="mt-2.5 text-base text-ink-soft">
            Ideal si vendes por WhatsApp, Instagram o tienes una tienda pequeña y quieres dejar tus documentos esenciales en regla.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-5xl tracking-[-0.04em]">
              {annual ? "S/ 190" : "S/ 19"}
            </span>
            <span className="text-base text-ink-soft">
              {annual ? "/ año (equivale a S/ 15.80/mes)" : "/ mes"}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.1em] text-sage">
            {annual ? "✓ Ahorras S/ 38 al año (2 meses gratis)" : "o S/ 190 al año · ahorras 2 meses"}
          </p>

          <ul className="mt-7 flex-1 space-y-3.5 border-t border-line pt-6 text-base">
            {[
              "Asistente Legal con IA 24/7: resuelve tus dudas en simple y redacta correos o documentos",
              "Hasta 2 bancos de datos (ej. Clientes y Trabajadores) + Ficha SIPDP",
              "Política de privacidad con enlace público + textos para WhatsApp",
              "Formulario público y hasta 30 solicitudes ARCO al año",
              "Registro de incidentes con reloj de 48 horas",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/registro?plan=basico" className="btn btn-ghost mt-7 w-full">
            Empezar con Básico (14 días gratis)
          </Link>
        </div>

        <div className="relative flex flex-col border-2 border-ink bg-paper p-7 md:p-8">
          <span className="absolute -top-[13px] left-7 bg-crimson px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-paper">
            Recomendado · Todas las funciones IA
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-3xl tracking-[-0.02em]">Pro</h3>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
              Para empresas RUC 20 en crecimiento
            </span>
          </div>
          <p className="mt-2.5 text-base text-ink-soft">
            Para negocios con tienda web, local físico, planilla, proveedores o consultorios que quieren automatizar todo su expediente con IA.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-5xl tracking-[-0.04em]">
              {annual ? "S/ 390" : "S/ 39"}
            </span>
            <span className="text-base text-ink-soft">
              {annual ? "/ año (equivale a S/ 32.50/mes)" : "/ mes"}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.1em] text-sage">
            {annual ? "✓ Ahorras S/ 78 al año (2 meses gratis)" : "o S/ 390 al año · ahorras 2 meses"}
          </p>

          <ul className="mt-7 flex-1 space-y-3.5 border-t border-line pt-6 text-base">
            {[
              "Todo lo del Plan Básico + Asistente Legal con IA y registros ilimitados",
              "Redactor con IA de respuestas ARCO a medida (separa baja publicitaria de boletas SUNAT)",
              "Autocompletado con IA de fichas SIPDP describiendo tu lista en 1 frase",
              "Evaluador con IA de incidentes en 48 h + redacción de comunicado a afectados",
              "Revisor con IA de textos para WhatsApp, formularios web y sorteos",
              "Documento de Seguridad interno + Contratos para personal y contador",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/registro?plan=pro" className="btn btn-crimson mt-7 w-full">
            Empezar con Pro (14 días gratis)
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

