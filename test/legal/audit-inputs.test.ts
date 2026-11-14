import { describe, expect, it } from "vitest";
import { allClauses } from "@/legal/registry";
import { auditInputs } from "./audit/inputs";

describe("entradas de la auditoría", () => {
  const inputs = auditInputs();

  it("cada cláusula está auditada o en notAudited con motivo", () => {
    const audited = new Set(inputs.clauses.map((c) => c.source));
    const skipped = new Map(inputs.notAudited.map((n) => [n.source, n.reason]));
    for (const clause of allClauses().filter((c) => !c.nonLegal)) {
      expect(audited.has(clause.id) || skipped.has(clause.id), clause.id).toBe(true);
    }
    for (const reason of skipped.values()) expect(reason.length).toBeGreaterThan(0);
  });

  it("como máximo 2 textos por cláusula, con sus artículos", () => {
    const counts = new Map<string, number>();
    for (const c of inputs.clauses) {
      counts.set(c.source, (counts.get(c.source) ?? 0) + 1);
      expect(c.text.trim().length, c.source).toBeGreaterThan(0);
      expect(c.articles.length, c.source).toBeGreaterThan(0);
      for (const a of c.articles) expect(a.text.length, `${c.source} ${a.norm}:${a.art}`).toBeGreaterThan(0);
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(counts.size).toBeGreaterThan(20);
  });

  it("los identificadores y títulos no se auditan como obligaciones", () => {
    expect(inputs.obligations.filter((o) => /\.(slug|keywords|title|heading)(\[\d+\])?$/.test(o.source)).map((o) => o.source)).toEqual([]);
  });

  it("las obligaciones incluyen cláusulas y textos de los módulos", () => {
    expect(inputs.obligations.some((o) => allClauses().some((c) => c.id === o.source))).toBe(true);
    expect(inputs.obligations.some((o) => o.source.startsWith("sectors:"))).toBe(true);
  });
});
