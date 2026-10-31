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
