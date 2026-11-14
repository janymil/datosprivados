import path from "node:path";
import { expect, it } from "vitest";
import { updateLawyerList, LAWYER_LIST } from "@/legal/audit/lawyer-list";
import { checkMeaning } from "@/legal/audit/meaning";
import { mechanicalFindings } from "@/legal/audit/mechanical";
import { findUncitedObligations } from "@/legal/audit/obligations";
import { writeReport } from "@/legal/audit/report";
import type { AuditFinding } from "@/legal/audit/types";
import { VerdictCache } from "@/legal/audit/verdict-cache";
import { activeModelId, callLlm, isLlmConfigured } from "@/lib/llm";
import { auditInputs } from "./inputs";

/**
 * `pnpm legal:audit` (diseño §7): corre después de los lints de test/legal, que dejan
 * legal/known-failures al día. Escribe legal/audit/<fecha>.{md,json} y actualiza
 * legal/audit/abogado.md. LEGAL_AUDIT_AI=0 omite el chequeo de significado.
 */
const CONCURRENCY = 4;
const limaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

it("auditoría legal", async () => {
  const aiEnabled = process.env.LEGAL_AUDIT_AI !== "0";
  if (aiEnabled && !isLlmConfigured()) {
    throw new Error("La auditoría de significado necesita la IA configurada (OPENAI_MODEL); usa LEGAL_AUDIT_AI=0 para la parte mecánica");
  }

  const inputs = auditInputs();
  const findings: AuditFinding[] = [...mechanicalFindings(), ...findUncitedObligations(inputs.obligations)];
  let aiFailures = 0;

  if (aiEnabled) {
    const cache = new VerdictCache();
    const model = activeModelId();
    let done = 0;
    const results = await pool(inputs.clauses, CONCURRENCY, async (input) => {
      const result = await checkMeaning(input, { call: callLlm, cache, model });
      if (++done % 20 === 0) {
        cache.save();
        console.log(`[legal:audit] significado ${done}/${inputs.clauses.length}`);
      }
      return result;
    });
    cache.save();
    for (const r of results) {
      if (r.aiFailed) aiFailures += 1;
      if (r.finding) findings.push(r.finding);
    }
  }

  const unique = [...new Map(findings.map((f) => [f.id, f])).values()];
  const meta = {
    date: limaDate(),
    model: aiEnabled ? activeModelId() : null,
    aiEnabled,
    clausesAudited: new Set(inputs.clauses.map((c) => c.source)).size,
    notAudited: inputs.notAudited,
    aiFailures,
  };
  const { md } = writeReport(path.join(process.cwd(), "legal", "audit"), unique, meta);
  const added = updateLawyerList(LAWYER_LIST, unique);
  const errors = unique.filter((f) => f.severity === "error").length;
  console.log(`[legal:audit] ${unique.length} hallazgos (${errors} errores), ${added} nuevos para el abogado, ${aiFailures} sin respuesta de la IA. Informe: ${path.relative(process.cwd(), md)}`);
  expect(unique.length).toBeGreaterThanOrEqual(0);
});
