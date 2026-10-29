import Link from "next/link";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  DatabaseIcon,
  FileIcon,
  InboxIcon,
  Logo,
  ShieldIcon,
} from "@/components/icons";

export const metadata = {
  title: "PrivadoPE — La Ley 29733, en orden",
};

function Seal() {
  return (
    <div className="relative h-[112px] w-[112px] text-crimson">
      <svg viewBox="0 0 120 120" className="spin-slow h-full w-full" aria-hidden="true">
        <defs>
          <path id="seal-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
        </defs>
        <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
        <text fill="currentColor" fontSize="8.4" letterSpacing="2.6" fontFamily="var(--font-plex)">
          <textPath href="#seal-path">LEY 29733 · CUMPLIMIENTO · PERÚ ·</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-crimson">Estado</span>
        <span className="font-display text-lg leading-none text-crimson">Al día</span>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="container-page flex h-[68px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3" aria-label="PrivadoPE, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] md:flex" aria-label="Principal">
          <a href="#problema" className="text-ink-soft transition-colors hover:text-ink">
            El problema
          </a>
          <a href="#producto" className="text-ink-soft transition-colors hover:text-ink">
            Producto
          </a>
          <a href="#precios" className="text-ink-soft transition-colors hover:text-ink">
            Precios
          </a>
          <a href="#preguntas" className="text-ink-soft transition-colors hover:text-ink">
            Preguntas
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Entrar
          </Link>
          <Link href="/registro" className="btn btn-primary btn-sm">
            Probar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] dot-field opacity-70 lg:block" />
      <div className="pointer-events-none absolute -right-24 top-24 hidden h-[420px] w-[420px] rounded-full border border-line lg:block" />

      <div className="container-page relative grid gap-14 py-14 md:py-20 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-10 lg:py-24">
        <div>
          <div className="rise d1 mb-7 flex items-center gap-3">
            <span className="h-[7px] w-[7px] bg-crimson" />
            <span className="label-mono">Ley 29733 · MYPE peruanas · 2026</span>
          </div>

          <h1 className="rise d2 max-w-[15ch] font-display text-[2.6rem] leading-[0.98] tracking-[-0.035em] sm:text-[3.4rem] lg:text-[4rem]">
            Tu empresa ya trata datos personales.{" "}
            <em className="text-crimson">Ahora puede cumplir la ley.</em>
          </h1>

          <p className="rise d3 mt-7 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft sm:text-base">
            PrivadoPE ordena tus bancos de datos, atiende solicitudes ARCO dentro del plazo y
            deja constancia de cada incidente. Sin consultoras eternas. Sin carpetas perdidas.
          </p>

          <div className="rise d4 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/demo" className="btn btn-primary h-12 px-6 text-[15px]">
              Probar la demo
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href="#precios" className="btn btn-ghost h-12 px-6 text-[15px]">
              Ver planes desde S/ 19
            </a>
          </div>

          <p className="rise d5 mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            14 días gratis · sin tarjeta · datos alojados en Lima
          </p>
        </div>

        <div className="rise d3 relative mx-auto w-full max-w-[440px] lg:mr-0">
          <div className="absolute -left-3 -top-3 hidden h-full w-full border border-crimson/30 sm:block" />
          <div className="relative border border-line-strong bg-paper-2 shadow-[0_18px_50px_-30px_rgba(23,25,30,0.45)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="label-mono">Expediente digital</p>
                <p className="mt-1 font-mono text-xs text-ink-soft">N.º PDP-2026-0042</p>
              </div>
              <span className="border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]">
                Confidencial
              </span>
            </div>

            <div className="px-5 pb-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-mono">Nivel de cumplimiento</p>
                  <p className="mt-1 font-display text-[3.6rem] leading-none tracking-[-0.04em]">
                    92<span className="text-2xl text-ink-soft">/100</span>
                  </p>
                </div>
                <div className="-mt-3 -rotate-6">
                  <Seal />
                </div>
              </div>

              <div className="mt-4 h-[6px] w-full bg-line">
                <div className="h-full w-[92%] bg-sage" />
              </div>

              <ul className="mt-6 divide-y divide-line border-y border-line text-[13px]">
                {[
                  ["Bancos de datos registrados", "3 de 4"],
                  ["Política de privacidad", "Publicada"],
                  ["Solicitudes ARCO pendientes", "1"],
                  ["Incidentes abiertos", "Ninguno"],
                ].map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-[10px]">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <CheckIcon className="h-[15px] w-[15px] text-sage" />
                      {label}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide">{value}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="font-display text-[15px]">Casa Verde Perú</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    RUC 20604567891
                  </p>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">
                  <span className="pulse-dot h-[6px] w-[6px] rounded-full bg-sage" />
                  Actualizado hoy
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            Vista real del panel · datos de demostración
          </p>
        </div>
      </div>
    </section>
  );
}

function StatBand() {
  const stats = [
    { value: "100 UIT", label: "multa máxima por infracción muy grave", note: "Ley 29733, art. 39" },
    { value: "48 h", label: "para notificar un incidente a la ANPD", note: "Reglamento DS 016-2024-JUS" },
    { value: "20 días", label: "hábiles para responder una solicitud ARCO", note: "Plazo legal de atención" },
  ];

  return (
    <section className="border-b border-line bg-ink text-paper">
      <div className="container-page grid divide-y divide-white/15 py-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-0">
        {stats.map((stat) => (
          <div key={stat.value} className="px-0 py-6 sm:px-8 sm:py-9 first:sm:pl-0 last:sm:pr-0">
            <p className="font-display text-3xl leading-none tracking-[-0.03em]">{stat.value}</p>
            <p className="mt-2 max-w-[24ch] text-[13px] leading-snug text-paper/70">{stat.label}</p>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">{stat.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    {
      n: "01",
      title: "No sabes qué datos tienes",
      body: "Clientes, planilla, proveedores, newsletter. Cada área guarda algo distinto y nadie tiene el inventario. Sin inventario no hay cumplimiento posible.",
    },
    {
      n: "02",
      title: "El plazo corre en tu contra",
      body: "Un correo pidiendo sus datos parece inofensivo. A los 20 días hábiles se convierte en una infracción que la ANPD puede sancionar.",
    },
    {
      n: "03",
      title: "La multa llega por correo",
      body: "No hay inspector en la puerta. Hay una notificación, un expediente y 15 días para responder. La mayoría de MYPE se enteran tarde.",
    },
  ];

  return (
    <section id="problema" className="border-b border-line">
      <div className="container-page py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="label-mono">01 — El problema</span>
            <h2 className="mt-4 max-w-[16ch] font-display text-[2.1rem] leading-[1.02] tracking-[-0.03em] md:text-[2.7rem]">
              El problema no es la ley. Es que nadie te dijo qué hacer con ella.
            </h2>
            <p className="mt-5 max-w-[40ch] text-sm leading-relaxed text-ink-soft">
              La Ley 29733 existe desde 2011. La mayoría de MYPE peruanas sigue sin un inventario de
              datos, sin política publicada y sin un canal formal para atender a sus titulares.
            </p>
          </div>

          <div className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <div key={item.n} className="grid gap-3 py-6 sm:grid-cols-[52px_1fr] sm:gap-6">
                <span className="font-mono text-[11px] tracking-[0.1em] text-crimson">{item.n}</span>
                <div>
                  <h3 className="font-display text-xl tracking-[-0.02em]">{item.title}</h3>
                  <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Product() {
  const features = [
    {
      icon: DatabaseIcon,
      title: "Inventario de bancos de datos",
      body: "Declara qué datos tratas, para qué y por cuánto tiempo. Cada banco queda listo para el registro en el SIPDP.",
      tag: "Registro asistido",
    },
    {
      icon: InboxIcon,
      title: "Bandeja ARCO con reloj",
      body: "Cada solicitud entra con número, plazo de 20 días hábiles y alertas antes de vencer. Plantillas de respuesta incluidas.",
      tag: "20 días hábiles",
    },
    {
      icon: AlertIcon,
      title: "Registro de incidentes",
      body: "Describe la brecha, calcula las 48 horas y genera el borrador de notificación para la ANPD.",
      tag: "48 horas",
    },
    {
      icon: FileIcon,
      title: "Documentos que no dan vergüenza",
      body: "Política de privacidad, consentimientos por canal y documento de seguridad, generados con tus propios datos.",
      tag: "Listos para publicar",
    },
    {
      icon: ShieldIcon,
      title: "Evidencia ordenada",
      body: "Historial de cada solicitud, respuesta y incidente. Si la ANPD pregunta, la respuesta ya está armada.",
      tag: "Expediente digital",
    },
    {
      icon: ClockIcon,
      title: "Alertas que sí importan",
      body: "Vencimientos ARCO, incidentes sin notificar y documentos faltantes. Un correo semanal, sin ruido.",
      tag: "Sin ruido",
    },
  ];

  return (
    <section id="producto" className="border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="label-mono">02 — El producto</span>
            <h2 className="mt-4 max-w-[18ch] font-display text-[2.1rem] leading-[1.02] tracking-[-0.03em] md:text-[2.7rem]">
              Seis piezas. Un solo expediente.
            </h2>
          </div>
          <p className="max-w-[38ch] text-sm leading-relaxed text-ink-soft">
            No es un curso ni una consultoría. Es el sistema operativo de tu cumplimiento, con la
            información siempre a mano.
          </p>
        </div>

        <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="group bg-paper-2 p-6 transition-colors hover:bg-paper">
              <div className="flex items-start justify-between">
                <feature.icon className="h-7 w-7 text-ink" />
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
                  {feature.tag}
                </span>
              </div>
              <h3 className="mt-8 font-display text-xl leading-tight tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{feature.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          <span className="flex items-center gap-2">
            <CheckIcon className="h-3.5 w-3.5 text-sage" /> Formulario público de ARCO
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="h-3.5 w-3.5 text-sage" /> Ficha imprimible para el SIPDP
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="h-3.5 w-3.5 text-sage" /> Exportación de documentos
          </span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Carga tu empresa",
      body: "RUC, sector y los bancos de datos que ya tienes. En 10 minutos, aunque nunca hayas oído hablar del SIPDP.",
      time: "10 min",
    },
    {
      n: "2",
      title: "Genera y publica",
      body: "Política de privacidad, consentimientos y documento de seguridad. Los publicas con un enlace o los descargas.",
      time: "15 min",
    },
    {
      n: "3",
      title: "Opera sin sustos",
      body: "Cada solicitud ARCO y cada incidente entran a un flujo con plazos, alertas y evidencia. Tú solo respondes.",
      time: "5 min / semana",
    },
  ];

  return (
    <section className="border-b border-line">
      <div className="container-page py-16 md:py-24">
        <span className="label-mono">03 — Cómo funciona</span>
        <h2 className="mt-4 max-w-[20ch] font-display text-[2.1rem] leading-[1.02] tracking-[-0.03em] md:text-[2.7rem]">
          De cero a cumplimiento en una tarde.
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.n} className="relative border-t border-ink pt-6">
              <div className="absolute -top-[5px] left-0 h-[9px] w-[9px] rounded-full bg-crimson" />
              <div className="flex items-baseline justify-between">
                <span className="font-display text-4xl leading-none tracking-[-0.04em]">
                  {step.n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {step.time}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              {index < steps.length - 1 && (
                <span className="absolute -right-4 top-0 hidden h-full w-px bg-line md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precios" className="border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="label-mono">04 — Precios</span>
            <h2 className="mt-4 font-display text-[2.1rem] leading-[1.02] tracking-[-0.03em] md:text-[2.7rem]">
              Menos que una hora de abogado.
            </h2>
          </div>
          <p className="max-w-[34ch] text-sm leading-relaxed text-ink-soft">
            Sin contrato anual obligatorio. Sin costo de implementación. Precios en soles, IGV incluido.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col p-7">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl tracking-[-0.02em]">Básico</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Para empezar
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Para la MYPE que necesita ordenar lo esencial y cumplir lo básico.
            </p>
            <div className="mt-7 flex items-baseline gap-2">
              <span className="font-display text-5xl tracking-[-0.04em]">S/ 19</span>
              <span className="text-sm text-ink-soft">/ mes</span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              o S/ 190 al año · ahorras 2 meses
            </p>
            <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-6 text-[13.5px]">
              {[
                "2 bancos de datos",
                "Política de privacidad y consentimientos",
                "Hasta 30 solicitudes ARCO al año",
                "Registro de incidentes",
                "Formulario público de ARCO",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckIcon className="mt-[3px] h-4 w-4 text-sage" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/registro?plan=basico" className="btn btn-ghost mt-7 w-full">
              Empezar con Básico
            </Link>
          </div>

          <div className="relative flex flex-col border border-ink bg-paper p-7">
            <span className="absolute -top-[11px] left-7 bg-crimson px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-paper">
              Recomendado
            </span>
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl tracking-[-0.02em]">Pro</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                Para operar en serio
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Para negocios con varios canales, más datos y necesidad de evidencia.
            </p>
            <div className="mt-7 flex items-baseline gap-2">
              <span className="font-display text-5xl tracking-[-0.04em]">S/ 39</span>
              <span className="text-sm text-ink-soft">/ mes</span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              o S/ 390 al año · ahorras 2 meses
            </p>
            <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-6 text-[13.5px]">
              {[
                "Bancos de datos ilimitados",
                "Solicitudes ARCO ilimitadas",
                "Plantillas de respuesta y evidencia",
                "Documento de seguridad y versiones",
                "Exportación del expediente completo",
                "Soporte prioritario por WhatsApp",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckIcon className="mt-[3px] h-4 w-4 text-sage" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/registro?plan=pro" className="btn btn-crimson mt-7 w-full">
              Empezar con Pro
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-6 max-w-[70ch] text-[12px] leading-relaxed text-ink-soft">
          Los precios no incluyen asesoría legal personalizada. PrivadoPE entrega documentos base y
          flujos de trabajo; te recomendamos validarlos con un abogado de tu confianza.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const questions = [
    {
      q: "¿Esto me hace cumplir la ley automáticamente?",
      a: "No. Ninguna herramienta lo hace. PrivadoPE te da el inventario, los documentos base, los plazos y la evidencia. El cumplimiento real depende de que apliques esos procesos y de la validación legal de tus textos.",
    },
    {
      q: "¿Tengo que registrar mis bancos de datos ante la ANPD?",
      a: "La Ley 29733 exige registrar los bancos de datos personales ante la Autoridad Nacional de Protección de Datos Personales a través del SIPDP. La plataforma te guía paso a paso y guarda el código y la fecha de cada registro.",
    },
    {
      q: "¿Qué pasa si me llega una solicitud ARCO?",
      a: "Tienes 20 días hábiles para responder. En PrivadoPE registras la solicitud, el sistema calcula el vencimiento, te avisa antes y te ofrece plantillas de respuesta. Todo queda archivado como evidencia.",
    },
    {
      q: "¿Funciona si vendo por WhatsApp o Instagram?",
      a: "Sí. Los consentimientos están pensados por canal: web, WhatsApp, correo y formularios físicos. Puedes copiar los textos y usarlos directamente en tus conversaciones o en tu bio.",
    },
    {
      q: "¿Dónde están mis datos?",
      a: "En el MVP los datos viven en una base local del servidor. La versión de producción se aloja en la región de Lima (o la más cercana disponible) con cifrado en tránsito, respaldos y control de acceso.",
    },
    {
      q: "¿Puedo cancelar cuando quiera?",
      a: "Sí. No hay permanencia mínima ni penalidad. Si cancelas, puedes exportar tu expediente antes de que se desactive la cuenta.",
    },
  ];

  return (
    <section id="preguntas" className="border-b border-line">
      <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <span className="label-mono">05 — Preguntas</span>
          <h2 className="mt-4 max-w-[12ch] font-display text-[2.1rem] leading-[1.02] tracking-[-0.03em] md:text-[2.7rem]">
            Lo que todos preguntan.
          </h2>
          <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-ink-soft">
            ¿Otra duda? Escríbenos a{" "}
            <a href="mailto:hola@privadope.pe" className="link-underline">
              hola@privadope.pe
            </a>
            .
          </p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {questions.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="mt-1 font-mono text-lg leading-none text-crimson transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] pr-8 text-[13.5px] leading-relaxed text-ink-soft">
                {item.a}
              </p>
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
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
            06 — Empieza hoy
          </span>
          <h2 className="mt-4 max-w-[18ch] font-display text-[2.3rem] leading-[1.0] tracking-[-0.03em] md:text-[3.2rem]">
            La multa no avisa. Tu cumplimiento tampoco debería.
          </h2>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-paper/70">
            Prueba la demo con datos de una empresa peruana real. Sin registro, sin tarjeta, sin
            llamada de ventas.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link href="/demo" className="btn h-12 w-full bg-paper-2 px-6 text-ink hover:bg-crimson hover:text-paper lg:w-auto">
            Abrir la demo
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/registro"
            className="btn h-12 w-full border-paper/40 px-6 text-paper hover:bg-paper hover:text-ink lg:w-auto"
          >
            Crear mi cuenta
          </Link>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/40 lg:text-right">
            14 días gratis · cancela cuando quieras
          </p>
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
            <p className="mt-4 max-w-[30ch] text-[13px] leading-relaxed text-ink-soft">
              El panel de cumplimiento de la Ley 29733 para micro y pequeñas empresas peruanas.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              Lima, Perú · 2026
            </p>
          </div>

          <div>
            <p className="label-mono">Producto</p>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-soft">
              <li><a href="#producto" className="hover:text-ink">Funciones</a></li>
              <li><a href="#precios" className="hover:text-ink">Precios</a></li>
              <li><Link href="/demo" className="hover:text-ink">Demo</Link></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Recursos</p>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-soft">
              <li><a href="#preguntas" className="hover:text-ink">Preguntas frecuentes</a></li>
              <li><span className="text-ink-soft/60">Guía de la Ley 29733 (pronto)</span></li>
              <li><span className="text-ink-soft/60">Plantillas ARCO (pronto)</span></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Contacto</p>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-soft">
              <li><a href="mailto:hola@privadope.pe" className="hover:text-ink">hola@privadope.pe</a></li>
              <li><a href="https://wa.me/51987654321" className="hover:text-ink">WhatsApp</a></li>
              <li><Link href="/login" className="hover:text-ink">Ingresar</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-[11px] leading-relaxed text-ink-soft md:flex-row md:items-start md:justify-between">
          <p className="max-w-[70ch]">
            © 2026 PrivadoPE. PrivadoPE es una herramienta de gestión de cumplimiento y no un estudio
            jurídico. Los documentos generados son borradores que deben ser validados por un abogado.
          </p>
          <p className="font-mono uppercase tracking-[0.12em]">Hecho en Perú</p>
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
      <StatBand />
      <Problem />
      <Product />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
