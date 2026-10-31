import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { activateSubscription, isCompanyActive } from "@/lib/billing";
import { getPreapproval, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Resultado de la suscripción" };

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ preapproval_id?: string; status?: string }>;
}) {
  const { company } = await requireSession();
  const params = await searchParams;
  const subscriptionId = company.subscription_id ?? params.preapproval_id ?? "";

  let title = "Estamos verificando tu suscripción.";
  let message =
    "MercadoPago todavía no nos confirmó la suscripción. Puede tardar unos minutos; vuelve a intentarlo o revisa tu correo.";
  let ok = false;

  if (!subscriptionId) {
    title = "No pudimos verificar la suscripción.";
    message = "No recibimos el identificador de la suscripción. Si ya pagaste, escríbenos con tu comprobante.";
  } else if (!isMercadoPagoConfigured()) {
    title = "MercadoPago no está configurado.";
    message = "Este entorno no tiene credenciales de MercadoPago. Usa la activación de desarrollo o configura el cobro.";
  } else {
    try {
      const preapproval = await getPreapproval(subscriptionId);
      if (preapproval.status === "authorized") {
        const activated = activateSubscription({
          companyId: company.id,
          subscriptionId,
        });
        ok = true;
        title = "Suscripción confirmada.";
        message = `Tu suscripción mensual está activa${
          activated?.paidUntil ? ` hasta el ${formatDate(activated.paidUntil)}` : ""
        }. Se renueva automáticamente cada mes.`;
      } else if (preapproval.status === "pending") {
        title = "Suscripción pendiente.";
        message =
          "MercadoPago todavía no autorizó la suscripción. Si terminaste el pago, espera unos minutos y vuelve a cargar esta página.";
      } else {
        title = "La suscripción no quedó activa.";
        message = `MercadoPago devolvió el estado «${preapproval.status}». Puedes intentarlo de nuevo.`;
      }
    } catch (error) {
      console.error("[mercadopago] Error verificando la suscripción:", error);
      title = "No pudimos verificar la suscripción.";
      message = "La suscripción existe, pero no pudimos consultarla. Escríbenos con tu comprobante.";
    }
  }

  const active = isCompanyActive(company);
  const canEnter = ok || active;
  const nextHref = canEnter ? (company.onboarded_at ? "/app" : "/bienvenida") : "/pago";

  return (
    <div className="mx-auto max-w-[620px]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Resultado de la suscripción
      </p>
      <h1 className="mt-3 font-display text-[2.4rem] leading-[1.05] tracking-[-0.03em]">{title}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{message}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={nextHref} className="btn btn-primary">
          {canEnter ? "Ir a mi expediente" : "Reintentar suscripción"}
        </Link>
        <Link href="/" className="btn btn-ghost">
          Volver al inicio
        </Link>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
        ¿Necesitas ayuda? Escríbenos a{" "}
        <a href="mailto:hola@datosprivados.pe" className="link-underline text-ink">
          hola@datosprivados.pe
        </a>{" "}
        con el identificador de la suscripción{subscriptionId ? ` (${subscriptionId})` : ""}.
      </p>
    </div>
  );
}
