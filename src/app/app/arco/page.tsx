import Link from "next/link";
import { HelpTip } from "@/components/help-tip";
import { requireSession } from "@/lib/auth";
import { listRequests } from "@/lib/data";
import { formatDate, limaToday } from "@/lib/format";
import { arcoLegalBusinessDays } from "@/lib/db";
import { createManualArcoRequestAction } from "@/app/actions/arco";
import { EmptyState, Field, PageHeader, StatusPill } from "@/components/ui";
import { GuideBox, Term } from "@/components/help";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { appUrl } from "@/lib/documents";
import { HolidayDisclaimer } from "@/components/legal-notes";

export const metadata = { title: "Solicitudes ARCO" };

const TYPE_LABEL: Record<string, string> = {
  acceso: "Acceso",
  rectificacion: "Rectificación",
  cancelacion: "Cancelación",
  oposicion: "Oposición",
};

const CHANNEL_LABEL: Record<string, string> = {
  web: "Formulario web",
  whatsapp: "WhatsApp",
  telefono: "Teléfono",
  correo: "Correo",
  presencial: "En persona",
  carta: "Carta / papel",
};

const STATUS_LABEL: Record<string, string> = {
  nuevo: "Nueva",
  en_proceso: "En proceso",
  respondido: "Respondida",
  vencido: "Vencida",
  rechazado: "Rechazada",
};

const FORM_ERROR: Record<string, string> = {
  campos: "Completa tipo, canal, nombre y descripción.",
  contacto: "Indica al menos un correo o un teléfono para responder.",
  fecha: "La fecha de recepción no es válida.",
  futura: "La fecha de recepción no puede ser futura.",
};

type Filter = "todas" | "abiertas" | "vencidas" | "respondidas";
type Tone = "danger" | "ok" | "warn" | "info";

export default async function ArcoPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; error?: string }>;
}) {
  const { company } = await requireSession();
  const { filtro, error } = await searchParams;
  const filter: Filter = (["todas", "abiertas", "vencidas", "respondidas"] as const).includes(
    filtro as Filter
  )
    ? (filtro as Filter)
    : "todas";
  const formError = error ? FORM_ERROR[error] : undefined;

  const requests = listRequests(company.id);
  const today = limaToday();
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

  const rows = filtered.map((request) => {
    const isOverdue = isOpen(request.status) && request.due_at < today;
    const tone: Tone = isOverdue
      ? "danger"
      : request.status === "respondido"
        ? "ok"
        : request.status === "en_proceso"
          ? "warn"
          : "info";
    return {
      request,
      tone,
      href: `/app/arco/${request.id}`,
      typeLabel: TYPE_LABEL[request.type] ?? request.type,
      legalDays: arcoLegalBusinessDays(request.type),
      channelLabel: CHANNEL_LABEL[request.channel] ?? request.channel,
      statusLabel: isOverdue ? "Vencida" : (STATUS_LABEL[request.status] ?? request.status),
    };
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title={
          <>
            Solicitudes de Derechos <Term k="arco">ARCO</Term>
          </>
        }
        description={
          <>
            Cada pedido llega con su fecha límite en <Term k="dias_habiles">días hábiles</Term>.
          </>
        }
        actions={
          <>
            <Link href={`/solicitud/${company.slug}`} className="btn btn-ghost btn-sm" target="_blank">
              Ver mi formulario público ↗
            </Link>
            <CopyButton
              text={`${appUrl()}/solicitud/${company.slug}`}
              label="Copiar enlace del formulario"
              className="btn btn-primary btn-sm"
            />
          </>
        }
      />

      <HolidayDisclaimer className="max-w-[70ch]" />

      <GuideBox
        title="¿Qué son los Derechos ARCO y cuántos días tengo para responder?"
        what={
          <>
            <Term k="arco">ARCO</Term> significa: <strong>A</strong>cceso (ver qué datos tienes),{" "}
            <strong>R</strong>ectificación (corregir un dato), <strong>C</strong>ancelación (eliminar sus datos) y{" "}
            <strong>O</strong>posición (dejar de usarlos, por ejemplo, para mandar publicidad).
          </>
        }
        why={
          <>
            Según el reglamento <Term k="ds016">DS 016-2024-JUS</Term>, atender estos pedidos es{" "}
            <strong>100 % gratuito para la persona</strong> y tienes plazos estrictos: <strong>10 días hábiles</strong> para Rectificación, Cancelación y Oposición, y <strong>20 días hábiles</strong> para Acceso.
          </>
        }
        how={
          <>
            Comparte tu enlace público (<span className="font-mono text-[11px]">/solicitud/{company.slug}</span>) <HelpTip k="arco_enlace" /> en tu web o WhatsApp. Si un pedido te llega por otro canal, regístralo aquí abajo. Luego ábrelo, usa la <strong>plantilla de respuesta</strong> y márcalo como respondido.
          </>
        }
      />

      {overdue > 0 && (
        <div className="flex flex-col gap-2 border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15.5px] font-semibold">
            Tienes {overdue} {overdue === 1 ? "solicitud vencida" : "solicitudes vencidas"}: respóndelas cuanto antes.
          </p>
          <Link
            href="/app/arco?filtro=vencidas"
            className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson underline"
          >
            Ver vencidas →
          </Link>
        </div>
      )}

      <details id="registrar" open={Boolean(formError)} className="group card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2.5 text-[15.5px] font-medium">
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line-strong font-mono text-sm leading-none text-crimson transition-transform group-open:rotate-45"
            >
              +
            </span>
            Registrar solicitud recibida por otro canal
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.08em] text-ink-soft sm:inline">
            WhatsApp · teléfono · correo · en persona
          </span>
        </summary>

        <form
          action={createManualArcoRequestAction}
          className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2"
        >
          {formError && (
            <p className="border-l-3 border-crimson bg-crimson/[0.06] px-3 py-2 text-sm text-crimson sm:col-span-2">
              {formError}
            </p>
          )}
          <Field label="Derecho solicitado">
            <select name="type" className="input" defaultValue="acceso" required>
              <option value="acceso">Acceso (20 días hábiles)</option>
              <option value="rectificacion">Rectificación (10 días hábiles)</option>
              <option value="cancelacion">Cancelación (10 días hábiles)</option>
              <option value="oposicion">Oposición (10 días hábiles)</option>
            </select>
          </Field>
          <Field label="Canal">
            <select name="channel" className="input" defaultValue="whatsapp" required>
              <option value="whatsapp">WhatsApp</option>
              <option value="telefono">Teléfono</option>
              <option value="correo">Correo</option>
              <option value="presencial">En persona</option>
              <option value="carta">Carta / papel</option>
            </select>
          </Field>
          <Field label="Nombre de la persona">
            <input name="requester_name" className="input" maxLength={200} required />
          </Field>
          <Field label="DNI / documento (opcional)">
            <input name="doc_number" className="input" maxLength={30} />
          </Field>
          <Field label="Correo">
            <input name="email" type="email" className="input" maxLength={200} />
          </Field>
          <Field label="Teléfono / WhatsApp" hint="Indica correo o teléfono (al menos uno).">
            <input name="phone" type="tel" className="input" maxLength={40} />
          </Field>
          <Field label={<>Fecha de recepción <HelpTip k="arco_plazo" className="ml-1" /></>} hint="El plazo se cuenta desde el día hábil siguiente.">
            <input name="received_at" type="date" className="input" defaultValue={today} max={today} required />
          </Field>
          <Field label="¿Qué pide?" className="sm:col-span-2">
            <textarea name="description" rows={3} className="input resize-y" maxLength={5000} required />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton pendingLabel="Registrando…" className="btn btn-primary btn-sm">
              Registrar solicitud
            </SubmitButton>
          </div>
        </form>
      </details>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {(
          [
            ["todas", "Todas", counts.todas],
            ["abiertas", "Pendientes", counts.abiertas],
            ["vencidas", "Fuera de plazo", counts.vencidas],
            ["respondidas", "Respondidas", counts.respondidas],
          ] as Array<[Filter, string, number]>
        ).map(([key, label, value]) => (
          <Link
            key={key}
            href={key === "todas" ? "/app/arco" : `/app/arco?filtro=${key}`}
            className={`border px-4 py-3.5 transition-colors ${
              filter === key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper-2 hover:border-line-strong"
            }`}
          >
            <p
              className={`font-mono text-xs uppercase tracking-[0.08em] ${
                filter === key ? "text-paper/70" : "text-ink-soft"
              }`}
            >
              {label}
            </p>
            <p className="mt-1.5 font-display text-3xl leading-none">{value}</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay solicitudes en este filtro"
          description="Aquí aparecerán los pedidos de tu formulario público y los que registres a mano."
          action={{ href: `/solicitud/${company.slug}`, label: "Ver mi formulario público" }}
        />
      ) : (
        <>
          {/* Móvil: tarjetas compactas */}
          <ul className="space-y-3 md:hidden">
            {rows.map(({ request, href, typeLabel, legalDays, channelLabel, statusLabel, tone }) => (
              <li key={request.id}>
                <Link href={href} className="card block px-4 py-3.5 transition-colors hover:border-line-strong">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-medium text-ink-soft">{request.ticket}</span>
                    <StatusPill tone={tone}>{statusLabel}</StatusPill>
                  </div>
                  <p className="mt-1.5 truncate text-[15.5px] font-medium">{request.requester_name}</p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-sm text-ink-soft">
                    <span className="truncate">
                      {typeLabel} ({legalDays} d) · {channelLabel}
                    </span>
                    <span className={`shrink-0 font-semibold ${tone === "danger" ? "text-crimson" : "text-ink"}`}>
                      {formatDate(request.due_at, "short")} →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Persona</th>
                  <th>Derecho</th>
                  <th>Recibida</th>
                  <th>Fecha límite</th>
                  <th className="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ request, href, typeLabel, legalDays, channelLabel, statusLabel, tone }) => (
                  <tr key={request.id}>
                    <td className="font-mono text-sm font-medium">
                      <Link href={href} className="hover:text-crimson">
                        {request.ticket}
                      </Link>
                    </td>
                    <td>
                      <Link href={href} className="block hover:text-crimson">
                        <span className="block text-[15.5px] font-medium">{request.requester_name}</span>
                        <span className="mt-0.5 block font-mono text-xs uppercase tracking-[0.04em] text-ink-soft">
                          {channelLabel}
                        </span>
                      </Link>
                    </td>
                    <td className="text-[15px]">
                      {typeLabel} <span className="text-sm text-ink-soft">({legalDays} d)</span>
                    </td>
                    <td className="text-sm text-ink-soft">{formatDate(request.received_at, "short")}</td>
                    <td className={`text-sm font-semibold ${tone === "danger" ? "text-crimson" : ""}`}>
                      {formatDate(request.due_at, "short")}
                    </td>
                    <td className="text-right">
                      <StatusPill tone={tone}>{statusLabel}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
