import Link from "next/link";
import { ContentShell, RichText } from "@/components/site-chrome";
import { FineCalculator } from "@/components/fine-calculator";
import { FINE_TIERS, UIT_2026, formatSoles } from "@/lib/fines";
import { absoluteUrl, breadcrumbLd, pageMetadata } from "@/lib/seo";

const PATH = "/herramientas/calculadora-multas-ley-29733";

export const metadata = pageMetadata({
  title: "Calculadora de multas de la Ley 29733: cuánto puede multarte la ANPD",
  description:
    "Calcula en soles el rango de multa por infracciones a la Ley 29733: leves de S/ 2,750 a S/ 27,500, graves hasta S/ 275,000 y muy graves hasta S/ 550,000. Gratis y sin registro.",
  path: PATH,
});

const FAQ = [
  {
    q: "¿Cuál es la multa máxima de la Ley 29733?",
    a: "100 UIT para una infracción muy grave: S/ 550,000 con la UIT 2026 de S/ 5,500.",
  },
  {
    q: "¿Qué UIT usa la calculadora?",
    a: "La UIT 2026, de S/ 5,500. Puedes cambiar el valor si quieres calcular con otro año.",
  },
  {
    q: "¿Qué infracciones son leves?",
    a: "No inscribir los bancos de datos, responder tarde una solicitud ARCO y no notificar un incidente cuando corresponde son infracciones leves, de 0.5 a 5 UIT.",
  },
  {
    q: "¿Las multas se suman?",
    a: "Cada infracción se evalúa dentro de su escala. La calculadora suma los rangos como escenario teórico; el monto real lo fija la ANPD en cada procedimiento.",
  },
  {
    q: "¿Mi empresa pequeña también puede ser multada?",
    a: "Sí. La ley no exime a ninguna empresa por su tamaño. Una denuncia de un cliente o de un extrabajador basta para iniciar un procedimiento.",
  },
];

export default function FineCalculatorPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Herramientas", path: "/herramientas" },
    { name: "Calculadora de multas", path: PATH },
  ];
  const structuredData = [
    breadcrumbLd(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Calculadora de multas de la Ley 29733",
      url: absoluteUrl(PATH),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-PE",
      offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
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
      <section className="container-page py-12 md:py-16">
        <p className="label-mono">Herramienta gratuita · sin registro</p>
        <h1 className="mt-3 max-w-[24ch] font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
          Calculadora de multas de la Ley 29733
        </h1>
        <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
          Marca las infracciones que podría tener tu empresa y mira el rango de multa que prevé la ley en soles. La
          escala es la del art. 39: de 0.5 a 100 UIT.
        </p>

        <FineCalculator />

        <div className="mx-auto mt-16 max-w-[820px]">
          <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Escala de multas en soles</h2>
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead className="bg-paper-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">Tipo</th>
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">En UIT</th>
                  <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">UIT 2026 (S/ {UIT_2026.toLocaleString("en-US")})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Object.values(FINE_TIERS).map((tier) => (
                  <tr key={tier.label}>
                    <td className="px-4 py-3 font-medium">{tier.label}</td>
                    <td className="px-4 py-3">{tier.minUit} a {tier.maxUit} UIT</td>
                    <td className="px-4 py-3">
                      {formatSoles(tier.minUit * UIT_2026)} a {formatSoles(tier.maxUit * UIT_2026)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-12 font-display text-[1.75rem] leading-snug tracking-[-0.02em]">
            Qué hacer para no llegar a una multa
          </h2>
          <ul className="mt-4 space-y-2.5 text-[16px] leading-relaxed">
            {[
              "Inscribe tus bancos de datos: es gratis. Ver [cómo inscribirlos](/guias/inscribir-banco-de-datos-personales).",
              "Controla los plazos de las solicitudes ARCO: [8, 10 y 20 días hábiles](/guias/derechos-arco-plazos).",
              "Ten listo el procedimiento de [incidentes de 48 horas](/guias/incidente-de-seguridad-48-horas).",
              "Revisa el [calendario de plazos](/guias/plazos-ds-016-2024-jus) según tu tamaño de empresa.",
              "Mide tu punto de partida con el [diagnóstico gratuito](/diagnostico).",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-crimson" />
                <span>
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Preguntas frecuentes</h2>
          <dl className="mt-4 divide-y divide-line">
            {FAQ.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="text-[17px] font-medium">{item.q}</dt>
                <dd className="mt-1.5 text-[16px] leading-relaxed text-ink-soft">{item.a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 text-sm leading-relaxed text-ink-soft">
            Herramienta informativa basada en el art. 39 de la Ley 29733. No es una predicción ni asesoría legal.{" "}
            <Link href="/guias/multas-ley-29733" className="link-underline text-ink">
              Guía completa de multas
            </Link>
            .
          </p>
        </div>
      </section>
    </ContentShell>
  );
}
