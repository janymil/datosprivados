import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { listDrafts } from "@/lib/legal-drafts";
import { redraftAction, requestDraftAction } from "./draft-actions";

/** Correcciones que el motor redacta solo (plan 7): en cola, sin solución (con el motivo) y pedidos a mano. */
export function DraftsSection() {
  const waiting = listDrafts({ status: ["pendiente", "redactando"] }).length;
  const failed = listDrafts({ status: ["sin_solucion"] }).slice(0, 20);
  const recent = listDrafts({ status: ["propuesto"] }).slice(0, 5);

  return (
    <section aria-labelledby="correcciones-redaccion" className="space-y-4">
      <h2 id="correcciones-redaccion" className="font-display text-2xl">
        Correcciones en redacción
      </h2>
      <p className="text-sm text-ink-soft">
        El motor redacta solo las correcciones de la auditoría y de las normas nuevas; cada una llega aquí para tu aprobación
        solo si pasó todas las comprobaciones. {waiting} en cola.
      </p>

      {failed.length > 0 && (
        <ul className="space-y-3">
          {failed.map((d) => (
            <li key={d.id} className="card p-4">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-crimson">
                No se pudo redactar · {formatDateTime(d.updated_at)}
              </p>
              <p className="mt-1 text-[15px] font-medium">{(JSON.parse(d.targets) as string[]).join(", ") || "norma nueva"}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {(JSON.parse(d.reasons ?? "[]") as string[]).map((r, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {r}
                  </li>
                ))}
              </ul>
              <form action={redraftAction} className="mt-3">
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  Redactar de nuevo
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <p className="text-sm text-ink-soft">
          Últimas redactadas:{" "}
          {recent.map((d, i) => (
            <span key={d.id}>
              {i > 0 && " · "}
              {d.change_id ? (
                <Link href={`/operador/legal/${d.change_id}`} className="underline underline-offset-4">
                  {d.change_id}
                </Link>
              ) : (
                d.id
              )}
            </span>
          ))}
        </p>
      )}

      <form action={requestDraftAction} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm">
          <span className="block text-ink-soft">Pedir una corrección (id de la cláusula, del hecho o ruta del texto)</span>
          <input name="target" required className="input mt-1 w-full" placeholder="sectorial.3.procedimientos" />
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          Redactar corrección
        </button>
      </form>
    </section>
  );
}
