import fs from "node:fs";
import { it } from "vitest";
import { VerdictCache } from "@/legal/audit/verdict-cache";
import type { Span } from "@/legal/draft/locate";
import { runDraft } from "@/legal/draft/run";
import { realSteps } from "@/legal/draft/steps";
import { getDb } from "@/lib/db";
import { limaToday } from "@/lib/format";
import { callLlm } from "@/lib/llm";
import { renderDetailed, type Rendered } from "./render";

/**
 * Redactor (motor legal, plan 7). Lo lanza deploy/datosprivados-draft.sh en su copia del
 * repositorio: `npx vitest run --config vitest.draft.config.ts` con DRAFT_REQUEST_FILE y
 * DRAFT_RESULT_FILE. Corre dentro de vitest por los alias `@/` y la base temporal (como la auditoría).
 */
const root = process.cwd();
/** Una sola generación por borrador: textos y citas salen juntos. */
const renders = new Map<string, Promise<Rendered>>();
const rendered = (span: Span, replacement: string) => {
  const key = `${span.file}:${span.start}:${replacement}`;
  if (!renders.has(key)) renders.set(key, renderDetailed(span, replacement, root));
  return renders.get(key)!;
};

it.skipIf(!process.env.DRAFT_REQUEST_FILE)("redactar una solicitud de la cola", async () => {
  const request = JSON.parse(fs.readFileSync(process.env.DRAFT_REQUEST_FILE!, "utf8"));
  // Gasto exacto: callLlm registra los tokens del proveedor (con reintentos y razonamiento) en la base
  // temporal de esta corrida; se suman y se informan a la app, que los cuenta en el tope del mes.
  const before = new Date().toISOString();
  let result;
  try {
    result = await runDraft(request, {
      root,
      ai: { call: callLlm, cache: new VerdictCache(), model: process.env.OPENAI_MODEL ?? "" },
      render: async (span, replacement) => (await rendered(span, replacement)).texts,
      textCites: async (span, replacement) => (await rendered(span, replacement)).cites,
      ...realSteps(root, { url: process.env.LEGAL_API_URL ?? "http://127.0.0.1:3000", secret: process.env.CRON_SECRET ?? "" }),
      today: limaToday(new Date()),
    });
  } catch (error) {
    result = { status: "reintentar", reasons: [`el redactor falló: ${error instanceof Error ? error.message : String(error)}`] };
  }
  const usage = getDb()
    .prepare("SELECT COALESCE(SUM(input_tokens), 0) AS inputTokens, COALESCE(SUM(output_tokens), 0) AS outputTokens FROM ai_usage WHERE created_at >= ?")
    .get(before) as { inputTokens: number; outputTokens: number };
  fs.writeFileSync(process.env.DRAFT_RESULT_FILE!, JSON.stringify({ ...result, usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } }));
}, 3_600_000);
