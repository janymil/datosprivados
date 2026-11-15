import fs from "node:fs";
import path from "node:path";
import { articlesFromText, normRecord, type SourceEntry } from "../library/ingest";
import type { Article } from "../library/types";
import type { callLlm } from "@/lib/llm";
import { untrusted } from "@/lib/llm";

/**
 * Paso 3 del diseño §8 (motor legal, plan 7): cargar una norma nueva en la biblioteca. La IA
 * propone cómo cortar el texto oficial (dónde empieza y termina, qué norma es); el corte lo
 * hace el mismo código de la ingesta manual, y las comprobaciones de abajo rechazan lo raro.
 */

const NORM_TYPES = ["ley", "decreto-supremo", "decreto-legislativo", "directiva", "resolucion", "norma-tecnica", "codigo", "opinion-consultiva"];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Menos texto que esto: el PDF es una imagen escaneada (sin capa de texto). */
const MIN_TEXT = 500;
/** Primeras líneas del texto que se le muestran a la IA para proponer el corte. */
const HEAD_LINES = 250;

export type ProposedSource = {
  id: string;
  start: string;
  startOccurrence: number;
  end?: string;
  sections: boolean;
  norm: { title: string; type: string; number: string; publishedAt: string };
};

export const SOURCE_SYSTEM = `Eres un abogado peruano que mantiene una biblioteca de normas oficiales. Te doy el inicio del texto de una norma recién publicada (extraído de su PDF oficial, línea por línea) y sus datos en El Peruano.
Propón cómo cortar la norma en artículos:
- "id": identificador en minúsculas con guiones, como "ds-001-2027-jus", "ley-32001", "rm-123-2027-jus".
- "start": expresión regular (JavaScript, multilínea) de la línea donde empieza el articulado (por ejemplo "^DECRETA:$" o "^Artículo 1\\\\.").
- "startOccurrence": en qué aparición de "start" empieza (1 si es la primera).
- "end": expresión regular de la primera línea que ya no es de la norma (otra norma del mismo PDF), u omítela.
- "sections": true solo si la norma se numera por puntos («6.13») en vez de artículos.
- "norm": {"title","type" (ley | decreto-supremo | decreto-legislativo | directiva | resolucion | norma-tecnica | codigo | opinion-consultiva),"number","publishedAt" (AAAA-MM-DD)}.
Responde SOLO con JSON con esas claves.`;

const json = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null;
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try {
    return JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export async function proposeSource(
  pdfText: string,
  item: { title: string; issuer: string; published_on: string | null; url: string; pdf_url: string | null },
  deps: { call: typeof callLlm }
): Promise<{ entry: ProposedSource } | { reasons: string[]; retry?: boolean }> {
  const head = pdfText.split("\n").slice(0, HEAD_LINES).join("\n");
  const raw = await deps.call({
    system: SOURCE_SYSTEM,
    messages: [{ role: "user", content: `DATOS EN EL PERUANO:\n${untrusted(JSON.stringify(item))}\n\nTEXTO:\n${untrusted(head)}` }],
    maxTokens: 2000,
  });
  const data = json(raw);
  if (!data) return { reasons: ["IA sin respuesta"], retry: true };
  const norm = (data.norm ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];
  const id = String(data.id ?? "");
  if (!ID.test(id)) reasons.push(`id de norma no válido: «${id}»`);
  if (!NORM_TYPES.includes(String(norm.type))) reasons.push(`tipo de norma desconocido: «${String(norm.type)}»`);
  if (!DATE.test(String(norm.publishedAt ?? ""))) reasons.push("fecha de publicación no válida");
  for (const key of ["title", "number"]) if (typeof norm[key] !== "string" || !String(norm[key]).trim()) reasons.push(`falta «${key}» de la norma`);
  for (const key of ["start", "end"]) {
    if (data[key] === undefined && key === "end") continue;
    try {
      new RegExp(String(data[key]), "m");
    } catch {
      reasons.push(`expresión «${key}» no válida`);
    }
  }
  if (reasons.length) return { reasons };
  const entry: ProposedSource = {
    id,
    start: String(data.start),
    startOccurrence: Number.isInteger(data.startOccurrence) && Number(data.startOccurrence) > 0 ? Number(data.startOccurrence) : 1,
    ...(data.end !== undefined ? { end: String(data.end) } : {}),
    sections: data.sections === true,
    norm: { title: String(norm.title).trim(), type: String(norm.type), number: String(norm.number).trim(), publishedAt: String(norm.publishedAt) },
  };
  return { entry };
}

/** Corta el texto con la entrada propuesta y comprueba que el resultado tenga sentido. */
export function ingestProposed(entry: ProposedSource, pdfText: string): { articles: Article[] } | { reasons: string[] } {
  const raw = pdfText.normalize("NFKC");
  if (raw.replace(/\s+/g, "").length < MIN_TEXT) return { reasons: ["PDF sin texto: la norma está escaneada como imagen"] };
  let articles: Article[];
  try {
    articles = articlesFromText(raw, { start: entry.start, startOccurrence: entry.startOccurrence, end: entry.end, sections: entry.sections }, entry.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { reasons: [/ocurrencia|inicio/.test(message) ? `no se encontró el inicio de la norma (${entry.start})` : message] };
  }
  if (!articles.length) return { reasons: ["el corte no produjo ningún artículo"] };
  const arabic = articles.map((a) => a.num).filter((n) => /^\d+$/.test(n)).map(Number);
  if (arabic.some((n, i) => i > 0 && n <= arabic[i - 1]) || (arabic.length && arabic[0] !== 1 && !entry.sections))
    return { reasons: [`artículos fuera de orden (${arabic.join(", ")}): el corte probablemente es equivocado`] };
  return { articles };
}

/** Escribe `legal/library/<id>/` y agrega la entrada a `scripts/legal/sources.json`. */
export function writeNorm(root: string, entry: ProposedSource, articles: Article[], origin: { url: string; sha256: string; retrievedAt: string }): void {
  const source: SourceEntry = {
    url: origin.url,
    start: entry.start,
    startOccurrence: entry.startOccurrence,
    ...(entry.end ? { end: entry.end } : {}),
    ...(entry.sections ? { sections: true } : {}),
    norm: { ...entry.norm, status: "vigente", consolidated: true, amendedBy: [], aliases: [] },
  };
  const dir = path.join(root, "legal/library", entry.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "norm.json"), `${JSON.stringify(normRecord(entry.id, source, origin.sha256, origin.retrievedAt), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "articles.json"), `${JSON.stringify(articles, null, 1)}\n`);
  const sourcesFile = path.join(root, "scripts/legal/sources.json");
  const sources = JSON.parse(fs.readFileSync(sourcesFile, "utf8")) as Record<string, unknown>;
  sources[entry.id] = source;
  fs.writeFileSync(sourcesFile, `${JSON.stringify(sources, null, 2)}\n`);
}

/** Una norma de la biblioteca que la nueva modifica: queda «modificada», con quién la modifica. */
export function markAmended(root: string, normId: string, byId: string): void {
  const file = path.join(root, "legal/library", normId, "norm.json");
  if (!fs.existsSync(file)) return;
  const norm = JSON.parse(fs.readFileSync(file, "utf8")) as { status: string; amendedBy?: string[] };
  norm.status = "modificada";
  norm.amendedBy = [...new Set([...(norm.amendedBy ?? []), byId])];
  fs.writeFileSync(file, `${JSON.stringify(norm, null, 2)}\n`);
}
