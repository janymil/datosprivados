import "server-only";

import { legalTextIndex, type IndexEntry, type IndexKind } from "@/legal/index-texts";
import { legalLibrary } from "@/legal/library";
import { getDb } from "../db";
import type { callLlm } from "../llm";
import { untrusted } from "../llm";
import type { NewWatchItem } from "./store";

/**
 * Del montón de normas del día a las pocas que importan (motor legal, plan 6):
 * 1. filtro sin IA (emisor, palabras clave, números de las normas de la biblioteca);
 * 2. triaje con IA solo de lo que pasa el filtro;
 * 3. impacto desde el índice de citas: fuentes, tipos de documento y clientes.
 */

const ISSUERS = ["JUSTICIA", "MINJUS", "AUTORIDAD NACIONAL DE PROTECCION DE DATOS", "DGTAIPD"];
const KEYWORDS = ["datos personales", "29733", "016-2024-jus", "videovigilancia", "uit"];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Números de las normas de la biblioteca («29733», «016-2024-JUS»…). */
export function libraryNumbers(): string[] {
  return Object.values(legalLibrary().norms)
    .map((n) => n.number)
    .filter((n) => /\d{3,}/.test(n) && !/^D\. Leg/.test(n));
}

export function prefilter(item: NewWatchItem): boolean {
  if (item.source === "anpd") return true;
  const issuer = fold(item.issuer).toUpperCase();
  if (ISSUERS.some((i) => issuer.includes(i))) return true;
  const text = fold(`${item.title} ${item.summary}`);
  if (KEYWORDS.some((k) => new RegExp(`(?<![\\p{L}\\p{N}])${k}(?![\\p{L}\\p{N}])`, "u").test(text))) return true;
  return libraryNumbers().some((n) => text.includes(fold(n)));
}

export const TRIAGE_SYSTEM = `Eres un abogado peruano especialista en protección de datos personales. Revisas las normas publicadas hoy para un producto que genera documentos de cumplimiento (políticas de privacidad, consentimientos, procedimiento ARCO, documento de seguridad, libro de reclamaciones, conservación de datos) a partir de una biblioteca de normas.
Decide si la norma nueva afecta a esa biblioteca:
- "amends": modifica, deroga o reglamenta una norma de la biblioteca.
- "relevant": no modifica ninguna, pero cambia obligaciones que esos documentos describen (plazos, montos como la UIT, datos sensibles, videovigilancia, transferencias, ARCO, reclamos de consumidores).
- "irrelevant": cualquier otra cosa (designaciones, presupuestos, normas de otros temas).
En "norms" pon solo ids de la biblioteca que se te da; en "articles", los artículos afectados si el título o el resumen los dicen.
Responde SOLO con JSON: {"relevance":"amends"|"relevant"|"irrelevant","norms":["<id>"],"articles":["<n>"],"reason":"<una frase en español>"}`;

export type Triage = { relevance: "amends" | "relevant" | "irrelevant"; norms: string[]; articles: string[]; reason: string };

function libraryIndex(): string {
  return Object.values(legalLibrary().norms)
    .map((n) => `- ${n.id}: ${n.title} (${n.number})`)
    .join("\n");
}

export async function triage(item: NewWatchItem, deps: { call: typeof callLlm }): Promise<Triage | null> {
  const message = `BIBLIOTECA DE NORMAS:\n${libraryIndex()}\n\nNORMA NUEVA:\n${untrusted(
    `Fuente: ${item.source}\nEmisor: ${item.issuer}\nTítulo: ${item.title}\nResumen: ${item.summary}\nFecha: ${item.published_on ?? ""}`
  )}`;
  const raw = await deps.call({ system: TRIAGE_SYSTEM, messages: [{ role: "user", content: message }], maxTokens: 2000 });
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    if (!["amends", "relevant", "irrelevant"].includes(String(data.relevance))) return null;
    if (typeof data.reason !== "string" || !data.reason.trim()) return null;
    const ids = new Set(Object.keys(legalLibrary().norms));
    const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      relevance: data.relevance as Triage["relevance"],
      norms: list(data.norms).filter((n) => ids.has(n)),
      articles: list(data.articles).filter((a) => /^[\dIVX]+(\.\d+)*$/.test(a)),
      reason: data.reason.trim().slice(0, 500),
    };
  } catch {
    return null;
  }
}

let cachedIndex: IndexEntry[] | undefined;

export type Impact = { sources: Array<{ kind: IndexKind; source: string }>; documentKinds: string[]; customers: number };

/** Qué cita esas normas (o esos artículos) y cuántos clientes activos tienen documentos de esos tipos. */
export function impactOf(norms: string[], articles: string[]): Impact {
  const index = (cachedIndex ??= legalTextIndex());
  const hits = index.filter((entry) =>
    entry.cites.some(
      (c) => norms.includes(c.norm) && (articles.length === 0 || articles.some((a) => c.art === a || c.art.startsWith(`${a}.`)))
    )
  );
  const sources = [...new Map(hits.map((h) => [`${h.kind}:${h.source}`, { kind: h.kind, source: h.source }])).values()];
  // Las cláusulas se llaman «<tipo>.<sección>.<nombre>»: el tipo de documento es el primer segmento.
  const documentKinds = [...new Set(sources.filter((s) => s.kind === "clause").map((s) => s.source.split(".")[0]))].sort();
  const customers = documentKinds.length
    ? (
        getDb()
          .prepare(
            `SELECT COUNT(DISTINCT d.company_id) AS n FROM documents d JOIN companies c ON c.id = d.company_id
             WHERE c.billing_status = 'active' AND d.kind IN (${documentKinds.map(() => "?").join(",")})`
          )
          .get(...documentKinds) as { n: number }
      ).n
    : 0;
  return { sources, documentKinds, customers };
}
