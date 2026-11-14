import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderReport, writeReport } from "@/legal/audit/report";
import { findingId, type AuditFinding, type AuditMeta } from "@/legal/audit/types";

const meta: AuditMeta = {
  date: "2026-11-14",
  model: "gpt-6-luna",
  aiEnabled: true,
  clausesAudited: 120,
  notAudited: [{ source: "eipd.9.biometria", reason: "no aplica en ningún perfil" }],
  aiFailures: 2,
};
const f = (over: Partial<AuditFinding>): AuditFinding => {
  const base = { check: "cita" as const, rule: "cite-misnumbered", source: "arco.3.plazos", detail: "ds:2.8 → III.8", severity: "error" as const, ...over };
  return { id: findingId(base.check, base.source, base.detail), ...base };
};
const findings = [
  f({ check: "significado", rule: "meaning", source: "politica.4.finalidades", detail: "las pasadas no coinciden", severity: "revisar", verdicts: [
    { pass: "a", verdict: "supported", quote: "El titular tiene derecho", reason: "lo dice" },
    { pass: "b", verdict: "partial", quote: "El titular tiene derecho", reason: "el plazo no está" },
  ] }),
  f({ source: "consentimiento.d.encabezado", detail: "ds:2.6 → III.6" }),
  f({}),
];

describe("informe de auditoría", () => {
  it("mismo input, mismo JSON (hallazgos ordenados)", () => {
    const a = fs.mkdtempSync(path.join(os.tmpdir(), "rep-a-"));
    const b = fs.mkdtempSync(path.join(os.tmpdir(), "rep-b-"));
    const one = writeReport(a, findings, meta);
    const two = writeReport(b, [...findings].reverse(), meta);
    expect(fs.readFileSync(one.json, "utf8")).toBe(fs.readFileSync(two.json, "utf8"));
    expect(path.basename(one.md)).toBe("2026-11-14.md");
    const sources = JSON.parse(fs.readFileSync(one.json, "utf8")).findings.map((x: AuditFinding) => x.source);
    expect(sources).toEqual(["arco.3.plazos", "consentimiento.d.encabezado", "politica.4.finalidades"]);
  });

  it("el informe cuenta lo no auditado y las fallas de la IA, y cita los dos veredictos", () => {
    const md = renderReport(findings, meta);
    expect(md).toContain("No auditadas: 1");
    expect(md).toContain("Sin respuesta de la IA: 2");
    expect(md).toContain("Pasada A: **supported**");
    expect(md).toContain("Pasada B: **partial**");
    expect(md).toContain("eipd.9.biometria");
  });
});
