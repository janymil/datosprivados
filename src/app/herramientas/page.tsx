import Link from "next/link";
import { ContentShell } from "@/components/site-chrome";
import { ArrowRightIcon } from "@/components/icons";
import { TOOLS } from "@/lib/tools";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Herramientas gratuitas de la Ley 29733 para empresas",
  description:
    "Calculadora de multas, diagnóstico de cumplimiento, checklist de inscripción en el SIPDP y modelo de política de privacidad. Gratis, sin registro.",
  path: "/herramientas",
});

export default function ToolsIndex() {
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Herramientas", path: "/herramientas" },
  ];
  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <section className="container-page py-12 md:py-16">
        <h1 className="max-w-[24ch] font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
          Herramientas gratuitas de protección de datos
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          Para empezar sin registrarte: mide tu riesgo, estima una multa y prepara la inscripción de tus bancos de datos.
          Nada de lo que escribas sale de tu navegador.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="card flex h-full flex-col p-6 hover:border-ink">
                <h2 className="font-display text-xl leading-tight tracking-[-0.01em]">{tool.title}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{tool.body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-crimson">
                  Abrir <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ContentShell>
  );
}
