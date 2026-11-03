import { ContentShell } from "@/components/site-chrome";
import { SelfCheck } from "@/components/self-check";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "¿Cumple tu empresa con la Ley 29733? Diagnóstico gratuito",
  description:
    "Responde 10 preguntas y descubre qué le falta a tu empresa para cumplir la Ley 29733 y el DS 016-2024-JUS. Gratis, sin registro y sin enviar datos.",
  path: "/diagnostico",
});

export default function DiagnosticPage() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Diagnóstico", path: "/diagnostico" },
  ];
  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[780px]">
          <p className="label-mono">Diagnóstico gratuito · 3 minutos</p>
          <h1 className="mt-3 font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
            ¿Tu empresa cumple con la Ley 29733?
          </h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            Diez preguntas sobre lo que la ANPD revisa en una fiscalización. Al final ves tu nivel de riesgo y qué te
            falta, con la guía para resolver cada punto. No necesitas registrarte y tus respuestas no salen de tu
            navegador.
          </p>
          <SelfCheck />
        </div>
      </section>
    </ContentShell>
  );
}
