import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getRequest } from "@/lib/data";
import { businessDaysBetween } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { ArcoResponseForm } from "@/components/arco-response-form";
import { PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Solicitud ARCO" };

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

export default async function ArcoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { company } = await requireSession();
  const { id } = await params;
  const { ok } = await searchParams;
  const request = getRequest(company.id, id);
  if (!request) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const isOpen = request.status === "nuevo" || request.status === "en_proceso";
  const overdue = isOpen && request.due_at < today;
  const totalBusinessDays = businessDaysBetween(request.received_at, request.due_at);
  const elapsed = businessDaysBetween(request.received_at, today);
  const remaining = Math.max(0, totalBusinessDays - elapsed);
  const progress = Math.min(100, Math.round((elapsed / Math.max(1, totalBusinessDays)) * 100));

  return (
    <div className="space-y-7">
      <nav className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/arco" className="hover:text-ink">
          Solicitudes ARCO
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">{request.ticket}</span>
      </nav>

      {ok && (
        <p className="border-l-2 border-sage bg-sage/[0.07] px-4 py-3 text-[13px]">
          Solicitud actualizada. La respuesta quedó archivada en el expediente.
        </p>
      )}

      <PageHeader
        eyebrow={`${request.ticket} · ${TYPE_LABEL[request.type]}`}
        title={request.requester_name}
        description={`Recibida el ${formatDate(request.received_at)} por el canal ${request.channel}. Vence el ${formatDate(request.due_at)}.`}
        actions={
          <StatusPill
            tone={
              overdue ? "danger" : request.status === "respondido" ? "ok" : request.status === "en_proceso" ? "warn" : "info"
            }
          >
            {overdue ? "Vencida" : STATUS_LABEL[request.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-xl tracking-[-0.02em]">Pedido del titular</h2>
            <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed">
              {request.description || "Sin descripción."}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                ["Documento", request.doc_number || "—"],
                ["Correo", request.email || "—"],
                ["Teléfono", request.phone || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">{label}</dt>
                  <dd className="mt-1 truncate text-[12.5px]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-[-0.02em]">Respuesta</h2>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Se archiva con fecha y hora. El envío al titular es manual en este MVP.
                </p>
              </div>
              {request.responded_at && (
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                  {formatDateTime(request.responded_at)}
                </span>
              )}
            </div>

            <div className="mt-5">
              <ArcoResponseForm
                id={request.id}
                companyName={company.name}
                requesterName={request.requester_name}
                type={request.type}
                response={request.response}
                status={request.status}
              />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={`border p-5 ${overdue ? "border-crimson/50 bg-crimson/[0.04]" : "border-line bg-paper-2"}`}>
            <p className="label-mono">Plazo legal</p>
            <p className={`mt-2 font-display text-3xl leading-none tracking-[-0.03em] ${overdue ? "text-crimson" : ""}`}>
              {request.status === "respondido" ? "Cerrada" : overdue ? "Vencida" : `${remaining} días`}
            </p>
            <p className="mt-1 text-[12px] text-ink-soft">
              {request.status === "respondido"
                ? `Respondida el ${formatDate(request.responded_at)}`
                : overdue
                  ? `El plazo venció el ${formatDate(request.due_at)}`
                  : `Hábiles restantes · vence el ${formatDate(request.due_at)}`}
            </p>

            <div className="mt-4 h-[5px] w-full bg-line">
              <div
                className={`h-full ${overdue ? "bg-crimson" : progress > 75 ? "bg-ochre" : "bg-sage"}`}
                style={{ width: `${request.status === "respondido" ? 100 : progress}%` }}
              />
            </div>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Días hábiles transcurridos</dt>
                <dd className="font-mono">{elapsed}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Plazo total</dt>
                <dd className="font-mono">20</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Canal</dt>
                <dd className="font-mono uppercase">{request.channel}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-paper p-5">
            <p className="label-mono">Qué debe contener la respuesta</p>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                La decisión adoptada: concede, corrige, cancela o deniega.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                La motivación si deniegas total o parcialmente.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                El plazo para impugnar ante la ANPD.
              </li>
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-soft">
              Si no puedes atender en plazo, informa al titular antes del vencimiento y sustenta la
              prórroga.
            </p>
          </section>

          <div className="border border-line bg-paper-2 p-5">
            <p className="label-mono">Referencia</p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              Plazo máximo de 20 días hábiles para atender solicitudes de acceso, rectificación,
              cancelación y oposición (Ley 29733 y su Reglamento).
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
