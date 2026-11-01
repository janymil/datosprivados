import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
import { billingLabel, isCompanyActive, planFromCompany } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { planName } from "@/lib/plans";
import { cancelSubscriptionAction } from "@/app/pago/actions";
import { PageHeader, StatusPill } from "@/components/ui";
import { ChangeEmailForm, ChangePasswordForm } from "@/components/account-forms";
import { resendVerificationAction, setAiConsentAction, setMailOptoutAction } from "@/app/actions/account";
import { aiBlockReason, companyMonthlyUsage, monthlyQuota } from "@/lib/ai-guard";
import { activeProviderName, isLlmConfigured } from "@/lib/llm";
import { getDb } from "@/lib/db";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { company, user } = await requireSession();
  const verified = Boolean(
    (getDb().prepare("SELECT email_verified_at FROM users WHERE id = ?").get(user.id) as { email_verified_at: string | null } | undefined)
      ?.email_verified_at
  );
  const aiProvider = activeProviderName();
  const aiBlock = isLlmConfigured() ? aiBlockReason(company) : null;
  const aiUsed = companyMonthlyUsage(company.id);
  const aiQuota = monthlyQuota(company);
  const { ok, error } = await searchParams;
  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const active = isCompanyActive(company);
  const currentPlan = planFromCompany(company);
  const isDemo = company.billing_status === "demo";
  const subscriptionCancelled = company.subscription_status === "cancelled";
  const canCancel = Boolean(company.subscription_id) && !subscriptionCancelled;

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
          <div className="mt-3.5 text-sm leading-relaxed text-ink-soft">
            {verified ? (
              "Tu correo está confirmado."
            ) : (
              <>
                Tu correo aún no está confirmado.{" "}
                {!isDemo && (
                  <form action={resendVerificationAction} className="inline">
                    <button type="submit" className="link-underline font-medium text-ink">Reenviar el enlace</button>
                  </form>
                )}
              </>
            )}{" "}
            El acceso con varios usuarios llega en una versión posterior.
          </div>
        </section>

        {!isDemo && (
          <>
            <section className="card p-6 md:p-7">
              <p className="label-mono">Contraseña</p>
              <div className="mt-4">
                <ChangePasswordForm />
              </div>
            </section>

            <section className="card p-6 md:p-7">
              <p className="label-mono">Correo de acceso</p>
              <p className="mt-2 text-sm text-ink-soft">Lo confirmas desde el correo nuevo; hasta entonces no cambia.</p>
              <div className="mt-4">
                <ChangeEmailForm />
              </div>
            </section>

            <section className="card p-6 md:p-7">
              <p className="label-mono">Inteligencia artificial</p>
              {ok === "ia" && <p className="mt-3 border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm">Preferencia guardada.</p>}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {aiProvider
                  ? `Las funciones de IA envían texto a ${aiProvider}, un proveedor en el extranjero (Estados Unidos), para generar borradores.`
                  : "Hoy la IA no está conectada: las funciones usan respuestas predefinidas."}{" "}
                Antes de enviarlo, un filtro reemplaza DNI, RUC, correos, teléfonos, direcciones y los nombres que ya
                conocemos por marcadores. <strong>No es infalible:</strong> un nombre escrito a mano en un texto libre
                puede pasar. No pegues datos de personas que no hayan aceptado ese uso. Todo lo que genera la IA es un
                borrador que debe revisar un abogado.
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                {company.ai_consent_at
                  ? `Activada el ${formatDate(company.ai_consent_at)}. Consultas este mes: ${aiUsed} de ${aiQuota}.`
                  : "Está desactivada. Sin tu aceptación no se envía nada al proveedor."}
                {aiBlock && company.ai_consent_at ? ` ${aiBlock.message}` : ""}
              </p>
              <form action={setAiConsentAction} className="mt-4">
                <input type="hidden" name="accept" value={company.ai_consent_at ? "0" : "1"} />
                <button type="submit" className={`btn btn-sm ${company.ai_consent_at ? "btn-ghost" : "btn-primary"}`}>
                  {company.ai_consent_at ? "Desactivar la IA" : "Activar la IA y aceptar el envío anonimizado"}
                </button>
              </form>
            </section>

            <section className="card p-6 md:p-7">
              <p className="label-mono">Avisos por correo</p>
              {ok === "correo" && <p className="mt-3 border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm">Preferencia guardada.</p>}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Siempre te escribimos por seguridad de la cuenta, cobros y plazos legales (solicitudes ARCO e
                incidentes). Los avisos de «documentos desactualizados» se pueden desactivar.
              </p>
              <form action={setMailOptoutAction} className="mt-4">
                <input type="hidden" name="optout" value={company.mail_optout ? "0" : "1"} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  {company.mail_optout ? "Volver a recibir avisos de documentos" : "Dejar de recibir avisos de documentos"}
                </button>
              </form>
            </section>
          </>
        )}

        <section className="border border-ink bg-ink p-6 text-paper md:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-paper/55">
            Exportación
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-[-0.02em]">Lleva tu expediente contigo</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-paper/80">
            Descarga un JSON con tu empresa, bancos de datos, solicitudes ARCO, incidentes y documentos.
            Sirve como respaldo o para entregarlo a tu abogado.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isDemo ? (
              <span className="text-sm text-paper/70">No disponible en la demostración.</span>
            ) : (
              <>
                <a href="/cuenta/exportar" className="btn btn-ghost btn-sm border-paper/40 text-paper hover:bg-paper hover:text-ink">
                  Descargar expediente (.json)
                </a>
                <Link href="/cuenta" className="text-sm text-paper/70 underline hover:text-paper">
                  Eliminar mi cuenta
                </Link>
              </>
            )}
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
