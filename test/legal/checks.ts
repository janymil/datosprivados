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

/** El primer segmento del inciso existe dentro del artículo: «26.5», «6. Datos…», «a) …». */
export function itemExists(article: Article, item: string): boolean {
  const first = item.split(".")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const num = article.num.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`\\b${num}\\.${first}\\b`).test(article.text) ||
    new RegExp(`(?:^|\\s)${first}\\.\\s`).test(article.text) ||
    new RegExp(`(?:^|\\s)${first}\\)\\s`).test(article.text)
  );
}

export function checkCitations(clauses: Clause[] = allClauses(), lib: Library = legalLibrary()): KnownFailure[] {
  const out = new Map<string, KnownFailure>();
  const add = (f: KnownFailure) => out.set(key(f), f);
  for (const clause of clauses) {
    for (const cite of clause.cites) {
      const detail = `${cite.norm}:${cite.art}`;
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
