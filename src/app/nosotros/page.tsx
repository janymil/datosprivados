import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ArrowRightIcon, CheckIcon, FileIcon } from "@/components/icons";
import {
  COMPANY_HUB_URL,
  PLATFORM_COMPLAINTS_URL,
  PLATFORM_CONTACT_EMAIL,
  PLATFORM_ENTITY,
} from "@/lib/platform-entity";
import { breadcrumbLd, pageMetadata, platformOrganizationLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Nosotros: quién está detrás de DatosPrivados",
  description:
    "DatosPrivados es un software peruano para cumplir la Ley 29733 de protección de datos personales. Lo desarrolla y opera SEMANTIKA TECH E.I.R.L., RUC 20616806981, con domicilio en San Isidro, Lima.",
  path: "/nosotros",
});

const E = PLATFORM_ENTITY;

export default function AboutPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
  ];
  const organization = { "@context": "https://schema.org", ...platformOrganizationLd() };

  return (
    <ContentShell crumbs={crumbs} structuredData={[organization, breadcrumbLd(crumbs)]}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[780px]">
          <p className="label-mono">Nosotros</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">
            Quién está detrás de DatosPrivados
          </h1>
          <p className="mt-5 max-w-[64ch] text-[17.5px] leading-relaxed text-ink-soft">
            Un software de cumplimiento de datos personales debe empezar por cumplir él mismo. Por eso aquí dice, sin
            letra chica, qué es DatosPrivados, quién lo opera y cómo contactarnos.
          </p>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Qué es DatosPrivados</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/90">
            Un software para cumplir la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento, el DS
            N.° 016-2024-JUS. Reúne en un solo panel lo que la ley pide tener en orden:
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              "El inventario de tus bancos de datos y la ficha para inscribirlos en el registro de la autoridad.",
              "Los documentos: política de privacidad, avisos, documento de seguridad y contratos con encargados.",
              "Las solicitudes ARCO, con su plazo controlado, y los incidentes de seguridad.",
              "La evidencia fechada de cada paso, para mostrarla si la autoridad la pide.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[16px] leading-relaxed">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[16px] leading-relaxed text-ink/90">
            Está pensado para micro y pequeñas empresas y negocios constituidos en el Perú, con RUC, que no tienen un
            área legal propia. También para{" "}
            <Link href="/contadores" className="link-underline text-ink">contadores y consultores</Link> que
            atienden a varias empresas.
          </p>
          <p className="mt-6 border-l-3 border-ochre bg-ochre/[0.08] px-5 py-4 text-[15.5px] leading-relaxed">
            DatosPrivados es una herramienta de gestión y de educación sobre la ley, <strong>no un estudio
            jurídico</strong>. Los documentos que genera son borradores de trabajo que recomendamos validar con un
            abogado.
          </p>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Quién lo opera</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/90">
            DatosPrivados es un producto de <strong>{E.legalName}</strong>, una empresa peruana de software que
            desarrolla y opera aplicaciones para negocios del Perú. Es la empresa que te presta el servicio, la que
            responde por él y la responsable de los datos de tu cuenta.
          </p>
          <dl className="card mt-5 grid gap-x-6 gap-y-3 p-5 text-[15.5px] sm:grid-cols-[auto_1fr]">
            <dt className="label-mono pt-0.5">Razón social</dt>
            <dd>{E.legalName}</dd>
            <dt className="label-mono pt-0.5">RUC</dt>
            <dd className="font-mono">{E.ruc}</dd>
            <dt className="label-mono pt-0.5">Domicilio</dt>
            <dd>{E.address}</dd>
          </dl>
          <a
            href={COMPANY_HUB_URL}
            target="_blank"
            rel="noopener"
            className="link-underline mt-5 inline-flex items-center gap-1.5 text-[16px] font-medium text-ink"
          >
            Conoce la empresa
            <ArrowRightIcon className="h-4 w-4" />
          </a>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Contacto</h2>
          <ul className="mt-4 space-y-2.5 text-[16px] leading-relaxed">
            <li>
              Correo:{" "}
              <a href={`mailto:${PLATFORM_CONTACT_EMAIL}`} className="link-underline text-ink">
                {PLATFORM_CONTACT_EMAIL}
              </a>
            </li>
            <li>
              Teléfono y WhatsApp:{" "}
              <a href={E.phoneHref} className="link-underline text-ink">
                {E.phone}
              </a>
            </li>
            <li>Por escrito: {E.address}</li>
          </ul>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
            Por estos mismos canales puedes ejercer tus derechos ARCO sobre los datos de tu cuenta.
          </p>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Documentos legales</h2>
          <ul className="mt-4 space-y-2.5 text-[16px]">
            <li><Link href="/terminos" className="link-underline text-ink">Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className="link-underline text-ink">Política de privacidad</Link></li>
            <li><Link href="/cookies" className="link-underline text-ink">Política de cookies</Link></li>
            <li>
              <a
                href={PLATFORM_COMPLAINTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-crimson"
              >
                <FileIcon className="h-4 w-4" />
                Libro de Reclamaciones
              </a>
            </li>
          </ul>
        </div>
      </article>
    </ContentShell>
  );
}
