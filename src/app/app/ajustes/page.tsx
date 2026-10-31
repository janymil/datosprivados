import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActivity, listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
import { billingLabel, isCompanyActive, planFromCompany } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { planName } from "@/lib/plans";
import { cancelSubscriptionAction } from "@/app/pago/actions";
import { DownloadButton } from "@/components/download-button";
import { PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { company, user } = await requireSession();
  const { ok, error } = await searchParams;
  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const activity = listActivity(company.id, 50);
  const active = isCompanyActive(company);
  const currentPlan = planFromCompany(company);
  const isDemo = company.billing_status === "demo";
  const subscriptionCancelled = company.subscription_status === "cancelled";
  const canCancel = Boolean(company.subscription_id) && !subscriptionCancelled;

  const exported = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      company,
      banks,
      arco_requests: requests,
      incidents,
      documents,
      activity,
    },
    null,
    2
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="Ajustes"
        description="Plan, cuenta y exportación del expediente."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-mono">Plan actual</p>
              <p className="mt-2 font-display text-[2.2rem] leading-none tracking-[-0.03em]">
                {planName(currentPlan)}
              </p>
              <p className="mt-2.5 text-[15.5px] text-ink-soft">
                {currentPlan === "pro"
                  ? "Incluye todo lo del Plan Básico + automatización con IA en solicitudes ARCO, fichas SIPDP, evaluación de incidentes y revisión de textos de WhatsApp."
                  : "Incluye todas tus listas de datos y solicitudes ARCO sin límite, documentos públicos, ficha SIPDP, relojes de plazos y Asistente Legal con IA para consultas."}
              </p>
              {company.paid_until && (
                <p className="mt-2 text-sm text-ink-soft">
                  {subscriptionCancelled
                    ? `Acceso hasta ${formatDate(company.paid_until)}.`
                    : active
                      ? `Se renueva automáticamente el ${formatDate(company.paid_until)}.`
                      : `Venció el ${formatDate(company.paid_until)}.`}
                </p>
              )}
            </div>
            <StatusPill
              tone={
                !active
                  ? "danger"
                  : subscriptionCancelled || company.subscription_status === "paused"
                    ? "warn"
                    : "ok"
              }
            >
              {billingLabel(company)}
            </StatusPill>
          </div>

          {ok === "cancel" && (
            <p className="mt-5 border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm leading-relaxed">
              Suscripción cancelada. Mantienes el acceso hasta el final del período pagado.
            </p>
          )}
          {error === "cancel" && (
            <p className="mt-5 border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-sm leading-relaxed">
              No pudimos cancelar la suscripción con MercadoPago. Intenta de nuevo o escríbenos.
            </p>
          )}

          {isDemo ? (
            <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
              Esta es una cuenta de demostración. Para activar un plan real,{" "}
              <Link href="/demo/salir?to=registro" className="link-underline font-medium text-ink">
                crea tu cuenta
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
                {active && canCancel && (
                  <form action={cancelSubscriptionAction}>
                    <button type="submit" className="btn btn-ghost btn-sm">
                      Cancelar suscripción
                    </button>
                  </form>
                )}
                {!active && !subscriptionCancelled && (
                  <Link href="/pago" className="btn btn-primary btn-sm">
                    Activar mi plan
                  </Link>
                )}
                {subscriptionCancelled && (
                  <Link
                    href={`/pago?plan=${currentPlan}&change=1`}
                    className="btn btn-primary btn-sm"
                  >
                    Volver a suscribirme
                  </Link>
                )}
                <Link href="/#precios" className="btn btn-ghost btn-sm">
                  Comparar planes
                </Link>
              </div>
              <p className="mt-3.5 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                MercadoPago cobra automáticamente cada mes o año, según tu plan. Puedes cancelar
                desde aquí; el acceso sigue hasta el final del período pagado.
              </p>
            </>
          )}
        </section>

        <section className="card p-6 md:p-7">
          <p className="label-mono">Cuenta</p>
          <dl className="mt-3 divide-y divide-line border-t border-line text-[15.5px]">
            {[
              ["Nombre", user.name],
              ["Correo", user.email],
              ["Rol", "Administrador"],
              ["Empresa", company.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="truncate text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
            Para cambiar el correo o la contraseña, escríbenos. La autenticación con múltiples usuarios
            llega en la siguiente versión.
          </p>
        </section>

        <section className="border border-ink bg-ink p-6 text-paper md:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-paper/55">
            Exportación
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-[-0.02em]">Lleva tu expediente contigo</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-paper/80">
            Descarga un JSON con tu empresa, bancos de datos, solicitudes ARCO, incidentes y documentos.
            Sirve como respaldo o para entregarlo a tu abogado.
          </p>
          <div className="mt-5">
            <DownloadButton
              text={exported}
              filename={`expediente-${company.slug}.json`}
              label="Descargar expediente (.json)"
              className="border-paper/40 text-paper hover:bg-paper hover:text-ink"
            />
          </div>
          <p className="mt-5 border-t border-paper/15 pt-3.5 font-mono text-xs uppercase tracking-[0.08em] text-paper/55">
            {banks.length} bancos · {requests.length} solicitudes · {incidents.length} incidentes ·{" "}
            {documents.length} documentos
          </p>
        </section>
      </div>
    </div>
  );
}
