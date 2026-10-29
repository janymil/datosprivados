import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listRequests } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { dueTone } from "@/lib/compliance";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Solicitudes ARCO" };

const TYPE_LABEL: Record<string, string> = {
  acceso: "Acceso",
  rectificacion: "Rectificación",
  cancelacion: "Cancelación",
  oposicion: "Oposición",
};

const STATUS_LABEL: Record<string, string> = {
  nuevo: "Nueva",
  en_proceso: "En proceso",
  respondido: "Respondida",
  vencido: "Vencida",
  rechazado: "Rechazada",
};

type Filter = "todas" | "abiertas" | "vencidas" | "respondidas";

export default async function ArcoPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { company } = await requireSession();
  const { filtro } = await searchParams;
  const filter: Filter = (["todas", "abiertas", "vencidas", "respondidas"] as const).includes(
    filtro as Filter
  )
    ? (filtro as Filter)
    : "todas";

  const requests = listRequests(company.id);
  const today = new Date().toISOString().slice(0, 10);
  const isOpen = (status: string) => status === "nuevo" || status === "en_proceso";

  const counts = {
    todas: requests.length,
    abiertas: requests.filter((r) => isOpen(r.status)).length,
    vencidas: requests.filter((r) => isOpen(r.status) && r.due_at < today).length,
    respondidas: requests.filter((r) => r.status === "respondido").length,
  };

  const filtered = requests.filter((request) => {
    if (filter === "abiertas") return isOpen(request.status);
    if (filter === "vencidas") return isOpen(request.status) && request.due_at < today;
    if (filter === "respondidas") return request.status === "respondido";
    return true;
  });

  const overdue = counts.vencidas;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Expediente · Derechos del titular"
        title="Solicitudes ARCO"
        description="Cada solicitud tiene 20 días hábiles. El reloj empieza el día de recepción y no se detiene por vacaciones ni por falta de información."
        actions={
          <>
            <Link href={`/solicitud/${company.slug}`} className="btn btn-ghost btn-sm" target="_blank">
              Abrir formulario público
            </Link>
            <Link href="/app/documentos?tab=consentimiento" className="btn btn-primary btn-sm">
              Plantillas
            </Link>
          </>
        }
      />

      {overdue > 0 && (
        <div className="flex flex-col gap-2 border-l-2 border-crimson bg-crimson/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px]">
            <span className="font-medium">
              {overdue} {overdue === 1 ? "solicitud vencida" : "solicitudes vencidas"}.
            </span>{" "}
            Responder fuera de plazo puede ser sancionado por la ANPD.
          </p>
          <Link
            href="/app/arco?filtro=vencidas"
            className="font-mono text-[9px] uppercase tracking-[0.1em] text-crimson underline"
          >
            Ver vencidas
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["todas", "Total", counts.todas],
            ["abiertas", "Abiertas", counts.abiertas],
            ["vencidas", "Vencidas", counts.vencidas],
            ["respondidas", "Respondidas", counts.respondidas],
          ] as Array<[Filter, string, number]>
        ).map(([key, label, value]) => (
          <Link
            key={key}
            href={key === "todas" ? "/app/arco" : `/app/arco?filtro=${key}`}
            className={`border px-4 py-3 transition-colors ${
              filter === key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper-2 hover:border-line-strong"
            }`}
          >
            <p
              className={`font-mono text-[9px] uppercase tracking-[0.1em] ${
                filter === key ? "text-paper/60" : "text-ink-soft"
              }`}
            >
              {label}
            </p>
            <p className="mt-1 font-display text-2xl leading-none">{value}</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay solicitudes en este filtro"
          description="Cuando un titular ejerza sus derechos desde tu formulario público, aparecerá aquí con su plazo calculado."
          action={{ href: `/solicitud/${company.slug}`, label: "Ver formulario público" }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[760px]">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Tipo</th>
                <th>Solicitante</th>
                <th>Recibida</th>
                <th>Vence</th>
                <th>Estado</th>
                <th className="text-right">Plazo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => {
                const isOverdue = isOpen(request.status) && request.due_at < today;
                const tone = dueTone(request.due_at, request.status);
                const statusLabel = isOverdue ? "Vencida" : STATUS_LABEL[request.status];
                return (
                  <tr key={request.id} className="cursor-pointer">
                    <td className="font-mono text-[11px]">
                      <Link href={`/app/arco/${request.id}`} className="hover:text-crimson">
                        {request.ticket}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/app/arco/${request.id}`}>{TYPE_LABEL[request.type]}</Link>
                    </td>
                    <td>
                      <Link href={`/app/arco/${request.id}`} className="block">
                        <span className="block text-[13px]">{request.requester_name}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.06em] text-ink-soft">
                          {request.channel} · {request.doc_number || "sin documento"}
                        </span>
                      </Link>
                    </td>
                    <td className="text-[12px] text-ink-soft">{formatDate(request.received_at, "short")}</td>
                    <td className="text-[12px]">{formatDate(request.due_at, "short")}</td>
                    <td>
                      <StatusPill
                        tone={
                          isOverdue
                            ? "danger"
                            : request.status === "respondido"
                              ? "ok"
                              : request.status === "en_proceso"
                                ? "warn"
                                : "info"
                        }
                      >
                        {statusLabel}
                      </StatusPill>
                    </td>
                    <td className="text-right font-mono text-[10px] uppercase tracking-[0.06em]">
                      {request.status === "respondido" ? (
                        <span className="text-ink-soft">Cerrada</span>
                      ) : (
                        <span
                          className={
                            tone === "danger" ? "text-crimson" : tone === "warn" ? "text-ochre" : "text-ink-soft"
                          }
                        >
                          {isOverdue ? "Fuera de plazo" : "En curso"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="max-w-[80ch] text-[12px] leading-relaxed text-ink-soft">
        El plazo de 20 días hábiles se calcula automáticamente omitiendo fines de semana y feriados
        nacionales del Perú. Los feriados regionales y suspensiones de último momento deben revisarse
        manualmente.
      </p>
    </div>
  );
}
