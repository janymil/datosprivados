import { CLAUSE_DEFAULT_NORM, parseCitations } from "@/legal/citations";
import type { MeaningInput } from "@/legal/audit/meaning";
import type { ObligationItem } from "@/legal/audit/obligations";
import { legalContext } from "@/legal/context";
import { legalDataModuleTexts } from "@/legal/index-texts";
import { legalLibrary } from "@/legal/library";
import { allClauses } from "@/legal/registry";
import { legalFixtures } from "../fixtures";
import { withFrozenWorld } from "../render-all";

/**
 * Entradas de la auditoría (diseño §7): el texto real de cada cláusula sobre todas
 * las fixtures (como máximo los 2 textos distintos más largos) con el texto oficial
 * de sus artículos, y los textos sueltos de los módulos para las obligaciones sin cita.
 * Vive en test/ porque usa las fixtures de empresa.
 */
export type AuditInputs = {
  clauses: MeaningInput[];
  obligations: ObligationItem[];
  notAudited: Array<{ source: string; reason: string }>;
};

const MAX_VARIANTS = 2;
/** Campos que no son texto legal: identificadores, títulos y palabras clave. */
const NOT_PROSE = /\.(?:slug|id|href|icon|keywords|related|title|heading|h1|label)(?:\[\d+\])?$/;
/** Ruta del objeto que contiene el campo: «FAMILIES.x.retention[1].term» → «FAMILIES.x.retention[1]». */
const parentOf = (source: string) => source.replace(/\.[^.[\]]+(?:\[\d+\])?$/, "");

export function auditInputs(): AuditInputs {
  const lib = legalLibrary();
  const texts = withFrozenWorld(() => {
    const out = new Map<string, Set<string>>();
    for (const f of legalFixtures()) {
      const ctx = legalContext(f.company, f.banks, f.providers);
      for (const clause of allClauses()) {
        if (clause.when && !clause.when(ctx)) continue;
        const text = clause.text(ctx).trim();
        if (!text) continue;
        const set = out.get(clause.id) ?? new Set<string>();
        set.add(text);
        out.set(clause.id, set);
      }
    }
    return out;
  });

  const clauses: MeaningInput[] = [];
  const obligations: ObligationItem[] = [];
  const notAudited: AuditInputs["notAudited"] = [];

  for (const clause of allClauses()) {
    const variants = [...(texts.get(clause.id) ?? [])].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, MAX_VARIANTS);
    for (const text of variants) obligations.push({ source: clause.id, text, cites: clause.cites, nonLegal: clause.nonLegal });
    if (clause.nonLegal) continue;
    if (!variants.length) {
      notAudited.push({ source: clause.id, reason: "no aplica en ningún perfil" });
      continue;
    }
    if (!clause.cites.length) {
      notAudited.push({ source: clause.id, reason: "sin artículos citados (ver hallazgo mecánico)" });
      continue;
    }
    const articles = clause.cites.map((c) => ({ norm: c.norm, art: c.art, text: lib.findArticle(c.norm, c.art)?.article.text ?? "" }));
    if (articles.some((a) => !a.text)) {
      notAudited.push({ source: clause.id, reason: "cita rota (ver hallazgo mecánico)" });
      continue;
    }
    for (const text of variants) clauses.push({ source: clause.id, text, articles });
  }

  // Un registro (fila de conservación, pregunta frecuente…) se lee entero: la cita de un
  // campo hermano («basis: "Código Tributario, art. 43"») respalda el plazo de «term».
  const prose = legalDataModuleTexts().filter((t) => !NOT_PROSE.test(t.source));
  const siblings = new Map<string, string[]>();
  for (const t of prose) siblings.set(parentOf(t.source), [...(siblings.get(parentOf(t.source)) ?? []), t.text]);
  for (const { source, text } of prose) {
    const record = (siblings.get(parentOf(source)) ?? [text]).join("\n");
    obligations.push({ source, text, cites: parseCitations(record, CLAUSE_DEFAULT_NORM, lib) });
  }
  return { clauses, obligations, notAudited };
}
