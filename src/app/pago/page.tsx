import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import {
  billingLabel,
  canBypassPayment,
  companyTerm,
  isCompanyActive,
  planFromCompany,
} from "@/lib/billing";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import {
  PLANS,
  PLAN_IDS,
  isBillingTerm,
  isPlanId,
  planName,
  planPrice,
  termLabel,
  termShortLabel,
  yearlySaving,
} from "@/lib/plans";
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
  searchParams: Promise<{ plan?: string; term?: string; error?: string; change?: string; transfer?: string; detail?: string }>;
}) {
  const { company } = await requireSession();
  const params = await searchParams;
  const active = isCompanyActive(company);
  const change = params.change === "1";

  if (active && !change) {
    redirect(company.onboarded_at ? "/app" : "/bienvenida");
  }

  const requested = params.plan;
  const plan = requested && isPlanId(requested) ? requested : planFromCompany(company);
  const term = params.term && isBillingTerm(params.term) ? params.term : companyTerm(company);
  const configured = isMercadoPagoConfigured();
  const devBypass = canBypassPayment();
  const error = params.error;
  const transferAvailable = isTransferConfigured();
  const pendingTransfer = params.transfer ? getPendingTransfer(company.id) : undefined;

  return (
    <div>
      <p className="label-mono">Suscripción</p>
      <h1 className="mt-3 max-w-[20ch] font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">
        {active ? "Cambia tu plan." : "Activa tu suscripción."}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-soft">
        {active
          ? "Tu plan actual sigue activo hasta que MercadoPago autorice el nuevo. Recién entonces se cancela el anterior."
          : "Tu cuenta ya está creada. Para entrar al panel y empezar tu expediente, activa tu suscripción mensual o anual con MercadoPago."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-sm text-ink-soft">
        <span>
          Plan actual: <strong className="text-ink">{planName(planFromCompany(company))}</strong>
        </span>
        <span>
          Facturación: <strong className="text-ink">{termLabel(term)}</strong>
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label-mono mr-1">Elige facturación</span>
        {(["monthly", "yearly"] as const).map((option) => {
          const selected = term === option;
          const suffix = change ? "&change=1" : "";
          return (
            <Link
              key={option}
              href={`/pago?plan=${plan}&term=${option}${suffix}`}
              className={`border px-3.5 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong bg-paper text-ink hover:border-ink"
              }`}
            >
              {option === "yearly" ? "Anual · 2 meses gratis" : "Mensual"}
            </Link>
          );
        })}
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
        <input type="hidden" name="term" value={term} />

        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const item = PLANS[id];
            const selected = plan === id;
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
                  <span className="font-display text-4xl tracking-[-0.04em]">
                    S/ {planPrice(id, term)}
                  </span>
                  <span className="text-sm text-ink-soft">/ {termShortLabel(term)} · IGV incluido</span>
                </span>
                {term === "yearly" && (
                  <span className="mt-1 block font-mono text-xs uppercase tracking-[0.08em] text-sage">
                    Ahorras S/ {yearlySaving(id)} al año
                  </span>
                )}
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
            La suscripción se renueva automáticamente cada {term === "yearly" ? "año" : "mes"} con
            MercadoPago. Puedes cancelarla cuando quieras desde Ajustes; el acceso sigue activo hasta
            el final del período pagado. El trámite de inscripción en el SIPDP sigue siendo gratuito
            (S/ 0).
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
                {active ? "Cambiar de plan con MercadoPago" : "Suscribirme con MercadoPago"}
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
