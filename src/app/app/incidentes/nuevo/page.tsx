import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createIncidentAction } from "@/app/actions/incidents";
import { limaDateTimeLocal } from "@/lib/format";
import { Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Registrar incidente" };

export default async function NewIncidentPage() {
  await requireSession();

  const local = limaDateTimeLocal();

  return (
    <div className="max-w-[760px] space-y-7">
      <nav className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/incidentes" className="hover:text-ink">
          Incidentes
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">Nuevo</span>
      </nav>

      <PageHeader
        eyebrow="48 horas para notificar"
        title="Registrar un incidente"
        description="No esperes a tener todas las respuestas. Registrar la hora de detección es lo primero: el contador de 48 horas corre desde ese momento."
      />

      <div className="border-l-2 border-ochre bg-ochre/[0.05] px-4 py-3 text-[12.5px] leading-relaxed">
        Si el incidente está en curso, primero contiene el acceso o corta la exposición. Luego vuelve a
        completar este formulario.
      </div>

      <form action={createIncidentAction} className="card space-y-5 p-6 md:p-8">
        <Field label="Título del incidente">
          <input
            name="title"
            required
            className="input"
            placeholder="Envío masivo con copia oculta mal configurada"
          />
        </Field>

        <Field label="Qué ocurrió" hint="Hechos concretos: qué sistema, qué datos, cómo se detectó.">
          <textarea
            name="description"
            rows={4}
            className="input resize-y"
            placeholder="Un correo de campaña salió con las direcciones de 38 suscriptores visibles en el campo Para."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gravedad estimada">
            <select name="severity" className="input" defaultValue="moderado">
              <option value="leve">Leve — datos de baja sensibilidad, alcance limitado</option>
              <option value="moderado">Moderado — datos de contacto o compra</option>
              <option value="grave">Grave — datos sensibles o financieros</option>
            </select>
          </Field>
          <Field label="Personas afectadas">
            <input
              type="number"
              name="affected_people"
              min={0}
              defaultValue={0}
              className="input"
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Categorías de datos comprometidos">
          <input
            name="data_categories"
            className="input"
            placeholder="Correo electrónico, nombre, dirección"
          />
        </Field>

        <Field label="Medidas adoptadas hasta ahora">
          <textarea
            name="measures"
            rows={3}
            className="input resize-y"
            placeholder="Se pidió eliminar el correo, se configuró el envío con copia oculta y se avisó a los afectados."
          />
        </Field>

        <Field label="Fecha y hora de detección" hint="Hora de Lima (UTC-5).">
          <input type="datetime-local" name="detected_at" defaultValue={local} className="input" />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Link href="/app/incidentes" className="btn btn-ghost">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary">
            Registrar incidente
          </button>
        </div>
      </form>
    </div>
  );
}
