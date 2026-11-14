import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLibrary } from "@/legal/library";
import type { Clause } from "@/legal/types";
import { checkCitations, ratchet } from "./checks";

/**
 * Lint de citas: cada artículo citado existe en el texto oficial de una norma
 * verificada. Lo que hoy falla está en legal/known-failures/citations.json, que solo
 * puede reducirse (WRITE_KNOWN_FAILURES=1 lo crea si no existe; nunca lo reescribe).
 */
describe("lint de citas", () => {
  const demo = loadLibrary(path.join(import.meta.dirname, "fixtures", "library"));
  const clause = (cites: Clause["cites"]): Clause => ({ id: "t.x.y", text: () => "x", cites });

  it("clasifica cada tipo de falla", () => {
    const rules = (cites: Clause["cites"]) => checkCitations([clause(cites)], demo).map((f) => f.rule);
    expect(rules([{ norm: "demo", art: "26.5" }])).toEqual([]);
    expect(rules([{ norm: "demo", art: "III.6" }])).toEqual([]);
    expect(rules([{ norm: "demo", art: "99" }])).toEqual(["cite-article-missing"]);
    expect(rules([{ norm: "demo", art: "26.9" }])).toEqual(["cite-item-missing"]);
    expect(rules([{ norm: "stub", art: "1" }])).toEqual(["cite-norm-unverified"]);
    expect(rules([{ norm: "nada", art: "1" }])).toEqual(["cite-norm-missing"]);
    expect(rules([{ norm: "desconocida:DS N.° 1", art: "1" }])).toEqual(["cite-norm-unknown"]);
  });

  const current = checkCitations();
  const { added, stale } = ratchet("citations", current);

  it("no hay fallas fuera de la lista de fallas conocidas", () => {
    expect(added, `fallas nuevas:\n${added.map((f) => `${f.rule} ${f.clause} ${f.detail}`).join("\n")}`).toEqual([]);
  });

  it("la lista de fallas conocidas no tiene entradas ya corregidas", () => {
    expect(stale, `ya no fallan, quítalas de legal/known-failures/citations.json:\n${stale.map((f) => `${f.rule} ${f.clause} ${f.detail}`).join("\n")}`).toEqual([]);
  });
});
