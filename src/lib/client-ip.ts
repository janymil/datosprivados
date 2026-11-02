import "server-only";

import { headers } from "next/headers";

/**
 * IP del cliente para los límites de intentos.
 *
 * Orden y por qué:
 * 1. `X-Real-IP`: lo escribe **nuestro** nginx en cada petición
 *    (`proxy_set_header X-Real-IP $remote_addr`), así que el cliente no puede
 *    elegirlo. Con `set_real_ip_from` + `real_ip_header CF-Connecting-IP`
 *    (`deploy/nginx-production.conf`) `$remote_addr` ya es la IP real detrás de
 *    Cloudflare, no la del borde.
 * 2. `CF-Connecting-IP`: solo cuenta cuando no hay nginx delante (desarrollo,
 *    pruebas, una máquina sin proxy). Quien llegue directo al origen puede
 *    inventarla, por eso va después de `X-Real-IP`.
 * 3. `X-Forwarded-For` (primer valor): último recurso para otros proxies.
 *
 * Un valor que no sea una IP se descarta: si no, bastaría mandar basura distinta
 * en cada intento para estrenar cupo cada vez y esquivar el límite.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

/** Devuelve la IP normalizada, o undefined si el valor no es una IP. */
export function validIp(value: string | null | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 45) return undefined;
  if (IPV4.test(candidate)) {
    return candidate.split(".").every((part) => Number(part) <= 255) ? candidate : undefined;
  }
  if (candidate.includes(":") && IPV6.test(candidate)) return candidate.toLowerCase();
  return undefined;
}

export async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  return (
    validIp(requestHeaders.get("x-real-ip")) ??
    validIp(requestHeaders.get("cf-connecting-ip")) ??
    validIp(requestHeaders.get("x-forwarded-for")?.split(",")[0]) ??
    "desconocida"
  );
}

