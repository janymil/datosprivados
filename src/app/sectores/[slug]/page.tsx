import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site-chrome";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "@/components/icons";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import { getBankPreset, type BankPresetId } from "@/lib/bank-presets";
import { findSectorById } from "@/lib/sectors";
import { FAMILIES, SECTOR_FAMILY } from "@/lib/sector-legal";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return pageMetadata({ title: industry.title, description: industry.description, path: `/sectores/${industry.slug}` });
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  const sector = industry && findSectorById(industry.sectorId);
  if (!industry || !sector) notFound();

  const legal = FAMILIES[SECTOR_FAMILY[sector.id] ?? "comercio"];
  // Igual que el asistente: toda empresa con personal declara también «Colaboradores y postulantes».
  const banks = (["trabajadores", ...sector.banks] as BankPresetId[])
    .map((id) => getBankPreset(id))
    .filter((preset) => preset !== undefined);

  const documents = [
    "Política de privacidad publicada en tu web",
    "Documento de seguridad y política de retención",
    "Aviso y consentimiento para trabajadores",
    "Confidencialidad para el personal y cláusulas de encargo con proveedores",
    "Procedimiento para solicitudes ARCO",
    ...(legal.sensitive ? ["Consentimiento por escrito para datos sensibles"] : []),
    ...(legal.minors ? ["Consentimiento de padres o tutores para menores de edad"] : []),
    ...(legal.imageUse ? ["Autorización de uso de imagen"] : []),
    ...(legal.biometric ? ["Consentimiento expreso para datos biométricos"] : []),
    ...(legal.processor ? ["Contrato de encargo para tus propios clientes"] : []),
    ...(legal.consumer ? ["Libro de Reclamaciones"] : []),
    ...(legal.terms === "plataforma" ? ["Términos y condiciones y política de cookies"] : []),
    ...(legal.automated || legal.sensitive ? ["Evaluación de impacto (EIPD), si tratas datos a gran escala"] : []),
  ];

  const path = `/sectores/${industry.slug}`;
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Sectores", path: "/sectores" },
    { name: industry.name, path },
  ];
  const others = INDUSTRIES.filter((item) => item.slug !== industry.slug).slice(0, 4);

  return (
    <ContentShell crumbs={crumbs} structuredData={[breadcrumbLd(crumbs)]}>
      <article className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-[860px]">
          <p className="label-mono">Sector · {legal.title}</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.04] tracking-[-0.03em] md:text-[3rem]">{industry.h1}</h1>
          <p className="mt-5 max-w-[64ch] text-[17.5px] leading-relaxed text-ink-soft">{industry.intro}</p>
          {sector.note && (
            <p className="mt-5 border-l-3 border-crimson bg-crimson/[0.06] px-5 py-4 text-[16px] leading-relaxed">
              {sector.note}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/registro?sector=${sector.id}`} className="btn btn-primary h-12 px-6 text-base">
              Empezar con la plantilla de este sector
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/diagnostico" className="btn btn-ghost h-12 px-6 text-base">
              Hacer el diagnóstico
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">
              Riesgos que vemos en {industry.name.toLowerCase()}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {[...industry.concerns, ...legal.risks.filter((row) => row.level === "Alto").map((row) => row.risk)]
                .filter((risk, index, all) => all.indexOf(risk) === index)
                .map((risk) => (
                  <li key={risk} className="flex gap-3 text-[16px] leading-relaxed">
                    <AlertIcon className="mt-1 h-4 w-4 shrink-0 text-crimson" />
                    {risk}
                  </li>
                ))}
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Bancos de datos que normalmente debes inscribir</h2>
            <p className="mt-2 text-[15.5px] text-ink-soft">
              Inscripción gratuita en el SIPDP.{" "}
              <Link href="/guias/inscribir-banco-de-datos-personales" className="link-underline text-ink">
                Guía paso a paso para inscribirlos
              </Link>
              .
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {banks.map((bank) => (
                <div key={bank.id} className="card p-5">
                  <p className="flex flex-wrap items-center gap-2 font-display text-lg leading-tight">
                    {bank.name}
                    {bank.sensitive && (
                      <span className="rounded-full border border-crimson/40 bg-crimson/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-crimson">
                        Datos sensibles
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{bank.example}</p>
                  <p className="mt-3 text-[14px] leading-relaxed"><strong>Conservación:</strong> {bank.retention}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Normas que aplican a tu sector</h2>
            <ul className="mt-4 space-y-3">
              {legal.norms.map((norm) => (
                <li key={norm} className="flex gap-3 text-[16px] leading-relaxed text-ink/90">
                  <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                  {norm}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-[1.75rem] leading-snug tracking-[-0.02em]">Cuánto tiempo conservar cada dato</h2>
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full min-w-[560px] text-left text-[15px]">
                <thead className="bg-paper-2">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">Dato</th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">Plazo</th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-[0.08em]">Fundamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {legal.retention.map((row) => (
                    <tr key={row.data}>
                      <td className="px-4 py-3 align-top font-medium">{row.data}</td>
                      <td className="px-4 py-3 align-top">{row.term}</td>
                      <td className="px-4 py-3 align-top text-ink-soft">{row.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-14 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-[1.5rem] leading-snug tracking-[-0.02em]">Documentos que necesitas</h2>
              <ul className="mt-4 space-y-2.5">
                {documents.map((doc) => (
                  <li key={doc} className="flex gap-3 text-[15.5px] leading-relaxed">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[1.5rem] leading-snug tracking-[-0.02em]">Medidas de seguridad clave</h2>
              <ul className="mt-4 space-y-2.5">
                {legal.security.map((measure) => (
                  <li key={measure} className="flex gap-3 text-[15.5px] leading-relaxed">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-sage" />
                    {measure}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <p className="mt-12 text-sm leading-relaxed text-ink-soft">
            Contenido informativo basado en la Ley 29733, el DS 016-2024-JUS y la normativa sectorial citada. Cada
            empresa debe declarar solo los bancos que realmente tiene.
          </p>

          <section className="mt-10 border-t border-line pt-8">
            <h2 className="label-mono">Otros sectores</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/sectores/${item.slug}`} className="card block h-full p-4 text-[15px] font-medium leading-snug hover:border-ink">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </ContentShell>
  );
}
