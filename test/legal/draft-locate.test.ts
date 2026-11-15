import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { applySpan, locateTarget } from "@/legal/draft/locate";
import { legalDataModuleTexts } from "@/legal/index-texts";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("localizar el texto a corregir en el código", () => {
  it("una cláusula: el objeto literal con ese id en src/legal/documents", () => {
    const span = locateTarget("aviso.nota.regla-practica")!;
    expect(span.kind).toBe("clause");
    expect(span.file).toBe("src/legal/documents/aviso.ts");
    expect(span.source.startsWith("{")).toBe(true);
    expect(span.source).toContain('id: "aviso.nota.regla-practica"');
    expect(read(span.file).slice(span.start, span.end)).toBe(span.source);
  });

  it("un hecho: su objeto en src/legal/facts.ts", () => {
    const span = locateTarget("cctv.conservacion")!;
    expect(span).toMatchObject({ kind: "fact", file: "src/legal/facts.ts" });
    expect(span.source).toContain('id: "cctv.conservacion"');
    expect(span.source).not.toContain("cctv.conservacion.educacion");
  });

  it("un texto de módulo heredado de BASE: el literal en BASE", () => {
    const span = locateTarget("sector-legal:FAMILIES.condominio.cctvDays")!;
    expect(span).toMatchObject({ kind: "module-string", file: "src/lib/sector-legal.ts" });
    expect(span.source).toBe('"30 a 60 días hábiles"');
  });

  it("un texto de módulo propio de la familia y un elemento de lista por slug", () => {
    const own = locateTarget("sector-legal:FAMILIES.condominio.norms[0]")!;
    expect(own.source).toMatch(/^"Ley N\.° 27157/);
    const bySlug = locateTarget("guides:GUIDES[ds-016-2024-jus-reglamento].sections[5].bullets[1]");
    expect(bySlug?.kind).toBe("module-string");
    expect(bySlug && read(bySlug.file).slice(bySlug.start, bySlug.end)).toBe(bySlug?.source);
  });

  it("lo que no es un texto localizable devuelve null", () => {
    expect(locateTarget("no.existe")).toBeNull();
    expect(locateTarget("src/lib/ai.ts")).toBeNull();
    expect(locateTarget("help:topicToPlainText:casos-especiales")).toBeNull();
    expect(locateTarget("sector-legal:FAMILIES.condominio.noExiste")).toBeNull();
  });

  it("cada texto de módulo localizado contiene exactamente el texto que muestra la app (y casi todos se localizan)", () => {
    const all = legalDataModuleTexts();
    const wrong: string[] = [];
    let found = 0;
    for (const { source, text } of all) {
      const span = locateTarget(source);
      if (!span) continue;
      found += 1;
      const init = (ts.createSourceFile("x.ts", `const v = ${span.source}`, ts.ScriptTarget.Latest, true).statements[0] as ts.VariableStatement)
        .declarationList.declarations[0].initializer!;
      if (ts.isStringLiteralLike(init) && init.text !== text) wrong.push(source);
    }
    expect(wrong).toEqual([]);
    expect(found / all.length).toBeGreaterThan(0.99);
  }, 120_000);

  it("applySpan reemplaza y rechaza un tramo que ya no coincide", () => {
    const span = locateTarget("aviso.nota.regla-practica")!;
    const next = applySpan(span, "{ X }", read(span.file));
    expect(next.slice(span.start, span.start + 5)).toBe("{ X }");
    expect(() => applySpan(span, "{ X }", next)).toThrow(/ya no coincide/);
  });
});
