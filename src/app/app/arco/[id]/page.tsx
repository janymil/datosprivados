import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getRequest } from "@/lib/data";
import { arcoLegalBusinessDays, businessDaysBetween } from "@/lib/db";
import { formatDate, formatDateTime, limaToday } from "@/lib/format";
import { ArcoResponseForm } from "@/components/arco-response-form";
import { ARCO_DENIAL, sectorArcoNotes, sectorLegalProfile } from "@/lib/sector-legal";
import { PageHeader, StatusPill } from "@/components/ui";
import { Term } from "@/components/help";

export const metadata = { title: "Solicitud ARCO" };

const TYPE_LABEL: Record<string, string> = {
  acceso: "Acceso (saber qué datos tienes)",
  rectificacion: "Rectificación (corregir datos)",
  cancelacion: "Cancelación (eliminar datos)",
  oposicion: "Oposición (no usar para cierto fin)",
};

const CHANNEL_LABEL: Record<string, string> = {
  web: "formulario web",
  whatsapp: "WhatsApp",
  telefono: "teléfono",
  correo: "correo",
  presencial: "en persona",
  carta: "carta / papel",
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

  const today = limaToday();
  const isOpen = request.status === "nuevo" || request.status === "en_proceso";
  const overdue = isOpen && request.due_at < today;
  const legalDays = arcoLegalBusinessDays(request.type);
  const totalBusinessDays = businessDaysBetween(request.received_at, request.due_at) || legalDays;
  const elapsed = businessDaysBetween(request.received_at, today);
  const remaining = Math.max(0, totalBusinessDays - elapsed);
  const progress = Math.min(100, Math.round((elapsed / Math.max(1, totalBusinessDays)) * 100));

  return (
    <div className="space-y-7">
      <nav className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/arco" className="hover:text-ink">
          Solicitudes ARCO
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">{request.ticket}</span>
      </nav>

      {ok && (
        <p className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-base">
          Solicitud actualizada. Tu respuesta quedó guardada con fecha y hora como evidencia ante la <Term k="anpd">ANPD</Term>.
        </p>
      )}

      <PageHeader
        eyebrow={`${request.ticket} · Derecho de ${TYPE_LABEL[request.type] ?? request.type}`}
        title={request.requester_name}
        description={
          <>
            Recibida el {formatDate(request.received_at)} por{" "}
            <strong>{CHANNEL_LABEL[request.channel] ?? request.channel}</strong>.
          </>
        }
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
          <section className="card p-6 md:p-7">
            <h2 className="font-display text-2xl tracking-[-0.02em]">
              Lo que solicita el <Term k="titular">titular del dato</Term>
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed">
              {request.description || "Sin descripción."}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                ["DNI / Documento", request.doc_number || "—"],
                ["Correo de respuesta", request.email || "—"],
                ["Teléfono / WhatsApp", request.phone || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
                  <dd className="mt-1 truncate text-[15.5px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl tracking-[-0.02em]">Redacta y archiva tu respuesta</h2>
                <p className="mt-1.5 text-[15px] text-ink-soft">
                  Completa los campos entre [corchetes], envíala a la persona y márcala como respondida.
                </p>
              </div>
              {request.responded_at && (
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                  Respondida: {formatDateTime(request.responded_at)}
                </span>
              )}
            </div>

            <div className="mt-5">
              <ArcoResponseForm
                id={request.id}
                companyName={company.name}
                companyPlan={company.plan}
                requesterName={request.requester_name}
                type={request.type}
                response={request.response}
                status={request.status}
                sectorTitle={sectorLegalProfile(company).title}
                notes={sectorArcoNotes(sectorLegalProfile(company).family)}
                denial={ARCO_DENIAL}
              />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={`border p-6 ${overdue ? "border-crimson/50 bg-crimson/[0.04]" : "border-line bg-paper-2"}`}>
            <p className="label-mono">Reloj de plazo legal (<Term k="ds016">DS 016-2024-JUS</Term>)</p>
            <p className={`mt-2 font-display text-3xl leading-none tracking-[-0.03em] ${overdue ? "text-crimson" : ""}`}>
              {request.status === "respondido" ? "Atendida" : overdue ? "Vencida" : `${remaining} días`}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {request.status === "respondido"
                ? `Cerrada el ${formatDate(request.responded_at)}`
                : overdue
                  ? `El plazo máximo venció el ${formatDate(request.due_at)}`
                  : `Días hábiles restantes · vence el ${formatDate(request.due_at)}`}
            </p>

            <div className="mt-4 h-[6px] w-full bg-line">
              <div
                className={`h-full ${overdue ? "bg-crimson" : progress > 75 ? "bg-ochre" : "bg-sage"}`}
                style={{ width: `${request.status === "respondido" ? 100 : progress}%` }}
              />
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Días hábiles transcurridos</dt>
                <dd className="font-mono font-medium">{elapsed}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Plazo legal para este derecho</dt>
                <dd className="font-mono font-medium">{legalDays} días hábiles</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Costo para el solicitante</dt>
                <dd className="font-mono font-medium text-sage">S/ 0 (Gratuito por ley)</dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-paper p-6">
            <p className="label-mono">Si no respondes a tiempo</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Atender tarde o no atender es una infracción que la ANPD sanciona con multa:
            </p>
            <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-ink-soft">Responder tarde (leve)</dt>
                <dd className="font-mono font-medium text-crimson">desde S/ 2,750</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-ink-soft">No responder (grave)</dt>
                <dd className="font-mono font-medium text-crimson">más de 5 UIT</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              0,5 UIT ≈ S/ 2,750, con la UIT referencial de S/ 5,500. El DS 016-2024-JUS (arts. 132.7 y
              133.1) califica la demora como infracción leve y el silencio como grave.
            </p>
          </section>

          {(request.type === "cancelacion" || request.type === "oposicion") && (
            <section className="border border-line bg-paper p-6">
              <p className="label-mono">¿Y si el dato está en una boleta o factura?</p>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                Sácalo de tus listas de marketing y WhatsApp, pero <strong>no borres boletas, facturas ni contratos</strong>: la SUNAT exige guardarlos 5 años. Esos datos quedan bloqueados y solo se conservan por <Term k="base_legal">obligación legal</Term>.
              </p>
            </section>
          )}

          <section className="border border-line bg-paper-2 p-6">
            <p className="label-mono">Checklist de respuesta válida</p>
            <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                Di claramente qué hiciste (ej. «eliminamos tu número de nuestra lista de promociones»).
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                ¿Necesitas más tiempo? Puedes ampliarlo una sola vez por un plazo igual, avisando a la persona antes de que venza.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                Menciona que puede reclamar ante la ANPD o acudir al hábeas data si no está conforme.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
