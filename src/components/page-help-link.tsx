"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpIcon } from "./icons";

/** Qué artículo de la Ayuda explica cada pantalla del panel. */
const PAGE_TOPICS: Array<[RegExp, string, string]> = [
  [/^\/app$/, "panel", "Mi plan"],
  [/^\/app\/bancos\/[^/]+\/ficha$/, "inscripcion-sipdp", "la inscripción en el SIPDP"],
  [/^\/app\/bancos\/[^/]+$/, "inscripcion-sipdp", "la inscripción en el SIPDP"],
  [/^\/app\/bancos/, "bancos", "los bancos de datos"],
  [/^\/app\/herramientas/, "herramientas", "las herramientas"],
  [/^\/app\/documentos/, "documentos", "los documentos"],
  [/^\/app\/evidencias/, "evidencias", "las evidencias"],
  [/^\/app\/arco/, "arco", "las solicitudes ARCO"],
  [/^\/app\/incidentes/, "incidentes", "los incidentes"],
  [/^\/app\/asistente/, "asistente-ia", "el asistente"],
  [/^\/app\/empresa/, "empresa", "los datos de la empresa"],
  [/^\/app\/ajustes/, "plan-y-pagos", "tu plan y tu cuenta"],
];

export function PageHelpLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/ayuda")) return null;
  const match = PAGE_TOPICS.find(([pattern]) => pattern.test(pathname));
  if (!match) return null;
  const [, slug, label] = match;

  return (
    <div className="no-print mb-4 flex justify-end">
      <Link
        href={`/app/ayuda/${slug}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper-2 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition-colors hover:border-crimson hover:text-crimson"
      >
        <HelpIcon className="h-3.5 w-3.5" />
        Ayuda sobre {label}
      </Link>
    </div>
  );
}
