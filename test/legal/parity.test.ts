import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lib/document-catalog";
import { legacyBuildDocument } from "@/legal/legacy/documents";
import { legalFixtures } from "./fixtures";
import { DOCUMENT_KINDS, firstDiff, withFrozenWorld } from "./render-all";

/**
 * Paridad durante la migración: el motor nuevo debe producir exactamente el mismo
 * texto que la copia congelada de los generadores, para cada empresa de prueba.
 * Se borra en la tarea 7 junto con la copia legacy.
 */
describe("paridad motor nuevo / legacy", () => {
  it.each(DOCUMENT_KINDS)("%s: idéntico para cada fixture", (kind) => {
    withFrozenWorld(() => {
      for (const f of legalFixtures()) {
        const expected = legacyBuildDocument(kind, f.company, f.banks, f.providers);
        const actual = buildDocument(kind, f.company, f.banks, f.providers);
        if (expected !== actual) throw new Error(`${f.id} ${kind}\n${firstDiff(expected, actual)}`);
      }
    });
  });

  it("firstDiff nombra la primera línea distinta", () => {
    expect(firstDiff("a\nb\nc", "a\nX\nc")).toBe("line 2\n- b\n+ X");
    expect(firstDiff("same", "same")).toBe("");
  });
});
