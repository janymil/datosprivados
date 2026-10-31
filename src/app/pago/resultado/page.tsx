import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isCompanyActive } from "@/lib/billing";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { formatDate } from "@/lib/format";
import { confirmAuthorizedSubscription } from "@/lib/subscriptions";

export const metadata = { title: "Resultado de la suscripción" };

export default async function PaymentResultPage() {
  // El identificador de suscripción sale de la base de datos, nunca de la URL.
  const { company } = await requireSession();

  let title = "Estamos verificando tu suscripción.";
  let message =
    "MercadoPago todavía no nos confirmó la suscripción. Puede tardar unos minutos; vuelve a intentarlo o revisa tu correo.";
  let ok = false;

  if (!company.pending_subscription_id && company.subscription_id && isCompanyActive(company)) {
    ok = true;
    title = "Tu suscripción está activa.";
    message = `Tu plan está activo${company.paid_until ? ` hasta el ${formatDate(company.paid_until)}` : ""}.`;
  } else if (!company.pending_subscription_id) {
    title = "No encontramos una suscripción pendiente.";
    message = "Inicia una suscripción desde la página de planes. Si ya pagaste, escríbenos con tu comprobante.";
  } else if (!isMercadoPagoConfigured()) {
    title = "MercadoPago no está configurado.";
    message = "Este entorno no tiene credenciales de MercadoPago. Usa la activación de desarrollo o configura el cobro.";
  } else {
    try {
      const result = await confirmAuthorizedSubscription(company.pending_subscription_id);
      if (result.ok) {
        ok = true;
        title = "Suscripción confirmada.";
        message = `Tu suscripción está activa hasta el ${formatDate(result.paidUntil)}. Se renueva automáticamente.`;
      } else if (result.status === "pending") {
        title = "Suscripción pendiente.";
        message =
          "MercadoPago todavía no autorizó la suscripción. Si terminaste el pago, espera unos minutos y vuelve a cargar esta página.";
      } else if (result.status) {
        title = "La suscripción no quedó activa.";
        message = `MercadoPago devolvió el estado «${result.status}». Puedes intentarlo de nuevo.`;
      } else {
        title = "No pudimos confirmar la suscripción.";
        message = `${result.reason} Escríbenos con tu comprobante si el cobro ya se realizó.`;
      }
    } catch (error) {
      console.error("[mercadopago] Error verificando la suscripción:", error);
      title = "No pudimos verificar la suscripción.";
      message = "La suscripción existe, pero no pudimos consultarla. Escríbenos con tu comprobante.";
    }
  }

  const active = ok || isCompanyActive(company);
  const nextHref = active ? (company.onboarded_at ? "/app" : "/bienvenida") : "/pago";

  return (
    <div className="mx-auto max-w-[620px]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Resultado de la suscripción
      </p>
      <h1 className="mt-3 font-display text-[2.4rem] leading-[1.05] tracking-[-0.03em]">{title}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{message}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={nextHref} className="btn btn-primary">
          {active ? "Ir a mi expediente" : "Reintentar suscripción"}
        </Link>
        <Link href="/" className="btn btn-ghost">
          Volver al inicio
        </Link>
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        ¿Necesitas ayuda? Escríbenos a{" "}
        <a href="mailto:hola@datosprivados.pe" className="link-underline text-ink">
          hola@datosprivados.pe
        </a>
        .
      </p>
    </div>
  );
}
