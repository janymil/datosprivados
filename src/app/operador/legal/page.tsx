import Link from "next/link";
import { OperatorNav } from "@/components/operator-nav";
import type { LegalChangeStatus } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { listLegalChanges } from "@/lib/legal-changes";
import { requireOperator } from "@/lib/operator";
import { STATUS_LABEL } from "./labels";

export const metadata = { title: "Cambios legales", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: Array<{ key: string; label: string; status: LegalChangeStatus[] }> = [
  { key: "pendientes", label: "Pendientes", status: ["nuevo", "fallo"] },
  { key: "abogado", label: "Abogado", status: ["abogado"] },
  { key: "historial", label: "Historial", status: ["aprobado", "fusionado", "aplicado", "rechazado"] },
];

/** Cambios legales propuestos: el fundador decide cada uno (diseño §8 y §10a). */
export default async function LegalChangesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireOperator();
  const { tab } = await searchParams;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const counts = Object.fromEntries(TABS.map((t) => [t.key, listLegalChanges({ status: t.status }).length]));
  const changes = listLegalChanges({ status: current.status });

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <OperatorNav current="legal" />
        <h1 className="mt-4 font-display text-4xl tracking-[-0.03em]">Cambios legales</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Cada cambio a los textos legales llega aquí con su fuente, la cita de la norma, lo que afecta y la diferencia
          exacta. <strong>Nada llega a tus clientes sin tu aprobación.</strong> Al aprobar, GitHub corre todas las
          pruebas y lo publica solo si pasan.
        </p>
      </header>

      <nav aria-label="Estado" className="flex gap-5 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/operador/legal?tab=${t.key}`}
            aria-current={t.key === current.key ? "page" : undefined}
            className={t.key === current.key ? "font-semibold text-ink underline underline-offset-4" : "text-ink-soft hover:text-ink"}
          >
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </nav>

      {changes.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No hay cambios en esta lista. La auditoría y el monitor de normas los proponen; te llegará un correo con cada uno.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {changes.map((change) => (
            <li key={change.id} className="py-3">
              <Link href={`/operador/legal/${change.id}`} className="block hover:bg-paper-2">
                <p className="text-[15px] font-medium">{change.title}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                  {change.kind === "norma" ? "cambio de norma" : "auditoría"} · {formatDate(change.created_at)} ·{" "}
                  {(JSON.parse(change.affected) as unknown[]).length} afectados ·{" "}
                  <span className={change.status === "fallo" ? "text-crimson" : undefined}>{STATUS_LABEL[change.status]}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
