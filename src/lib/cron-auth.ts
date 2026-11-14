import crypto from "node:crypto";

/**
 * Compara el bearer con CRON_SECRET en tiempo constante. Sin secreto configurado
 * (o con uno de menos de 16 caracteres), todo se rechaza. Lo usan las rutas
 * internas: tareas programadas y registro de cambios legales.
 */
export function authorizedByCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = crypto.createHash("sha256").update(header.replace(/^Bearer\s+/i, "")).digest();
  const expected = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(given, expected);
}
