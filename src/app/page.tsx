import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  Logo,
} from "@/components/icons";
import { Term } from "@/components/help";
import { ExplainerVideo } from "@/components/explainer-video";
import { PromoVideo } from "@/components/promo-video";
import {
  InteractivePricing,
  InteractiveProblem,
  InteractiveProduct,
  InteractiveSteps,
} from "@/components/landing-interactive";

export const metadata = {
  title: "PrivadoPE — Cumple la Ley 29733 en simple para tu negocio en Perú",
};

function Seal() {
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
        <span className="font-display text-xl leading-none text-crimson">Al día</span>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3" aria-label="PrivadoPE, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-[15px] font-medium md:flex" aria-label="Principal">
          <a href="#video" className="text-ink-soft transition-colors hover:text-ink">
            ¿Qué es esto? (Video)
          </a>
          <a href="#problema" className="text-ink-soft transition-colors hover:text-ink">
            ¿A quién aplica?
          </a>
          <a href="#producto" className="text-ink-soft transition-colors hover:text-ink">
            Qué incluye
          </a>
          <a href="#ia" className="text-ink-soft transition-colors hover:text-ink">
            Asistente IA
          </a>
          <a href="#precios" className="text-ink-soft transition-colors hover:text-ink">
            Precios
          </a>
          <a href="#preguntas" className="text-ink-soft transition-colors hover:text-ink">
            Preguntas
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
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

      <div className="container-page relative grid gap-14 py-14 md:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:py-22">
        <div>
          <div className="rise d1 mb-6 flex flex-wrap items-center gap-2.5">
            <span className="h-[8px] w-[8px] bg-crimson" />
            <span className="label-mono">
              Para todo negocio con RUC 10 o 20 en el Perú
            </span>
          </div>

          <h1 className="rise d2 max-w-[16ch] font-display text-[2.6rem] leading-[1.02] tracking-[-0.035em] sm:text-[3.3rem] lg:text-[3.85rem]">
            ¿Pides nombres, DNI o WhatsApp a tus clientes?{" "}
            <em className="text-crimson">Esta ley ya te aplica.</em>
          </h1>

          <p className="rise d3 mt-6 max-w-[54ch] text-[17.5px] leading-relaxed text-ink-soft sm:text-[18.5px]">
            Si guardas clientes en Excel o WhatsApp, emites boletas, tienes trabajadores o cámaras, la{" "}
            <Term k="ley29733">Ley 29733</Term> te obliga a declarar esas listas y publicar tu Política de
            Privacidad. PrivadoPE te guía paso a paso, sin abogados.
          </p>

          <div className="rise d4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/registro" className="btn btn-primary h-13 px-7 text-base">
              Empieza gratis
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/demo" prefetch={false} className="btn btn-ghost h-13 px-7 text-base">
              Ver la demo
            </Link>
          </div>

          <p className="rise d5 mt-5 font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
            Listo en 30 minutos · Trámite estatal S/ 0 en SIPDP · Planes desde S/ 19/mes
          </p>
        </div>

        <div className="rise d3 relative mx-auto w-full max-w-[460px] lg:mr-0">
          <div className="absolute -left-3 -top-3 hidden h-full w-full border border-crimson/30 sm:block" />
          <div className="relative border border-line-strong bg-paper-2 shadow-[0_18px_50px_-30px_rgba(23,25,30,0.45)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="label-mono">Expediente de tu negocio</p>
                <p className="mt-1 font-mono text-xs text-ink-soft">N.º PDP-2026-0042</p>
              </div>
              <span className="border border-ink px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">
                Listo para inspección
              </span>
            </div>

            <div className="px-6 pb-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-mono">Nivel de cumplimiento</p>
                  <p className="mt-1 font-display text-[3.8rem] leading-none tracking-[-0.04em]">
                    92<span className="text-2xl text-ink-soft">/100</span>
                  </p>
                </div>
                <div className="-mt-3 -rotate-6">
                  <Seal />
                </div>
              </div>

              <div className="mt-4 h-[7px] w-full bg-line">
                <div className="h-full w-[92%] bg-sage" />
              </div>

              <ul className="mt-6 divide-y divide-line border-y border-line text-[15px]">
                {[
                  ["Bancos de datos (listas) en SIPDP", "3 de 4"],
                  ["Política de privacidad web/WhatsApp", "Publicada"],
                  ["Solicitudes ARCO de clientes", "1 en plazo"],
                  ["Asistente Legal con IA", "Activo 24/7"],
                ].map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2.5 text-ink-soft">
                      <CheckIcon className="h-4 w-4 text-sage" />
                      {label}
                    </span>
                    <span className="font-mono text-xs font-medium uppercase tracking-wide">{value}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="font-display text-lg">Casa Verde Perú S.A.C.</p>
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
                    RUC 20604567891
                  </p>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.1em] text-sage">
                  <span className="pulse-dot h-[7px] w-[7px] rounded-full bg-sage" />
                  Actualizado hoy
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-right font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
            Vista real del panel · puedes probarlo gratis arriba
          </p>
        </div>
      </div>
    </section>
  );
}

function StatBand() {
  return (
    <section className="border-b border-line bg-ink text-paper">
      <div className="container-page grid divide-y divide-white/15 py-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-0">
        <div className="px-0 py-6 sm:px-8 sm:py-9 first:sm:pl-0">
          <p className="font-display text-3xl leading-none tracking-[-0.03em] md:text-4xl">0.5 a 100 UIT</p>
          <p className="mt-2.5 max-w-[32ch] text-[15px] leading-relaxed text-paper/85">
            Multas desde ~S/ 2,600 (leves, como no inscribir tus listas) hasta más de S/ 500,000 (muy graves).
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/55">
            Ley 29733, art. 38 y 39 · Fiscaliza la ANPD
          </p>
        </div>

        <div className="px-0 py-6 sm:px-8 sm:py-9">
          <p className="font-display text-3xl leading-none tracking-[-0.03em] md:text-4xl">10 a 20 días</p>
          <p className="mt-2.5 max-w-[32ch] text-[15px] leading-relaxed text-paper/85">
            Plazo máximo en días hábiles para responder cuando un cliente pide corregir, borrar (10 días) o ver sus datos (20 días).
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/55">
            Derechos ARCO · DS 016-2024-JUS
          </p>
        </div>

        <div className="px-0 py-6 sm:px-8 sm:py-9 last:sm:pr-0">
          <p className="font-display text-3xl leading-none tracking-[-0.03em] md:text-4xl">48 horas</p>
          <p className="mt-2.5 max-w-[32ch] text-[15px] leading-relaxed text-paper/85">
            Tiempo límite para notificar a la ANPD si sufres un robo de laptop, hackeo o filtración que ponga en riesgo datos personales.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/55">
            Nueva obligación · DS 016-2024-JUS
          </p>
        </div>
      </div>
    </section>
  );
}

function VideoSection() {
  return (
    <section id="video" className="border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-22">
        <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="label-mono">01 — Entiéndelo en 1 minuto</span>
            <h2 className="mt-3 max-w-[22ch] font-display text-[2.25rem] leading-[1.04] tracking-[-0.03em] md:text-[2.8rem]">
              ¿Nunca escuchaste de esta ley? Mira esta historia ilustrada.
            </h2>
          </div>
          <p className="max-w-[46ch] text-base leading-relaxed text-ink-soft">
            En 5 escenas dibujadas te explicamos qué exige el Ministerio de Justicia (<Term k="anpd">ANPD</Term>) a cualquier negocio que atiende clientes o tiene personal en el Perú.
          </p>
        </div>

        <ExplainerVideo />
      </div>
    </section>
  );
}

function PromoVideoSection() {
  return (
    <section id="video-promo" className="relative overflow-hidden border-b border-line bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dot-field" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-crimson/25 blur-[130px]"
        aria-hidden="true"
      />

      <div className="container-page relative grid gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-[8px] w-[8px] bg-crimson" />
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-paper/60">
              Resumen en video · 1:42
            </span>
          </div>

          <h2 className="mt-4 max-w-[18ch] font-display text-[2.3rem] leading-[1.03] tracking-[-0.03em] md:text-[2.9rem]">
            Lo que la ANPD espera de tu negocio.
          </h2>

          <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-paper/75">
            Sin lenguaje de abogados: qué datos ya estás tratando, las tres obligaciones que te
            aplican y cómo dejar todo en orden antes de que te lo pidan.
          </p>

          <ol className="mt-7 border-t border-paper/15">
            {[
              ["0:00", "El mito de «solo vendo por WhatsApp»"],
              ["0:51", "Las tres obligaciones que sí te aplican"],
              ["1:39", "Tu negocio en orden antes de la inspección"],
            ].map(([time, title]) => (
              <li key={title} className="flex items-baseline gap-4 border-b border-paper/10 py-3.5">
                <span className="font-mono text-xs font-semibold tracking-[0.08em] text-[#e2574c]">{time}</span>
                <span className="text-[15.5px] leading-snug text-paper/90">{title}</span>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/demo"
              prefetch={false}
              className="btn h-12 bg-paper-2 px-6 text-ink hover:border-crimson hover:bg-crimson hover:text-paper"
            >
              Probar la demo
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href="#precios" className="btn h-12 border-paper/30 px-6 text-paper hover:bg-paper hover:text-ink">
              Ver planes desde S/ 19
            </a>
          </div>

          <p className="mt-4 font-mono text-xs uppercase tracking-[0.1em] text-paper/45">
            Se reproduce en silencio · activa el audio cuando quieras
          </p>
        </div>

        <PromoVideo />
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section id="problema" className="border-b border-line">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="label-mono">02 — ¿Por qué esto te importa?</span>
            <h2 className="mt-3 max-w-[20ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
              El problema no es la ley. Es que nadie te la explicó en cristiano.
            </h2>
          </div>
          <p className="max-w-[48ch] text-base leading-relaxed text-ink-soft">
            Así como la <strong>SUNAT</strong> fiscaliza tus impuestos e <strong>INDECOPI</strong> tu Libro de Reclamaciones, la <Term k="anpd">ANPD</Term> (del Ministerio de Justicia) fiscaliza cómo manejas los datos de las personas.
          </p>
        </div>

        <InteractiveProblem />
      </div>
    </section>
  );
}

function Product() {
  return (
    <section id="producto" className="border-b border-line bg-paper-2">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="label-mono">03 — Qué hace PrivadoPE por ti</span>
            <h2 className="mt-3 max-w-[19ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
              Las 6 obligaciones legales, resueltas en un solo lugar.
            </h2>
          </div>
          <p className="max-w-[44ch] text-base leading-relaxed text-ink-soft">
            Haz clic en cada una de las 6 obligaciones de abajo para explorar cómo PrivadoPE las resuelve paso a paso.
          </p>
        </div>

        <InteractiveProduct />

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
          <span className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-sage" /> Enlace público para tu Política y formulario ARCO
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-sage" /> Ficha lista para copiar al SIPDP (trámite gratuito)
          </span>
          <span className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-sage" /> Calendario oficial con feriados del Perú
          </span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-b border-line">
      <div className="container-page py-16 md:py-24">
        <span className="label-mono">04 — Paso a paso interactivo</span>
        <h2 className="mt-3 max-w-[22ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
          De no saber nada a tener tu negocio en regla hoy mismo.
        </h2>

        <InteractiveSteps />
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
            <span className="label-mono">05 — Precios claros</span>
            <h2 className="mt-3 font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
              Cuesta menos que media hora de abogado.
            </h2>
          </div>
          <p className="max-w-[40ch] text-base leading-relaxed text-ink-soft">
            Sin contratos amarrados. Además, recuerda que el registro oficial en el portal{" "}
            <Term k="sipdp">SIPDP</Term> del Estado es <strong>100 % gratuito (S/ 0)</strong>.
          </p>
        </div>

        <InteractivePricing />

        <p className="mt-6 max-w-[78ch] text-sm leading-relaxed text-ink-soft">
          Importante: PrivadoPE es tu software operativo de gestión y genera borradores basados en lo que declaras; no reemplaza a un estudio de abogados. Si manejas operaciones complejas o datos médicos a gran escala, te recomendamos que tu abogado valide los textos finales.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const questions = [
    {
      q: "Soy una MYPE pequeña o persona con negocio (RUC 10), ¿de verdad me aplica la Ley 29733?",
      a: "Sí. La Ley 29733 y su nuevo Reglamento (DS 016-2024-JUS) aplican a toda persona natural con negocio o empresa privada en el Perú que maneje datos de personas (clientes, trabajadores, pacientes, alumnos, proveedores), sin importar su tamaño o nivel de ventas.",
    },
    {
      q: "¿Qué significa «Banco de datos»? ¿Tiene algo que ver con un banco financiero?",
      a: "No tiene nada que ver con bancos de dinero. «Banco de datos» es el nombre legal para cualquier lista o archivo donde guardas datos de personas: tu Excel de clientes, tu agenda de pedidos de WhatsApp, tu carpeta con contratos de trabajadores o las grabaciones de tus cámaras de seguridad.",
    },
    {
      q: "¿Cuánto cuesta registrar mis bancos de datos ante el Estado (ANPD / SIPDP)?",
      a: "¡Es 100 % gratuito (S/ 0)! Con el nuevo Reglamento DS 016-2024-JUS, la inscripción de bancos de datos en el portal virtual SIPDP del Ministerio de Justicia no tiene tasa ni costo estatal y es de aprobación automática. PrivadoPE te prepara la ficha exacta para que solo copies y pegues los datos.",
    },
    {
      q: "¿Estoy obligado a contratar un Oficial de Datos Personales (ODP)?",
      a: "Solo si tratas grandes volúmenes de datos o datos sensibles (salud, biometría) como parte de tu actividad. Aun así, si eres microempresa (ventas hasta 150 UIT) recién se te exige desde el 30 de noviembre de 2028 (pequeñas empresas, noviembre de 2027). Mientras tanto, tú mismo o un encargado interno puede figurar como contacto de privacidad.",
    },
    {
      q: "¿Qué pasa si un cliente me escribe pidiendo borrar su número o ver sus datos (ARCO)?",
      a: "Debes atenderlo gratis dentro del plazo legal: 10 días hábiles si pide Rectificación, Cancelación (borrar) u Oposición (no más publicidad), o 20 días hábiles si pide Acceso (saber qué datos tienes). En PrivadoPE el reloj cuenta los días hábiles descontando feriados peruanos y te da la respuesta lista.",
    },
    {
      q: "¿Y si no sé cómo redactar una respuesta o tengo dudas sobre mi caso?",
      a: "Dentro de PrivadoPE tienes un Asistente Legal que te explica en palabras simples qué hacer y cuándo, y te redacta las respuestas, correos o cláusulas listas para enviar. Además, protege la confidencialidad de tu negocio: los nombres, DNI y teléfonos de tus clientes quedan resguardados en privado.",
    },
    {
      q: "¿Funciona si solo vendo por WhatsApp, Instagram o TikTok y no tengo página web?",
      a: "¡Sí! Justamente por eso PrivadoPE aloja tu Política de Privacidad y tu Formulario ARCO en un enlace público propio (ej. privadope.pe/p/tu-negocio) para que puedas ponerlo en tu biografía de Instagram, catálogo de WhatsApp Business o pie de correo sin gastar en programadores.",
    },
  ];

  return (
    <section id="preguntas" className="border-b border-line">
      <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <span className="label-mono">06 — Dudas frecuentes</span>
          <h2 className="mt-3 max-w-[14ch] font-display text-[2.25rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
            Explicado sin palabras difíciles.
          </h2>
          <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-ink-soft">
            ¿Tienes otra duda sobre tu negocio? Escríbenos a{" "}
            <a href="mailto:hola@privadope.pe" className="link-underline text-ink">
              hola@privadope.pe
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
              <p className="mt-3.5 max-w-[66ch] pr-8 text-base leading-relaxed text-ink-soft">
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
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-paper/60">
            07 — Pruébalo ahora mismo
          </span>
          <h2 className="mt-4 max-w-[19ch] font-display text-[2.4rem] leading-[1.02] tracking-[-0.03em] md:text-[3.2rem]">
            Mira cómo se ve un negocio peruano 100 % en orden.
          </h2>
          <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-paper/80">
            Entra con 1 clic a la demostración interactiva de «Casa Verde Perú S.A.C.» y explora los bancos de datos, los reclamos ARCO y los documentos explicados paso a paso.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link href="/demo" prefetch={false} className="btn h-13 w-full bg-paper-2 px-7 text-base text-ink hover:bg-crimson hover:text-paper lg:w-auto">
            Abrir la demo sin registrarme
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/registro"
            className="btn h-13 w-full border-paper/40 px-7 text-base text-paper hover:bg-paper hover:text-ink lg:w-auto"
          >
            Crear cuenta para mi empresa
          </Link>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-paper/50 lg:text-right">
            14 días gratis · sin tarjeta · cancela cuando quieras
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
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              Cumplimiento en simple de la Ley 29733 y el DS 016-2024-JUS para micro y pequeñas empresas del Perú.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
              Lima, Perú · 2026
            </p>
          </div>

          <div>
            <p className="label-mono">Producto</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><a href="#video" className="hover:text-ink">Video explicativo</a></li>
              <li><a href="#producto" className="hover:text-ink">Funciones</a></li>
              <li><a href="#precios" className="hover:text-ink">Precios</a></li>
              <li><Link href="/demo" prefetch={false} className="hover:text-ink">Demo interactiva</Link></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Normativa Peruana</p>
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
              <li><a href="mailto:hola@privadope.pe" className="hover:text-ink">hola@privadope.pe</a></li>
              <li><a href="https://wa.me/51987654321" className="hover:text-ink">Soporte WhatsApp</a></li>
              <li><Link href="/login" className="hover:text-ink">Ingresar a mi cuenta</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft md:flex-row md:items-start md:justify-between">
          <p className="max-w-[76ch]">
            © 2026 PrivadoPE. PrivadoPE es una herramienta tecnológica de gestión y educación sobre la Ley 29733 y no un estudio jurídico. Los documentos generados son borradores de trabajo que recomendamos validar con un abogado.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.12em]">Hecho en Perú para MYPEs</p>
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
      <VideoSection />
      <PromoVideoSection />
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
