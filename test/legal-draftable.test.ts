import { describe, expect, it } from "vitest";
import type { AuditFinding } from "@/legal/audit/types";
import { DRAFTABLE_RULES, draftRequestsFromReport } from "@/legal/draft/draftable";

const finding = (over: Partial<AuditFinding>): AuditFinding => ({
  id: Math.random().toString(16).slice(2, 14),
  check: "significado",
  rule: "meaning",
  source: "aviso.nota.regla-practica",
  detail: "x",
  severity: "error",
  ...over,
});

describe("qué hallazgos se redactan solos", () => {
  it("solo los «error»; los «revisar» los decide una persona", () => {
    const out = draftRequestsFromReport({
      findings: [finding({ severity: "revisar" }), finding({ rule: "obligation-uncited", severity: "revisar", source: "politica.x" })],
    });
    expect(out).toEqual([]);
    expect(draftRequestsFromReport({ findings: [finding({})] })).toHaveLength(1);
  });

  it("una norma sin texto en la biblioteca no se redacta (falta la fuente oficial)", () => {
    expect(DRAFTABLE_RULES).not.toContain("cite-norm-unverified");
    expect(draftRequestsFromReport({ findings: [finding({ rule: "cite-norm-unverified", check: "vigencia" })] })).toEqual([]);
  });

  it("dos hallazgos del mismo texto dan una sola solicitud, con referencia estable", () => {
    const a = finding({ id: "bbbbbbbbbbbb", rule: "cite-misnumbered", check: "cita" });
    const b = finding({ id: "aaaaaaaaaaaa" });
    const [one, ...rest] = draftRequestsFromReport({ findings: [a, b] });
    expect(rest).toEqual([]);
    expect(one).toEqual({ origin: "auditoria", ref: "aaaaaaaaaaaa,bbbbbbbbbbbb", targets: ["aviso.nota.regla-practica"], context: { findings: [a, b] } });
    expect(draftRequestsFromReport({ findings: [b, a] })[0].ref).toBe(one.ref);
  });
});
