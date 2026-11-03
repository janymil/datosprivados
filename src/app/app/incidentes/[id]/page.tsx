import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getIncident } from "@/lib/data";
import { updateIncidentAction } from "@/app/actions/incidents";
import { formatDateTime, hoursClock, hoursLeft } from "@/lib/format";
import {
  INCIDENT_CRITERIA,
  criteriaLabels,
  parseCriteria,
  requiresAnpdNotification,
} from "@/lib/incident-criteria";
import { Countdown } from "@/components/countdown";
import { CopyButton } from "@/components/copy-button";
import { buildAuthorityNotice } from "@/lib/incident-notice";
import { demoPreview, isDemoCompany } from "@/lib/demo";
import { IncidentAiPanel } from "@/components/incident-ai-panel";
import { SubmitButton } from "@/components/submit-button";
import { Field, PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Incidente" };

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" }> = {
  abierto: { label: "Abierto", tone: "danger" },
  en_analisis: { label: "En análisis", tone: "warn" },
  notificado: { label: "Notificado a la ANPD", tone: "info" },
  cerrado: { label: "Cerrado", tone: "ok" },
};

const SEVERITY: Record<string, string> = {
  leve: "Leve",
  moderado: "Moderado",
  grave: "Grave",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireSession();
  const { id } = await params;
  const incident = getIncident(company.id, id);
  if (!incident) notFound();

  const status = STATUS[incident.status] ?? STATUS.abierto;
  const expired = hoursLeft(incident.due_at).expired;
  const closed = incident.status === "cerrado";
  const notifiedLate =
    !!incident.notified_at && new Date(incident.notified_at) > new Date(incident.due_at);
  const selectedCriteria = parseCriteria(incident.criteria);
  const mustNotify = requiresAnpdNotification(incident.criteria);
  const criteriaText = criteriaLabels(incident.criteria).join(", ") || "Ninguno";

  const draft = buildAuthorityNotice({ company, incident });

  const rows: [string, string][] = [
    ["Gravedad", SEVERITY[incident.severity] ?? incident.severity],
    ["Personas afectadas", incident.affected_people ? String(incident.affected_people) : "Por determinar"],
    ["A quiénes alcanzó", incident.affected_sample || "—"],
    ["Criterios art. 34.1", criteriaText],
    ["Datos comprometidos", incident.data_categories || "—"],
    ["Medidas adoptadas", incident.measures || "—"],
    [
      "Notificado a la ANPD",
      incident.notified_at
        ? `${formatDateTime(incident.notified_at)}${notifiedLate ? " (fuera de plazo)" : ""}`
        : "No",
    ],
  ];

  return (
    <div className="space-y-7">
      <nav className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft" aria-label="Ruta">
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

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:grid-rows-[auto_1fr]">
        {/* En móvil, el reloj y la acción principal van primero; el criterio, al final. */}
        <div className="order-2 min-w-0 space-y-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <section className="group card p-6 md:p-7">
            <h2 className="font-display text-2xl tracking-[-0.02em]">Datos del incidente</h2>
            <dl className="mt-4 divide-y divide-line border-t border-line group-has-[details[open]]:hidden">
              {rows.map(([label, value]) => (
                <div key={label} className="grid gap-1.5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
                  <dd className="whitespace-pre-line text-[15.5px] leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-line pt-4 group-has-[details[open]]:hidden">
              <p className="label-mono">Criterios del art. 34.1</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {INCIDENT_CRITERIA.map((criterion) => {
                  const active = selectedCriteria.includes(criterion.id);
                  return (
                    <span
                      key={criterion.id}
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "border-crimson/50 bg-crimson/[0.08] text-crimson"
                          : "border-line bg-paper-2 text-ink-soft"
                      }`}
                    >
                      {active ? "✓" : "—"} {criterion.label}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                {mustNotify
                  ? "Cumple al menos un criterio: el aviso a la ANPD es obligatorio dentro de 48 horas y también se informa a los afectados (art. 34.3)."
                  : "No cumple ningún criterio: no hay aviso obligatorio a la ANPD, pero el incidente se documenta igual (art. 35)."}
              </p>
            </div>

            {!closed && (
              <details className="mt-4">
                <summary className="btn btn-ghost btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="group-has-[details[open]]:hidden">Editar datos</span>
                  <span className="hidden group-has-[details[open]]:inline">Cancelar edición</span>
                </summary>
                <form action={updateIncidentAction} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={incident.id} />
                  <input type="hidden" name="action" value="guardar" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Gravedad">
                      <select name="severity" defaultValue={incident.severity} className="input">
                        <option value="leve">Leve</option>
                        <option value="moderado">Moderado</option>
                        <option value="grave">Grave</option>
                      </select>
                    </Field>
                    <Field label="Personas afectadas">
                      <input
                        type="number"
                        name="affected_people"
                        min={0}
                        max={100000000}
                        inputMode="numeric"
                        defaultValue={incident.affected_people}
                        className="input"
                      />
                    </Field>
                  </div>
                  <Field label="Datos comprometidos">
                    <input
                      name="data_categories"
                      maxLength={500}
                      defaultValue={incident.data_categories}
                      className="input"
                    />
                  </Field>
                  <Field
                    label="A quiénes alcanzó"
                    hint="Correos, teléfonos o el grupo afectado. Queda en el reporte como evidencia."
                  >
                    <input
                      name="affected_sample"
                      maxLength={500}
                      defaultValue={incident.affected_sample}
                      className="input"
                    />
                  </Field>
                  <fieldset>
                    <legend className="field-label">Criterios del art. 34.1</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {INCIDENT_CRITERIA.map((criterion) => (
                        <label
                          key={criterion.id}
                          className="flex cursor-pointer items-start gap-2 border border-line bg-paper px-3 py-2 text-sm leading-snug"
                        >
                          <input
                            type="checkbox"
                            name="criteria"
                            value={criterion.id}
                            defaultChecked={selectedCriteria.includes(criterion.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#b0241c]"
                          />
                          <span>{criterion.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Medidas adoptadas">
                    <textarea
                      name="measures"
                      rows={3}
                      maxLength={4000}
                      defaultValue={incident.measures}
                      className="input resize-y"
                    />
                  </Field>
                  <Field label="Descripción">
                    <textarea
                      name="description"
                      rows={3}
                      maxLength={4000}
                      defaultValue={incident.description}
                      className="input resize-y"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <SubmitButton pendingLabel="Guardando…" className="btn btn-primary btn-sm">
                      Guardar cambios
                    </SubmitButton>
                  </div>
                </form>
              </details>
            )}
          </section>

          <IncidentAiPanel incidentId={incident.id} companyPlan={company.plan} />

          <section className="card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl tracking-[-0.02em]">Borrador para la ANPD</h2>
                <p className="mt-1.5 max-w-[54ch] text-sm leading-relaxed text-ink-soft">
                  Completa lo que está entre [corchetes] y guarda la constancia de envío.
                </p>
              </div>
              <CopyButton text={isDemoCompany(company) ? "" : draft} label="Copiar borrador" locked={isDemoCompany(company)} />
            </div>
            <pre className="mt-4 max-h-[380px] overflow-auto whitespace-pre-wrap border border-line bg-paper p-5 font-mono text-xs leading-relaxed text-ink">
              {isDemoCompany(company) ? demoPreview(draft) : draft}
            </pre>
          </section>
        </div>

        <div className="order-1 lg:col-start-2 lg:row-start-1">
          <section
            className={`border p-6 ${
              closed || !mustNotify
                ? "border-line bg-paper-2"
                : expired
                  ? "border-crimson/50 bg-crimson/[0.04]"
                  : "border-ochre/50 bg-ochre/[0.04]"
            }`}
          >
            <p className="label-mono">{mustNotify ? "Plazo de 48 horas" : "Registro del incidente"}</p>
            {closed ? (
              <p className="mt-2 font-display text-2xl tracking-[-0.02em]">Incidente cerrado</p>
            ) : incident.notified_at ? (
              <>
                <p className={`mt-2 font-display text-2xl tracking-[-0.02em] ${notifiedLate ? "text-crimson" : "text-sage"}`}>
                  {notifiedLate ? "Notificado fuera de plazo" : "Notificado a tiempo"}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{formatDateTime(incident.notified_at)}</p>
              </>
            ) : mustNotify ? (
              <>
                <p className={`mt-2 font-display text-[2.2rem] leading-none tracking-[-0.03em] ${expired ? "text-crimson" : ""}`}>
                  <Countdown dueAt={incident.due_at} initialLabel={hoursClock(incident.due_at)} />
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  {expired
                    ? "Si notificas ahora, explica el motivo de la demora."
                    : `Vence el ${formatDateTime(incident.due_at)}.`}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-display text-2xl tracking-[-0.02em]">Solo documentar</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  No marcaste criterios del art. 34.1, así que no hay aviso obligatorio a la ANPD.
                  Deja registradas las medidas adoptadas: todo incidente se documenta (art. 35).
                </p>
              </>
            )}

            {!closed && (
              <div className="mt-5 space-y-2.5 border-t border-line pt-4">
                {!incident.notified_at && (
                  <form action={updateIncidentAction}>
                    <input type="hidden" name="id" value={incident.id} />
                    <input type="hidden" name="action" value="notificar" />
                    <SubmitButton pendingLabel="Guardando…" className="btn btn-primary btn-sm w-full">
                      {mustNotify ? "Marcar como notificado" : "Marcar como notificado (voluntario)"}
                    </SubmitButton>
                  </form>
                )}
                {incident.status === "abierto" && (
                  <form action={updateIncidentAction}>
                    <input type="hidden" name="id" value={incident.id} />
                    <input type="hidden" name="action" value="analisis" />
                    <SubmitButton pendingLabel="Guardando…" className="btn btn-ghost btn-sm w-full">
                      Pasar a análisis
                    </SubmitButton>
                  </form>
                )}
                <form action={updateIncidentAction}>
                  <input type="hidden" name="id" value={incident.id} />
                  <input type="hidden" name="action" value="cerrar" />
                  <SubmitButton pendingLabel="Cerrando…" className="btn btn-ghost btn-sm w-full">
                    Cerrar incidente
                  </SubmitButton>
                </form>
                <p className="text-xs leading-relaxed text-ink-soft">
                  Cerrar no borra el registro: queda como evidencia.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="order-3 lg:col-start-2 lg:row-start-2 lg:self-start">
          <section className="border border-line bg-paper p-6">
            <p className="label-mono">¿Debo notificar a la ANPD?</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Sí, en máximo 48 h, si el incidente (art. 34.1):
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              <li>expone grandes volúmenes de datos,</li>
              <li>puede afectar a muchas personas,</li>
              <li>involucra datos sensibles, o</li>
              <li>causa un daño evidente a sus derechos.</li>
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
              Aplica aunque ya lo hayas resuelto. Si fue digital, avisa también al CNSD. Si afecta a
              personas, infórmales en 48 h. Y regístralo siempre (art. 35).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
