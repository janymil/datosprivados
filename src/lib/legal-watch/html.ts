/** Utilidades mínimas para leer las páginas oficiales (sin dependencias). */

export const USER_AGENT = "DatosPrivados-monitor/1.0";
export const TIMEOUT_MS = 20_000;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodifica entidades HTML numéricas (&#211;) y las más comunes con nombre. */
export function decodeHtml(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED[name.toLowerCase()] ?? m);
}

/** Texto plano de un fragmento HTML: sin etiquetas, entidades decodificadas y espacios simples. */
export function stripTags(fragment: string): string {
  return decodeHtml(fragment.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

/** «3 de julio de 2011» (también «septiembre») → «2011-07-03»; null si no es una fecha. */
export function spanishDateToIso(text: string): string | null {
  const m = /(\d{1,2}) de ([a-záéíóú]+) de (\d{4})/i.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase().replace("septiembre", "setiembre")) + 1;
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
