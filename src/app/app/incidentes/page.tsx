import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listIncidents } from "@/lib/data";
import { formatDateTime, hoursLeft } from "@/lib/format";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { GuideBox, Term } from "@/components/help";

export const metadata = { title: "Incidentes" };

const SEVERITY: Record<string, { label: string; tone: "ok" | "warn" | "danger" }> = {
  leve: { label: "Leve", tone: "ok" },
  moderado: { label: "Moderado", tone: "warn" },
  grave: { label: "Grave", tone: "danger" },
};

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" }> = {
  abierto: { label: "Abierto", tone: "danger" },
  en_analisis: { label: "En análisis", tone: "warn" },
  notificado: { label: "Notificado a ANPD", tone: "info" },
  cerrado: { label: "Cerrado", tone: "ok" },
};

export default async function IncidentsPage() {
  const { company } = await requireSession();
  const incidents = listIncidents(company.id);

  return (
    <div className="space-y-7">
      <PageHeader
        title={
          <>
            Registro de <Term k="incidente">Incidentes de seguridad</Term>
          </>
        }
        description={
          <>
            ¿Laptop robada, correo hackeado o un Excel enviado por error? Regístralo y mira cuánto
            queda del plazo de <strong>48 horas</strong> para avisar a la <Term k="anpd">ANPD</Term>.
          </>
        }
        actions={
          <Link href="/app/incidentes/nuevo" className="btn btn-primary btn-sm">
            + Reportar un incidente
          </Link>
        }
      />

      <GuideBox
        title="¿Qué se considera un incidente y cuándo es obligatorio avisar a la ANPD?"
        what={
          <>
            Un <Term k="incidente">incidente de seguridad</Term> es cualquier pérdida, robo, hackeo o error humano donde datos personales de clientes o trabajadores quedan expuestos (ej. mandar un correo masivo sin copia oculta «CCO»).
          </>
        }
        why={
          <>
            El <Term k="ds016">DS 016-2024-JUS</Term> (art. 34) obliga a avisar a la ANPD en <strong>máximo 48 horas</strong> si el incidente expone muchos datos, puede afectar a muchas personas, involucra datos sensibles o causa un daño evidente, aunque ya lo hayas solucionado. Todos los incidentes deben quedar registrados (art. 35).
          </>
        }
        how={
          <>
            Si ocurre algo, haz clic en «Reportar un incidente». El sistema activa el <strong>reloj de 48 horas</strong>, guarda qué medidas tomaste y te genera el borrador oficial listo para enviar a la ANPD.
          </>
        }
      />


      {incidents.length === 0 ? (
        <EmptyState
          title="Sin incidentes registrados"
          description="Si ocurre una pérdida, acceso indebido o envío erróneo de datos, regístralo aquí de inmediato."
          action={{ href: "/app/incidentes/nuevo", label: "Registrar un incidente" }}
        />
      ) : (
        <div className="space-y-3.5">
          {incidents.map((incident) => {
            const severity = SEVERITY[incident.severity] ?? SEVERITY.moderado;
            const status = STATUS[incident.status] ?? STATUS.abierto;
            const left = hoursLeft(incident.due_at);
            return (
              <Link
                key={incident.id}
                href={`/app/incidentes/${incident.id}`}
                className="group card block p-6 transition-colors hover:border-line-strong"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      <StatusPill tone={severity.tone} dot={false}>
                        {severity.label}
                      </StatusPill>
                      <span className="font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                        {formatDateTime(incident.detected_at)}
                      </span>
                    </div>
                    <h2 className="mt-2.5 font-display text-2xl leading-tight tracking-[-0.02em] group-hover:text-crimson">
                      {incident.title}
                    </h2>
                    {incident.description && (
                      <p className="mt-1.5 line-clamp-1 text-[15.5px] text-ink-soft">{incident.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-line pt-3.5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                      {incident.status === "cerrado" ? "Estado del caso" : "Plazo 48 h ANPD"}
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {incident.status === "cerrado" ? (
                        <span className="text-ink-soft">Caso cerrado y archivado</span>
                      ) : incident.notified_at ? (
                        new Date(incident.notified_at) <= new Date(incident.due_at) ? (
                          <span className="text-sage">Notificado a tiempo</span>
                        ) : (
                          <span className="text-crimson">Notificado fuera de plazo</span>
                        )
                      ) : (
                        <Countdown
                          dueAt={incident.due_at}
                          initialLabel={left.expired ? `Plazo vencido hace ${left.hours} h` : `${left.hours} h ${left.minutes} min restantes`}
                        />
                      )}
                    </p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                      {incident.affected_people
                        ? `${incident.affected_people} ${incident.affected_people === 1 ? "persona afectada" : "personas afectadas"}`
                        : "Afectados por determinar"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
