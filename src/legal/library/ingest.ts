import { applyTextFixes, splitArticles, type TextFix } from "./split.ts";
import type { Article } from "./types.ts";

/**
 * Lo que comparten `scripts/legal/ingest.mjs` (a mano) y la redacción automática (plan 7):
 * cortar el texto de una norma oficial en artículos y armar su `norm.json`. Sin alias `@/`:
 * lo carga también `node --experimental-strip-types`.
 */

export type SourceEntry = {
  url: string;
  extract?: "default";
  start: string;
  startOccurrence: number;
  end?: string;
  amended?: boolean;
  sumilla?: boolean;
  sections?: boolean;
  textFixes?: TextFix[];
  norm: {
    title: string;
    type: string;
    number: string;
    publishedAt: string | null;
    status: string;
    consolidated: boolean;
    amendedBy: string[];
    aliases: string[];
  };
};

/** Artículos de la norma a partir del texto de `pdftotext` (ya normalizado NFKC). */
export function articlesFromText(raw: string, source: Omit<SourceEntry, "url" | "norm">, id = "norma"): Article[] {
  const text = applyTextFixes(raw, source.textFixes);
  // La norma empieza en la N-ésima aparición del marcador (antes puede haber un índice o el decreto aprobatorio).
  const startRe = new RegExp(source.start, "gm");
  let match: RegExpExecArray | null = null;
  for (let n = 0; n < source.startOccurrence; n++) {
    match = startRe.exec(text);
    if (!match) throw new Error(`${id}: no aparece la ocurrencia ${n + 1} de ${source.start}`);
  }
  return splitArticles(text.slice(match!.index), {
    start: new RegExp(source.start, "m"),
    end: source.end ? new RegExp(source.end, "m") : undefined,
    amended: Boolean(source.amended),
    sumilla: Boolean(source.sumilla),
    sections: Boolean(source.sections),
  });
}

/** `norm.json` con las claves en el orden de siempre. */
export function normRecord(id: string, source: SourceEntry, sha256: string, retrievedAt: string): Record<string, unknown> {
  const norm: Record<string, unknown> = { id, ...source.norm, officialUrl: source.url, sourceSha256: sha256, retrievedAt };
  return Object.fromEntries(
    ["id", "title", "type", "number", "publishedAt", "officialUrl", "sourceSha256", "retrievedAt", "status", "consolidated", "amendedBy", "aliases"].map((k) => [
      k,
      norm[k],
    ])
  );
}
