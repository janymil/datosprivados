import crypto from "node:crypto";
import path from "node:path";

/**
 * Auditoría de corrección del motor legal (diseño §7). Tipos compartidos por los
 * chequeos, el informe y la lista para el abogado.
 */

/** Falla pendiente de un lint legal, fijada en legal/known-failures/<lista>.json. */
export type KnownFailure = { rule: string; clause: string; detail: string };

export const KNOWN_FAILURES_DIR = path.join(process.cwd(), "legal", "known-failures");

/**
 * Qué comprueba cada hallazgo (diseño §7): 1 cita existe, 2 vigencia, 3 cita textual
 * del hecho, 4 números desde los hechos, 5 significado (IA), 6 obligación sin cita.
 * `regla`: un chequeo de reglas (§6) falla para un perfil de empresa.
 */
export type AuditCheck = "cita" | "vigencia" | "cita-textual" | "numero" | "significado" | "obligacion-sin-cita" | "regla";

export type AiVerdict = {
  pass: "a" | "b";
  verdict: "supported" | "partial" | "not_supported";
  /** Extracto literal del artículo citado. */
  quote: string;
  reason: string;
};

export type AuditFinding = {
  id: string;
  check: AuditCheck;
  rule: string;
  /** Cláusula, hecho, módulo o perfil donde está el problema. */
  source: string;
  detail: string;
  /** `error`: confirmado, se corrige con aprobación. `revisar`: lo decide una persona. */
  severity: "error" | "revisar";
  verdicts?: AiVerdict[];
};

export type AuditMeta = {
  /** AAAA-MM-DD, hora de Lima. */
  date: string;
  model: string | null;
  aiEnabled: boolean;
  clausesAudited: number;
  notAudited: Array<{ source: string; reason: string }>;
  aiFailures: number;
};

/** Id estable de un hallazgo: no cambia entre corridas mientras el problema sea el mismo. */
export function findingId(check: AuditCheck, source: string, detail: string): string {
  return crypto.createHash("sha256").update(`${check}|${source}|${detail}`).digest("hex").slice(0, 12);
}

const ORDER: AuditCheck[] = ["cita", "vigencia", "cita-textual", "numero", "regla", "obligacion-sin-cita", "significado"];

/** Orden estable: por chequeo, fuente y detalle. */
export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
  return [...findings].sort(
    (a, b) =>
      ORDER.indexOf(a.check) - ORDER.indexOf(b.check) ||
      a.source.localeCompare(b.source) ||
      a.detail.localeCompare(b.detail) ||
      a.rule.localeCompare(b.rule)
  );
}
