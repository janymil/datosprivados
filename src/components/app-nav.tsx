"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertIcon,
  BuildingIcon,
  DatabaseIcon,
  FileIcon,
  InboxIcon,
  SettingsIcon,
  ShieldIcon,
} from "./icons";

const ITEMS = [
  { href: "/app", label: "Panel", icon: ShieldIcon },
  { href: "/app/bancos", label: "Bancos de datos", icon: DatabaseIcon },
  { href: "/app/arco", label: "Solicitudes ARCO", icon: InboxIcon },
  { href: "/app/incidentes", label: "Incidentes", icon: AlertIcon },
  { href: "/app/documentos", label: "Documentos", icon: FileIcon },
  { href: "/app/empresa", label: "Empresa", icon: BuildingIcon },
  { href: "/app/ajustes", label: "Ajustes", icon: SettingsIcon },
];

const MOBILE_LABEL: Record<string, string> = {
  "/app": "Panel",
  "/app/bancos": "Bancos",
  "/app/arco": "ARCO",
  "/app/incidentes": "Incidentes",
  "/app/documentos": "Docs",
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
    return (
      <nav className="grid grid-cols-4 gap-1 border-b border-line bg-paper-2 px-2 py-2" aria-label="Secciones">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-sm px-1 py-2 font-mono text-[9px] uppercase tracking-[0.06em] ${
                active ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {MOBILE_LABEL[item.href]}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-8 flex flex-1 flex-col gap-0.5" aria-label="Secciones">
      {ITEMS.map((item, index) => {
        const active = isActive(item.href);
        const badge =
          item.href === "/app/arco" ? badges.arco : item.href === "/app/incidentes" ? badges.incidents : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-3 px-3 py-[9px] text-[13px] transition-colors ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            <span
              className={`w-4 font-mono text-[9px] tracking-[0.08em] ${
                active ? "text-paper/50" : "text-ink-soft/60"
              }`}
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span
                className={`min-w-[18px] rounded-full px-1 text-center font-mono text-[9px] leading-[16px] ${
                  active ? "bg-paper text-ink" : "bg-crimson text-paper"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
