import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listEvidence } from "@/lib/data";
import { addEvidenceAction, deleteEvidenceAction } from "@/app/actions/tools";
import type { EvidenceType } from "@/lib/db";
import { formatDate, limaToday } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";

export const metadata = { title: "Evidencias" };

const TYPES: Array<{ id: EvidenceType; label: string; why: string; placeholder: string }> = [
  {
    id: "consentimiento",
    label: "Consentimientos",
    why: "La carga de la prueba del consentimiento es tuya (art. 9). Anota cómo y cuándo lo obtuviste.",
    placeholder: "Ej. 14 suscriptores aceptaron «SÍ ACEPTO» por WhatsApp (capturas en la carpeta 2026-10)",
  },
  {
    id: "capacitacion",
    label: "Capacitaciones",
    why: "El plan de capacitación del personal es una medida de seguridad (art. 46.2).",
    placeholder: "Ej. Charla de 45 minutos sobre claves, WhatsApp e incidentes en 48 horas; asistieron 6 personas",
  },
  {
    id: "revision_accesos",
    label: "Revisiones de accesos",
    why: "Los privilegios se verifican como mínimo cada seis meses (art. 46.1.c).",
    placeholder: "Ej. Revisé quién accede al sistema y a la carpeta de clientes; retiré a 2 usuarios que ya no trabajan",
  },
  {
    id: "prueba_respaldo",
    label: "Pruebas de respaldo",
    why: "Debes verificar la integridad de las copias y la recuperación completa (art. 51.2).",
    placeholder: "Ej. Restauré la copia del lunes en otra computadora; todos los archivos abrieron bien",
  },
  {
    id: "purga",
    label: "Purgas de datos",
    why: "Cada eliminación demuestra el principio de minimización y el cumplimiento de tus plazos.",
    placeholder: "Ej. Eliminé grabaciones de cámaras anteriores a 60 días y 38 CV de más de 6 meses",
  },
];

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; ok?: string }>;
}) {
  const { company } = await requireSession();
  const { type, ok } = await searchParams;
  const active = TYPES.find((item) => item.id === type) ?? TYPES[0];
  const all = listEvidence(company.id);
  const rows = all.filter((row) => row.type === active.id);
  const today = limaToday();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Evidencias de cumplimiento"
        description="Tener los documentos no basta: ante una fiscalización la ANPD pide pruebas de que las medidas se aplican. Aquí dejas constancia con fecha de lo que haces."
      />
      {ok && <Toast message="Evidencia registrada." />}

      <nav className="flex flex-wrap gap-2" aria-label="Tipos de evidencia">
        {TYPES.map((item) => {
          const count = all.filter((row) => row.type === item.id).length;
          return (
            <Link
              key={item.id}
              href={`/app/evidencias?type=${item.id}`}
              className={`border px-3.5 py-2 text-[15px] ${
                item.id === active.id ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper hover:border-ink"
              }`}
            >
              {item.label} ({count})
            </Link>
          );
        })}
      </nav>

      <section className="card p-6">
        <h2 className="font-display text-xl tracking-[-0.02em]">{active.label}</h2>
        <p className="mt-1 max-w-[68ch] text-[15px] text-ink-soft">{active.why}</p>

        <form action={addEvidenceAction} className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]">
          <input type="hidden" name="type" value={active.id} />
          <label className="text-sm text-ink-soft">
            Fecha
            <input type="date" name="occurred_on" defaultValue={today} max={today} required className="input mt-1" />
          </label>
          <label className="text-sm text-ink-soft">
            Qué hiciste
            <input name="detail" required maxLength={600} className="input mt-1" placeholder={active.placeholder} />
          </label>
          <label className="text-sm text-ink-soft sm:col-span-2">
            Dónde está la prueba (opcional)
            <input
              name="reference"
              maxLength={200}
              className="input mt-1"
              placeholder="Carpeta, enlace, número de acta o nombre del archivo"
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Guardando…">Registrar</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-5 text-[15px] text-ink-soft">Aún no registraste evidencias de este tipo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-4 px-6 py-4">
                <span className="w-24 shrink-0 font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                  {formatDate(row.occurred_on, "short")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px]">{row.detail}</p>
                  {row.reference && <p className="mt-0.5 text-sm text-ink-soft">Prueba: {row.reference}</p>}
                </div>
                <form action={deleteEvidenceAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="type" value={row.type} />
                  <button type="submit" className="text-sm text-ink-soft underline">
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
