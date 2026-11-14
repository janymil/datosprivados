import { describe, expect, it } from "vitest";
import { allClauses, SPECS } from "@/legal/registry";
import { buildDocument } from "@/lib/document-catalog";
import { sectorLegalProfile } from "@/lib/sector-legal";
import { representativeFixtures } from "./fixtures";
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

  it("hay un fixture representativo por familia legal", () => {
    const families = representativeFixtures().map((f) => sectorLegalProfile(f.company).family);
    expect(new Set(families).size).toBe(families.length);
    expect(families.length).toBeGreaterThanOrEqual(20);
  });
});

describe("instantáneas de texto por familia", () => {
  const cases = representativeFixtures().flatMap((fixture) => DOCUMENT_KINDS.map((kind) => [fixture, kind] as const));

  it.each(cases)("%#", async (fixture, kind) => {
    const text = withFrozenWorld(() => buildDocument(kind, fixture.company, fixture.banks, fixture.providers));
    const family = sectorLegalProfile(fixture.company).family;
    await expect(text).toMatchFileSnapshot(`./__snapshots__/${family}/${kind}.md`);
  });
});
