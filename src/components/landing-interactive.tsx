"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, firstYearPrice, renewalPrice } from "@/lib/plans";
import { Term } from "./help";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  FileIcon,
  InboxIcon,
  ShieldIcon,
  SparklesIcon,
} from "./icons";

type Segment = {
  id: string;
  sector: string;
  badge: string;
  title: string;
  summary: string;
  banks: string[];
  tip: string;
};

/**
 * Plantillas visibles en la portada. Los identificadores `sector` existen en
 * `src/lib/sectors.ts`: al pulsar «Usar esta plantilla» se precarga el rubro en
 * el registro y en el onboarding.
 */
const SEGMENTS: Segment[] = [
  {
    id: "consultorio",
    sector: "policlinico",
    badge: "Salud",
    title: "Clínica, policlínico o centro médico",
    summary:
      "Historias clínicas, recetas, citas y datos de salud de tus pacientes. Son datos sensibles: la ANPD los mira con lupa.",
    banks: ["Pacientes e historias", "Trabajadores", "Cámaras", "Proveedores"],
    tip: "Pide consentimiento expreso y por escrito para datos de salud. La plantilla incluye el texto listo.",
  },
  {
    id: "financiera",
    sector: "prestamos",
    badge: "Finanzas",
    title: "Financiera, cooperativa o casa de préstamos",
    summary:
      "Ingresos, historial crediticio, debida diligencia y decisiones de crédito. Protección de datos y prevención de lavado se cruzan en cada expediente.",
    banks: ["Créditos y debida diligencia", "Clientes", "Trabajadores", "Cámaras"],
    tip: "Consultar centrales de riesgo exige la autorización del titular: guárdala junto a la solicitud.",
  },
  {
    id: "farmacia",
    sector: "farmacia",
    badge: "Salud",
    title: "Farmacia o botica",
    summary:
      "Recetas, historial de compras de medicamentos y datos de clientes. La receta puede revelar una condición de salud.",
    banks: ["Clientes", "Recetas / pacientes", "Trabajadores", "Cámaras"],
    tip: "Declara «clientes» y «pacientes» por separado: la finalidad y la base legal son distintas.",
  },
  {
    id: "colegio",
    sector: "colegio",
    badge: "Educación",
    title: "Colegio, nido o academia",
    summary:
      "Matrículas, notas, asistencia, apoderados, salud escolar y cámaras. Los datos de menores tienen protección reforzada.",
    banks: ["Alumnos y apoderados", "Trabajadores", "Cámaras", "Proveedores"],
    tip: "El consentimiento de un menor lo otorgan sus padres o apoderados, no el alumno.",
  },
  {
    id: "restaurante",
    sector: "restaurante",
    badge: "Alimentos",
    title: "Restaurante, cafetería o delivery",
    summary:
      "Reservas, pedidos, reparto, libro de reclamaciones y cámaras. Si haces promociones, necesitas permiso aparte.",
    banks: ["Clientes y reservas", "Trabajadores", "Cámaras", "Proveedores"],
    tip: "Vender el pedido no te autoriza a meter al cliente en una lista de ofertas por WhatsApp.",
  },
  {
    id: "inmobiliaria",
    sector: "inmobiliaria",
    badge: "Inmobiliaria",
    title: "Inmobiliaria o constructora",
    summary:
      "Prospectos de ferias y portales, sustento de ingresos de compradores, contratistas y cámaras de obra.",
    banks: ["Clientes y prospectos", "Trabajadores", "Proveedores", "Cámaras"],
    tip: "Una base de prospectos comprada no trae el consentimiento para enviarles publicidad.",
  },
  {
    id: "estudio",
    sector: "contable",
    badge: "Servicios",
    title: "Estudio contable, abogados o agencia",
    summary:
      "Datos de clientes, planillas, expedientes y contactos comerciales. Muchas veces tratas datos por encargo de otra empresa.",
    banks: ["Clientes", "Trabajadores", "Proveedores"],
    tip: "Si tratas datos por encargo, firma la cláusula de encargado que está en Documentos.",
  },
  {
    id: "saas",
    sector: "software",
    badge: "Tecnología",
    title: "SaaS, app o plataforma digital",
    summary:
      "Usuarios, cobros, registros técnicos y datos de terceros que tus usuarios invitan. Son los bancos que casi nadie declara.",
    banks: ["Usuarios", "Facturación", "Logs", "Terceros invitados"],
    tip: "Si además alojas datos de tus clientes, eres su encargado del tratamiento: firma la cláusula.",
  },
  {
    id: "hotel",
    sector: "hotel",
    badge: "Turismo",
    title: "Hotel, hostal o alojamiento",
    summary:
      "Huéspedes, reservas, check-in, facturación y cámaras. La normativa de hospedaje obliga a registrar ciertos datos.",
    banks: ["Huéspedes", "Trabajadores", "Cámaras", "Proveedores"],
    tip: "Booking o Airbnb son encargados: revisa qué datos comparten y declara el flujo transfronterizo.",
  },
  {
    id: "gimnasio",
    sector: "gimnasio",
    badge: "Bienestar",
    title: "Gimnasio, estética o spa",
    summary:
      "Socios, fichas de salud, control de acceso y cámaras. La huella o el rostro son datos biométricos sensibles.",
    banks: ["Socios y membresías", "Pacientes", "Trabajadores", "Cámaras"],
    tip: "Si usas huella o reconocimiento facial para entrar, necesitas consentimiento expreso y una EIPD.",
  },
];

export function InteractiveSegments() {
  const [selected, setSelected] = useState(0);
  const segment = SEGMENTS[selected];

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="border border-line bg-paper-2 p-4 md:p-5">
        <label htmlFor="segment-select" className="label-mono">
          Elige tu sector
        </label>
        <select
          id="segment-select"
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
          className="input mt-3 sm:hidden"
        >
          {SEGMENTS.map((item, index) => (
            <option key={item.id} value={index}>
              {item.title}
            </option>
          ))}
        </select>
        <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid">
          {SEGMENTS.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={active}
                className={`min-h-[58px] border px-3 py-2.5 text-left text-[13.5px] font-medium leading-snug transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink hover:border-ink"
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>
        <p className="mt-4 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
          ¿No ves tu rubro? Tenemos más de 60 plantillas dentro.{" "}
          <Link href="/registro" className="link-underline font-medium text-ink">
            Crea tu cuenta
          </Link>{" "}
          y elige la tuya.
        </p>
      </div>

      <div className="flex flex-col border border-ink bg-paper p-6 md:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-crimson/40 bg-crimson/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson">
              {segment.badge}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
              Plantilla de rubro
            </span>
          </div>

          <h3 className="mt-4 font-display text-[1.8rem] leading-tight tracking-[-0.02em] text-ink md:text-[2.05rem]">
            {segment.title}
          </h3>
          <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">
            {segment.summary}
          </p>

          <div className="mt-5 border-t border-line pt-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
              Bancos de datos (tus listas) que la ley te pide declarar
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {segment.banks.map((bank) => (
                <span
                  key={bank}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/10 px-3 py-1 font-mono text-xs font-medium text-sage"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  {bank}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 border-l-3 border-ochre bg-ochre/[0.08] px-3.5 py-2.5 text-sm leading-snug text-ink">
            <strong>Clave legal:</strong> {segment.tip}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-line pt-5">
          <Link href={`/registro?sector=${segment.sector}`} className="btn btn-primary">
            Usar esta plantilla
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link href="/demo" prefetch={false} className="btn btn-ghost">
            Ver la demo
          </Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          La plantilla se carga al crear tu cuenta. Puedes cambiarla o ajustar las listas después.
        </p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: "sipdp",
    num: "01",
    short: "Listas y SIPDP",
    icon: DatabaseIcon,
    title: "Inventario de listas y ficha para el SIPDP",
    tag: "Plantillas con 1 clic",
    body: (
      <>
        Elige tus listas (clientes, pacientes, planilla, proveedores, cámaras). Generamos la ficha para
        inscribirlas gratis en el <Term k="sipdp">SIPDP</Term> y guardamos tu código.
      </>
    ),
    previewTitle: "Vista previa: ficha lista para copiar",
    previewItems: [
      ["Denominación del banco", "Clientes y compradores (web / WhatsApp)"],
      ["Costo estatal", "S/ 0 (aprobación automática)"],
    ],
  },
  {
    id: "politica",
    num: "02",
    short: "Política y textos",
    icon: FileIcon,
    title: "Política de privacidad y textos para WhatsApp",
    tag: "Enlace público propio",
    body: (
      <>
        Publica tu Política de Privacidad con un enlace propio y copia avisos cortos para formularios,
        WhatsApp, checkout y boletas, más los textos de consentimiento por canal.
      </>
    ),
    previewTitle: "Vista previa: textos listos para copiar",
    previewItems: [
      ["Enlace público", "datosprivados.pe/p/tu-empresa"],
      ["WhatsApp", "«Para enviarte ofertas, confirma con un SÍ»"],
    ],
  },
  {
    id: "arco",
    num: "03",
    short: "Canal ARCO",
    icon: InboxIcon,
    title: "Formulario público y bandeja ARCO",
    tag: "Reloj de 10 y 20 días hábiles",
    body: (
      <>
        Tus clientes o pacientes piden ver, corregir o borrar sus datos. El reloj descuenta los feriados
        peruanos y respondes con plantillas listas.
      </>
    ),
    previewTitle: "Vista previa: reloj legal",
    previewItems: [
      ["Acceso", "20 días hábiles"],
      ["Rectificación, cancelación u oposición", "10 días hábiles"],
    ],
  },
  {
    id: "incidentes",
    num: "04",
    short: "Incidentes 48 h",
    icon: AlertIcon,
    title: "Registro de incidentes y reloj de 48 horas",
    tag: "Criterios del art. 34.1",
    body: (
      <>
        Si pierdes un equipo o filtras datos, evalúas si debes notificar a la ANPD, ves el contador de 48
        horas y descargas un borrador de reporte con la cronología.
      </>
    ),
    previewTitle: "Vista previa: bitácora y reporte",
    previewItems: [
      ["Contador", "48 horas desde la detección"],
      ["Reporte", "Borrador con cronología y medidas"],
    ],
  },
  {
    id: "seguridad",
    num: "05",
    short: "Documentos internos",
    icon: ShieldIcon,
    title: "Documento de seguridad y contratos internos",
    tag: "Checklist de medidas",
    body: (
      <>
        Documento de seguridad, retención, encargo de tratamiento, confidencialidad, cartel de cámaras y
        evaluación de impacto, con un checklist de las medidas de los arts. 46 y 47.
      </>
    ),
    previewTitle: "Vista previa: documentación interna",
    previewItems: [
      ["Documento de seguridad", "Accesos, respaldos y contraseñas"],
      ["Encargo y confidencialidad", "Cláusulas para proveedores y equipo"],
    ],
  },
  {
    id: "asistente",
    num: "06",
    short: "Asistente IA",
    icon: SparklesIcon,
    title: "Asistente legal con IA",
    tag: "Consultas y redacción",
    body: (
      <>
        Pregunta en simple qué hacer, pide un correo o una respuesta <Term k="arco">ARCO</Term> y calcula
        tus días hábiles. Los datos identificables se anonimizan antes de enviarse al modelo.
      </>
    ),
    previewTitle: "Vista previa: asistente y redactor",
    previewItems: [
      ["Consulta en simple", "Qué hacer, cuándo y en qué sección"],
      ["Redacción", "Correos, respuestas ARCO y cláusulas"],
    ],
  },
];

export function InteractiveProduct() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];
  const Icon = feat.icon;

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {FEATURES.map((item, idx) => {
          const ItemIcon = item.icon;
          const isSelected = idx === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(idx)}
              aria-pressed={isSelected}
              className={`flex flex-col items-start justify-between gap-3 rounded-[3px] border p-4 text-left transition-all ${
                isSelected
                  ? "border-ink bg-ink text-paper shadow-md"
                  : "border-line-strong bg-paper text-ink hover:border-ink"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <ItemIcon className={`h-6 w-6 ${isSelected ? "text-[#e2574c]" : "text-ink"}`} />
                <span className={`font-mono text-xs font-bold ${isSelected ? "text-paper/60" : "text-ink-soft"}`}>
                  {item.num}
                </span>
              </div>
              <span className="font-display text-base font-medium leading-snug">{item.short}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-6 rounded-[3px] border border-ink bg-paper p-6 md:p-9 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] bg-crimson text-paper">
              <Icon className="h-6 w-6" />
            </span>
            <span className="rounded-full border border-crimson/40 bg-crimson/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson">
              Módulo {feat.num} · {feat.tag}
            </span>
          </div>

          <h3 className="mt-5 font-display text-[1.85rem] leading-tight tracking-[-0.02em] text-ink md:text-[2.15rem]">
            {feat.title}
          </h3>

          <div className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">{feat.body}</div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/demo" prefetch={false} className="btn btn-primary">
              Probar esta función
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev + 1) % FEATURES.length)}
              className="btn btn-ghost"
            >
              Ver módulo {FEATURES[(active + 1) % FEATURES.length].num} →
            </button>
          </div>
        </div>

        <div className="rounded-[3px] border border-line-strong bg-paper-2 p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-sage">{feat.previewTitle}</p>
          <dl className="mt-4 divide-y divide-line border-t border-line">
            {feat.previewItems.map(([label, val]) => (
              <div key={label} className="py-3.5">
                <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
                <dd className="mt-1 text-base font-medium text-ink">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

const PRICING_BULLETS: Record<"basico" | "pro", string[]> = {
  basico: [
    "Implementación incluida: tus bancos, política, documento de seguridad y fichas SIPDP listos",
    "Todos tus bancos de datos y solicitudes ARCO, sin límite",
    "Política de privacidad con enlace público + textos de WhatsApp",
    "Reloj de plazos ARCO e incidentes con reloj de 48 horas",
    "Asistente Legal con IA para consultas",
  ],
  pro: [
    "Todo lo del Plan Básico",
    "Redactor IA de respuestas ARCO a medida",
    "Autocompletado IA de fichas SIPDP",
    "Evaluador IA de incidentes + comunicado a afectados",
    "Revisor IA de textos de WhatsApp, formularios y sorteos",
  ],
};

/** Planes anuales: el primer año incluye la implementación y cada renovación cuesta menos. */
export function InteractivePricing() {
  return (
    <div className="mt-10">
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-[3px] border border-line-strong bg-paper p-4">
        <span className="font-display text-lg font-medium text-ink">Un pago al año, sin cobros mensuales.</span>
        <span className="rounded-full bg-sage/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink">
          Primer año con implementación · renovación más barata
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(["basico", "pro"] as const).map((id) => {
          const plan = PLANS[id];
          const featured = id === "pro";
          return (
            <div
              key={id}
              className={`relative flex flex-col p-7 md:p-8 ${featured ? "border-2 border-ink bg-paper" : "card"}`}
            >
              {featured && (
                <span className="absolute -top-[13px] left-7 bg-crimson px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-paper">
                  Recomendado · Plan Pro
                </span>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-3xl tracking-[-0.02em]">{plan.name}</h3>
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">{plan.tagline}</span>
              </div>
              <p className="mt-2.5 text-base text-ink-soft">{plan.audience}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl tracking-[-0.04em]">S/ {firstYearPrice(id)}</span>
                <span className="text-base text-ink-soft">el primer año</span>
              </div>
              <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.1em] text-sage">
                Luego S/ {renewalPrice(id)} al año · IGV incluido
              </p>

              <ul className="mt-7 flex-1 space-y-3.5 border-t border-line pt-6 text-base">
                {PRICING_BULLETS[id].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/registro?plan=${id}`}
                className={`btn mt-7 w-full ${featured ? "btn-crimson" : "btn-ghost"}`}
              >
                Empezar con {plan.name}
                {featured && <ArrowRightIcon className="h-4 w-4" />}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-[80ch] text-sm leading-relaxed text-ink-soft">
        Tu plan no se renueva solo con el precio del primer año: te avisamos 30 y 7 días antes para que renueves
        por menos. Si no renuevas, puedes exportar todos tus datos.
      </p>
    </div>
  );
}
