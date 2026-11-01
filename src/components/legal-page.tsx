import Link from "next/link";
import { Logo } from "@/components/icons";
import { LEGAL_CONTENT, LEGAL_PAGES, LEGAL_REVIEWED, LEGAL_VERSION, type LegalDocument } from "@/lib/platform-legal";

export function legalMetadata(document: LegalDocument) {
  return {
    title: LEGAL_PAGES[document].title,
    // Mientras sea borrador no debe aparecer en buscadores.
    robots: LEGAL_REVIEWED ? undefined : { index: false, follow: false },
  };
}

export function LegalPage({ document }: { document: LegalDocument }) {
  const { title } = LEGAL_PAGES[document];
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper-2">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="DatosPrivados">
            <Logo />
          </Link>
          <nav aria-label="Documentos legales" className="flex gap-4 font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
            {(Object.keys(LEGAL_PAGES) as LegalDocument[]).map((key) => (
              <Link key={key} href={LEGAL_PAGES[key].href} className="hover:text-crimson">
                {LEGAL_PAGES[key].title.split(" ")[0]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="container-page py-10 md:py-16">
        <article className="mx-auto max-w-[800px]">
          <h1 className="font-display text-[2.4rem] leading-[1.03] tracking-[-0.03em] md:text-[3rem]">{title}</h1>
          <p className="mt-3 text-sm text-ink-soft">Versión {LEGAL_VERSION}</p>

          {!LEGAL_REVIEWED && (
            <p role="note" className="mt-6 border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed">
              <strong>Borrador pendiente de revisión legal.</strong> Este texto no sustituye asesoría legal y puede cambiar antes
              del lanzamiento. Los datos entre corchetes se completarán cuando se constituya la empresa operadora.
            </p>
          )}

          <div className="mt-8 space-y-8 border-t border-line pt-6">
            {LEGAL_CONTENT[document].map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-[1.5rem] leading-snug tracking-[-0.02em]">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-base leading-relaxed text-ink/95">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
