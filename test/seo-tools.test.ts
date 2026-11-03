import { describe, expect, it } from "vitest";
import { FINE_TIERS, LEVE_EXAMPLES, UIT_2026, clampCount, fineRange, formatSoles, validUit } from "@/lib/fines";
import { GUIDES, getGuide } from "@/lib/guides";
import { SALES_BANDS } from "@/lib/sector-legal";
import { SIPDP_CHECKLIST, checklistText, plainText, policyTemplate } from "@/lib/templates";

/**
 * Herramientas públicas que atraen búsquedas: la calculadora de multas, el calendario de
 * plazos, el modelo de política y el checklist. Las cifras salen de la misma fuente que
 * usa el panel; estas pruebas impiden que la versión pública se desvíe.
 */

describe("calculadora de multas", () => {
  it("la escala coincide con el art. 39 y con la UIT 2026", () => {
    expect(UIT_2026).toBe(5500);
    expect(FINE_TIERS.leve).toMatchObject({ minUit: 0.5, maxUit: 5 });
    expect(FINE_TIERS.grave).toMatchObject({ minUit: 5, maxUit: 50 });
    expect(FINE_TIERS.muy_grave).toMatchObject({ minUit: 50, maxUit: 100 });
    expect(formatSoles(0.5 * UIT_2026)).toBe("S/ 2,750");
    expect(formatSoles(5 * UIT_2026)).toBe("S/ 27,500");
    expect(formatSoles(100 * UIT_2026)).toBe("S/ 550,000");
  });

  it("una infracción por tramo da el rango del tramo", () => {
    const leve = fineRange({ leve: 1, grave: 0, muy_grave: 0 });
    expect([leve.minSoles, leve.maxSoles]).toEqual([2750, 27500]);
    const muyGrave = fineRange({ leve: 0, grave: 0, muy_grave: 1 });
    expect([muyGrave.minSoles, muyGrave.maxSoles]).toEqual([275000, 550000]);
  });

  it("suma los rangos y respeta una UIT distinta", () => {
    const range = fineRange({ leve: 3, grave: 1, muy_grave: 0 }, 5000);
    expect(range.total).toBe(4);
    expect(range.minSoles).toBe(3 * 0.5 * 5000 + 5 * 5000);
    expect(range.maxSoles).toBe(3 * 5 * 5000 + 50 * 5000);
  });

  it("entradas inválidas no producen NaN ni montos negativos", () => {
    expect(clampCount(-3)).toBe(0);
    expect(clampCount(Number.NaN)).toBe(0);
    expect(clampCount(99)).toBe(20);
    expect(validUit(0)).toBe(UIT_2026);
    expect(validUit(Number.NaN)).toBe(UIT_2026);
    const range = fineRange({ leve: -1, grave: Number.NaN, muy_grave: 0 }, -5);
    expect(range.total).toBe(0);
    expect(range.maxSoles).toBe(0);
  });

  it("ofrece exactamente las tres infracciones leves documentadas", () => {
    expect(LEVE_EXAMPLES.map((item) => item.id)).toEqual(["bancos", "arco", "incidente"]);
  });
});

describe("guía de plazos del DS 016-2024-JUS", () => {
  const guide = getGuide("plazos-ds-016-2024-jus")!;
  const odpTable = guide.sections.find((section) => section.heading.includes("Oficial de Datos Personales"))!.table!;

  it("el calendario del ODP sale de SALES_BANDS, de la fecha más cercana a la más lejana", () => {
    expect(odpTable.rows).toHaveLength(SALES_BANDS.length);
    const dates = odpTable.rows.map((row) => row[3]);
    expect(dates).toEqual([
      "30 de noviembre de 2025",
      "30 de noviembre de 2026",
      "30 de noviembre de 2027",
      "30 de noviembre de 2028",
    ]);
    expect(odpTable.rows.map((row) => row[0])).toEqual(["Gran empresa", "Mediana empresa", "Pequeña empresa", "Microempresa"]);
  });

  it("cada fila de cada tabla tiene tantas celdas como columnas", () => {
    for (const g of GUIDES) {
      for (const section of g.sections) {
        if (!section.table) continue;
        for (const row of section.table.rows) {
          expect(row, `${g.slug} · ${section.heading}`).toHaveLength(section.table.head.length);
        }
      }
    }
  });
});

describe("modelo de política de privacidad", () => {
  const template = policyTemplate();

  it("es el generador del panel con los datos de la empresa entre corchetes", () => {
    expect(template).toContain("[RAZÓN SOCIAL]");
    expect(template).toContain("[RUC]");
    expect(template).toContain("[DOMICILIO LEGAL]");
    expect(template).toContain("[ENLACE A TU FORMULARIO DE DERECHOS ARCO]");
    expect(template).toContain("[ENLACE DONDE PUBLICAS ESTA POLÍTICA]");
    expect(template).toContain("[FECHA DE PUBLICACIÓN]");
    expect(template).toContain("Ley N.° 29733");
  });

  it("no deja rastros de la empresa de ejemplo ni de DatosPrivados", () => {
    expect(template).not.toContain("tu-empresa");
    expect(template).not.toMatch(/https?:\/\//);
    expect(template).not.toContain("Documento elaborado con DatosPrivados");
    expect(template).not.toContain("plantilla-");
  });

  it("el texto plano no conserva marcas de markdown", () => {
    const text = plainText(template);
    expect(text).not.toMatch(/\*\*|^## /m);
  });
});

describe("checklist del SIPDP", () => {
  it("la versión descargable incluye todos los puntos", () => {
    const text = checklistText();
    for (const section of SIPDP_CHECKLIST) {
      for (const item of section.items) expect(text).toContain(`[ ] ${item}`);
    }
    expect(text).toContain("31 de marzo de 2025");
  });
});
