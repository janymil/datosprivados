import { describe, expect, it } from "vitest";
import { affectedBy, legalTextIndex } from "@/legal/index-texts";
import { allClauses } from "@/legal/registry";

/** Índice de textos legales: qué cláusulas, hechos, módulos y páginas toca un cambio de artículo. */
describe("índice de textos legales", () => {
  const index = legalTextIndex();

  it("incluye cada cláusula con sus citas declaradas", () => {
    const clauses = new Set(index.filter((e) => e.kind === "clause").map((e) => e.source));
    for (const clause of allClauses()) expect(clauses.has(clause.id), clause.id).toBe(true);
  });

  it("un cambio en el art. 69 del DS alcanza cláusulas, hechos y textos de ayuda", () => {
    const hits = affectedBy("ds-016-2024-jus", "69");
    const sources = new Set(hits.map((h) => `${h.kind}:${h.source}`));
    expect(sources.has("clause:politica.7.derechos-arco")).toBe(true);
    expect(sources.has("clause:arco.3.plazos")).toBe(true);
    expect(sources.has("fact:arco.plazo.acceso")).toBe(true);
    expect(hits.some((h) => h.kind === "module")).toBe(true);
  });

  it("un cambio en el art. 39 de la Ley alcanza los hechos de multas", () => {
    const facts = affectedBy("ley-29733", "39").filter((h) => h.kind === "fact").map((h) => h.source);
    expect(facts).toEqual(expect.arrayContaining(["multa.leve", "multa.grave", "multa.muy-grave"]));
  });

  it("un artículo alcanza también sus incisos, pero no otro artículo con el mismo prefijo", () => {
    const sources = affectedBy("ds-016-2024-jus", "26").map((h) => h.source);
    expect(sources).toContain("consentimiento.b.whatsapp"); // cita 26.2 y 26.5
    // consentimiento.b.whatsapp cita 9, 26.2 y 26.5: el art. 2 no la alcanza.
    expect(affectedBy("ds-016-2024-jus", "2").some((h) => h.source === "consentimiento.b.whatsapp")).toBe(false);
  });
}, 120_000);
