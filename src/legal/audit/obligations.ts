import { CLAUSE_DEFAULT_NORM, parseCitations } from "@/legal/citations";
import type { Citation } from "@/legal/types";
import { findingId, sortFindings, type AuditFinding } from "./types";

/**
 * Obligaciones sin cita (diseño §7, punto 6): una frase que impone un deber, un plazo
 * o un número, sin artículo propio y en un texto que tampoco declara su base legal.
 */

/** Marcadores de obligación. Límites Unicode: `\b` no funciona junto a «á». */
export const OBLIGATION =
  /(?<![\p{L}\p{N}])(?:debe|deben|deberá|deberán|obligatori[oa]s?|obligad[oa]s?|tiene la obligación|plazos?|dentro de(?:l)? \d+|\d+\s*(?:días|horas|meses|años)|UIT)(?![\p{L}\p{N}])/iu;

/** Frases de un texto, sin marcas de markdown ni títulos en negrita. */
export function obligationSentences(text: string): string[] {
  const plain = text
    .replace(/\*\*[^*\n]{1,80}\.\*\*/g, " ") // título en negrita «**Plazo.**»
    .replace(/[*_`>#]/g, " ")
    .replace(/^\s*(?:[-•]|\d+\.)\s+/gm, "");
  return plain
    // «;» siempre corta; «.» y «:» solo antes de mayúscula, para no cortar «art. 69» ni «N.° 29733».
    .split(/(?<=;)\s+|(?<=[.:])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«"(])|\n+/)
    .map((s) => s.replace(/\s+/g, " ").replace(/[.;:]+$/, "").trim())
    .filter((s) => s.length > 0);
}

export type ObligationItem = { source: string; text: string; cites: Citation[]; nonLegal?: string };

export function findUncitedObligations(items: ObligationItem[]): AuditFinding[] {
  const out = new Map<string, AuditFinding>();
  for (const item of items) {
    // Una cláusula que declara sus artículos respalda sus frases; un título (nonLegal) no puede obligar.
    if (item.cites.length > 0 && !item.nonLegal) continue;
    for (const sentence of obligationSentences(item.text)) {
      if (!OBLIGATION.test(sentence)) continue;
      if (parseCitations(sentence, CLAUSE_DEFAULT_NORM).length > 0) continue;
      const detail = sentence.length > 200 ? `${sentence.slice(0, 199)}…` : `${sentence}.`;
      const id = findingId("obligacion-sin-cita", item.source, detail);
      out.set(id, { id, check: "obligacion-sin-cita", rule: "obligation-uncited", source: item.source, detail, severity: "revisar" });
    }
  }
  return sortFindings([...out.values()]);
}
