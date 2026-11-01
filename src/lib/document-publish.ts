/**
 * Un texto legal con campos sin completar no se puede publicar: la política es
 * pública y, con un «[completar domicilio]» a la vista, dejaría de ser creíble.
 */

/** Fragmentos entre corchetes que son campos por completar (no enlaces markdown ni casillas). */
const PLACEHOLDER = /\[(?![ xX]?\])([^\]\n]{3,140})\](?!\()/g;

export function findPlaceholders(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER)) found.add(`[${match[1].trim()}]`);
  return [...found];
}

/** Motivos por los que no puede publicarse; vacío = puede. */
export function publishBlockers(content: string): string[] {
  return findPlaceholders(content);
}
