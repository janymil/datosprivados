import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listIncidents } from "@/lib/data";
import { formatDateTime, hoursLeft } from "@/lib/format";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { Countdown } from "@/components/countdown";

export const metadata = { title: "Incidentes" };

const SEVERITY: Record<string, { label: string; tone: "ok" | "warn" | "danger" }> = {
  leve: { label: "Leve", tone: "ok" },
  moderado: { label: "Moderado", tone: "warn" },
  grave: { label: "Grave", tone: "danger" },
};

const STATUS: Record<string, string> = {
  abierto: "Abierto",
  en_analisis: "En análisis",
  notificado: "Notificado",
  cerrado: "Cerrado",
};

export default async function IncidentsPage() {
  const { company } = await requireSession();
  const incidents = listIncidents(company.id);
  const open = incidents.filter((incident) => incident.status !== "cerrado");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Expediente · Seguridad"
        title="Incidentes"
        description="Registra cualquier acceso, pérdida o exposición de datos personales. Si hay riesgo para los titulares, la ANPD debe recibir la notificación en 48 horas."
        actions={
          <Link href="/app/incidentes/nuevo" className="btn btn-primary btn-sm">
            Registrar incidente
          </Link>
        }
      />

      {open.length > 0 && (
        <div className="border-l-2 border-ochre bg-ochre/[0.05] px-4 py-3">
          <p className="text-[13px]">
            <span className="font-medium">{open.length} incidente(s) sin cerrar.</span> Revisa el
            contador de 48 horas y documenta las medidas adoptadas.
          </p>
        </div>
      )}

      {incidents.length === 0 ? (
        <EmptyState
          title="Sin incidentes registrados"
          description="Tener el registro vacío también es evidencia. Si detectas un envío masivo mal configurado, un acceso indebido o un robo de equipo, regístralo aquí."
          action={{ href: "/app/incidentes/nuevo", label: "Registrar el primero" }}
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const severity = SEVERITY[incident.severity] ?? SEVERITY.moderado;
            const left = hoursLeft(incident.due_at);
            return (
              <Link
                key={incident.id}
                href={`/app/incidentes/${incident.id}`}
                className="group card block p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={severity.tone}>{severity.label}</StatusPill>
                      <StatusPill tone={incident.status === "cerrado" ? "ok" : incident.status === "notificado" ? "info" : "warn"} dot={false}>
                        {STATUS[incident.status]}
                      </StatusPill>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                        {formatDateTime(incident.detected_at)}
                      </span>
                    </div>
                    <h2 className="mt-2 font-display text-xl leading-tight tracking-[-0.02em] group-hover:text-crimson">
                      {incident.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-soft">{incident.description}</p>
                  </div>

                  <div className="shrink-0 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
                      {incident.status === "cerrado" ? "Cerrado" : "Notificación ANPD"}
                    </p>
                    <p className="mt-1 font-mono text-[11px]">
                      {incident.status === "cerrado" ? (
                        <span className="text-ink-soft">Fuera del contador</span>
                      ) : incident.notified_at ? (
                        <span className="text-sage">Notificado</span>
                      ) : (
                        <Countdown
                          dueAt={incident.due_at}
                          initialLabel={left.expired ? `Vencido hace ${left.hours} h` : `${left.hours} h ${left.minutes} min restantes`}
                        />
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                      {incident.affected_people} personas afectadas
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        {[
          ["1. Detecta y contiene", "Aísla el sistema afectado y evita que el incidente crezca."],
          ["2. Evalúa el riesgo", "Determina qué datos, cuántas personas y qué consecuencias."],
          ["3. Notifica y documenta", "ANPD en 48 horas si corresponde; titulares si hay riesgo."],
        ].map(([title, body]) => (
          <div key={title}>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-crimson">{title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
