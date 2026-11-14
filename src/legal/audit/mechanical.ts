import fs from "node:fs";
import path from "node:path";
import { findingId, KNOWN_FAILURES_DIR, sortFindings, type AuditCheck, type AuditFinding, type KnownFailure } from "./types";

/**
 * Hallazgos mecánicos (diseño §7, puntos 1 a 4). Los lints de test/legal ya los
 * calculan y el trinquete obliga a que legal/known-failures/*.json sea exactamente
 * la lista actual de fallas: la auditoría la lee en vez de repetir los chequeos
 * (`pnpm legal:audit` corre primero esos lints).
 */

/** Chequeo de cada regla de lint. Una regla nueva sin entrada aquí rompe la auditoría. */
export const RULE_CHECK: Record<string, AuditCheck> = {
  "cite-misnumbered": "cita",
  "cite-norm-unknown": "cita",
  "cite-norm-missing": "cita",
  "cite-article-missing": "cita",
  "cite-item-missing": "cita",
  "cite-norm-unverified": "vigencia",
  "cite-norm-repealed": "vigencia",
  "fact-unverified": "cita-textual",
  "fact-quote-not-found": "cita-textual",
  "clause-without-basis": "obligacion-sin-cita",
};

/** Reglas que no confirman un error: piden que una persona decida la base legal. */
const REVIEW_RULES = new Set(["clause-without-basis"]);

function read(file: string): KnownFailure[] {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as KnownFailure[]) : [];
}

export function mechanicalFindings(dir: string = KNOWN_FAILURES_DIR): AuditFinding[] {
  const out = new Map<string, AuditFinding>();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const file of files) {
    for (const failure of read(path.join(dir, file))) {
      // rules.json: chequeos de reglas (§6) por perfil de empresa; su `rule` es el id de la regla.
      const check: AuditCheck | undefined = file === "rules.json" ? "regla" : RULE_CHECK[failure.rule];
      if (!check) throw new Error(`regla de ${file} sin chequeo de auditoría: ${failure.rule} (agrégala a RULE_CHECK)`);
      const finding: AuditFinding = {
        id: findingId(check, failure.clause, `${failure.rule} ${failure.detail}`.trim()),
        check,
        rule: failure.rule,
        source: failure.clause,
        detail: failure.detail,
        severity: REVIEW_RULES.has(failure.rule) ? "revisar" : "error",
      };
      out.set(finding.id, finding);
    }
  }
  return sortFindings([...out.values()]);
}
