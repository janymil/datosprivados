import { legalLibrary, normalizeAlias, type Library } from "./library";
import type { Citation } from "./types";

/**
 * Lee las citas de artículos de un texto («art. 26.5 del DS N.° 016-2024-JUS»,
 * «arts. 46 a 51», «Código Civil, art. 15»). Base del lint de citas: lo que el texto
 * dice tiene que coincidir con lo que la cláusula declara en `cites`.
 */

/** Norma de las menciones sin norma explícita («(art. 87)»). */
export const CLAUSE_DEFAULT_NORM = "ds-016-2024-jus";

const NUM = String.raw`(?:\d+|[IVX]+)(?:\.\d+)*(?:\.[a-z])?(?![\w])`;
const SEP = String.raw`(?:\s*,\s*(?:num(?:eral)?\.?\s*)?|\s+y\s+|\s+al?\s+)`;
const MENTION = new RegExp(String.raw`(?<![\wÁÉÍÓÚáéíóú])(?:[Aa]rts?\.|[Aa]rt[ií]culos?)\s*(${NUM}(?:${SEP}${NUM})*)`, "g");
const TOKEN = /(?:\d+|[IVX]+)(?:\.\d+)*(?:\.[a-z])?|,\s*num(?:eral)?\.?|,|\by\b|\bal?\b/g;
/** Forma genérica de una norma que no está en la biblioteca. */
const GENERIC_NORM =
  /^((?:DS|D\.\s?S\.|Decreto Supremo|Decreto Legislativo|D\.\s?Leg\.|Ley|Resoluci[óo]n(?: Ministerial| Directoral)?|RM|NTS|Directiva|Opini[óo]n Consultiva)\s+(?:N\.?\s*[°º]\s*)?[0-9][\w./-]*[\w])/;

function expand(group: string): string[] {
  const tokens = group.match(TOKEN) ?? [];
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^,\s*num/.test(token) && out.length && tokens[i + 1]) {
      out[out.length - 1] = `${out[out.length - 1]}.${tokens[++i]}`;
    } else if (/^al?$/.test(token) && out.length && /^\d+$/.test(out[out.length - 1]) && /^\d+$/.test(tokens[i + 1] ?? "")) {
      const from = Number(out[out.length - 1]);
      const to = Number(tokens[++i]);
      for (let n = from + 1; n <= to; n++) out.push(String(n));
    } else if (!/^(,|y|al?)$/.test(token)) {
      out.push(token);
    }
  }
  return out;
}

type AliasIndex = Array<{ key: string; id: string }>;

function aliasIndex(lib: Library): AliasIndex {
  return Object.values(lib.norms)
    .flatMap((norm) => norm.aliases.map((alias) => ({ key: normalizeAlias(alias), id: norm.id })))
    .sort((a, b) => b.key.length - a.key.length);
}

const boundary = (s: string, at: number) => at >= s.length || !/[\p{L}\p{N}]/u.test(s[at]);

/** Norma nombrada justo después de la mención: «… de la Ley N.° 29733», «… del Reglamento». */
function normAfter(after: string, index: AliasIndex): string | null {
  const m = /^\s*\**\s*,?\s*(?:de la|del|de los|de las)\s+\**\s*/i.exec(after);
  if (!m) return null;
  return resolveNormName(after.slice(m[0].length), index);
}

/** Nombre completo de una norma: alias de varias palabras, o forma con número fuera de la biblioteca. */
function specificNorm(rest: string, index: AliasIndex): string | null {
  const norm = normalizeAlias(rest.slice(0, 120));
  for (const { key, id } of index) if (key.includes(" ") && norm.startsWith(key) && boundary(norm, key.length)) return id;
  const generic = GENERIC_NORM.exec(rest);
  return generic ? `desconocida:${generic[1]}` : null;
}

/** Ley con nombre propio («Ley General de Salud»): mayúscula tras la palabra. */
const NAMED = /^(Ley|Reglamento)((?:\s+(?:[A-ZÁÉÍÓÚÑ][\p{L}]+|de|del|la|las|los|y|e)(?=[\s,.;:)]|$))*\s+[A-ZÁÉÍÓÚÑ][\p{L}]+)/u;
/** «Reglamento de la Ley N.° 29733 aprobado por Decreto Supremo N.° 003-2013-JUS». */
const APPROVED_BY = /^[^;()]{0,100}?\baprobad[oa] por\s+(?:el\s+)?/i;

function resolveNormName(rest: string, index: AliasIndex): string | null {
  const specific = specificNorm(rest, index);
  if (specific) return specific;
  const word = /^(Ley|Reglamento)\b/i.exec(rest);
  if (!word) return null;
  // «Reglamento … aprobado por <norma>»: manda la norma aprobatoria.
  const approved = APPROVED_BY.exec(rest);
  if (approved) {
    const by = specificNorm(rest.slice(approved[0].length), index);
    if (by) return by;
  }
  // «Ley General de Salud»: otra ley con nombre propio, fuera de la biblioteca.
  const named = NAMED.exec(rest);
  if (named && !/^\s+(de|del)\b/.test(named[2])) return `desconocida:${named[0]}`;
  // «la Ley», «el Reglamento», «la Ley de Protección de Datos Personales»: los alias genéricos.
  const norm = normalizeAlias(word[0]);
  for (const { key, id } of index) if (key === norm) return id;
  return null;
}

/**
 * Norma nombrada justo antes: «Código Civil, art. 15», «**Ley N.° 29733** (art. 16)».
 * Solo con un nombre específico: en «… del art. 18 de la Ley (art. 74)» la segunda cita
 * es del Reglamento, no de «la Ley» que la precede.
 */
function normBefore(before: string, index: AliasIndex): string | null {
  if (!/(?:,|\()\s*$/.test(before)) return null;
  const norm = normalizeAlias(before.replace(/[\s,(*]+$/, ""));
  for (const { key, id } of index) {
    if (!key.includes(" ")) continue; // «ley», «reglamento»: demasiado genéricos para atar la cita siguiente
    if (norm.endsWith(key) && (norm.length === key.length || !/[\p{L}\p{N}]/u.test(norm[norm.length - key.length - 1]))) return id;
  }
  return null;
}

export function parseCitations(text: string, defaultNorm: string, lib: Library = legalLibrary()): Citation[] {
  const index = aliasIndex(lib);
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const match of text.matchAll(MENTION)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const norm =
      normAfter(text.slice(end, end + 160), index) ??
      normBefore(text.slice(Math.max(0, start - 80), start), index) ??
      defaultNorm;
    for (const art of expand(match[1])) {
      const key = `${norm}:${art}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ norm, art });
    }
  }
  return out;
}
