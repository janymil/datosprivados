import Link from "next/link";
import { listHolidays } from "@/lib/db";
import { formatDate, limaToday } from "@/lib/format";
import { requireOperator } from "@/lib/operator";
import { SubmitButton } from "@/components/submit-button";
import { addHolidayAction, removeHolidayAction } from "./actions";

export const metadata = { title: "Feriados", robots: { index: false } };
export const dynamic = "force-dynamic";

const ERROR_LABEL: Record<string, string> = {
  fecha: "La fecha no es válida: usa el selector (AAAA-MM-DD).",
  nombre: "El nombre debe tener entre 3 y 80 caracteres.",
};

/** Feriados y días no laborables que se descuentan de los plazos en días hábiles. */
export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; ok?: string; error?: string }>;
}) {
  await requireOperator();
  const { year, ok, error } = await searchParams;
  const currentYear = Number(limaToday().slice(0, 4));
  const selected = Number(year) >= 2000 && Number(year) <= 2100 ? Number(year) : currentYear;
  const holidays = listHolidays(selected);
  const years = Array.from(new Set([currentYear, currentYear + 1, selected])).sort();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <Link href="/operador" className="text-sm text-ink-soft hover:text-ink">
          ← Operador
        </Link>
        <p className="mt-3 label-mono">Operador</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.03em]">Feriados y días no laborables</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          De aquí salen los plazos en <strong>días hábiles</strong> de las solicitudes ARCO y de los incidentes: los
          fines de semana y estas fechas no se cuentan. Se siembran los feriados nacionales calculados; añade los días
          no laborables que declare un decreto supremo y corrige lo que cambie.
        </p>
      </header>

      {ok && <p className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm">Guardado: {ok}.</p>}
      {error && (
        <p className="border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-sm">
          {ERROR_LABEL[error] ?? "No se pudo completar."}
        </p>
      )}

      <section className="card p-6">
        <h2 className="font-display text-2xl">Añadir o corregir una fecha</h2>
        <form action={addHolidayAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Fecha
            <input type="date" name="date" required className="input mt-1 block" />
          </label>
          <label className="min-w-[16rem] flex-1 text-sm">
            Nombre
            <input
              name="name"
              required
              minLength={3}
              maxLength={80}
              placeholder="Día no laborable para el sector público"
              className="input mt-1 block w-full"
            />
          </label>
          <SubmitButton pendingLabel="Guardando…" className="btn btn-primary btn-sm">
            Guardar fecha
          </SubmitButton>
        </form>
        <p className="mt-3 text-sm text-ink-soft">
          Cambiar el calendario <strong>no recalcula</strong> plazos ya fijados: cada solicitud conserva la fecha límite
          con la que entró.
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Feriados de {selected}</h2>
          <div className="flex gap-2 text-sm">
            {years.map((value) => (
              <Link
                key={value}
                href={`/operador/feriados?year=${value}`}
                className={value === selected ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"}
              >
                {value}
              </Link>
            ))}
          </div>
        </div>

        {holidays.length === 0 && <p className="mt-4 text-sm text-ink-soft">No hay fechas cargadas para ese año.</p>}

        <ul className="mt-4 divide-y divide-line border-y border-line">
          {holidays.map((holiday) => (
            <li key={holiday.date} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-mono text-sm">{holiday.date}</p>
                <p className="text-[15px]">{holiday.name}</p>
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                  {holiday.source === "calculado" ? "calculado" : "decreto"}
                </p>
              </div>
              <form action={removeHolidayAction}>
                <input type="hidden" name="date" value={holiday.date} />
                <SubmitButton pendingLabel="Quitando…" className="btn btn-ghost btn-sm">
                  Quitar
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          {formatDate(`${selected}-01-01`)} — {formatDate(`${selected}-12-31`)} · {holidays.length} fecha(s).
        </p>
      </section>
    </main>
  );
}
