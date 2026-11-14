import fs from "node:fs";
import path from "node:path";
import type { Article, Library, Norm } from "./types";

export type { Article, Library, Norm, NormStatus, NormType } from "./types";

export const DEFAULT_LIBRARY_DIR = path.join(process.cwd(), "legal", "library");

/** Normaliza un nombre de norma para compararlo: minúsculas, espacios simples y «N.°» uniforme. */
export function normalizeAlias(alias: string): string {
  return alias
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\bn\s*\.?\s*[º°o]\s*\.?/g, "n.°")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lee la biblioteca de una carpeta. Una carpeta inexistente da una biblioteca vacía. */
export function loadLibrary(dir: string = DEFAULT_LIBRARY_DIR): Library {
  const norms: Record<string, Norm> = {};
  const articles: Record<string, Article[]> = {};
  const aliases = new Map<string, string>();

  const folders = fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];
  for (const folder of folders.sort()) {
    const normFile = path.join(dir, folder, "norm.json");
    if (!fs.existsSync(normFile)) continue;
    const norm = JSON.parse(fs.readFileSync(normFile, "utf8")) as Norm;
    if (norm.id !== folder) throw new Error(`norma ${normFile}: id «${norm.id}» distinto de la carpeta «${folder}»`);
    norms[norm.id] = norm;
    const articlesFile = path.join(dir, folder, "articles.json");
    articles[norm.id] = fs.existsSync(articlesFile) ? (JSON.parse(fs.readFileSync(articlesFile, "utf8")) as Article[]) : [];
    for (const alias of norm.aliases) {
      const key = normalizeAlias(alias);
      const other = aliases.get(key);
      if (other && other !== norm.id) throw new Error(`alias repetido «${alias}» en ${other} y ${norm.id}`);
      aliases.set(key, norm.id);
    }
  }

  return {
    norms,
    articlesOf: (normId) => articles[normId] ?? [],
    findArticle(normId, ref) {
      const [num, ...rest] = ref.split(".");
      const article = (articles[normId] ?? []).find((candidate) => candidate.num === num);
      if (!article) return null;
      return rest.length ? { article, item: rest.join(".") } : { article };
    },
    normByAlias(alias) {
      const id = aliases.get(normalizeAlias(alias));
      return id ? norms[id] : undefined;
    },
  };
}

let cached: Library | undefined;

/** La biblioteca del repositorio (`legal/library/`), leída una sola vez. */
export function legalLibrary(): Library {
  cached ??= loadLibrary();
  return cached;
}
