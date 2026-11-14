import { describe, expect, it } from "vitest";
import { sourceFileTexts } from "@/legal/index-texts";
import { checkTextCitations, ratchet } from "./checks";
import { legalModuleTexts } from "./modules";

/**
 * Lint de citas en los textos fuera de los documentos (ayuda, guías, FAQ, glosario,
 * prompt…) y en el código de páginas y componentes. Las fallas de hoy están en
 * legal/known-failures/modules.json, que solo puede reducirse.
 */
describe("lint de citas en módulos y páginas", () => {
  const current = checkTextCitations([...legalModuleTexts(), ...sourceFileTexts()]);
  const { added, stale } = ratchet("modules", current);

  it("no hay fallas fuera de la lista de fallas conocidas", () => {
    expect(added, `fallas nuevas:\n${added.map((f) => `${f.rule} ${f.clause} ${f.detail}`).join("\n")}`).toEqual([]);
  });

  it("la lista de fallas conocidas no tiene entradas ya corregidas", () => {
    expect(stale.map((f) => `${f.rule} ${f.clause} ${f.detail}`)).toEqual([]);
  });

  it("las páginas y componentes se leen", () => {
    const pages = sourceFileTexts().map((p) => p.source);
    expect(pages).toContain("src/app/herramientas/calculadora-multas-ley-29733/page.tsx");
  });
}, 180_000);
