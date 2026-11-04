import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import {
  billingLabel,
  canBypassPayment,
  canRenewNow,
  checkoutCharge,
  isCompanyActive,
  planFromCompany,
} from "@/lib/billing";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { PLANS, PLAN_IDS, isPlanId, planName, renewalPrice } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { getPendingTransfer, isTransferConfigured, transferBankDetails } from "@/lib/transfers";
import { formatSol } from "@/lib/invoicing";
import { startSubscriptionAction, activateDevAction, requestTransferAction } from "./actions";

export const metadata = { title: "Suscripción" };

const PLAN_BULLETS = {
  basico: [
    "Todas tus listas de datos y solicitudes ARCO, sin límite",
    "Política de privacidad con enlace público + textos de WhatsApp",
    "Ficha SIPDP y reloj de 10/20 días hábiles",
    "Incidentes con reloj de 48 horas",
  ],
  pro: [
    "Todo lo del Plan Básico",
    "Redactor IA de respuestas ARCO a medida",
    "Autocompletado IA de fichas SIPDP",
    "Evaluador IA de incidentes + comunicado a afectados",
  ],
};

export default async function PagoPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string; change?: string; transfer?: string; detail?: string }>;
}) {
  const { company } = await requireSession();
  const params = await searchParams;
  const active = isCompanyActive(company);
  const change = params.change === "1";

  // Una cuenta activa vuelve aquí para cambiar de plan o, a menos de 60 días del vencimiento, para renovar.
  const renewing = active && !change && canRenewNow(company);
  if (active && !change && !renewing) {
    redirect(company.onboarded_at ? "/app" : "/bienvenida");
  }

  const requested = params.plan;
  const plan = requested && isPlanId(requested) ? requested : planFromCompany(company);
  const configured = isMercadoPagoConfigured();
  const devBypass = canBypassPayment();
  const error = params.error;
  const transferAvailable = isTransferConfigured();
  const pendingTransfer = params.transfer ? getPendingTransfer(company.id) : undefined;

  return (
    <div>
      <p className="label-mono">Suscripción</p>
      <h1 className="mt-3 max-w-[20ch] font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">
        {renewing ? "Renueva tu plan." : active ? "Cambia tu plan." : "Activa tu plan."}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-soft">
        {renewing
          ? "Renovar antes de que venza suma 12 meses a tu plazo actual: no pierdes ningún día."
          : active
            ? "Tu plan actual sigue activo hasta que se confirme el pago del nuevo. El cambio se cobra como una renovación anual y suma 12 meses."
            : "Tu cuenta ya está creada. Para entrar al panel y empezar tu expediente, paga tu primer año: incluye la implementación (documentos y fichas) y 12 meses de acceso."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-sm text-ink-soft">
        <span>
          Plan actual: <strong className="text-ink">{planName(planFromCompany(company))}</strong>
        </span>
        <span>
          Facturación: <strong className="text-ink">Anual</strong>
        </span>
        <span>
          Estado: <strong className="text-ink">{billingLabel(company)}</strong>
        </span>
        {company.paid_until && (
          <span>
            {active ? "Activo hasta" : "Venció el"}:{" "}
            <strong className="text-ink">{formatDate(company.paid_until)}</strong>
          </span>
        )}
      </div>

      {error && (
        <p className="mt-5 border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-[15px] leading-relaxed">
          {error === "config"
            ? "MercadoPago no está configurado en este entorno. En producción se activa con las credenciales del servidor."
            : error === "cancel"
              ? "No pudimos cancelar la suscripción anterior. No creamos una nueva para evitar un doble cobro."
              : error === "transfer"
                ? (params.detail ?? "No pudimos registrar la transferencia.")
              : error === "mp"
                ? "No pudimos abrir la suscripción de MercadoPago. Intenta de nuevo en un momento."
                : error === "dev"
                  ? "La activación de desarrollo no está disponible en este entorno."
                  : "No pudimos procesar la suscripción. Intenta de nuevo."}
        </p>
      )}

      {pendingTransfer && (
        <div className="mt-5 border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[15px] leading-relaxed">
          <p>
            <strong>Pago por transferencia pendiente:</strong> {formatSol(pendingTransfer.amount)} (IGV incluido), referencia{" "}
            <strong>{pendingTransfer.external_reference}</strong>.
          </p>
          <p className="mt-1 whitespace-pre-line">{transferBankDetails()}</p>
          <p className="mt-1">
            También te lo enviamos por correo. Te mandaremos la factura electrónica y activaremos tu plan cuando recibamos el pago.
          </p>
        </div>
      )}

      <form action={startSubscriptionAction} className="mt-8">
        <input type="hidden" name="change" value={change ? "1" : ""} />

        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const item = PLANS[id];
            const selected = plan === id;
            const charge = checkoutCharge(company.id, id);
            return (
              <label
                key={id}
                className="group cursor-pointer border border-line bg-paper p-6 transition-colors hover:border-line-strong has-[:checked]:border-ink has-[:checked]:bg-paper-2"
              >
                <input
                  type="radio"
                  name="plan"
                  value={id}
                  defaultChecked={selected}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl tracking-[-0.02em]">{item.name}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                    {item.tagline}
                  </span>
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-ink-soft">{item.audience}</span>
                <span className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl tracking-[-0.04em]">S/ {charge.amount}</span>
                  <span className="text-sm text-ink-soft">
                    {charge.intro ? "primer año · IGV incluido" : "renovación anual · IGV incluido"}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-xs uppercase tracking-[0.08em] text-sage">
                  {charge.intro
                    ? `Incluye la implementación · luego S/ ${renewalPrice(id)} al año`
                    : "Suma 12 meses a tu plazo"}
                </span>
                <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm leading-relaxed">
                  {PLAN_BULLETS[id].map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </label>
            );
          })}
        </div>

        <div className="mt-6 border border-line bg-paper-2 p-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            {PLAN_IDS.every((id) => !checkoutCharge(company.id, id).intro)
              ? "La renovación se cobra cada año con MercadoPago hasta que la canceles desde Ajustes; el acceso sigue activo hasta el final del período pagado."
              : "Pagas el primer año una sola vez. Antes de que termine te avisamos para que renueves por menos: tu plan no se renueva solo con el monto del primer año."}{" "}
            El trámite de inscripción en el SIPDP sigue siendo gratuito (S/ 0).
          </p>

          {configured ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Puedes pagar con tarjeta de crédito o débito (o Yape) en el formulario de MercadoPago.
                No necesitas tener ni crear una cuenta de MercadoPago: elige «continuar sin cuenta».
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                Al suscribirte aceptas los{" "}
                <Link href="/terminos" target="_blank" className="link-underline font-medium text-ink">Términos y condiciones</Link>{" "}
                y la{" "}
                <Link href="/privacidad" target="_blank" className="link-underline font-medium text-ink">Política de privacidad</Link>.
              </p>
              <button type="submit" className="btn btn-primary mt-4 w-full">
                {renewing ? "Renovar con MercadoPago" : active ? "Cambiar de plan con MercadoPago" : "Pagar con MercadoPago"}
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </>
          ) : devBypass ? (
            <>
              <p className="mt-4 border-l-3 border-ochre bg-ochre/[0.08] px-3.5 py-2.5 text-sm leading-relaxed">
                <strong>Modo desarrollo:</strong> MercadoPago no está configurado. Puedes activar la
                cuenta sin cobro para probar el flujo.
              </p>
              <button
                type="submit"
                formAction={activateDevAction}
                className="btn btn-primary mt-4 w-full"
              >
                Activar cuenta en modo desarrollo
              </button>
            </>
          ) : (
            <p className="mt-4 border-l-3 border-crimson bg-crimson/[0.06] px-3.5 py-2.5 text-sm leading-relaxed">
              La suscripción no está disponible en este entorno. Configura las credenciales de
              MercadoPago para habilitarla.
            </p>
          )}
          {transferAvailable && (
            <button type="submit" formAction={requestTransferAction} className="btn btn-ghost mt-3 w-full">
              Prefiero pagar por transferencia con factura
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
