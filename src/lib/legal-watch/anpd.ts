import "server-only";

import { spanishDateToIso, stripTags, TIMEOUT_MS, USER_AGENT } from "./html";
import type { NewWatchItem } from "./store";

/**
 * ANPD en gob.pe, «Normas y documentos legales»: resoluciones directorales y normas que
 * no siempre aparecen en El Peruano. Cada entrada enlaza
 * /institucion/anpd/normas-legales/<id>-<slug> con su título y fecha.
 */

const LIST_URL = "https://www.gob.pe/institucion/anpd/normas-legales";
const LINK = /<a[^>]+href="(\/institucion\/anpd\/normas-legales\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function parseAnpd(html: string): { items: NewWatchItem[]; structureOk: boolean } {
  const byId = new Map<string, NewWatchItem>();
  for (const match of html.matchAll(LINK)) {
    const [, href, id, inner] = match;
    const title = stripTags(inner);
    const current = byId.get(id);
    // El mismo id aparece en el título y en «Leer más»: vale el texto con contenido.
    if (current && current.title) continue;
    if (!title || /^leer más$/i.test(title)) {
      if (!current) byId.set(id, { ...entry(href, id, ""), published_on: dateAfter(html, match.index ?? 0) });
      continue;
    }
    byId.set(id, { ...entry(href, id, title), published_on: dateAfter(html, match.index ?? 0) });
  }
  const items = [...byId.values()].filter((i) => i.title);
  return { items, structureOk: items.length > 0 };
}

function entry(href: string, id: string, title: string): NewWatchItem {
  return {
    source: "anpd",
    external_id: id,
    url: `https://www.gob.pe${href}`,
    pdf_url: null,
    issuer: "AUTORIDAD NACIONAL DE PROTECCIÓN DE DATOS PERSONALES",
    title,
    summary: "",
    published_on: null,
  };
}

/** Primera fecha «d de mes de aaaa» en los 2 000 caracteres que siguen al enlace. */
function dateAfter(html: string, at: number): string | null {
  return spanishDateToIso(stripTags(html.slice(at, at + 2000)));
}

export async function fetchAnpd(fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(LIST_URL, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`ANPD gob.pe HTTP ${response.status}`);
  return parseAnpd(await response.text());
}
