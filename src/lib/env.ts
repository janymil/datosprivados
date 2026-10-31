import "server-only";

/**
 * Validación de configuración al arrancar el servidor (instrumentation.ts).
 *
 * En producción, un error aquí impide arrancar: es mejor no servir que servir
 * con cookies inseguras o con un webhook que acepta firmas falsas.
 * Las advertencias no detienen el arranque; avisan de funciones que quedan
 * desactivadas (cobro, IA).
 */
export function checkEnvironment(env: NodeJS.ProcessEnv = process.env): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (env.NODE_ENV !== "production") return { errors, warnings };

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (!appUrl.startsWith("https://")) {
    errors.push("NEXT_PUBLIC_APP_URL debe ser una URL https:// en producción.");
  }
  if (env.COOKIE_SECURE === "0") {
    errors.push("COOKIE_SECURE=0 no está permitido en producción.");
  }
  if (env.PAYMENTS_DEV_BYPASS === "1") {
    errors.push("PAYMENTS_DEV_BYPASS=1 no está permitido en producción.");
  }
  if (env.DATOSPRIVADOS_DB && !env.DATOSPRIVADOS_DB.startsWith("/")) {
    errors.push("DATOSPRIVADOS_DB debe ser una ruta absoluta en producción.");
  }

  if (!env.DECOLECTA_API_TOKEN?.trim()) {
    errors.push("DECOLECTA_API_TOKEN es obligatorio en producción: sin él no se puede verificar el RUC en el registro.");
  }

  const hasMercadoPago = Boolean(env.MERCADOPAGO_ACCESS_TOKEN?.trim());
  if (hasMercadoPago && !env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
    errors.push("MERCADOPAGO_WEBHOOK_SECRET es obligatorio cuando hay MERCADOPAGO_ACCESS_TOKEN.");
  }
  if (!hasMercadoPago) {
    warnings.push("Sin MERCADOPAGO_ACCESS_TOKEN: las cuentas nuevas no pueden activarse.");
  }
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    warnings.push("Sin clave de IA: las funciones de IA usan el modo básico.");
  }

  return { errors, warnings };
}
