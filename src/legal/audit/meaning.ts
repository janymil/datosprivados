import crypto from "node:crypto";
import type { callLlm } from "@/lib/llm";
import { untrusted } from "@/lib/llm";
import { findingId, type AiVerdict, type AuditFinding } from "./types";
import type { VerdictCache } from "./verdict-cache";

/**
 * Chequeo de significado (diseño §7, punto 5): ¿el artículo citado respalda lo que
 * dice la cláusula? Dos pasadas independientes con instrucciones distintas; si no
 * coinciden, o alguna duda, el hallazgo va a revisión. Solo dos «not_supported» lo
 * confirman como error.
 */

const SCOPE = `Los datos propios de la empresa (nombre, RUC, dirección, correos, canales de atención, procedimientos internos o plazos que la empresa elige por encima del mínimo legal) no son afirmaciones legales: no los evalúes. Juzga solo lo que la cláusula atribuye a la norma: derechos, obligaciones, plazos legales, sujetos, condiciones y excepciones.`;

const FORMAT = `Responde SOLO con un objeto JSON, sin texto alrededor:
{"verdict":"supported"|"partial"|"not_supported","quote":"<extracto LITERAL del artículo que fundamenta tu respuesta>","reason":"<una o dos frases en español>"}`;

export const PASS_A_SYSTEM = `Eres un abogado peruano especialista en protección de datos personales (Ley N.° 29733 y su Reglamento, DS N.° 016-2024-JUS).
Recibes una cláusula de un documento legal y el texto oficial de los artículos que la cláusula cita.
Decide si los artículos respaldan lo que la cláusula dice:
- "supported": todo lo que afirma la cláusula está en los artículos.
- "partial": una parte está y otra no (un plazo, un sujeto, una condición distintos o ausentes).
- "not_supported": los artículos no dicen lo que la cláusula afirma.
${SCOPE}
${FORMAT}`;

export const PASS_B_SYSTEM = `Eres un revisor escéptico de textos legales peruanos. Tu trabajo es encontrar lo que una cláusula afirma SIN respaldo.
1. Enumera mentalmente cada afirmación de la cláusula: obligaciones, plazos, números, sujetos, condiciones y excepciones.
2. Para cada una, busca la frase del artículo que la dice. No supongas: si no está escrita, no está.
3. Si todas están: "supported". Si falta alguna: "partial". Si falta la principal o el artículo dice otra cosa: "not_supported".
${SCOPE}
${FORMAT}`;

export type MeaningInput = { source: string; text: string; articles: Array<{ norm: string; art: string; text: string }> };

type Deps = { call: typeof callLlm; cache: VerdictCache; model: string };

const VERDICTS = new Set(["supported", "partial", "not_supported"]);
const normalize = (s: string) => s.replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
/** Número de artículo o inciso al inicio de un trozo: «Art. 61:», «66.1», «III.8». */
const LABEL = /^(?:art(?:[íi]culo)?s?\.?\s*)?(?:\d+|[IVX]+)(?:\.\d+)*\.?\s*[:.)-]?\s+/i;

/**
 * ¿La cita de la IA está en los artículos? La IA junta incisos («66.1 … 68.1 …»), antepone
 * el número o corta con «…»: cada trozo de al menos 20 caracteres debe estar, literal.
 */
export function quoteFound(quote: string, articles: Array<{ text: string }>): boolean {
  const corpus = normalize(articles.map((a) => a.text).join(" "));
  const pieces = quote
    .split(/\s*(?:…|\.\.\.)\s*|\s+(?=(?:\d+|[IVX]+)\.\d+\s)/)
    .map((p) => normalize(p.replace(LABEL, "")).replace(/^[.,;:]\s*|[.,;:]$/g, ""))
    .filter(Boolean);
  const long = pieces.filter((p) => p.length >= 20);
  return (long.length ? long : [normalize(quote)]).every((p) => corpus.includes(p));
}

/** Lee el primer objeto JSON de la respuesta (también dentro de ```json o con texto alrededor). */
export function parseVerdict(raw: string | null, pass: "a" | "b"): AiVerdict | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof data.verdict !== "string" || !VERDICTS.has(data.verdict)) return null;
    if (typeof data.quote !== "string" || typeof data.reason !== "string" || !data.reason.trim()) return null;
    return { pass, verdict: data.verdict as AiVerdict["verdict"], quote: data.quote.trim(), reason: data.reason.trim() };
  } catch {
    return null;
  }
}

function userMessage(input: MeaningInput): string {
  const articles = input.articles.map((a) => `### ${a.norm}, art. ${a.art}\n${a.text}`).join("\n\n");
  return `CLÁUSULA (${input.source}):\n${untrusted(input.text)}\n\nARTÍCULOS CITADOS (texto oficial):\n${untrusted(articles)}`;
}

async function runPass(pass: "a" | "b", input: MeaningInput, deps: Deps): Promise<AiVerdict | null> {
  const system = pass === "a" ? PASS_A_SYSTEM : PASS_B_SYSTEM;
  const key = crypto
    .createHash("sha256")
    .update(JSON.stringify([deps.model, pass, system, input.text, input.articles]))
    .digest("hex");
  const cached = deps.cache.get(key);
  if (cached) return cached;
  const verdict = parseVerdict(await deps.call({ system, messages: [{ role: "user", content: userMessage(input) }], maxTokens: 4000 }), pass);
  if (verdict) deps.cache.set(key, verdict);
  return verdict;
}

export async function checkMeaning(input: MeaningInput, deps: Deps): Promise<{ finding: AuditFinding | null; aiFailed: boolean }> {
  const [a, b] = await Promise.all([runPass("a", input, deps), runPass("b", input, deps)]);
  const make = (severity: AuditFinding["severity"], detail: string, verdicts: AiVerdict[]): AuditFinding => ({
    id: findingId("significado", input.source, input.text),
    check: "significado",
    rule: "meaning",
    source: input.source,
    detail,
    severity,
    verdicts,
  });

  if (!a || !b) return { finding: make("revisar", "la IA no respondió", [a, b].filter((v): v is AiVerdict => v !== null)), aiFailed: true };

  if ([a, b].some((v) => v.quote && !quoteFound(v.quote, input.articles))) {
    return { finding: make("revisar", "la cita de la IA no está en el artículo", [a, b]), aiFailed: false };
  }
  if (a.verdict === "supported" && b.verdict === "supported") return { finding: null, aiFailed: false };
  if (a.verdict === "not_supported" && b.verdict === "not_supported") {
    return { finding: make("error", "las dos pasadas dicen que el artículo no respalda la cláusula", [a, b]), aiFailed: false };
  }
  const detail = a.verdict === b.verdict ? "las dos pasadas ven respaldo parcial" : "las pasadas no coinciden";
  return { finding: make("revisar", detail, [a, b]), aiFailed: false };
}
