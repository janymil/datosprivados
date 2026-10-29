import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getIncident } from "@/lib/data";
import { updateIncidentAction } from "@/app/actions/incidents";
import { formatDateTime, hoursLeft } from "@/lib/format";
import { Countdown } from "@/components/countdown";
import { CopyButton } from "@/components/copy-button";
import { Field, PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Incidente" };

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" }> = {
  abierto: { label: "Abierto", tone: "danger" },
  en_analisis: { label: "En análisis", tone: "warn" },
  notificado: { label: "Notificado a la ANPD", tone: "info" },
  cerrado: { label: "Cerrado", tone: "ok" },
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireSession();
  const { id } = await params;
  const incident = getIncident(company.id, id);
  if (!incident) notFound();

  const status = STATUS[incident.status] ?? STATUS.abierto;
  const left = hoursLeft(incident.due_at);
  const expired = left.expired;
  const closed = incident.status === "cerrado";

  const draft = `NOTIFICACIÓN DE INCIDENTE DE SEGURIDAD DE DATOS PERSONALES
Autoridad Nacional de Protección de Datos Personales (ANPD)

1. RESPONSABLE DEL TRATAMIENTO
${company.name} — RUC ${company.ruc}
Domicilio: ${company.address || "por completar"}
Contacto: ${company.dpo_name || "por designar"} · ${company.dpo_email || company.email}

2. FECHA Y HORA DE DETECCIÓN
${formatDateTime(incident.detected_at)} (hora de Lima)

3. DESCRIPCIÓN DEL INCIDENTE
${incident.title}
${incident.description || "Por completar."}

4. CATEGORÍAS DE DATOS AFECTADOS
${incident.data_categories || "Por completar."}

5. NÚMERO ESTIMADO DE TITULARES AFECTADOS
${incident.affected_people || "Por determinar"}

6. MEDIDAS ADOPTADAS
${incident.measures || "Por completar."}

7. EVALUACIÓN DE RIESGO
[Explicar si existe riesgo para los derechos y libertades de los titulares y por qué.]

8. MEDIDAS DE CONTENCIÓN Y CORRECCIÓN PREVISTAS
[Detallar acciones, responsables y plazos.]

Fecha de esta notificación: ${new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
`;

  return (
    <div className="space-y-7">
      <nav className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/incidentes" className="hover:text-ink">
          Incidentes
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">{incident.title}</span>
      </nav>

      <PageHeader
        eyebrow={`Detectado el ${formatDateTime(incident.detected_at)}`}
        title={incident.title}
        description={incident.description || undefined}
        actions={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-xl tracking-[-0.02em]">Datos del incidente</h2>
            <dl className="mt-4 divide-y divide-line border-t border-line">
              {[
                ["Gravedad", incident.severity],
                ["Personas afectadas", String(incident.affected_people || 0)],
                ["Categorías de datos", incident.data_categories || "—"],
                ["Medidas adoptadas", incident.measures || "—"],
                ["Notificado a la ANPD", incident.notified_at ? formatDateTime(incident.notified_at) : "No"],
                ["Cierre", incident.status === "cerrado" ? "Registrado" : "Pendiente"],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[190px_1fr] sm:gap-4">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">{label}</dt>
                  <dd className="text-[12.5px] capitalize leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl tracking-[-0.02em]">Borrador de notificación ANPD</h2>
                <p className="mt-1 max-w-[52ch] text-[12px] leading-relaxed text-ink-soft">
                  Completa los campos entre corchetes en el portal de la ANPD. Guarda la constancia de
                  envío.
                </p>
              </div>
              <div className="flex gap-2">
                <CopyButton text={draft} label="Copiar borrador" />
                <Link href="/app/incidentes" className="btn btn-ghost btn-sm">
                  Volver
                </Link>
              </div>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap border border-line bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink-soft">
              {draft}
            </pre>
          </section>

          {!closed && (
            <section className="card p-6">
              <h2 className="font-display text-xl tracking-[-0.02em]">Actualizar expediente</h2>
              <form action={updateIncidentAction} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={incident.id} />
                <input type="hidden" name="action" value="guardar" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Personas afectadas">
                    <input
                      type="number"
                      name="affected_people"
                      min={0}
                      defaultValue={incident.affected_people}
                      className="input"
                    />
                  </Field>
                  <Field label="Categorías de datos">
                    <input name="data_categories" defaultValue={incident.data_categories} className="input" />
                  </Field>
                </div>
                <Field label="Medidas adoptadas">
                  <textarea name="measures" rows={3} defaultValue={incident.measures} className="input resize-y" />
                </Field>
                <Field label="Descripción">
                  <textarea name="description" rows={3} defaultValue={incident.description} className="input resize-y" />
                </Field>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary btn-sm">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section
            className={`border p-5 ${
              closed ? "border-line bg-paper-2" : expired ? "border-crimson/50 bg-crimson/[0.04]" : "border-ochre/50 bg-ochre/[0.04]"
            }`}
          >
            <p className="label-mono">Reloj de 48 horas</p>
            {closed ? (
              <>
                <p className="mt-2 font-display text-2xl tracking-[-0.02em]">Incidente cerrado</p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  Documento archivado. Revisa las lecciones aprendidas con tu equipo.
                </p>
              </>
            ) : incident.notified_at ? (
              <>
                <p className="mt-2 font-display text-2xl tracking-[-0.02em] text-sage">Notificado</p>
                <p className="mt-2 text-[12px] text-ink-soft">{formatDateTime(incident.notified_at)}</p>
              </>
            ) : (
              <>
                <p className={`mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] ${expired ? "text-crimson" : ""}`}>
                  <Countdown
                    dueAt={incident.due_at}
                    initialLabel={expired ? `Vencido hace ${left.hours} h` : `${left.hours} h ${left.minutes} min`}
                  />
                </p>
                <p className="mt-2 text-[12px] text-ink-soft">
                  Vence el {formatDateTime(incident.due_at)}. Si no hay riesgo para los titulares,
                  documenta la decisión de no notificar.
                </p>
              </>
            )}
          </section>

          {!closed && (
            <section className="card p-5">
              <p className="label-mono">Acciones</p>
              <div className="mt-3 space-y-2">
                {!incident.notified_at && (
                  <form action={updateIncidentAction}>
                    <input type="hidden" name="id" value={incident.id} />
                    <input type="hidden" name="action" value="notificar" />
                    <button type="submit" className="btn btn-primary btn-sm w-full">
                      Marcar como notificado
                    </button>
                  </form>
                )}
                {incident.status === "abierto" && (
                  <form action={updateIncidentAction}>
                    <input type="hidden" name="id" value={incident.id} />
                    <input type="hidden" name="action" value="analisis" />
                    <button type="submit" className="btn btn-ghost btn-sm w-full">
                      Pasar a análisis
                    </button>
                  </form>
                )}
                <form action={updateIncidentAction}>
                  <input type="hidden" name="id" value={incident.id} />
                  <input type="hidden" name="action" value="cerrar" />
                  <button type="submit" className="btn btn-ghost btn-sm w-full">
                    Cerrar incidente
                  </button>
                </form>
              </div>
              <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-soft">
                Cerrar no elimina el registro: queda como evidencia de que actuaste.
              </p>
            </section>
          )}

          <section className="border border-line bg-paper p-5">
            <p className="label-mono">Criterio de notificación</p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              Notifica a la ANPD cuando el incidente afecte datos personales y pueda generar un riesgo
              para los derechos de los titulares. Ante la duda, documenta el análisis y consulta con tu
              abogado.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
