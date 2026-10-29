import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createIncidentAction } from "@/app/actions/incidents";
import { limaDateTimeLocal } from "@/lib/format";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Registrar incidente" };

const ERRORS: Record<string, string> = {
  "1": "Escribe un título para el incidente.",
  fecha: "Revisa la fecha y hora de detección: no puede estar en el futuro.",
};

export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession();
  const { error } = await searchParams;
  const errorMessage = error ? ERRORS[error] : undefined;

  const local = limaDateTimeLocal();

  return (
    <div className="max-w-[820px] space-y-7">
      <nav className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/incidentes" className="hover:text-ink">
          Incidentes
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">Nuevo</span>
      </nav>

      <PageHeader
        title="Registrar un incidente"
        description="Anota primero cuándo lo detectaste: el plazo de 48 horas corre desde ese momento. Lo demás puedes completarlo después."
      />

      <div className="border-l-3 border-ochre bg-ochre/[0.05] px-5 py-4 text-[15px] leading-relaxed">
        ¿Sigue ocurriendo? Primero corta el acceso o la exposición; luego regístralo.
      </div>

      {errorMessage && (
        <p role="alert" className="border-l-3 border-crimson bg-crimson/10 px-5 py-3 text-[15px] text-crimson">
          {errorMessage}
        </p>
      )}

      <form action={createIncidentAction} className="card space-y-5 p-6 md:p-8">
        <Field label="Fecha y hora de detección" hint="Hora de Lima (UTC-5).">
          <input
            type="datetime-local"
            name="detected_at"
            defaultValue={local}
            required
            className="input"
          />
        </Field>

        <Field label="Título del incidente">
          <input
            name="title"
            required
            maxLength={200}
            className="input"
            placeholder="Correo masivo enviado sin copia oculta"
          />
        </Field>

        <Field label="Qué ocurrió">
          <textarea
            name="description"
            rows={4}
            maxLength={4000}
            className="input resize-y"
            placeholder="Qué sistema, qué datos y cómo se detectó."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gravedad estimada">
            <select name="severity" className="input" defaultValue="moderado">
              <option value="leve">Leve — poco alcance, datos no sensibles</option>
              <option value="moderado">Moderado — datos de contacto o compra</option>
              <option value="grave">Grave — datos sensibles o financieros</option>
            </select>
          </Field>
          <Field label="Personas afectadas">
            <input
              type="number"
              name="affected_people"
              min={0}
              max={100000000}
              defaultValue={0}
              className="input"
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Datos comprometidos">
          <input
            name="data_categories"
            maxLength={500}
            className="input"
            placeholder="Correo, nombre, dirección"
          />
        </Field>

        <Field label="Medidas adoptadas hasta ahora">
          <textarea
            name="measures"
            rows={3}
            maxLength={4000}
            className="input resize-y"
            placeholder="Qué hiciste para contenerlo."
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Link href="/app/incidentes" className="btn btn-ghost">
            Cancelar
          </Link>
          <SubmitButton pendingLabel="Registrando…" className="btn btn-primary">
            Registrar e iniciar plazo
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
