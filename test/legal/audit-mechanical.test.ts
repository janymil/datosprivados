import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mechanicalFindings, RULE_CHECK } from "@/legal/audit/mechanical";
import { KNOWN_FAILURES_DIR } from "@/legal/audit/types";

function tempDir(files: Record<string, unknown[]>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-mech-"));
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
  return dir;
}

describe("hallazgos mecánicos", () => {
  it("cada regla de legal/known-failures tiene su chequeo", () => {
    for (const file of ["citations.json", "facts.json", "modules.json"]) {
      const list = JSON.parse(fs.readFileSync(path.join(KNOWN_FAILURES_DIR, file), "utf8")) as Array<{ rule: string }>;
      for (const { rule } of list) expect(RULE_CHECK[rule], `${file}: ${rule}`).toBeDefined();
    }
    expect(() => mechanicalFindings()).not.toThrow();
  });

  it("cite-norm-repealed y cite-norm-unverified son vigencia; cite-misnumbered es cita; fact-unverified es cita-textual", () => {
    expect(RULE_CHECK["cite-norm-repealed"]).toBe("vigencia");
    expect(RULE_CHECK["cite-norm-unverified"]).toBe("vigencia");
    expect(RULE_CHECK["cite-misnumbered"]).toBe("cita");
    expect(RULE_CHECK["fact-unverified"]).toBe("cita-textual");
  });

  it("una regla desconocida rompe", () => {
    const dir = tempDir({ "citations.json": [{ rule: "nueva-regla", clause: "x", detail: "" }] });
    expect(() => mechanicalFindings(dir)).toThrow(/sin chequeo de auditoría: nueva-regla/);
  });

  it("severidad: citas y hechos son error; cláusula sin base es obligación sin cita para revisar; reglas por perfil son error", () => {
    const dir = tempDir({
      "citations.json": [
        { rule: "cite-misnumbered", clause: "arco.3.plazos", detail: "ds-016-2024-jus:2.8 → III.8" },
        { rule: "clause-without-basis", clause: "politica.1.intro", detail: "" },
      ],
      "facts.json": [{ rule: "fact-unverified", clause: "uit.2026", detail: "falta el decreto" }],
      "rules.json": [{ rule: "sensibles-consentimiento-escrito", clause: "salud-pequena", detail: "falta la cláusula" }],
    });
    const byRule = Object.fromEntries(mechanicalFindings(dir).map((f) => [f.rule, f]));
    expect(byRule["cite-misnumbered"]).toMatchObject({ check: "cita", severity: "error", source: "arco.3.plazos" });
    expect(byRule["clause-without-basis"]).toMatchObject({ check: "obligacion-sin-cita", severity: "revisar" });
    expect(byRule["fact-unverified"]).toMatchObject({ check: "cita-textual", severity: "error" });
    expect(byRule["sensibles-consentimiento-escrito"]).toMatchObject({ check: "regla", severity: "error", source: "salud-pequena" });
  });

  it("los ids son estables entre corridas", () => {
    const ids = (d: string) => mechanicalFindings(d).map((f) => f.id);
    expect(ids(KNOWN_FAILURES_DIR)).toEqual(ids(KNOWN_FAILURES_DIR));
    expect(new Set(ids(KNOWN_FAILURES_DIR)).size).toBe(ids(KNOWN_FAILURES_DIR).length);
  });
});
