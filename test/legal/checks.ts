import fs from "node:fs";
import path from "node:path";
import { legalLibrary, type Article, type Library } from "@/legal/library";
import { allClauses } from "@/legal/registry";
import type { Clause } from "@/legal/types";

/**
 * Fallas conocidas: lo que hoy está mal y se corrige en la auditoría (plan 5), con
 * aprobación del fundador. La lista solo puede reducirse: una falla nueva rompe el
 * build y una falla ya corregida exige quitarla de la lista.
 */
export type KnownFailure = { rule: string; clause: string; detail: string };

export const KNOWN_FAILURES_DIR = path.join(process.cwd(), "legal", "known-failures");
const key = (f: KnownFailure) => `${f.rule}|${f.clause}|${f.detail}`;
const byKey = (a: KnownFailure, b: KnownFailure) => key(a).localeCompare(key(b));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * El primer segmento del inciso existe dentro del artículo. Si el artículo numera sus
 * incisos «26.1, 26.2…», se exige esa forma; si no, vale una lista «1. …» o «a) …».
 */
export function itemExists(article: Article, item: string): boolean {
  const first = escape(item.split(".")[0]);
  const num = escape(article.num);
  if (new RegExp(`\\b${num}\\.\\d`).test(article.text)) return new RegExp(`\\b${num}\\.${first}\\b`).test(article.text);
  return new RegExp(`(?:^|\\s)${first}\\.\\s`).test(article.text) || new RegExp(`(?:^|\\s)${first}\\)\\s`).test(article.text);
}

/**
 * Citas mal numeradas, revisadas a mano contra el texto oficial: el inciso existe pero
 * dice otra cosa. Las definiciones del DS 016-2024-JUS están en el art. III del Título
 * Preliminar (III.2 Bloqueo, III.4 Datos personales, III.6 Datos sensibles, III.8 Días);
 * el art. 2 es «Características del consentimiento válido».
 */
export const MISNUMBERED: Record<string, string> = {
  "ds-016-2024-jus:2.2": "III.2",
  "ds-016-2024-jus:2.4": "III.4",
  "ds-016-2024-jus:2.6": "III.6",
  "ds-016-2024-jus:2.8": "III.8",
};

export function checkCitations(clauses: Clause[] = allClauses(), lib: Library = legalLibrary()): KnownFailure[] {
  const out = new Map<string, KnownFailure>();
  const add = (f: KnownFailure) => out.set(key(f), f);
  for (const clause of clauses) {
    // Cláusula sustantiva sin ningún artículo citado: la auditoría (plan 5) decide su base.
    if (clause.cites.length === 0 && !clause.nonLegal) add({ rule: "clause-without-basis", clause: clause.id, detail: "" });
    for (const cite of clause.cites) {
      const detail = `${cite.norm}:${cite.art}`;
      if (MISNUMBERED[detail]) { add({ rule: "cite-misnumbered", clause: clause.id, detail: `${detail} → ${MISNUMBERED[detail]}` }); continue; }
      if (cite.norm.startsWith("desconocida:")) { add({ rule: "cite-norm-unknown", clause: clause.id, detail }); continue; }
      const norm = lib.norms[cite.norm];
      if (!norm) { add({ rule: "cite-norm-missing", clause: clause.id, detail }); continue; }
      if (norm.status === "no-verificada") { add({ rule: "cite-norm-unverified", clause: clause.id, detail }); continue; }
      if (norm.status === "derogada") add({ rule: "cite-norm-repealed", clause: clause.id, detail });
      const found = lib.findArticle(cite.norm, cite.art);
      if (!found) { add({ rule: "cite-article-missing", clause: clause.id, detail }); continue; }
      if (found.item && !itemExists(found.article, found.item)) add({ rule: "cite-item-missing", clause: clause.id, detail });
    }
  }
  return [...out.values()].sort(byKey);
}

/** Compara con legal/known-failures/<name>.json. Devuelve las fallas nuevas y las entradas que ya no fallan. */
export function ratchet(name: string, current: KnownFailure[]): { added: KnownFailure[]; stale: KnownFailure[] } {
  const file = path.join(KNOWN_FAILURES_DIR, `${name}.json`);
  if (!fs.existsSync(file) && process.env.WRITE_KNOWN_FAILURES === "1") {
    fs.mkdirSync(KNOWN_FAILURES_DIR, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(current, null, 1)}\n`);
  }
  const known: KnownFailure[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  const knownKeys = new Set(known.map(key));
  const currentKeys = new Set(current.map(key));
  return {
    added: current.filter((f) => !knownKeys.has(key(f))),
    stale: known.filter((f) => !currentKeys.has(key(f))),
  };
}
