import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActivity, listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
import { computeCompliance, dueTone } from "@/lib/compliance";
import { formatDate, formatDateTime } from "@/lib/format";
import { CheckIcon, ClockIcon, ArrowRightIcon } from "@/components/icons";
import { ComplianceRing, PageHeader, StatCard, StatusPill } from "@/components/ui";

export const metadata = { title: "Panel" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { company, user } = await requireSession();
  const { bienvenida } = await searchParams;

  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const activity = listActivity(company.id, 5);

  const compliance = computeCompliance({ company, banks, requests, incidents, documents });
  const openRequests = requests
    .filter((r) => r.status === "nuevo" || r.status === "en_proceso")
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const pendingItems = compliance.items.filter((item) => !item.ok);
  const firstName = user.name.split(" ")[0];

  const today = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-8">
      {bienvenida && (
        <div className="flex flex-col gap-2 border-l-2 border-sage bg-sage/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px]">
            <span className="font-medium">Tu cuenta está lista.</span> Empieza declarando tus bancos de
            datos; con eso generamos tu política.
          </p>
          <Link href="/app/bancos/nuevo" className="btn btn-sm btn-primary w-fit">
            Crear primer banco
          </Link>
        </div>
      )}

      <PageHeader
        eyebrow={`Panel · ${today}`}
        title={`Hola, ${firstName}.`}
        description={`Este es el expediente de ${company.name}. Revisa los vencimientos antes de que se conviertan en un problema.`}
        actions={
          <>
            <Link href={`/solicitud/${company.slug}`} className="btn btn-ghost btn-sm">
              Formulario ARCO
            </Link>
            <Link href="/app/bancos/nuevo" className="btn btn-primary btn-sm">
              Nuevo banco
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
        <StatCard
          label="Cumplimiento"
          value={`${compliance.score}%`}
          hint={
            compliance.pending === 0
              ? compliance.label
              : `${compliance.pending} pendiente${compliance.pending === 1 ? "" : "s"}`
          }
          tone={compliance.level === "en_riesgo" ? "danger" : undefined}
          href="/app"
        />
        <StatCard
          label="Bancos registrados"
          value={`${banks.filter((b) => b.status === "registrado").length}/${banks.length}`}
          hint={banks.length ? "Frente al SIPDP" : "Aún sin declarar"}
          href="/app/bancos"
        />
        <StatCard
          label="ARCO abiertas"
          value={openRequests.length}
          hint={openRequests.length ? "Con plazo en curso" : "Bandeja al día"}
          tone={openRequests.length > 0 ? "warn" : undefined}
          href="/app/arco"
        />
        <StatCard
          label="Incidentes abiertos"
          value={incidents.filter((i) => i.status !== "cerrado").length}
          hint="Últimos 12 meses"
          href="/app/incidentes"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono">Estado del expediente</p>
              <h2 className="mt-1.5 font-display text-2xl tracking-[-0.02em]">
                {compliance.pending === 0
                  ? "Todo en orden."
                  : compliance.level === "en_riesgo"
                    ? "Hay frentes abiertos."
                    : "Casi todo en orden."}
              </h2>
            </div>
            <StatusPill
              tone={
                compliance.pending === 0
                  ? "ok"
                  : compliance.level === "en_riesgo"
                    ? "danger"
                    : "warn"
              }
            >
              {compliance.pending === 0
                ? compliance.label
                : `${compliance.pending} pendiente${compliance.pending === 1 ? "" : "s"}`}
            </StatusPill>
          </div>

          <div className="mt-6 flex flex-col items-start gap-7 sm:flex-row sm:items-center">
            <ComplianceRing score={compliance.score} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                {compliance.pending === 0
                  ? "No tienes pendientes críticos. Revisa el expediente una vez al mes."
                  : `Te ${compliance.pending === 1 ? "queda" : "quedan"} ${compliance.pending} ${compliance.pending === 1 ? "frente" : "frentes"} por cerrar. Cada uno suma al puntaje y te deja evidencia.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/app/documentos" className="btn btn-ghost btn-sm">
                  Documentos
                </Link>
                <Link href="/app/empresa" className="btn btn-ghost btn-sm">
                  Datos de empresa
                </Link>
              </div>
            </div>
          </div>

          <ul className="mt-6 divide-y divide-line border-t border-line">
            {compliance.items.map((item) => (
              <li key={item.label} className="flex items-start gap-3 py-[11px]">
                <span
                  className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center border ${
                    item.ok ? "border-sage bg-sage text-paper" : "border-line-strong text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] ${item.ok ? "text-ink-soft" : "font-medium text-ink"}`}>
                    {item.label}
                  </p>
                  {!item.ok && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{item.detail}</p>}
                </div>
                {!item.ok && item.href && (
                  <Link
                    href={item.href}
                    className="mt-[1px] shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-crimson hover:underline"
                  >
                    {item.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl tracking-[-0.02em]">Próximos vencimientos</h2>
              <Link href="/app/arco" className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft hover:text-crimson">
                Ver todo
              </Link>
            </div>

            {openRequests.length === 0 ? (
              <div className="mt-5 border border-dashed border-line-strong px-4 py-6 text-center">
                <p className="text-[13px] text-ink-soft">No hay solicitudes abiertas.</p>
                <Link href={`/solicitud/${company.slug}`} className="mt-2 inline-block font-mono text-[9px] uppercase tracking-[0.1em] text-crimson hover:underline">
                  Abrir formulario público
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {openRequests.slice(0, 4).map((request) => {
                  const tone = dueTone(request.due_at, request.status);
                  return (
                    <li key={request.id}>
                      <Link href={`/app/arco/${request.id}`} className="group flex items-center gap-3 py-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-paper font-mono text-[10px]">
                          {request.type.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium group-hover:text-crimson">
                            {request.requester_name}
                          </p>
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-soft">
                            {request.ticket} · {formatDate(request.due_at, "short")}
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

            <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-ink-soft">
              <ClockIcon className="h-3.5 w-3.5" />
              El plazo legal es de 20 días hábiles desde la recepción.
            </p>
          </section>

          <section className="border border-line bg-paper-2 p-6">
            <h2 className="font-display text-xl tracking-[-0.02em]">Acciones rápidas</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { href: "/app/bancos/nuevo", label: "Declarar banco" },
                { href: "/app/arco", label: "Revisar ARCO" },
                { href: "/app/incidentes/nuevo", label: "Registrar incidente" },
                { href: "/app/documentos", label: "Generar política" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center justify-between gap-2 border border-line bg-paper px-3 py-3 text-[12px] transition-colors hover:border-ink"
                >
                  {action.label}
                  <ArrowRightIcon className="h-3.5 w-3.5 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-crimson" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="card p-6">
          <h2 className="font-display text-xl tracking-[-0.02em]">Actividad reciente</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-soft">Aún no hay movimientos registrados.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full border border-crimson bg-crimson/20" />
                  <div>
                    <p className="text-[12.5px] leading-snug">{item.message}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col justify-between gap-5 border border-ink bg-ink p-6 text-paper">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/40">
              Siguiente paso sugerido
            </p>
            <h2 className="mt-3 max-w-[24ch] font-display text-[1.7rem] leading-[1.08] tracking-[-0.02em]">
              {pendingItems[0]?.nextStep ?? "Mantén el expediente actualizado"}
            </h2>
            <p className="mt-2 max-w-[40ch] text-[13px] leading-relaxed text-paper/65">
              {pendingItems[0]?.detail ??
                "Revisa tus documentos cada vez que cambie un proceso, un proveedor o una finalidad."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={pendingItems[0]?.href ?? "/app/documentos"}
              className="btn btn-sm bg-paper-2 text-ink hover:bg-crimson hover:text-paper"
            >
              {pendingItems[0]?.cta ?? "Revisar documentos"}
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-paper/40">
              Ley 29733 · ANPD
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
