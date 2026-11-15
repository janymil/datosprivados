import { formatDate, formatDateTime } from "@/lib/format";
import { listWatchItems, sourceHealth } from "@/lib/legal-watch/store";
import { markWatchItemAction } from "./watch-actions";

const SOURCE_NAME = { elperuano: "El Peruano", anpd: "ANPD (gob.pe)" } as const;

/** Normas nuevas que el monitor (plan 6) considera relevantes, con su impacto, y la salud de las fuentes. */
export function WatchSection() {
  const items = listWatchItems({ status: ["relevante"] });
  const health = sourceHealth();

  return (
    <section aria-labelledby="normas-detectadas" className="space-y-4">
      <h2 id="normas-detectadas" className="font-display text-2xl">
        Normas detectadas ({items.length})
      </h2>
      <p className="text-sm text-ink-soft">
        {health.length === 0
          ? "El monitor de normas aún no ha leído las fuentes."
          : health.map((h, i) => (
              <span key={h.source} className={h.failingDays > 0 || h.structureChanged ? "text-crimson" : undefined}>
                {i > 0 && " · "}
                <strong>{SOURCE_NAME[h.source]}</strong>{" "}
                {h.structureChanged
                  ? "la página cambió: revisar el monitor"
                  : h.failingDays > 0
                    ? `sin leer hace ${h.failingDays} días (${h.lastError ?? "error"})`
                    : h.lastOkAt
                      ? `leída ${formatDateTime(h.lastOkAt)}`
                      : "sin lectura todavía"}
              </span>
            ))}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">No hay normas nuevas que afecten a los documentos.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const impact = item.affected ? (JSON.parse(item.affected) as { documentKinds: string[]; customers: number }) : null;
            return (
              <li key={item.id} className="card p-4">
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                  {SOURCE_NAME[item.source]} · {item.issuer} · {formatDate(item.published_on)} ·{" "}
                  {item.relevance === "amends" ? "modifica una norma de la biblioteca" : "relevante"}
                </p>
                <p className="mt-1 text-[15px] font-medium">
                  <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {item.title}
                  </a>
                </p>
                {item.summary && <p className="mt-1 text-sm">{item.summary}</p>}
                <p className="mt-2 text-sm">
                  <strong>Por qué importa:</strong> {item.reason}
                </p>
                {impact && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Documentos: {impact.documentKinds.join(", ") || "ninguno identificado"} · {impact.customers} clientes
                  </p>
                )}
                <form action={markWatchItemAction} className="mt-3 flex gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" name="status" value="revisado" className="btn btn-primary btn-sm">
                    Revisado
                  </button>
                  <button type="submit" name="status" value="irrelevante" className="btn btn-ghost btn-sm">
                    No aplica
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
