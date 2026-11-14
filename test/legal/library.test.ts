import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLibrary } from "@/legal/library";

const DEMO = path.join(import.meta.dirname, "fixtures", "library");

describe("biblioteca de normas", () => {
  const lib = loadLibrary(DEMO);

  it("carga cada norm.json y su id coincide con la carpeta", () => {
    expect(Object.keys(lib.norms).sort()).toEqual(["demo", "stub"]);
    expect(lib.norms.demo.title).toBe("Norma de prueba");
  });

  it("findArticle separa artículo e inciso", () => {
    expect(lib.findArticle("demo", "26.5")?.article.num).toBe("26");
    expect(lib.findArticle("demo", "26.5")?.item).toBe("5");
    expect(lib.findArticle("demo", "III.6")?.article.num).toBe("III");
    expect(lib.findArticle("demo", "III.6")?.item).toBe("6");
    expect(lib.findArticle("demo", "26")?.item).toBeUndefined();
    expect(lib.findArticle("demo", "99")).toBeNull();
  });

  it("una norma no verificada no tiene artículos", () => {
    expect(lib.norms.stub.status).toBe("no-verificada");
    expect(lib.articlesOf("stub")).toEqual([]);
    expect(lib.findArticle("stub", "1")).toBeNull();
  });

  it("encuentra la norma por cualquiera de sus alias, sin importar mayúsculas ni espacios", () => {
    expect(lib.normByAlias("DS N.° 999-2099-JUS")?.id).toBe("demo");
    expect(lib.normByAlias("ds  n.° 999-2099-jus")?.id).toBe("demo");
    expect(lib.normByAlias("Ley N.° 1")).toBeUndefined();
  });

  it("rechaza alias repetidos entre normas", () => {
    expect(() => loadLibrary(path.join(import.meta.dirname, "fixtures", "library-dup"))).toThrow(/alias repetido/);
  });

  it("la biblioteca real carga sin errores", () => {
    expect(() => loadLibrary()).not.toThrow();
  });
});
