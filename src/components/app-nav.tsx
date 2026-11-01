"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertIcon,
  BuildingIcon,
  ClipboardIcon,
  DatabaseIcon,
  FileIcon,
  HelpIcon,
  InboxIcon,
  PlugIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
} from "./icons";

const ITEMS = [
  { href: "/app", label: "Mi plan", icon: ShieldIcon, group: "", hint: "Tu puntaje, tus alertas y el siguiente paso." },
  { href: "/app/bancos", label: "Bancos de datos", icon: DatabaseIcon, group: "Configurar", hint: "Tus listas de personas (clientes, trabajadores…) y su inscripción gratis en el SIPDP." },
  { href: "/app/herramientas", label: "Herramientas", icon: PlugIcon, group: "Configurar", hint: "Los programas que guardan datos de tus clientes: web, correo, WhatsApp, nube." },
  { href: "/app/documentos", label: "Documentos", icon: FileIcon, group: "Configurar", hint: "Política de privacidad, consentimientos, seguridad y contratos, armados con tus datos." },
  { href: "/app/evidencias", label: "Evidencias", icon: ClipboardIcon, group: "Atender", hint: "Tus pruebas con fecha de que aplicas las medidas." },
  { href: "/app/arco", label: "Solicitudes ARCO", icon: InboxIcon, group: "Atender", hint: "Personas que piden ver, corregir o borrar sus datos. Tienen plazo legal." },
  { href: "/app/incidentes", label: "Incidentes", icon: AlertIcon, group: "Atender", hint: "Pérdidas, robos o filtraciones de datos. Corre un reloj de 48 horas." },
  { href: "/app/ayuda", label: "Centro de ayuda", icon: HelpIcon, group: "Ayuda", hint: "Guía completa de la A a la Z, buscador, glosario y preguntas frecuentes." },
  { href: "/app/asistente", label: "Asistente legal", icon: SparklesIcon, group: "Ayuda", hint: "Pregunta lo que quieras sobre la ley o sobre cómo usar la app." },
  { href: "/app/empresa", label: "Empresa", icon: BuildingIcon, group: "Cuenta", hint: "Tus datos y tu responsable de privacidad: salen en tus documentos." },
  { href: "/app/ajustes", label: "Ajustes", icon: SettingsIcon, group: "Cuenta", hint: "Plan, pagos, contraseña, IA y exportar tu expediente." },
];

const MOBILE_LABEL: Record<string, string> = {
  "/app": "Mi plan",
  "/app/ayuda": "Ayuda",
  "/app/asistente": "Asistente",
  "/app/bancos": "Bancos",
  "/app/arco": "ARCO",
  "/app/incidentes": "Incidentes",
  "/app/documentos": "Docs",
  "/app/herramientas": "Herramientas",
  "/app/evidencias": "Evidencias",
  "/app/empresa": "Empresa",
  "/app/ajustes": "Ajustes",
};

export function AppNav({
  variant = "sidebar",
  badges,
}: {
  variant?: "sidebar" | "mobile";
  badges: { arco: number; incidents: number };
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "mobile") {
    return <MobileNav isActive={isActive} badges={badges} />;
  }

  return (
    <nav className="mt-6 flex flex-1 flex-col" aria-label="Secciones">
      {ITEMS.map((item, index) => {
        const active = isActive(item.href);
        const badge =
          item.href === "/app/arco" ? badges.arco : item.href === "/app/incidentes" ? badges.incidents : 0;
        const startsGroup = item.group && item.group !== ITEMS[index - 1]?.group;
        return (
          <div key={item.href}>
            {startsGroup && (
              <p className="mb-1.5 mt-5 px-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft/70">
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              aria-describedby={`nav-hint-${index}`}
              className={`group relative flex items-center gap-3 px-3.5 py-2.5 text-[15px] font-medium transition-colors ${
                active ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className={`min-w-[20px] rounded-full px-1.5 text-center font-mono text-xs font-semibold leading-[18px] ${
                    active ? "bg-paper text-ink" : "bg-crimson text-paper"
                  }`}
                >
                  {badge}
                </span>
              )}
              <span
                id={`nav-hint-${index}`}
                role="tooltip"
                className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 w-60 -translate-y-1/2 rounded-[3px] border border-ink bg-paper-2 px-3 py-2 text-[13px] font-normal leading-snug text-ink opacity-0 shadow-[0_14px_36px_-10px_rgba(23,25,30,0.45)] transition-opacity delay-300 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
              >
                {item.hint}
              </span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

const MOBILE_PRIMARY = ["/app", "/app/bancos", "/app/documentos", "/app/arco"];

/** Barra inferior fija en móvil: 4 secciones principales y «Más» para el resto. */
function MobileNav({
  isActive,
  badges,
}: {
  isActive: (href: string) => boolean;
  badges: { arco: number; incidents: number };
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.href));
  const secondary = ITEMS.filter((item) => !MOBILE_PRIMARY.includes(item.href));
  const secondaryActive = secondary.some((item) => isActive(item.href));
  const badgeFor = (href: string) =>
    href === "/app/arco" ? badges.arco : href === "/app/incidentes" ? badges.incidents : 0;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-ink/30" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Secciones"
      >
        {moreOpen && (
          <ul className="grid grid-cols-2 gap-2 border-b border-line p-3">
            {secondary.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-2.5 rounded-sm px-3 py-3 text-[15px] font-medium ${
                    isActive(item.href) ? "bg-ink text-paper" : "bg-paper text-ink"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {badgeFor(item.href) > 0 && (
                    <span className="rounded-full bg-crimson px-1.5 font-mono text-xs text-paper">{badgeFor(item.href)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const active = isActive(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-crimson" : "text-ink-soft"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {MOBILE_LABEL[item.href]}
                {badge > 0 && (
                  <span className="absolute right-[22%] top-1.5 min-w-[16px] rounded-full bg-crimson px-1 text-center font-mono text-[10px] leading-4 text-paper">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              moreOpen || secondaryActive ? "text-crimson" : "text-ink-soft"
            }`}
          >
            <span aria-hidden="true" className="flex h-5 items-center text-lg leading-none">
              •••
            </span>
            Más
            {badges.incidents > 0 && (
              <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-crimson" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
