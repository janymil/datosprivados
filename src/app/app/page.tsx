import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { listActivity, listBanks, listDocuments, listIncidents, listRequests, listProviders, listEvidence } from "@/lib/data";
import { computeCompliance, dueTone } from "@/lib/compliance";
import { appUrl } from "@/lib/documents";
import { formatDate, formatDateTime } from "@/lib/format";
import { ComplianceRing, PageHeader, StatusPill } from "@/components/ui";
import { Term } from "@/components/help";
import { PlanSteps } from "@/components/plan-steps";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Panel" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { company, user } = await requireSession();
  if (!company.onboarded_at) redirect("/bienvenida");
  const { bienvenida } = await searchParams;

  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const activity = listActivity(company.id, 5);

  const compliance = computeCompliance({
    company,
    banks,
    requests,
    incidents,
    documents,
    providers: listProviders(company.id),
    evidence: listEvidence(company.id),
  });
  const openRequests = requests
    .filter((r) => r.status === "nuevo" || r.status === "en_proceso")
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const done = compliance.items.length - compliance.pending;
  const policyPublished = Boolean(documents.find((d) => d.kind === "politica")?.published);
  const firstName = user.name.split(" ")[0];

  const links = [
    {
      label: "Formulario ARCO",
      hint: "Para que tus clientes pidan ver, corregir o borrar sus datos. Ya está activo.",
      url: `${appUrl()}/solicitud/${company.slug}`,
      href: `/solicitud/${company.slug}`,
      active: true,
    },
    {
      label: "Política de Privacidad",
      hint: policyPublished
        ? "Ponla en tu web, bio de Instagram o perfil de WhatsApp Business."
        : "Se activa cuando publiques tu política.",
      url: `${appUrl()}/p/${company.slug}`,
      href: `/p/${company.slug}`,
      active: policyPublished,
    },
  ];

  return (
    <div className="space-y-7">
      {bienvenida && (
        <div className="border-l-3 border-sage bg-sage/[0.08] px-5 py-4 text-base leading-relaxed">
          <span className="font-semibold">¡Listo, tu plan está armado!</span> Creamos tus bancos de datos en borrador y
          un primer borrador de tu Política de Privacidad. Sigue los pasos de abajo en orden; puedes hacerlos en varios
          días.
        </div>
      )}

      <PageHeader
        title={`Hola, ${firstName}.`}
        description={
          <>
            Este es tu plan para cumplir la <Term k="ley29733">Ley 29733</Term> en <strong>{company.name}</strong>. Haz
            un paso a la vez: siempre te mostramos el siguiente.
          </>
        }
      />

      {compliance.alerts.length > 0 && (
        <section className="space-y-2.5" aria-label="Alertas">
          {compliance.alerts.map((alert) => (
            <div
              key={alert.message}
              className={`flex flex-col gap-3 border-l-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                alert.tone === "danger" ? "border-crimson bg-crimson/[0.06]" : "border-ochre bg-ochre/[0.08]"
              }`}
            >
              <p className="text-[15.5px] font-medium">{alert.message}</p>
              <Link href={alert.href} className="btn btn-sm btn-primary w-fit shrink-0">
                {alert.cta}
              </Link>
            </div>
          ))}
        </section>
      )}

      <section className="card p-6 md:p-7">
        <div className="grid gap-7 md:grid-cols-[auto_1fr]">
          <div className="flex flex-row items-center gap-5 md:flex-col md:items-start">
            <ComplianceRing score={compliance.score} size={128} />
            <div>
              <StatusPill
                tone={compliance.level === "al_dia" ? "ok" : compliance.level === "en_riesgo" ? "danger" : "warn"}
              >
                {compliance.label}
              </StatusPill>
              <p className="mt-2 max-w-[24ch] text-sm leading-snug text-ink-soft">
                {done} de {compliance.items.length} pasos completados
              </p>
              {compliance.penalty > 0 && (
                <p className="mt-1.5 max-w-[24ch] text-sm leading-snug text-crimson">
                  {compliance.setupScore} puntos por tus pasos − {compliance.penalty} por plazos vencidos (ver
                  alerta arriba).
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-2xl tracking-[-0.02em]">
              {compliance.pending === 0 ? "Tu negocio está al día." : "Tu plan de cumplimiento"}
            </h2>
            <p className="mb-4 mt-1 text-[15px] text-ink-soft">
              {compliance.pending === 0
                ? "Solo vuelve cuando recibas una solicitud ARCO, ocurra un incidente o cambies cómo usas los datos."
                : "Ordenado según lo que más te protege ante una fiscalización de la ANPD."}
            </p>
            <PlanSteps items={compliance.items} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl tracking-[-0.02em]">
              Solicitudes <Term k="arco">ARCO</Term>
            </h2>
            <Link href="/app/arco" className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft hover:text-crimson">
              Ver todas →
            </Link>
          </div>

          {openRequests.length === 0 ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              No tienes pedidos pendientes. Cuando un cliente use tu formulario, aparecerá aquí con su plazo legal (10 días
              hábiles; 20 si pide acceso a sus datos).
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {openRequests.slice(0, 4).map((request) => {
                const tone = dueTone(request.due_at, request.status);
                return (
                  <li key={request.id}>
                    <Link href={`/app/arco/${request.id}`} className="group flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium group-hover:text-crimson">{request.requester_name}</p>
                        <p className="font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                          {request.ticket} · vence {formatDate(request.due_at, "short")}
                        </p>
                      </div>
                      <StatusPill tone={tone === "danger" ? "danger" : tone === "warn" ? "warn" : "ok"} dot={false}>
                        {tone === "danger" ? "Urgente" : tone === "warn" ? "Pronto" : "En plazo"}
                      </StatusPill>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-6 md:p-7">
          <h2 className="font-display text-xl tracking-[-0.02em]">Tus enlaces públicos</h2>
          <ul className="mt-3 divide-y divide-line">
            {links.map((link) => (
              <li key={link.label} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">{link.label}</p>
                  <p className="text-sm leading-snug text-ink-soft">{link.hint}</p>
                  {link.active && (
                    <p className="mt-1 break-all font-mono text-xs text-ink">{link.url.replace(/^https?:\/\//, "")}</p>
                  )}
                </div>
                {link.active ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyButton text={link.url} label="Copiar" />
                    <Link href={link.href} target="_blank" className="btn btn-ghost btn-sm" aria-label={`Abrir ${link.label}`}>
                      ↗
                    </Link>
                  </div>
                ) : (
                  <Link href="/app/documentos?tab=politica" className="btn btn-ghost btn-sm shrink-0">
                    Publicar
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-6 md:p-7">
        <h2 className="font-display text-xl tracking-[-0.02em]">Historial de evidencia</h2>
        <p className="mt-1 text-[15px] text-ink-soft">
          Cada acción queda registrada con fecha y hora: te sirve para demostrar cumplimiento ante la{" "}
          <Term k="anpd">ANPD</Term>.
        </p>
        {activity.length === 0 ? (
          <p className="mt-4 text-base text-ink-soft">Aún no hay movimientos registrados.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="shrink-0 font-mono text-xs uppercase tracking-[0.06em] text-ink-soft sm:w-44">
                  {formatDateTime(item.created_at)}
                </span>
                <span className="text-[15px] leading-snug">{item.message}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
