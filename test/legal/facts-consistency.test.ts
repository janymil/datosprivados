import { describe, expect, it } from "vitest";
import { factNumber } from "@/legal/facts";
import { legalDataModuleTexts, sourceFileTexts } from "@/legal/index-texts";
import { legalModuleTexts } from "./modules";

/**
 * Coherencia texto / comportamiento: el plazo de incidentes aparece en ~90 textos
 * (páginas, ayuda, correos, guías). Todos deben decir el mismo número de horas que el
 * hecho legal que calcula el vencimiento. Si el hecho cambia, cada texto con el valor
 * viejo hace fallar esta prueba.
 */
const HOURS = /\b(\d{1,3})\s*h(?:oras)?\b/g;
/** Palabras de plazo ante la ANPD junto a las horas; «3 h» de una ruta de ayuda no cuenta. */
const ABOUT_DEADLINE = /ANPD|plazo|reloj|notific|vence|Evaluador|Incidentes? 48/i;

function incidentHourMentions(items: Array<{ source: string; text: string }>): Array<{ source: string; hours: number }> {
  const out: Array<{ source: string; hours: number }> = [];
  for (const { source, text } of items)
    for (const m of text.matchAll(HOURS)) {
      const around = text.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + 50);
      if (ABOUT_DEADLINE.test(around)) out.push({ source, hours: Number(m[1]) });
    }
  return out;
}

describe("coherencia de los textos con los hechos legales", () => {
  it("todo texto sobre el plazo de incidentes dice las horas del hecho legal", () => {
    const expected = factNumber("incidente.notificacion");
    const mentions = incidentHourMentions([...legalModuleTexts(), ...sourceFileTexts()]);
    expect(mentions.length).toBeGreaterThan(20);
    const wrong = mentions.filter((m) => m.hours !== expected && m.hours !== 0);
    expect(wrong.map((w) => `${w.source}: ${w.hours} h`)).toEqual([]);
  });

  it("los textos de sectores y pestañas de documentos están cubiertos", () => {
    const sources = legalDataModuleTexts().map((t) => t.source);
    expect(sources.some((s) => s.startsWith("sectors:SECTORS["))).toBe(true);
    expect(sources.some((s) => s.startsWith("document-catalog:DOCUMENT_TABS["))).toBe(true);
  });

  it("los ids de texto son estables: usan slug, id o key en vez de la posición", () => {
    const sources = legalDataModuleTexts().map((t) => t.source);
    expect(sources.some((s) => /^guides:GUIDES\[[a-z0-9-]+\]/.test(s))).toBe(true);
    expect(sources.some((s) => /^help:TOPICS\[[a-z0-9-]+\]/.test(s))).toBe(true);
    expect(sources.some((s) => /^sectors:SECTORS\[[a-z_]+\]/.test(s))).toBe(true);
  });

  it("el escaneo de código fuente incluye archivos .ts de lib y de acciones", () => {
    const files = sourceFileTexts().map((t) => t.source);
    expect(files).toContain("src/lib/mail-templates.ts");
    expect(files).toContain("src/app/actions/incidents.ts");
    expect(files).toContain("src/app/herramientas/calculadora-multas-ley-29733/page.tsx");
  });
}, 180_000);
