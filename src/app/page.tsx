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
  Logo,
  ShieldIcon,
  SparklesIcon,
} from "@/components/icons";
import { PromoVideo } from "@/components/promo-video";
import { InteractivePricing, InteractiveSegments } from "@/components/landing-interactive";

export const metadata = {
  title: "DatosPrivados — Ley 29733 en simple para tu negocio o consultorio en Perú",
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

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="container-page flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="DatosPrivados, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-[15px] font-medium md:flex" aria-label="Principal">
          <a href="#obligaciones" className="text-ink-soft transition-colors hover:text-ink">
            Qué exige la ley
          </a>
          <a href="#rubros" className="text-ink-soft transition-colors hover:text-ink">
            Tu rubro
          </a>
          <a href="#pasos" className="text-ink-soft transition-colors hover:text-ink">
            Cómo funciona
          </a>
          <a href="#precios" className="text-ink-soft transition-colors hover:text-ink">
            Precios
          </a>
          <a href="#preguntas" className="text-ink-soft transition-colors hover:text-ink">
            Preguntas
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/login"
            className="btn btn-ghost btn-sm shrink-0 whitespace-nowrap px-3 text-[13px] sm:px-4 sm:text-sm"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="btn btn-primary btn-sm shrink-0 whitespace-nowrap px-3 text-[13px] sm:px-4 sm:text-sm"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
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
            ¿Atiendes pacientes, clientes o trabajadores?{" "}
            <em className="text-crimson">La ley ya te aplica.</em>
          </h1>

          <p className="rise d3 mt-6 max-w-[50ch] text-[17.5px] leading-relaxed text-ink-soft sm:text-[18.5px]">
            Si guardas datos de personas, la <strong>Ley 29733</strong> te pide 7 cosas. Te decimos cuáles y te las
            dejamos listas, sin lenguaje de abogados.
          </p>

          <div className="rise d4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#obligaciones" className="btn btn-primary h-13 px-7 text-base">
              Ver qué me exige
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <Link href="/demo" prefetch={false} className="btn btn-ghost h-13 px-7 text-base">
              Probar la demo
            </Link>
          </div>

          <p className="rise d5 mt-5 text-sm text-ink-soft">Demo sin registro · planes desde S/ 19 al mes</p>
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
    law: "Cada lista de personas (clientes, trabajadores, cámaras) va al registro del Estado (SIPDP). Es gratis.",
    help: "Te sugerimos las listas de tu rubro y te damos la ficha lista para copiar.",
  },
  {
    icon: FileIcon,
    title: "Publicar tu Política de Privacidad",
    law: "Tus clientes deben poder leer qué haces con sus datos.",
    help: "La armamos con tus datos y te damos un enlace para tu web o WhatsApp.",
  },
  {
    icon: CheckIcon,
    title: "Pedir consentimiento",
    law: "Antes de enviar publicidad o tratar datos de salud.",
    help: "Textos listos para formularios, WhatsApp y correos.",
  },
  {
    icon: ShieldIcon,
    title: "Tener un Documento de Seguridad",
    law: "Manual interno de quién accede a qué y cómo se protege. No se publica.",
    help: "Lo generamos y marcas las medidas que ya aplicas.",
  },
  {
    icon: LockIcon,
    title: "Firmar confidencialidad",
    law: "Con tu equipo y los proveedores que ven datos.",
    help: "Formatos listos para imprimir y firmar.",
  },
];

const WHEN: Obligation[] = [
  {
    icon: InboxIcon,
    title: "Responder pedidos ARCO",
    law: "Si alguien pide ver, corregir o borrar sus datos: 10 a 20 días hábiles.",
    help: "Formulario público, reloj con feriados del Perú y respuesta lista.",
  },
  {
    icon: AlertIcon,
    title: "Avisar incidentes graves",
    law: "Si se filtran o pierden datos: aviso a la ANPD en 48 horas.",
    help: "Te decimos si debes avisar y te damos el borrador.",
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
          Lo que la ley te exige, en 7 puntos.
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-soft">
          Cinco se hacen una sola vez. Los otros dos, solo cuando pasa algo. En verde, lo que hace DatosPrivados por ti.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card p-6 md:p-7">
            <p className="label-mono">Una sola vez · ~30 minutos</p>
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
                De 0.5 a 100 UIT si la ANPD fiscaliza y falta alguno de estos puntos. No importa el tamaño del negocio.
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
          ¿Qué bancos de datos tiene tu negocio?
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-ink-soft">
          Elige tu rubro y mira las listas de personas que te toca declarar en el SIPDP.
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
            ¿Nunca escuchaste de esta ley?
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
    title: "Elige tu rubro",
    time: "10 min",
    body: "Te proponemos las listas típicas de tu negocio. Desmarcas lo que no aplique.",
  },
  {
    n: "2",
    title: "Revisa y publica",
    time: "20 min",
    body: "Política, consentimientos, documento de seguridad y ficha SIPDP, ya llenos con tus datos.",
  },
  {
    n: "3",
    title: "Atiende avisos",
    time: "Cuando pase algo",
    body: "Te avisamos si llega un pedido ARCO o vence un plazo. Todo queda registrado como prueba.",
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
          ¿Dudas en el camino? El asistente con IA te responde en simple.
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
          Cuesta menos que media hora de abogado.
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-ink-soft">
          Sin contratos amarrados. El registro en el SIPDP del Estado es gratis.
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
      q: "Soy un consultorio, una bodega o tengo RUC 10. ¿Me aplica?",
      a: "Sí. Aplica a cualquier negocio que guarde datos de personas, sin importar su tamaño. Si manejas historias clínicas, el cuidado es mayor porque son datos sensibles.",
    },
    {
      q: "¿Qué es un «banco de datos»?",
      a: "Cualquier lista o archivo con datos de personas: tu Excel de clientes, la agenda de WhatsApp, la planilla o las grabaciones de tus cámaras. No tiene nada que ver con un banco financiero.",
    },
    {
      q: "¿Sirve si solo vendo por WhatsApp, Instagram o TikTok?",
      a: "Sí. Te damos un enlace para tu política y tu formulario ARCO, listo para tu biografía o tu catálogo de WhatsApp Business.",
    },
    {
      q: "¿Esto reemplaza a mi abogado?",
      a: "No. Es una herramienta de gestión y los documentos son borradores. Para datos sensibles a gran escala o casos complejos, hazlos revisar.",
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
            Mira cómo se ve un negocio en orden.
          </h2>
          <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-paper/80">
            Entra a la demo sin registrarte y recorre los 7 puntos con un negocio de ejemplo.
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

function Footer() {
  return (
    <footer className="bg-paper-2">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              Cumplimiento en simple de la Ley 29733 y el DS 016-2024-JUS para MYPE, consultorios y
              profesionales del Perú.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
              Lima, Perú · 2026
            </p>
          </div>

          <div>
            <p className="label-mono">Producto</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><a href="#obligaciones" className="hover:text-ink">Qué exige la ley</a></li>
              <li><a href="#rubros" className="hover:text-ink">Plantillas por rubro</a></li>
              <li><a href="#precios" className="hover:text-ink">Precios</a></li>
              <li><Link href="/demo" prefetch={false} className="hover:text-ink">Demo interactiva</Link></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Normativa peruana</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><a href="#preguntas" className="hover:text-ink">Preguntas frecuentes</a></li>
              <li><span>Ley N.° 29733 (LPDP)</span></li>
              <li><span>Reglamento DS N.° 016-2024-JUS</span></li>
              <li><span>Portal SIPDP — MINJUSDH</span></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Contacto</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><a href="mailto:hola@datosprivados.pe" className="hover:text-ink">hola@datosprivados.pe</a></li>
              <li><Link href="/login" className="hover:text-ink">Ingresar a mi cuenta</Link></li>
              <li><Link href="/registro" className="hover:text-ink">Crear una cuenta</Link></li>
              <li><Link href="/terminos" className="hover:text-ink">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-ink">Política de privacidad</Link></li>
              <li><Link href="/cookies" className="hover:text-ink">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft md:flex-row md:items-start md:justify-between">
          <p className="max-w-[76ch]">
            © 2026 DatosPrivados. DatosPrivados es una herramienta tecnológica de gestión y educación
            sobre la Ley 29733, no un estudio jurídico. Los documentos generados son borradores de
            trabajo que recomendamos validar con un abogado.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.12em]">Hecho en Perú para MYPEs y consultorios</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main>
      <Header />
      <Hero />
      <Obligations />
      <Segments />
      <VideoSection />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
