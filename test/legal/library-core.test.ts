import { describe, expect, it } from "vitest";
import { legalLibrary } from "@/legal/library";

/**
 * Controles sobre el texto oficial ya separado (legal/library/). Si una nueva
 * descarga o un cambio del separador rompe la estructura, falla aquí.
 */
const lib = legalLibrary();
const title = (norm: string, num: string) => lib.findArticle(norm, num)?.article.title ?? "";
const arabic = (norm: string) =>
  lib.articlesOf(norm).filter((a) => /^\d+$/.test(a.num)).map((a) => Number(a.num));

describe("DS N.° 016-2024-JUS", () => {
  const id = "ds-016-2024-jus";

  it("tiene procedencia oficial", () => {
    const norm = lib.norms[id];
    expect(norm.status).toBe("vigente");
    expect(norm.officialUrl).toMatch(/^https:\/\/www3\.congreso\.gob\.pe\//);
    expect(norm.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separa los artículos clave con su título correcto", () => {
    expect(title(id, "34")).toMatch(/incidente de seguridad/i);
    expect(title(id, "69")).toMatch(/plazos de respuesta/i);
    expect(title(id, "8")).toMatch(/datos sensibles/i);
    expect(title(id, "18")).toMatch(/flujo transfronterizo/i);
    expect(title(id, "1")).toMatch(/consentimiento/i); // no el «Aprobación» del decreto aprobatorio
  });

  it("las definiciones están en el Artículo III del Título Preliminar", () => {
    expect(title(id, "III")).toMatch(/definiciones/i);
    expect(lib.findArticle(id, "III")?.article.text).toContain("6. Datos sensibles");
    expect(title(id, "2")).toMatch(/consentimiento/i); // el art. 2 no son definiciones
  });

  it("tiene los artículos 1 a 135 sin huecos ni repetidos", () => {
    const nums = arabic(id);
    expect(nums).toEqual(Array.from({ length: 135 }, (_, i) => i + 1));
  });
});

describe("texto limpio de las normas", () => {
  it("ningún artículo arrastra cabeceras de página ni sellos de El Peruano", () => {
    for (const id of ["ds-016-2024-jus", "ley-29733"])
      for (const a of lib.articlesOf(id)) expect(`${id}:${a.num} ${a.text}`).not.toMatch(/NORMAS LEGALES|ElPeruano|\d{4} El Peruano \/|Fecha: \d{2}\//);
  });

  it("el último artículo no arrastra disposiciones ni firmas", () => {
    expect(lib.findArticle("ds-016-2024-jus", "135")?.article.text).not.toMatch(/Disposici|POR TANTO|Comuníquese|Primera\./);
    expect(lib.findArticle("ley-29733", "40")?.article.text).not.toMatch(/Disposici|POR TANTO|Comuníquese|Primera\./);
  });

  it("las disposiciones complementarias se separan y se pueden citar", () => {
    expect(lib.findArticle("ds-016-2024-jus", "1DCF")?.article.title).toMatch(/vigencia/i);
    expect(lib.findArticle("ds-016-2024-jus", "1DCT")).not.toBeNull();
    expect(lib.findArticle("ley-29733", "1DCF")?.article.title).toMatch(/reglamento/i);
    // El calendario del Oficial de Datos está en una disposición complementaria final del DS.
    const odp = lib.articlesOf("ds-016-2024-jus").filter((a) => /DCF$/.test(a.num) && /Oficial de Datos/i.test(a.text));
    expect(odp.length).toBeGreaterThan(0);
  });
});

describe("Ley N.° 29733", () => {
  const id = "ley-29733";

  it("es la Ley y no el reglamento de 2013 publicado en el mismo PDF", () => {
    expect(title(id, "39")).toMatch(/sanciones/i);
    expect(title(id, "39")).not.toMatch(/seguridad/i);
    expect(title(id, "2")).toMatch(/definiciones/i);
    expect(title(id, "18")).toMatch(/derecho de información/i);
  });

  it("tiene los artículos 1 a 40 sin huecos ni repetidos", () => {
    expect(arabic(id)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it("declara que no es texto consolidado y quién la modifica", () => {
    expect(lib.norms[id].consolidated).toBe(false);
    for (const amender of lib.norms[id].amendedBy) expect(lib.norms[amender]).toBeDefined();
  });
});
