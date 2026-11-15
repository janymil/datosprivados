import { checkMeaning } from "../audit/meaning";
import type { AiVerdict } from "../audit/types";
import type { VerdictCache } from "../audit/verdict-cache";
import { legalLibrary, type Library } from "../library";
import type { callLlm } from "@/lib/llm";
import { untrusted } from "@/lib/llm";
import { checkReplacement, citationsOf } from "./gates";
import type { Span } from "./locate";

/**
 * Paso 5 del diseño §8 (motor legal, plan 7): la IA redacta el reemplazo de un texto con las
 * citas que lo respaldan. Cada intento: (1) elige artículos de la biblioteca, (2) redacta con su
 * texto oficial, (3) compuertas, (4) las dos pasadas de significado sobre el texto nuevo. Como
 * máximo 2 intentos; el segundo recibe los motivos del primero.
 */

export const PICK_SYSTEM = `Eres un abogado peruano especialista en protección de datos personales. Te doy un texto legal de un producto, el problema que encontró la auditoría (o la norma nueva que lo afecta) y el índice de la biblioteca de normas (norma · artículo · título).
Elige los artículos (máximo 6) cuyo texto oficial respalda lo que el texto debe decir. Solo artículos del índice o, en las normas marcadas «pide por número», artículos que existan.
Responde SOLO con JSON: {"articles":[{"norm":"<id de la norma>","art":"<número>"}]}`;

export const WRITE_SYSTEM = `Eres un abogado peruano especialista en protección de datos personales. Corriges un texto legal de un producto de software para que diga solo lo que respaldan los artículos oficiales que te doy.
Reglas:
- Devuelve el MISMO fragmento de código TypeScript con solo estos cambios: el texto de los literales y la lista «cites». No cambies «id», «when», «nonLegal», «defaultNorm», nombres de variables ni ninguna expresión \${…}: puedes conservar o quitar las que hay, nunca agregar una nueva.
- En un hecho («value», «unit», «quote»), «quote» es una frase copiada TEXTUAL del artículo citado y debe decir el valor.
- En un texto de módulo, devuelve solo el literal de texto.
- No inventes artículos ni contenido: solo lo que dice el texto oficial dado. Español de Perú, claro y para un dueño de negocio.
- Si el texto original afirma algo que ningún artículo dado respalda, quítalo o dilo como recomendación («se recomienda…»), no como obligación legal.
Responde SOLO con JSON: {"replacement":"<fragmento completo>","rationale":"<por qué, en una o dos frases>"}`;

const MAX_ATTEMPTS = 2;
const MAX_PICKED = 6;
/** Normas con más artículos que esto no se listan enteras en el índice (Código Civil). */
const BIG_NORM = 300;
const MAX_VARIANTS = 2;

type Deps = {
  call: typeof callLlm;
  cache: VerdictCache;
  model: string;
  /** Cómo se ve el texto nuevo para los clientes (variantes sobre las fixtures); lo da el orquestador. */
  render: (span: Span, replacement: string) => Promise<string[]>;
  /** Citas que produce el texto de una cláusula en todas las combinaciones (como test/legal/citations.test.ts). */
  textCites?: (span: Span, replacement: string) => Promise<Array<{ norm: string; art: string }>>;
  lib?: Library;
};
export type ComposeResult =
  | { ok: true; replacement: string; rationale: string; verdicts: AiVerdict[] }
  | { ok: false; retry: boolean; reasons: string[] };

function libraryIndex(lib: Library): string {
  const lines: string[] = [];
  for (const norm of Object.values(lib.norms)) {
    if (norm.status === "no-verificada") continue;
    const arts = lib.articlesOf(norm.id);
    if (arts.length > BIG_NORM) {
      lines.push(`${norm.id} · (${arts.length} artículos; pide por número) · ${norm.title}`);
      continue;
    }
    for (const a of arts) lines.push(`${norm.id} · ${a.num} · ${a.title}`);
  }
  return lines.join("\n");
}

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

const articleText = (lib: Library, norm: string, art: string) => {
  const hit = lib.findArticle(norm, art);
  return hit ? `### ${norm}, art. ${hit.article.num}${hit.item ? ` (inciso ${hit.item})` : ""} — ${hit.article.title}\n${hit.article.text}` : null;
};

export async function composeDraft(input: { span: Span; renderedVariants: string[]; context: unknown }, deps: Deps): Promise<ComposeResult> {
  const lib = deps.lib ?? legalLibrary();
  const index = libraryIndex(lib);
  const original = citationsOf(input.span, input.span.source, lib);
  let feedback: string[] = [];
  let lastReasons: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const problem = `PROBLEMA O NORMA NUEVA:\n${untrusted(JSON.stringify(input.context))}`;
    const current = `TEXTO ACTUAL (${input.span.kind}):\n${untrusted(input.span.source)}\n\nCÓMO LO VEN LOS CLIENTES:\n${untrusted(input.renderedVariants.join("\n---\n"))}`;
    const retryNote = feedback.length ? `\n\nEL INTENTO ANTERIOR NO SIRVIÓ:\n${untrusted(feedback.join("\n"))}` : "";

    // 1. Elegir artículos.
    const picked = json(await deps.call({ system: PICK_SYSTEM, messages: [{ role: "user", content: `${problem}\n\n${current}${retryNote}\n\nÍNDICE:\n${index}` }], maxTokens: 2000 }));
    if (!picked) return { ok: false, retry: true, reasons: ["IA sin respuesta"] };
    const chosen = (Array.isArray(picked.articles) ? picked.articles : [])
      .map((a) => ({ norm: String((a as { norm?: unknown }).norm ?? ""), art: String((a as { art?: unknown }).art ?? "") }))
      .slice(0, MAX_PICKED);
    const texts = [...new Map([...original, ...chosen].map((c) => [`${c.norm}:${c.art}`, articleText(lib, c.norm, c.art)])).values()].filter(
      (t): t is string => t !== null
    );

    // 2. Redactar.
    const written = json(
      await deps.call({
        system: WRITE_SYSTEM,
        messages: [{ role: "user", content: `${problem}\n\n${current}${retryNote}\n\nARTÍCULOS OFICIALES:\n${untrusted(texts.join("\n\n"))}` }],
        maxTokens: 6000,
      })
    );
    if (!written || typeof written.replacement !== "string") return { ok: false, retry: true, reasons: ["IA sin respuesta"] };
    const replacement = written.replacement.trim();
    const rationale = typeof written.rationale === "string" ? written.rationale : "";

    // 3. Compuertas.
    const problems = checkReplacement(input.span, replacement, lib);
    if (problems.length) {
      feedback = problems;
      lastReasons = problems;
      continue;
    }

    // 4. Significado del texto nuevo (los hechos ya se verificaron con su frase textual).
    if (input.span.kind === "fact") return { ok: true, replacement, rationale, verdicts: [] };

    // Una cláusula declara exactamente las citas que su texto produce (regla de test/legal/citations.test.ts).
    if (input.span.kind === "clause" && deps.textCites) {
      const key = (c: { norm: string; art: string }) => `${c.norm}:${c.art}`;
      let produced: string[];
      try {
        produced = [...new Set((await deps.textCites(input.span, replacement)).map(key))].sort();
      } catch (error) {
        feedback = lastReasons = [`el texto nuevo no se pudo generar: ${error instanceof Error ? error.message : String(error)}`];
        continue;
      }
      const declared = [...new Set(citationsOf(input.span, replacement, lib).map(key))].sort();
      const extra = declared.filter((c) => !produced.includes(c));
      const missing = produced.filter((c) => !declared.includes(c));
      if (extra.length || missing.length) {
        feedback = lastReasons = [
          `las citas declaradas en «cites» deben ser exactamente las que el texto menciona. El texto menciona: ${produced.join(", ") || "ninguna"}.` +
            (extra.length ? ` Sobran en «cites»: ${extra.join(", ")}.` : "") +
            (missing.length ? ` Faltan en «cites»: ${missing.join(", ")}.` : ""),
        ];
        continue;
      }
    }
    let variants: string[];
    try {
      variants = (await deps.render(input.span, replacement)).slice(0, MAX_VARIANTS);
    } catch (error) {
      feedback = lastReasons = [`el texto nuevo no se pudo generar: ${error instanceof Error ? error.message : String(error)}`];
      continue;
    }
    const articles = citationsOf(input.span, replacement, lib).flatMap((c) => {
      const hit = lib.findArticle(c.norm, c.art);
      return hit ? [{ norm: c.norm, art: c.art, text: hit.article.text }] : [];
    });
    const verdicts: AiVerdict[] = [];
    const reasons: string[] = [];
    for (const text of variants) {
      const result = await checkMeaning({ source: "borrador", text, articles }, deps);
      if (result.aiFailed) return { ok: false, retry: true, reasons: ["IA sin respuesta"] };
      if (result.finding) reasons.push(`${result.finding.detail}: ${result.verdicts.map((v) => v.reason).join(" / ")}`);
      else verdicts.push(...result.verdicts);
    }
    if (!reasons.length) return { ok: true, replacement, rationale, verdicts };
    feedback = lastReasons = reasons;
  }
  return { ok: false, retry: false, reasons: lastReasons };
}
