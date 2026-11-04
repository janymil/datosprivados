import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { CheckIcon } from "@/components/icons";
import { SUPPORT_EMAIL } from "@/lib/mail-templates";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Protección de datos para contadores y consultores: programa piloto",
  description:
    "Si llevas la planilla y la contabilidad de varias empresas, tus clientes te preguntan por la Ley 29733. Programa piloto para gestionar su expediente de cumplimiento con facturación por cliente.",
  path: "/contadores",
});

const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Piloto para contadores y consultores")}`;

export default function AccountantsPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Para contadores", path: "/contadores" },
  ];
  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[780px]">
          <p className="label-mono">Programa piloto</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">
            Tus clientes te preguntan por la Ley 29733. Ten una respuesta.
          </h1>
          <p className="mt-5 max-w-[64ch] text-[17.5px] leading-relaxed text-ink-soft">
            Quien lleva la planilla y la contabilidad de una empresa maneja datos de sus trabajadores, clientes y
            proveedores, y es su <strong>encargado del tratamiento</strong>. Cuando la ANPD fiscaliza a un cliente,
            suele preguntar primero por el expediente. Ofrecerlo ordenado es un servicio más que puedes cobrar.
          </p>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Lo que estamos armando</h2>
          <ul className="mt-4 space-y-2.5">
            {[
              "Un expediente de cumplimiento por cliente: bancos de datos, política, documento de seguridad y fichas SIPDP.",
              "Plazos ARCO y de incidentes controlados, con evidencia fechada que puedes mostrar en una fiscalización.",
              "Avisos de renovación y de documentos desactualizados, para que el servicio sea continuo y no de una sola vez.",
              "Facturación por cliente, con un precio por empresa pensado para estudios que atienden de 10 a 50.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[16px] leading-relaxed">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-8 border-l-3 border-ochre bg-ochre/[0.08] px-5 py-4 text-[15.5px] leading-relaxed">
            <strong>Estado:</strong> todavía no existe una cuenta única para varios clientes. Hoy cada empresa tiene su
            propia cuenta. Estamos definiendo el piloto con los primeros estudios; entrar ahora significa moldear cómo
            funciona.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={MAILTO} className="btn btn-primary h-12 px-6 text-base">
              Quiero entrar al piloto
            </a>
            <Link href="/demo" prefetch={false} className="btn btn-ghost h-12 px-6 text-base">
              Ver la demo
            </Link>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Escríbenos a {SUPPORT_EMAIL} con el nombre de tu estudio y cuántos clientes atiendes.
          </p>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Para empezar hoy</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/90">
            Puedes compartir con tus clientes las{" "}
            <Link href="/herramientas" className="link-underline text-ink">herramientas gratuitas</Link>: el
            diagnóstico, la calculadora de multas, el{" "}
            <Link href="/plantillas/checklist-inscripcion-sipdp" className="link-underline text-ink">
              checklist de inscripción
            </Link>{" "}
            y el{" "}
            <Link href="/plantillas/politica-de-privacidad" className="link-underline text-ink">
              modelo de política de privacidad
            </Link>
            . Y la guía sobre{" "}
            <Link href="/guias/datos-personales-de-trabajadores" className="link-underline text-ink">
              datos de trabajadores y planilla
            </Link>
            .
          </p>
        </div>
      </article>
    </ContentShell>
  );
}
