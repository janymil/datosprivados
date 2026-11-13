import Link from "next/link";

const LINKS = [
  { key: "cobros", href: "/operador", label: "Comprobantes y transferencias" },
  { key: "clientes", href: "/operador/clientes", label: "Clientes" },
  { key: "feriados", href: "/operador/feriados", label: "Feriados" },
] as const;

/** Navegación del panel de operador. */
export function OperatorNav({ current }: { current: (typeof LINKS)[number]["key"] }) {
  return (
    <nav aria-label="Operador" className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.08em]">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === current ? "page" : undefined}
          className={link.key === current ? "text-crimson underline underline-offset-4" : "text-ink-soft hover:text-ink"}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
