import "server-only";

import { decodeHtml, stripTags, USER_AGENT, TIMEOUT_MS } from "./html";
import type { NewWatchItem } from "./store";

/**
 * El Peruano, «Normas Legales»: la misma lista que muestra diariooficial.elperuano.pe.
 * Cada norma es un <article class="edicionesoficiales_articulos"> con el emisor (h4),
 * el título y enlace (h5), «Fecha: dd/mm/yyyy» y un resumen (p).
 */

const BASE = "https://diariooficial.elperuano.pe";
const MARKER = "NormasEPPortal";
const ARTICLE = /<article\b[^>]*\bclass="[^"]*\bedicionesoficiales_articulos\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function parseElPeruano(html: string): { items: NewWatchItem[]; structureOk: boolean } {
  const items: NewWatchItem[] = [];
  for (const [, body] of html.matchAll(ARTICLE)) {
    const link = /<h5>\s*<a href="(https:\/\/busquedas\.elperuano\.pe\/dispositivo\/[A-Z]+\/([\w-]+))"[^>]*>([\s\S]*?)<\/a>/.exec(body);
    if (!link) continue;
    const date = /Fecha:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(body);
    const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1])).filter((p) => p && !/^Fecha:/.test(p));
    items.push({
      source: "elperuano",
      external_id: link[2],
      url: link[1],
      pdf_url: `${link[1]}/pdf`,
      issuer: stripTags(/<h4>([\s\S]*?)<\/h4>/.exec(body)?.[1] ?? ""),
      title: stripTags(link[3]),
      summary: paragraphs[0] ?? "",
      published_on: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
    });
  }
  // Una página válida sin normas (domingo) conserva el contenedor; sin él, cambió la página.
  // Un día sin normas es válido (la página trae el marcador y ningún artículo); artículos
  // que no se reconocen significan que la página cambió.
  return { items, structureOk: items.length > 0 || (html.includes(MARKER) && !/<article\b/i.test(html)) };
}

/** Normas publicadas un día (AAAA-MM-DD), con el mismo filtro de fecha que usa la página. */
export async function fetchElPeruanoDay(day: string, fetchImpl: FetchLike = fetch) {
  const [y, m, d] = day.split("-");
  const ddmmyyyy = `${d}/${m}/${y}`;
  const dateparam = encodeURIComponent(`${m}/${d}/${y} 00:00:00`);
  const response = await fetchImpl(`${BASE}/Normas/Filtro?dateparam=${dateparam}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-requested-with": "XMLHttpRequest", "user-agent": USER_AGENT },
    body: new URLSearchParams({ cddesde: ddmmyyyy, cdhasta: ddmmyyyy }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`El Peruano HTTP ${response.status}`);
  return parseElPeruano(decodeHtml(await response.text()));
}
