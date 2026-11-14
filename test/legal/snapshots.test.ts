import { describe, expect, it } from "vitest";
import { allClauses, SPECS } from "@/legal/registry";
import { buildDocument } from "@/lib/document-catalog";
import { FAMILIES, sectorLegalProfile } from "@/lib/sector-legal";
import { extraRepresentatives, legalFixtures, representativeFixtures } from "./fixtures";
import { DOCUMENT_KINDS, withFrozenWorld } from "./render-all";

/**
 * Instantáneas de texto: un documento completo por familia legal y tipo, para que
 * cualquier cambio de redacción se vea como diferencia legible en la revisión.
 *
 * Actualizarlas (vitest -u) solo se permite con un motivo registrado y subiendo
 * TEMPLATE_VERSIONS de los tipos afectados (diseño §5). Las huellas de
 * baseline.test.ts cubren todas las combinaciones; estas, la lectura humana.
 */
describe("registro de cláusulas", () => {
  it("cada tipo tiene su especificación", () => {
    for (const kind of DOCUMENT_KINDS) expect(SPECS[kind].kind).toBe(kind);
  });

  it("los ids de cláusula son únicos", () => {
    const ids = allClauses().map((clause) => clause.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los ids siguen <tipo>.<sección>.<nombre>", () => {
    for (const clause of allClauses()) expect(clause.id).toMatch(/^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/);
  });

  it("hay exactamente un fixture representativo por cada familia legal", () => {
    const families = representativeFixtures().map((f) => sectorLegalProfile(f.company).family);
    expect(new Set(families).size).toBe(families.length);
    expect(families.length).toBe(Object.keys(FAMILIES).length);
  });

  it("las fixtures son de solo lectura (una prueba no puede alterar las de otra)", () => {
    const [first] = legalFixtures();
    expect(Object.isFrozen(legalFixtures())).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.company)).toBe(true);
  });
});

describe("instantáneas de texto por familia", () => {
  const byFamily = representativeFixtures().map((fixture) => ({ dir: sectorLegalProfile(fixture.company).family, fixture }));
  const cases = [...byFamily, ...extraRepresentatives()].flatMap(({ dir, fixture }) =>
    DOCUMENT_KINDS.map((kind) => [dir, fixture, kind] as const)
  );

  it.each(cases)("%s %#", async (dir, fixture, kind) => {
    const text = withFrozenWorld(() => buildDocument(kind, fixture.company, fixture.banks, fixture.providers));
    await expect(text).toMatchFileSnapshot(`./__snapshots__/${dir}/${kind}.md`);
  });
});
