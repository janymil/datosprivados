import { describe, expect, it } from "vitest";
import { SECTORS } from "@/lib/sectors";
import { legalFixtures } from "./fixtures";
import { pairwise } from "./pairwise";

const D = { a: [1, 2, 3], b: ["x", "y"], c: [true, false] } as const;

describe("pairwise", () => {
  it("cubre cada par de valores", () => {
    const rows = pairwise(D);
    const keys = ["a", "b", "c"] as const;
    for (const k1 of keys)
      for (const k2 of keys) {
        if (k1 >= k2) continue;
        for (const v1 of D[k1])
          for (const v2 of D[k2]) expect(rows.some((r) => r[k1] === v1 && r[k2] === v2)).toBe(true);
      }
  });

  it("es determinista", () => {
    expect(pairwise(D)).toEqual(pairwise(D));
  });
});

describe("legalFixtures", () => {
  const all = legalFixtures();

  it("cubre cada rubro y el rubro desconocido", () => {
    const sectors = new Set(all.map((f) => f.company.sector));
    for (const s of SECTORS) expect(sectors.has(s.label)).toBe(true);
    expect(sectors.has("software")).toBe(true);
  });

  it("los ids son únicos", () => {
    const ids = all.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("incluye los casos del Review Focus", () => {
    expect(all.some((f) => f.company.complaints_url === "   ")).toBe(true);
    expect(all.some((f) => f.company.dpo_name === "")).toBe(true);
    expect(all.some((f) => f.company.name.includes("|"))).toBe(true);
    expect(all.some((f) => f.banks.some((b) => b.status === "cancelado"))).toBe(true);
    expect(all.some((f) => f.banks.some((b) => /voz analizadas con IA/.test(b.name)))).toBe(true);
    expect(all.some((f) => f.providers.some((p) => p.country === "No sé"))).toBe(true);
    console.log(`legalFixtures: ${all.length}`);
  });
});
