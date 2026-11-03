import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  FileIcon,
  InboxIcon,
  LockIcon,
  ShieldIcon,
  SparklesIcon,
} from "@/components/icons";
import { PromoVideo } from "@/components/promo-video";
import { InteractivePricing, InteractiveSegments } from "@/components/landing-interactive";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GUIDES } from "@/lib/guides";
import { TOOLS } from "@/lib/tools";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({
    title: "DatosPrivados — Software de cumplimiento de la Ley 29733 para empresas",
    description:
      "Inscribe tus bancos de datos en el SIPDP, genera la política de privacidad y el documento de seguridad, controla los plazos ARCO y los incidentes de 48 horas. Para pequeñas y medianas empresas del Perú.",
    path: "/",
  }),
  // Sin plantilla «%s · DatosPrivados»: el título de la portada ya lleva la marca.
  title: { absolute: "DatosPrivados — Software de cumplimiento de la Ley 29733 para empresas" },
};

function Seal({ label = "Al día" }: { label?: string }) {
  return (
    <div className="relative h-[116px] w-[116px] text-crimson">
      <svg viewBox="0 0 120 120" className="spin-slow h-full w-full" aria-hidden="true">
        <defs>
          <path id="seal-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
        </defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
        <text fill="currentColor" fontSize="8.8" letterSpacing="2.4" fontFamily="var(--font-plex)">
          <textPath href="#seal-path">LEY 29733 · CUMPLIMIENTO · PERÚ ·</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-crimson">Estado</span>
        <span className="font-display text-base leading-none text-crimson">{label}</span>
      </div>
    </div>
  );
}

function Hero() {
  const rows: Array<[string, string, "ok" | "danger"]> = [
    ["Bancos de datos en SIPDP", "3 de 4", "danger"],
    ["Política de privacidad", "Publicada", "ok"],
    ["Documento de seguridad", "Listo", "ok"],
    ["Solicitudes ARCO", "1 vencida", "danger"],
  ];

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] dot-field opacity-70 lg:block" />
      <div className="pointer-events-none absolute -right-24 top-24 hidden h-[420px] w-[420px] rounded-full border border-line lg:block" />

      <div className="container-page relative grid gap-14 py-14 md:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:py-22">
        <div>
          <h1 className="max-w-[19ch] font-display text-[2.6rem] leading-[1.02] tracking-[-0.035em] sm:text-[3.3rem] lg:text-[3.85rem]">
            Tu empresa guarda datos de clientes y trabajadores.{" "}
            <em className="text-crimson">¿Podrías demostrar que cumples?</em>
          </h1>

          <p className="rise d3 mt-6 max-w-[50ch] text-[17.5px] leading-relaxed text-ink-soft sm:text-[18.5px]">
            La <strong>Ley 29733</strong> y su reglamento exigen bancos de datos inscritos, documentos vigentes y plazos
            controlados. DatosPrivados arma el expediente de tu empresa y lo mantiene al día, con evidencia fechada para
            una fiscalización de la ANPD.
          </p>

          <div className="rise d4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/diagnostico" className="btn btn-primary h-13 px-7 text-base">
              Diagnóstico gratuito
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/demo" prefetch={false} className="btn btn-ghost h-13 px-7 text-base">
              Probar la demo
            </Link>
          </div>

          <p className="rise d5 mt-5 text-sm text-ink-soft">Diagnóstico en 3 minutos · demo sin registro · para empresas con planilla</p>
        </div>

        <div className="rise d3 relative mx-auto w-full max-w-[460px] lg:mr-0">
          <div className="absolute -left-3 -top-3 hidden h-full w-full border border-crimson/30 sm:block" />
          <div className="relative border border-line-strong bg-paper-2 shadow-[0_18px_50px_-30px_rgba(23,25,30,0.45)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="label-mono">Tu plan de cumplimiento</p>
                <p className="mt-1 text-sm text-ink-soft">Ejemplo · Casa Verde Perú S.A.C.</p>
              </div>
              <span className="border border-crimson px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-crimson">
                2 pendientes
              </span>
            </div>

            <div className="px-6 pb-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-mono">Nivel de cumplimiento</p>
                  <p className="mt-1 font-display text-[3.8rem] leading-none tracking-[-0.04em]">
                    60<span className="text-2xl text-ink-soft">/100</span>
                  </p>
                </div>
                <div className="-mt-3 -rotate-6">
                  <Seal label="En riesgo" />
                </div>
              </div>

              <div className="mt-4 h-[7px] w-full bg-line">
                <div className="h-full w-[60%] bg-crimson" />
              </div>

              <ul className="mt-6 divide-y divide-line border-y border-line text-[15px]">
                {rows.map(([label, value, tone]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2.5 text-ink-soft">
                      {tone === "danger" ? (
                        <AlertIcon className="h-4 w-4 text-crimson" />
                      ) : (
                        <CheckIcon className="h-4 w-4 text-sage" />
                      )}
                      {label}
                    </span>
                    <span
                      className={`font-mono text-xs font-medium uppercase tracking-wide ${
                        tone === "danger" ? "text-crimson" : ""
                      }`}
                    >
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ink-soft">Siempre ves el siguiente paso y qué vence pronto.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Obligation = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  law: string;
  help: string;
};

const ONCE: Obligation[] = [
  {
    icon: DatabaseIcon,
    title: "Inscribir tus bancos de datos",
    law: "Cada banco (clientes, colaboradores, cámaras, proveedores) se inscribe en el SIPDP. Es gratis.",
    help: "Proponemos los bancos de tu sector con la ficha redactada, lista para copiar.",
  },
  {
    icon: FileIcon,
    title: "Publicar tu Política de Privacidad",
    law: "Clientes, postulantes y usuarios deben poder leer qué haces con sus datos.",
    help: "Se genera con tus bancos inscritos y se publica con enlace propio y control de versiones.",
  },
  {
    icon: CheckIcon,
    title: "Pedir consentimiento",
    law: "Para publicidad, datos de salud, biometría o datos de menores.",
    help: "Textos para formularios, contratos, WhatsApp y correo, con revisor de casillas.",
  },
  {
    icon: ShieldIcon,
    title: "Tener un Documento de Seguridad",
    law: "Quién accede a qué, cómo se protege y cuánto se conserva. Lo pide la ANPD.",
    help: "Se genera con las medidas de tu sector y marcas las que ya aplicas.",
  },
  {
    icon: LockIcon,
    title: "Firmar confidencialidad",
    law: "Con tu personal y con los proveedores que tratan datos por ti.",
    help: "Aviso para trabajadores, confidencialidad y cláusulas de encargo.",
  },
];

const WHEN: Obligation[] = [
  {
    icon: InboxIcon,
    title: "Responder pedidos ARCO",
    law: "Si alguien pide ver, corregir o borrar sus datos: de 8 a 20 días hábiles.",
    help: "Formulario público con ticket, plazos con feriados del Perú y plantillas de respuesta.",
  },
  {
    icon: AlertIcon,
    title: "Avisar incidentes graves",
    law: "Si se filtran o pierden datos: aviso a la ANPD en 48 horas.",
    help: "Reloj de 48 horas, criterios de notificación y borrador para la ANPD.",
  },
];

function ObligationItem({ item, n }: { item: Obligation; n: number }) {
  const Icon = item.icon;
  return (
    <li className="flex gap-4 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line-strong bg-paper text-crimson">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl leading-tight tracking-[-0.01em]">
          <span className="mr-1.5 text-crimson">{n}.</span>
          {item.title}
        </p>
        <p className="mt-1 text-[15.5px] leading-relaxed text-ink-soft">{item.law}</p>
        <p className="mt-1.5 flex items-start gap-1.5 text-[15px] leading-snug text-sage">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {item.help}
        </p>
      </div>
    </li>
  );
}

function Obligations() {
  return (
    <section id="obligaciones" className="scroll-mt-20 border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-24">
        <h2 className="max-w-[24ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
          Lo que la ley exige a tu empresa, en 7 puntos.
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-soft">
          Cinco se hacen una sola vez. Los otros dos, solo cuando pasa algo. En verde, lo que hace DatosPrivados por ti.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card p-6 md:p-7">
            <p className="label-mono">Base del expediente · se mantiene al día</p>
            <ul className="mt-1 divide-y divide-line">
              {ONCE.map((item, index) => (
                <ObligationItem key={item.title} item={item} n={index + 1} />
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card p-6 md:p-7">
              <p className="label-mono">Cuando pase algo</p>
              <ul className="mt-1 divide-y divide-line">
                {WHEN.map((item, index) => (
                  <ObligationItem key={item.title} item={item} n={ONCE.length + index + 1} />
                ))}
              </ul>
            </div>

            <div className="border-l-3 border-crimson bg-crimson/[0.06] px-5 py-4">
              <p className="font-display text-xl leading-tight">Multas de S/ 2,750 a S/ 550,000</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
                De 0.5 a 100 UIT si la ANPD fiscaliza y falta alguno de estos puntos. La ley no exime a ninguna empresa por su tamaño.
              </p>
            </div>

            <Link href="/demo" prefetch={false} className="btn btn-primary h-12 w-full px-6 text-base sm:w-fit">
              Ver los 7 puntos en la demo
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Segments() {
  return (
    <section id="rubros" className="scroll-mt-20 border-b border-line">
      <div className="container-page py-16 md:py-24">
        <h2 className="max-w-[24ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
          ¿Qué bancos de datos tiene tu empresa?
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-ink-soft">
          Elige tu sector y mira los bancos que normalmente se declaran en el SIPDP.{" "}
          <Link href="/sectores" className="link-underline text-ink">
            Ver el detalle por sector
          </Link>
          .
        </p>

        <InteractiveSegments />
      </div>
    </section>
  );
}

function VideoSection() {
  return (
    <section id="video" className="overflow-hidden border-b border-ink bg-ink text-paper">
      <div className="container-page grid gap-10 py-16 md:py-22 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
        <PromoVideo />

        <div>
          <h2 className="max-w-[20ch] font-display text-[2.25rem] leading-[1.04] tracking-[-0.03em] md:text-[2.8rem]">
            Así empieza una multa.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-paper/75">
            Mira en 1:42 cómo un video de cámaras terminó en una multa de 21 UIT, y qué hacer para que no te pase.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/registro"
              className="btn h-12 border-paper/40 bg-paper px-6 text-ink hover:bg-crimson hover:text-paper"
            >
              Crear cuenta
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Elige tu sector",
    time: "10 min",
    body: "Proponemos los bancos de datos típicos de tu empresa. Desmarcas lo que no aplique.",
  },
  {
    n: "2",
    title: "Revisa y publica",
    time: "20 min",
    body: "Política, consentimientos, documento de seguridad, cláusulas y fichas SIPDP, generados con tus datos.",
  },
  {
    n: "3",
    title: "Mantén el expediente",
    time: "Continuo",
    body: "Te avisamos si llega una solicitud ARCO, vence un plazo o hay un incidente. Todo queda fechado como evidencia.",
  },
];

function HowItWorks() {
  return (
    <section id="pasos" className="scroll-mt-20 border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-24">
        <h2 className="max-w-[24ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
          Cómo funciona
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card flex flex-col p-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-4xl leading-none tracking-[-0.04em] text-crimson">{step.n}</span>
                <span className="rounded-full border border-line-strong bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                  {step.time}
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl leading-tight tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 flex items-center gap-2 text-[15px] text-ink-soft">
          <SparklesIcon className="h-4 w-4 text-crimson" />
          ¿Dudas en el camino? El asistente con IA responde sobre la ley y sobre tu propio expediente.
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precios" className="scroll-mt-20 border-b border-line">
      <div className="container-page py-16 md:py-24">
        <h2 className="font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
          Cuesta menos que una hora de consultoría.
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-ink-soft">
          Sin contratos de permanencia. El registro en el SIPDP del Estado es gratis.
        </p>

        <InteractivePricing />

        <p className="mt-6 max-w-[80ch] text-sm leading-relaxed text-ink-soft">
          Los documentos son borradores con lo que declaras; no reemplazan a un abogado en casos complejos.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const questions = [
    {
      q: "Somos una empresa pequeña. ¿Nos aplica la ley?",
      a: "Sí. La Ley 29733 aplica a cualquier empresa que trate datos de personas, sin importar su tamaño. Si tienes trabajadores en planilla ya tienes al menos un banco de datos, y casi siempre con datos sensibles como descansos médicos.",
    },
    {
      q: "¿Qué es un «banco de datos»?",
      a: "Cualquier conjunto de datos de personas que la empresa usa para una finalidad: la base de clientes del ERP o CRM, la planilla y los legajos, los CVs recibidos o las grabaciones de las cámaras. No tiene nada que ver con un banco financiero.",
    },
    {
      q: "¿Necesitamos un Oficial de Datos Personales?",
      a: "Solo si tratas datos sensibles o grandes volúmenes como parte de tu actividad. Si te aplica, las medianas empresas están obligadas desde noviembre de 2026 y las pequeñas desde noviembre de 2027. DatosPrivados mantiene el expediente que ese oficial necesita.",
    },
    {
      q: "¿Esto reemplaza a mi abogado?",
      a: "No. Es una herramienta de gestión y los documentos son borradores de trabajo. Tu abogado o consultor puede revisarlos sobre una base ordenada, en vez de empezar de cero.",
    },
  ];

  return (
    <section id="preguntas" className="scroll-mt-20 border-b border-line bg-paper-2">
      <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <h2 className="max-w-[16ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
            Preguntas frecuentes
          </h2>
          <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-ink-soft">
            ¿Otra duda? Escríbenos a{" "}
            <a href="mailto:hola@datosprivados.pe" className="link-underline text-ink">
              hola@datosprivados.pe
            </a>
            .
          </p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {questions.map((item, idx) => (
            <details key={item.q} open={idx === 0} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[17px] font-medium leading-snug [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-lg leading-none text-crimson transition-transform group-open:rotate-45 group-open:border-crimson group-open:bg-crimson group-open:text-paper">
                  +
                </span>
              </summary>
              <p className="mt-3.5 max-w-[66ch] pr-8 text-base leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] dot-field" />
      <div className="container-page relative grid gap-10 py-16 md:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <h2 className="max-w-[19ch] font-display text-[2.4rem] leading-[1.02] tracking-[-0.03em] md:text-[3.2rem]">
            Mira cómo se ve una empresa en orden.
          </h2>
          <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-paper/80">
            Entra a la demo sin registrarte y recorre los 7 puntos con una empresa de ejemplo.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link
            href="/demo"
            prefetch={false}
            className="btn h-13 w-full bg-paper-2 px-7 text-base text-ink hover:bg-crimson hover:text-paper lg:w-auto"
          >
            Abrir la demo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/registro"
            className="btn h-13 w-full border-paper/40 px-7 text-base text-paper hover:bg-paper hover:text-ink lg:w-auto"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

function ToolsBand() {
  return (
    <section id="herramientas" className="scroll-mt-20 border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[24ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
            Herramientas gratuitas
          </h2>
          <Link href="/herramientas" className="link-underline text-[15px] font-medium">
            Ver todas
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="card block h-full p-5 hover:border-ink">
                <p className="font-display text-lg leading-tight">{tool.title}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{tool.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GuidesBand() {
  return (
    <section id="guias" className="scroll-mt-20 border-b border-line">
      <div className="container-page py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[24ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
            Guías de la Ley 29733 para empresas
          </h2>
          <Link href="/guias" className="link-underline text-[15px] font-medium">
            Ver todas las guías
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {GUIDES.slice(0, 6).map((guide) => (
            <li key={guide.slug}>
              <Link href={`/guias/${guide.slug}`} className="card block h-full p-5 hover:border-ink">
                <p className="font-display text-lg leading-tight">{guide.h1}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "DatosPrivados",
      url: absoluteUrl("/"),
      email: "hola@datosprivados.pe",
      areaServed: "PE",
    },
    {
      "@type": "SoftwareApplication",
      name: "DatosPrivados",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-PE",
      description:
        "Software de cumplimiento de la Ley 29733 de Protección de Datos Personales del Perú: bancos de datos, documentos, solicitudes ARCO e incidentes.",
      url: absoluteUrl("/"),
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <JsonLd data={ORGANIZATION_LD} />
      <main>
        <Hero />
        <Obligations />
        <Segments />
        <VideoSection />
        <HowItWorks />
        <Pricing />
        <ToolsBand />
        <GuidesBand />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
