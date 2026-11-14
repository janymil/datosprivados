import { describe, expect, it } from "vitest";
import { splitArticles } from "@/legal/library/split";

const SAMPLE = [
  "DECRETO SUPREMO",
  "Artículo 1. Aprobación",
  "Apruébase el Reglamento.",
  "REGLAMENTO DE LA LEY Nº 29733,",
  "TÍTULO PRELIMINAR",
  "Artículo III. Deﬁniciones",
  "Para efectos del Reglamento:",
  "6. Datos sensibles: Es aquella informa-",
  "ción relativa a la salud.",
  "TÍTULO I",
  "CAPÍTULO I",
  "Artículo 1. El consentimiento para el tratamiento de",
  "datos personales",
  "1.1 El titular debe obtener el consentimiento.",
  "Artículo 2.- Características del consentimiento.",
  "El consentimiento es libre.",
  "DECRETO SUPREMO Nº 003-2013-JUS",
  "Artículo 39.- Seguridad",
  "Texto de otra norma.",
].join("\n");

const OPTS = { start: /^REGLAMENTO DE LA LEY/m, end: /^DECRETO SUPREMO N/m };

describe("splitArticles", () => {
  const articles = splitArticles(SAMPLE, OPTS);

  it("ignora lo anterior al inicio y lo posterior al fin", () => {
    expect(articles.map((a) => a.num)).toEqual(["III", "1", "2"]);
  });

  it("reconoce números romanos y arábigos, con punto o con punto y guion", () => {
    expect(articles[0].title).toBe("Definiciones");
    expect(articles[2].title).toBe("Características del consentimiento");
  });

  it("une el título partido en dos líneas", () => {
    expect(articles[1].title).toBe("El consentimiento para el tratamiento de datos personales");
  });

  it("normaliza ligaduras y une palabras cortadas con guion", () => {
    expect(articles[0].text).toContain("6. Datos sensibles: Es aquella información relativa a la salud.");
    expect(articles[0].title).not.toContain("ﬁ");
  });

  it("no mete los encabezados de título o capítulo en el texto del artículo", () => {
    expect(articles[0].text).not.toMatch(/TÍTULO|CAPÍTULO/);
  });

  it("calcula una huella por artículo", () => {
    expect(articles[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(articles.map((a) => a.sha256)).size).toBe(3);
  });

  it("reconoce el encabezado sin espacios y entre comillas (artículo modificado)", () => {
    const out = splitArticles(
      "REGLAMENTO\nArtículo54.Copiaoreproducción\n54.1 Texto.\n“Artículo 2. Definiciones\nPara efectos de la Ley.",
      { start: /^REGLAMENTO/m }
    );
    expect(out.map((a) => a.num)).toEqual(["54", "2"]);
  });

  it("al unir el título partido, deja en el cuerpo lo que empieza con mayúscula", () => {
    const out = splitArticles(
      "REGLAMENTO\n“Artículo 18. Derecho de información del titular\nde datos personales El titular de datos personales\ntiene derecho a ser informado.",
      { start: /^REGLAMENTO/m }
    );
    expect(out[0].title).toBe("Derecho de información del titular de datos personales");
    expect(out[0].text).toBe("El titular de datos personales tiene derecho a ser informado.");
  });

  it("quita cabeceras de página, sellos y códigos de El Peruano del texto", () => {
    const out = splitArticles(
      [
        "REGLAMENTO",
        "Artículo 26. Publicidad",
        "26.1 El tratamiento de productos y",
        "9 Sábado 30 de noviembre de 2024 El Peruano /",
        "2 NORMAS LEGALES Sábado 30 de noviembre de 2024 ElPeruano",
        "/",
        "NORMAS LEGALES actualizadas",
        "Fecha: 30/11/2024 02:31",
        "12",
        "servicios es lícito.",
        "2349653-1",
      ].join("\n"),
      { start: /^REGLAMENTO/m }
    );
    expect(out[0].text).toBe("26.1 El tratamiento de productos y servicios es lícito.");
  });

  it("separa las disposiciones complementarias y corta en la firma", () => {
    const out = splitArticles(
      [
        "REGLAMENTO",
        "Artículo 135. Reincidencia",
        "135.1 Texto final.",
        "DISPOSICIONES COMPLEMENTARIAS",
        "FINALES",
        "Primera. Vigencia",
        "El Reglamento entra en vigencia.",
        "Segunda. Oficial de Datos Personales",
        "El ODP es exigible según el calendario.",
        "DISPOSICIONES COMPLEMENTARIAS",
        "TRANSITORIAS",
        "PRIMERA. Conductas infractoras",
        "Se rigen por la norma anterior.",
        "POR TANTO:",
        "Mando se publique y cumpla.",
      ].join("\n"),
      { start: /^REGLAMENTO/m }
    );
    expect(out.map((a) => a.num)).toEqual(["135", "1DCF", "2DCF", "1DCT"]);
    expect(out[0].text).toBe("135.1 Texto final.");
    expect(out[2].title).toBe("Oficial de Datos Personales");
    expect(out[3].text).toBe("Se rigen por la norma anterior.");
  });

  it("rechaza un número de artículo repetido", () => {
    expect(() => splitArticles("REGLAMENTO DE LA LEY\nArtículo 1. A\nx\nArtículo 1. B\ny", { start: /^REGLAMENTO/m })).toThrow(/repetido/);
  });

  it("falla si no encuentra el inicio", () => {
    expect(() => splitArticles("nada", { start: /^REGLAMENTO/m })).toThrow(/inicio/);
  });
});
