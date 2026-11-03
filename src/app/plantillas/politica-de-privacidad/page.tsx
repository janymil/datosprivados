import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { CopyButton } from "@/components/copy-button";
import { DocBody } from "@/components/doc-body";
import { DownloadButton } from "@/components/download-button";
import { CheckIcon } from "@/components/icons";
import { POLICY_SECTIONS, plainText, policyTemplate } from "@/lib/templates";
import { absoluteUrl, breadcrumbLd, pageMetadata } from "@/lib/seo";

const PATH = "/plantillas/politica-de-privacidad";

export const metadata = pageMetadata({
  title: "Modelo de política de privacidad para empresas en Perú (Ley 29733)",
  description:
    "Plantilla gratuita de política de privacidad conforme a la Ley 29733 y el DS 016-2024-JUS: bancos de datos, base legal, derechos ARCO, transferencias, seguridad y cookies. Cópiala o descárgala.",
  path: PATH,
});

const FAQ = [
  {
    q: "¿Es obligatorio tener una política de privacidad?",
    a: "Sí. Quien trata datos personales debe informar quién es, qué datos recoge, para qué, por cuánto tiempo, con quién los comparte y cómo ejercer los derechos ARCO (art. 18 de la Ley 29733).",
  },
  {
    q: "¿Basta con copiar este modelo?",
    a: "Es un punto de partida. Debe coincidir con los bancos de datos que inscribas en el SIPDP y con lo que tu empresa realmente hace; elimina lo que no aplique y completa los datos entre corchetes.",
  },
  {
    q: "¿La política reemplaza el consentimiento?",
    a: "No. Publicarla cumple el deber de informar, pero el consentimiento sigue siendo necesario para publicidad y datos sensibles.",
  },
  {
    q: "¿Dónde debo publicarla?",
    a: "En tu web, en el pie de página, en formularios y checkout, y en el perfil de WhatsApp Business o redes sociales si captas datos por ahí.",
  },
];

export default function PrivacyPolicyTemplatePage() {
  const template = policyTemplate();
  const text = plainText(template);
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Plantillas", path: "/plantillas" },
    { name: "Política de privacidad", path: PATH },
  ];
  const structuredData = [
    breadcrumbLd(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Modelo de política de privacidad para empresas en Perú",
      inLanguage: "es-PE",
      mainEntityOfPage: absoluteUrl(PATH),
      author: { "@type": "Organization", name: "DatosPrivados", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <ContentShell crumbs={crumbs} structuredData={structuredData}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="label-mono">Plantilla gratuita · Ley 29733 · DS 016-2024-JUS</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">
            Modelo de política de privacidad para empresas en Perú
          </h1>
          <p className="mt-5 max-w-[64ch] text-[17.5px] leading-relaxed text-ink-soft">
            Es el mismo texto que genera DatosPrivados, con los datos de tu empresa entre corchetes y los cuatro bancos
            que casi toda empresa tiene: colaboradores, clientes, prospectos y cámaras. Cópialo, completa los corchetes y
            elimina lo que no aplique.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <CopyButton text={text} label="Copiar el texto" className="btn btn-primary btn-sm" />
            <DownloadButton text={text} filename="modelo-politica-de-privacidad.txt" label="Descargar (.txt)" />
          </div>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">
            Qué debe contener una política de privacidad
          </h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {POLICY_SECTIONS.map((section, index) => (
              <li key={section} className="flex gap-3 text-[15.5px] leading-snug">
                <span className="font-mono text-crimson">{index + 1}.</span>
                {section}
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Cómo completarla</h2>
          <ul className="mt-4 space-y-2.5">
            {[
              "Reemplaza cada dato entre corchetes: razón social, RUC, domicilio, correo de privacidad y enlace a tu formulario ARCO.",
              "Deja solo los bancos de datos que realmente tengas y que hayas inscrito en el SIPDP.",
              "Ajusta las finalidades y los destinatarios: tu contador, tu nube, tu software de planillas.",
              "Si usas servidores fuera del Perú (Google, Microsoft, AWS), declara la transferencia internacional.",
              "Si tratas datos sensibles o de menores, añade la sección correspondiente y pide consentimiento por escrito.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[16px] leading-relaxed">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                {item}
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">El modelo</h2>
          <div className="mt-4 border border-line-strong bg-paper-2 p-6 md:p-8">
            <DocBody content={template} />
          </div>

          <div className="mt-10 border-l-3 border-crimson bg-crimson/[0.06] px-5 py-4">
            <p className="font-display text-xl leading-tight">¿Prefieres que se genere con tus datos?</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
              DatosPrivados arma la política con tus bancos inscritos, tus proveedores y las normas de tu sector, la
              publica con un enlace propio y guarda cada versión.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href="/registro" className="btn btn-primary">Generarla para mi empresa</Link>
              <Link href="/demo" prefetch={false} className="btn btn-ghost">Ver la demo</Link>
            </div>
          </div>

          <h2 className="mt-12 font-display text-[1.65rem] leading-snug tracking-[-0.02em]">Preguntas frecuentes</h2>
          <dl className="mt-4 divide-y divide-line">
            {FAQ.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="text-[17px] font-medium">{item.q}</dt>
                <dd className="mt-1.5 text-[16px] leading-relaxed text-ink-soft">{item.a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 text-sm leading-relaxed text-ink-soft">
            Modelo informativo: es un borrador de trabajo y no reemplaza la asesoría legal. Recomendamos que un abogado
            lo revise en casos complejos o con datos sensibles a gran escala. Ver también el{" "}
            <Link href="/plantillas/checklist-inscripcion-sipdp" className="link-underline text-ink">
              checklist de inscripción en el SIPDP
            </Link>
            .
          </p>
        </div>
      </article>
    </ContentShell>
  );
}
