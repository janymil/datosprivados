import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, Logo } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";

/**
 * Cabecera y pie de las páginas públicas (portada, guías, sectores, glosario,
 * plantillas y diagnóstico). Los enlaces de sección usan `/#…` para que funcionen
 * igual desde la portada y desde cualquier otra página.
 */

const NAV = [
  { href: "/guias", label: "Guías" },
  { href: "/sectores", label: "Sectores" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/plantillas", label: "Plantillas" },
  { href: "/#precios", label: "Precios" },
];

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="container-page flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="DatosPrivados, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-[15px] font-medium md:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/login"
            className="btn btn-ghost btn-sm shrink-0 whitespace-nowrap px-3 text-[13px] sm:px-4 sm:text-sm"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="btn btn-primary btn-sm shrink-0 whitespace-nowrap px-3 text-[13px] sm:px-4 sm:text-sm"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print bg-paper-2">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              Software de cumplimiento de la Ley 29733 y el DS 016-2024-JUS para pequeñas y medianas empresas del
              Perú.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">Lima, Perú · 2026</p>
          </div>

          <div>
            <p className="label-mono">Producto</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/#obligaciones" className="hover:text-ink">Qué exige la ley</Link></li>
              <li><Link href="/sectores" className="hover:text-ink">Por sector</Link></li>
              <li><Link href="/herramientas/calculadora-multas-ley-29733" className="hover:text-ink">Calculadora de multas</Link></li>
              <li><Link href="/diagnostico" className="hover:text-ink">Diagnóstico gratuito</Link></li>
              <li><Link href="/plantillas/checklist-inscripcion-sipdp" className="hover:text-ink">Checklist SIPDP</Link></li>
              <li><Link href="/plantillas/politica-de-privacidad" className="hover:text-ink">Modelo de política de privacidad</Link></li>
              <li><Link href="/plantillas" className="hover:text-ink">Todas las plantillas</Link></li>
              <li><Link href="/contadores" className="hover:text-ink">Para contadores</Link></li>
              <li><Link href="/#precios" className="hover:text-ink">Precios</Link></li>
              <li><Link href="/demo" prefetch={false} className="hover:text-ink">Demo interactiva</Link></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Normativa peruana</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/guias/inscribir-banco-de-datos-personales" className="hover:text-ink">Inscribir bancos de datos</Link></li>
              <li><Link href="/guias/ds-016-2024-jus-reglamento" className="hover:text-ink">Reglamento DS 016-2024-JUS</Link></li>
              <li><Link href="/guias/plazos-ds-016-2024-jus" className="hover:text-ink">Calendario de plazos</Link></li>
              <li><Link href="/guias/multas-ley-29733" className="hover:text-ink">Multas de la ANPD</Link></li>
              <li><Link href="/guias/derechos-arco-plazos" className="hover:text-ink">Derechos ARCO</Link></li>
              <li><Link href="/glosario" className="hover:text-ink">Glosario</Link></li>
              <li><Link href="/guias" className="hover:text-ink">Todas las guías</Link></li>
            </ul>
          </div>

          <div>
            <p className="label-mono">Contacto</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><a href="mailto:hola@datosprivados.pe" className="hover:text-ink">hola@datosprivados.pe</a></li>
              <li><Link href="/login" className="hover:text-ink">Ingresar a mi cuenta</Link></li>
              <li><Link href="/registro" className="hover:text-ink">Crear una cuenta</Link></li>
              <li><Link href="/terminos" className="hover:text-ink">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-ink">Política de privacidad</Link></li>
              <li><Link href="/cookies" className="hover:text-ink">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft md:flex-row md:items-start md:justify-between">
          <p className="max-w-[76ch]">
            © 2026 DatosPrivados. DatosPrivados es una herramienta tecnológica de gestión y educación
            sobre la Ley 29733, no un estudio jurídico. Los documentos generados son borradores de
            trabajo que recomendamos validar con un abogado.
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.12em]">Hecho en Perú para empresas peruanas</p>
        </div>
      </div>
    </footer>
  );
}

/** Marco de una página de contenido: cabecera, migas de pan, contenido y pie. */
export function ContentShell({
  crumbs,
  structuredData = [],
  children,
}: {
  crumbs: Array<{ name: string; path: string }>;
  structuredData?: unknown[];
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {structuredData.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <main>
        <nav aria-label="Migas de pan" className="no-print border-b border-line bg-paper-2">
          <ol className="container-page flex flex-wrap items-center gap-1.5 py-3 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
            {crumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true">/</span>}
                {index === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-ink">{crumb.name}</span>
                ) : (
                  <Link href={crumb.path} className="hover:text-crimson">{crumb.name}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {children}
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}

export function CtaBand() {
  return (
    <section className="no-print border-y border-line bg-ink text-paper">
      <div className="container-page grid gap-8 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <h2 className="max-w-[22ch] font-display text-[2rem] leading-[1.05] tracking-[-0.03em] md:text-[2.5rem]">
            Ten tu expediente de cumplimiento listo antes de una fiscalización.
          </h2>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-paper/80">
            Bancos de datos, documentos, solicitudes ARCO e incidentes en un solo panel, con evidencia fechada de cada
            paso.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link
            href="/diagnostico"
            className="btn h-12 w-full bg-paper-2 px-6 text-base text-ink hover:bg-crimson hover:text-paper lg:w-auto"
          >
            Hacer el diagnóstico gratuito
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            prefetch={false}
            className="btn h-12 w-full border-paper/40 px-6 text-base text-paper hover:bg-paper hover:text-ink lg:w-auto"
          >
            Ver la demo
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Texto con **negritas** y [enlaces](/ruta-interna). Solo admite rutas internas. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[A-Za-z0-9\-_/#?=&]*\))/g);
  return (
    <>
      {parts.map((part, index) => {
        const link = /^\[([^\]]+)\]\((\/[A-Za-z0-9\-_/#?=&]*)\)$/.exec(part);
        if (link) {
          return (
            <Link key={index} href={link[2]} className="link-underline font-medium text-ink">
              {link[1]}
            </Link>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}
