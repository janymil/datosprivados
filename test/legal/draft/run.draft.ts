import fs from "node:fs";
import { it } from "vitest";
import { VerdictCache } from "@/legal/audit/verdict-cache";
import { runDraft } from "@/legal/draft/run";
import { realSteps } from "@/legal/draft/steps";
import { limaToday } from "@/lib/format";
import { callLlm } from "@/lib/llm";
import { renderTarget } from "./render";

/**
 * Redactor (motor legal, plan 7). Lo lanza deploy/datosprivados-draft.sh en su copia del
 * repositorio: `npx vitest run --config vitest.draft.config.ts` con DRAFT_REQUEST_FILE y
 * DRAFT_RESULT_FILE. Corre dentro de vitest por los alias `@/` y la base temporal (como la auditoría).
 */
const root = process.cwd();

it.skipIf(!process.env.DRAFT_REQUEST_FILE)("redactar una solicitud de la cola", async () => {
  const request = JSON.parse(fs.readFileSync(process.env.DRAFT_REQUEST_FILE!, "utf8"));
  // Gasto aproximado (4 caracteres por token): se informa a la app, que lo suma al tope del mes.
  const usage = { inputTokens: 0, outputTokens: 0 };
  const call: typeof callLlm = async (args) => {
    const out = await callLlm(args);
    usage.inputTokens += Math.ceil((args.system.length + args.messages.reduce((n, m) => n + m.content.length, 0)) / 4);
    usage.outputTokens += Math.ceil((out?.length ?? 0) / 4);
    return out;
  };
  let result;
  try {
    result = await runDraft(request, {
      root,
      ai: { call, cache: new VerdictCache(), model: process.env.OPENAI_MODEL ?? "" },
      render: (span, replacement) => renderTarget(span, replacement, root),
      ...realSteps(root, { url: process.env.LEGAL_API_URL ?? "http://127.0.0.1:3000", secret: process.env.CRON_SECRET ?? "" }),
      today: limaToday(new Date()),
    });
  } catch (error) {
    result = { status: "reintentar", reasons: [`el redactor falló: ${error instanceof Error ? error.message : String(error)}`] };
  }
  fs.writeFileSync(process.env.DRAFT_RESULT_FILE!, JSON.stringify({ ...result, usage }));
}, 3_600_000);
