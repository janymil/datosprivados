import { describe, expect, it } from "vitest";
import { parseCitations } from "@/legal/citations";

const D = "ds-016-2024-jus";
const refs = (text: string) => parseCitations(text, D).map((c) => `${c.norm}:${c.art}`);

describe("parseCitations (formas reales de los documentos)", () => {
  it("menciones simples usan la norma por defecto", () => {
    expect(refs("(art. 26.5)")).toEqual(["ds-016-2024-jus:26.5"]);
    expect(refs("revisión de privilegios (art. 46.1.c)")).toEqual(["ds-016-2024-jus:46.1.c"]);
  });

  it("rangos «a» se expanden a cada artículo", () => {
    expect(refs("(arts. 46 a 51)")).toEqual([46, 47, 48, 49, 50, 51].map((n) => `${D}:${n}`));
    expect(parseCitations("arts. 61 a 88 del DS N.° 016-2024-JUS", D)).toHaveLength(28);
  });

  it("listas con «y» y con comas", () => {
    expect(refs("(art. 66.4 y 66.5)")).toEqual([`${D}:66.4`, `${D}:66.5`]);
    expect(refs("(arts. 10.2 y 26.5)")).toEqual([`${D}:10.2`, `${D}:26.5`]);
    expect(refs("(art. 6.1.3 y 6.1.7)")).toEqual([`${D}:6.1.3`, `${D}:6.1.7`]);
    expect(refs("arts. 28 a 33 y 36")).toEqual([28, 29, 30, 31, 32, 33, 36].map((n) => `${D}:${n}`));
  });

  it("la norma nombrada después de la mención", () => {
    expect(refs("art. 5 y 13.5 de la Ley N.° 29733")).toEqual(["ley-29733:5", "ley-29733:13.5"]);
    expect(refs("Art. 5, 13 y 18 de la Ley N.° 29733")).toEqual(["ley-29733:5", "ley-29733:13", "ley-29733:18"]);
    expect(refs("art. 2.6 del DS N.° 016-2024-JUS")).toEqual(["ds-016-2024-jus:2.6"]);
    expect(refs("art. 9 del DS 016-2024-JUS: la carga")).toEqual(["ds-016-2024-jus:9"]);
    expect(refs("**arts. 46 a 47 del Decreto Supremo N.° 016-2024-JUS**")).toEqual([`${D}:46`, `${D}:47`]);
    expect(refs("todo lo del art. 18 de la Ley (art. 74)")).toEqual(["ley-29733:18", `${D}:74`]);
    expect(refs("art. 8 del Reglamento")).toEqual([`${D}:8`]);
  });

  it("numeral escrito como «num.» o «numeral»", () => {
    expect(refs("art. 14, num. 5 de la Ley N.° 29733")).toEqual(["ley-29733:14.5"]);
    expect(refs("(art. 14, numeral 5, de la Ley)")).toEqual(["ley-29733:14.5"]);
  });

  it("la norma nombrada antes de la mención", () => {
    expect(refs("(Código Civil, art. 15)")).toEqual(["codigo-civil:15"]);
    expect(refs("la **Ley N.° 29733** (art. 16) y de los")).toEqual(["ley-29733:16"]);
  });

  it("«artículo» escrito completo", () => {
    expect(refs("Conforme al artículo 17 de la Ley N.° 29733, esta obligación")).toEqual(["ley-29733:17"]);
  });

  it("una norma que no está en la biblioteca queda marcada como desconocida", () => {
    expect(refs("Art. 24 del DS N.° 099-2099-JUS")).toEqual(["desconocida:DS N.° 099-2099-JUS:24"]);
    expect(refs("Art. 24 del DS N.° 020-2017-JUS")).toEqual(["ds-020-2017-jus:24"]);
  });

  it("los artículos del Título Preliminar en romanos", () => {
    expect(refs("(art. III.6)")).toEqual([`${D}:III.6`]);
  });

  it("no inventa citas", () => {
    expect(refs("Primera Disposición Complementaria Final")).toEqual([]);
    expect(refs("los artículos de limpieza y 2 años")).toEqual([]);
  });

  it("sin repetidos y en orden de aparición", () => {
    expect(refs("(art. 87) … (art. 87) … (art. 69)")).toEqual([`${D}:87`, `${D}:69`]);
  });
});
