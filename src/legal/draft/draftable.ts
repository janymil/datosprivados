import type { AuditFinding } from "../audit/types";

/**
 * Qué hallazgos de la auditoría se redactan solos (motor legal, plan 7). Sin alias `@/`: lo
 * usa también `scripts/legal/enqueue-report.mjs` con `node --experimental-strip-types`.
 *
 * Solo los de severidad «error» (diseño §7: «error» se corrige con aprobación; «revisar» lo
 * decide una persona, que puede pedir la redacción desde /operador/legal). Una norma sin
 * texto en la biblioteca (`cite-norm-unverified`) no se redacta: el hallazgo no dice de dónde
 * descargar el texto oficial.
 */
export const DRAFTABLE_RULES = ["meaning", "cite-misnumbered", "cite-item-missing", "fact-unverified", "fact-quote-not-found"];

export type DraftRequestInput = { origin: "auditoria"; ref: string; targets: string[]; context: { findings: AuditFinding[] } };

/** Una solicitud por texto afectado; la referencia son los ids de sus hallazgos, ordenados. */
export function draftRequestsFromReport(report: { findings: AuditFinding[] }): DraftRequestInput[] {
  const bySource = new Map<string, AuditFinding[]>();
  for (const f of report.findings) {
    if (f.severity !== "error" || !DRAFTABLE_RULES.includes(f.rule)) continue;
    bySource.set(f.source, [...(bySource.get(f.source) ?? []), f]);
  }
  return [...bySource.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, findings]) => ({
      origin: "auditoria",
      ref: findings.map((f) => f.id).sort().join(","),
      targets: [source],
      context: { findings },
    }));
}
