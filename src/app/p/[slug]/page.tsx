import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicyBySlug } from "@/lib/data";
import { DocBody } from "@/components/doc-body";
import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/icons";
import { companyIdentityLine } from "@/lib/documents";

export const metadata = { title: "Política de Privacidad" };

export default async function PublicPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getPolicyBySlug(slug);
  if (!data) notFound();
  const { company, doc } = data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper-2">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="DatosPrivados">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/solicitud/${slug}`} className="hidden font-mono text-xs font-medium uppercase tracking-[0.1em] text-ink-soft hover:text-crimson sm:block">
              Ejercer derechos ARCO ↗
            </Link>
            <PrintButton label="Descargar PDF" />
          </div>
        </div>
      </header>

      <main className="container-page py-10 md:py-16">
        <article className="print-page mx-auto max-w-[800px]">
          <p className="label-mono">{companyIdentityLine(company)}</p>
          <h1 className="mt-3 font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">
            Política de Privacidad
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            Versión {doc.version} · actualizada el{" "}
            {new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Lima" }).format(
              new Date(doc.updated_at)
            )}
          </p>

          <div className="mt-8 border-t border-line pt-6">
            <DocBody content={doc.content} />
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[52ch] text-sm leading-relaxed text-ink-soft">
              ¿Tienes preguntas sobre tus datos? Escríbenos a{" "}
              <a href={`mailto:${company.dpo_email || company.email}`} className="link-underline text-ink">
                {company.dpo_email || company.email}
              </a>
              .
            </p>
            <Link href={`/solicitud/${slug}`} className="btn btn-primary btn-sm no-print">
              Ver, corregir o borrar mis datos
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-soft sm:flex-row sm:justify-between">
          <p>© 2026 {company.name}.</p>
          <p className="font-mono uppercase tracking-[0.08em]">
            Política generada con DatosPrivados
          </p>
        </div>
      </footer>
    </div>
  );
}
