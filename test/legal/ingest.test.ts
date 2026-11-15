import { describe, expect, it } from "vitest";
import { applyTextFixes, splitArticles } from "@/legal/library/split";

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

  it("en una compilación anotada, la versión modificada reemplaza a la original", () => {
    const text = [
      "REGLAMENTO DE LA LEY",
      "Artículo 1.- Objeto",
      "Regula el libro.",
      "Artículo 2.- Plazo",
      "El proveedor responde en treinta días. (*)",
      "(*) Artículo modificado por el Artículo 1 del Decreto Supremo Nº 006-2014-PCM, publicado el 23 enero 2014, cuyo texto es el siguiente:",
      "“Artículo 2.- Plazo",
      "El proveedor responde en quince días hábiles.”",
      "Artículo 3.- Aviso",
      "Se exhibe un aviso.",
    ].join("\n");
    const out = splitArticles(text, { start: /^REGLAMENTO/m, amended: true });
    expect(out.map((a) => a.num)).toEqual(["1", "2", "3"]);
    const art2 = out.find((a) => a.num === "2")!;
    expect(art2.text).toContain("quince días hábiles");
    expect(art2.text).not.toContain("treinta");
    expect(art2.text).not.toContain("(*)");
    expect(art2.text).not.toMatch(/[“”]/);
  });

  it("código con sumilla en la línea anterior: el título es la sumilla y el texto empieza en el encabezado", () => {
    const text = [
      "LIBRO I",
      "Derecho a la intimidad",
      "Artículo 14.- La intimidad de la vida personal y familiar no puede ser puesta de manifiesto",
      "sin el asentimiento de la persona.",
      "Derecho a la imagen y voz",
      "Artículo 15.- La imagen y la voz de una persona no pueden ser aprovechadas sin autorización",
      "expresa de ella.",
    ].join("\n");
    const out = splitArticles(text, { start: /^LIBRO I$/m, sumilla: true });
    expect(out.map((a) => [a.num, a.title])).toEqual([
      ["14", "Derecho a la intimidad"],
      ["15", "Derecho a la imagen y voz"],
    ]);
    expect(out[0].text).toBe("La intimidad de la vida personal y familiar no puede ser puesta de manifiesto sin el asentimiento de la persona.");
    expect(out[1].text).toBe("La imagen y la voz de una persona no pueden ser aprovechadas sin autorización expresa de ella.");
  });

  it("una referencia «Artículo 59.» partida a mitad de frase no abre un artículo", () => {
    const text = [
      "LEY",
      "Artículo 59.- Derecho a la restitución",
      "El consumidor tiene derecho a la restitución.",
      "Artículo 60.- Irrenunciabilidad",
      "Es nula la renuncia anticipada, conforme a lo señalado en el",
      "Artículo 59.",
      "Artículo 61.- Métodos",
      "Texto.",
    ].join("\n");
    const out = splitArticles(text, { start: /^LEY$/m });
    expect(out.map((a) => a.num)).toEqual(["59", "60", "61"]);
    expect(out[1].text).toBe("Es nula la renuncia anticipada, conforme a lo señalado en el Artículo 59.");
  });

  describe("directiva numerada por puntos (sections)", () => {
    const text = [
      "DIRECTIVA N° 01-2020-JUS/DGTAIPD",
      "I. OBJETIVO",
      "Establecer las disposiciones.",
      "V. DEFINICIONES Y SIGLAS",
      "5.9 Días: Días hábiles.",
      "5.10 Dron:",
      "Aeronave no tripulada.",
      "5.16 Perfil:",
      "Conjunto de permisos.",
      "5.16.1 Perfil administrador:",
      "Accede a todo.",
      "VI. DISPOSICIONES GENERALES",
      "6.12 El informativo debe contener:",
      "6.12.4 El plazo durante el cual se conservarán los datos personales.",
      "Plazo de conservación o almacenamiento de la información grabada",
      "6.13 Las imágenes y/o voces grabadas se almacenan por un plazo de treinta (30) días",
      "y hasta un plazo máximo de sesenta (60), salvo disposición distinta en normas",
      "sectoriales.",
      "6.14 El registro de las imágenes debe ser informado a la Policía Nacional del",
      "Perú o al Ministerio Público, según corresponda.",
      "ANEXO 1",
      "9. SCLPD",
    ].join("\n");
    const out = splitArticles(text, { start: /^I\. OBJETIVO$/m, end: /^ANEXO 1$/m, sections: true });
    const byNum = Object.fromEntries(out.map((a) => [a.num, a]));

    it("cada punto de dos niveles es una entrada; los de tres niveles quedan dentro de su punto", () => {
      expect(out.map((a) => a.num)).toEqual(["5.9", "5.10", "5.16", "6.12", "6.13", "6.14"]);
      expect(byNum["5.16"].text).toBe("Perfil: Conjunto de permisos. 5.16.1 Perfil administrador: Accede a todo.");
    });

    it("el texto del punto empieza en su línea de encabezado (las definiciones se citan textualmente)", () => {
      expect(byNum["5.9"].text).toBe("Días: Días hábiles.");
      expect(byNum["6.13"].text).toBe(
        "Las imágenes y/o voces grabadas se almacenan por un plazo de treinta (30) días y hasta un plazo máximo de sesenta (60), salvo disposición distinta en normas sectoriales."
      );
    });

    it("el subtítulo previo es el título del punto y no queda en el texto del anterior", () => {
      expect(byNum["6.13"].title).toBe("Plazo de conservación o almacenamiento de la información grabada");
      expect(byNum["6.12"].text).toBe("El informativo debe contener: 6.12.4 El plazo durante el cual se conservarán los datos personales.");
      expect(byNum["5.9"].title).toBe("");
    });

    it("corta en el fin (anexos) y no abre puntos con los encabezados romanos", () => {
      expect(out.some((a) => a.num.startsWith("9"))).toBe(false);
      expect(out.some((a) => a.text.includes("OBJETIVO") || a.text.includes("DISPOSICIONES GENERALES"))).toBe(false);
    });
  });

  describe("correcciones de OCR (textFixes)", () => {
    it("aplica cada corrección una vez", () => {
      const raw = "A\n710 El empleador\nB";
      expect(applyTextFixes(raw, [{ from: "\n710 El empleador", to: "\n7.10 El empleador", page: 16, why: "número del margen" }])).toBe("A\n7.10 El empleador\nB");
    });

    it("falla si una corrección no aparece o aparece más de una vez (el PDF cambió)", () => {
      expect(() => applyTextFixes("A", [{ from: "X", to: "Y", page: 1, why: "w" }])).toThrow(/aparece 0 veces/);
      expect(() => applyTextFixes("X X", [{ from: "X", to: "Y", page: 1, why: "w" }])).toThrow(/aparece 2 veces/);
    });
  });

  it("rechaza un número de artículo repetido", () => {
    expect(() => splitArticles("REGLAMENTO DE LA LEY\nArtículo 1. A\nx\nArtículo 1. B\ny", { start: /^REGLAMENTO/m })).toThrow(/repetido/);
  });

  it("falla si no encuentra el inicio", () => {
    expect(() => splitArticles("nada", { start: /^REGLAMENTO/m })).toThrow(/inicio/);
  });
});
