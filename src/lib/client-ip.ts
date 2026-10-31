import "server-only";

import { headers } from "next/headers";

/**
 * IP del cliente para límites de intentos.
 *
 * Detrás de Cloudflare, `CF-Connecting-IP` es la IP real; `X-Real-IP` sería la
 * IP del borde de Cloudflare y todos los usuarios compartirían un cupo.
 * Estos encabezados solo son confiables si el origen acepta tráfico únicamente
 * desde Cloudflare (ver docs/RUNBOOK.md, sección «Origen»).
 */
export async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  const cf = requestHeaders.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = requestHeaders.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "desconocida";
}
