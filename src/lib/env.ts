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
  if (env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.OPENAI_MODEL) {
    warnings.push("OPENAI_API_KEY sin OPENAI_MODEL: la IA queda en modo básico (no hay modelo por defecto).");
  }
  if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_MODEL) {
    warnings.push("ANTHROPIC_MODEL no está definido: se usa el valor por defecto del código; fíjalo y verifica que el id es válido para tu cuenta.");
  }
  if (env.AI_MONTHLY_BUDGET_USD === undefined && (env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY)) {
    warnings.push("Sin AI_MONTHLY_BUDGET_USD: no hay tope de gasto mensual de IA.");
  }

  const mailProvider = env.MAIL_PROVIDER?.trim().toLowerCase();
  if (mailProvider === "resend" && !env.MAIL_API_KEY?.trim()) {
    errors.push("MAIL_PROVIDER=resend requiere MAIL_API_KEY.");
  }
  if (mailProvider !== "resend") {
    warnings.push("Sin MAIL_PROVIDER: los correos se acumulan en la bandeja de salida y no se envían (restablecer contraseña y avisos de plazos no funcionan).");
  }
  if (env.MAIL_PROVIDER && !env.MAIL_WEBHOOK_SECRET?.trim() && mailProvider === "resend") {
    warnings.push("Sin MAIL_WEBHOOK_SECRET: los rebotes y quejas del correo no se procesan.");
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) {
    warnings.push("CRON_SECRET ausente o menor de 16 caracteres: las tareas programadas (/api/cron) rechazan toda petición.");
  }

  return { errors, warnings };
}
