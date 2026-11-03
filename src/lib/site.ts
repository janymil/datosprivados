/**
 * URL pública de la aplicación. Se toma de NEXT_PUBLIC_APP_URL (sin barra final).
 * Es la única fuente para enlaces absolutos: metadatos, robots, sitemap, IA y
 * retorno de MercadoPago.
 */
const FALLBACK = "https://datosprivados.pe";

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || FALLBACK).replace(/\/+$/, "");
}

/**
 * ¿Este despliegue debe quedar fuera de los buscadores?
 *
 * Un preview indexado es un problema que sobrevive al lanzamiento: Google conserva la
 * copia con los textos legales en borrador y compite con el dominio real. Se activa con
 * `NEXT_PUBLIC_NOINDEX=1` **al compilar** (robots y metadatos se generan en el build):
 *
 *   NEXT_PUBLIC_NOINDEX=1 pnpm build
 *
 * Producción no la define, así que sigue indexable sin tocar código.
 */
export function noindex(): boolean {
  return process.env.NEXT_PUBLIC_NOINDEX === "1";
}
