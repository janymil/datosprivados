import { describe, expect, it } from "vitest";
import { getDb, newId, nowIso } from "@/lib/db";
import { impactOf, libraryNumbers, prefilter, triage } from "@/lib/legal-watch/triage";
import type { NewWatchItem } from "@/lib/legal-watch/store";
import { makeActiveCompany } from "./helpers/db";

const item = (over: Partial<NewWatchItem> = {}): NewWatchItem => ({
  source: "elperuano",
  external_id: "1-1",
  url: "https://busquedas.elperuano.pe/dispositivo/NL/1-1",
  pdf_url: null,
  issuer: "DESARROLLO E INCLUSIÓN SOCIAL",
  title: "RESOLUCIÓN N° D000117-2026-MIDIS/P65-DE",
  summary: "Designan Jefa de la Unidad de Tecnologías de la Información",
  published_on: "2026-11-14",
  ...over,
});

describe("monitor de normas: filtro, triaje e impacto", () => {
  it("pasa el filtro: emisor MINJUS o ANPD, palabra clave o número de una norma de la biblioteca; no pasa: una designación en MIDIS", () => {
    expect(libraryNumbers()).toEqual(expect.arrayContaining(["29733", "016-2024-JUS"]));
    expect(prefilter(item())).toBe(false);
    expect(prefilter(item({ issuer: "JUSTICIA Y DERECHOS HUMANOS" }))).toBe(true);
    expect(prefilter(item({ summary: "Aprueban lineamientos sobre videovigilancia en mercados" }))).toBe(true);
    expect(prefilter(item({ summary: "Modifican el artículo 3 del Decreto Supremo N° 016-2024-JUS" }))).toBe(true);
    expect(prefilter(item({ title: "DECRETO SUPREMO N° 050-2027-PCM", summary: "Modifican el Reglamento aprobado por Decreto Supremo N° 011-2011-PCM" }))).toBe(true); // 011-2011-PCM está en la biblioteca
    expect(prefilter(item({ source: "anpd", issuer: "", summary: "" }))).toBe(true);
  });

  it("triaje: lee el JSON aunque venga con texto alrededor; JSON inválido → null", async () => {
    const reply = 'Claro:\n```json\n{"relevance":"amends","norms":["ds-016-2024-jus","inventada"],"articles":["69"],"reason":"Cambia los plazos ARCO"}\n```';
    const result = await triage(item(), { call: (async () => reply) as never });
    expect(result).toEqual({ relevance: "amends", norms: ["ds-016-2024-jus"], articles: ["69"], reason: "Cambia los plazos ARCO" });
    expect(await triage(item(), { call: (async () => "no sé") as never })).toBeNull();
    expect(await triage(item(), { call: (async () => null) as never })).toBeNull();
  });

  it("impacto de ds-016-2024-jus 69: cláusulas de arco, tipos de documento y clientes activos con esos documentos", () => {
    const { companyId } = makeActiveCompany();
    getDb()
      .prepare("INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at) VALUES (?, ?, 'arco', 'ARCO', 'x', 1, 0, ?)")
      .run(newId(), companyId, nowIso());
    const impact = impactOf(["ds-016-2024-jus"], ["69"]);
    expect(impact.sources.some((s) => s.kind === "clause" && s.source.startsWith("arco."))).toBe(true);
    expect(impact.documentKinds).toContain("arco");
    expect(impact.customers).toBeGreaterThanOrEqual(1);
  });

  it("impacto sin artículos: todo lo que cita esa norma", () => {
    const impact = impactOf(["ley-29733"], []);
    expect(impact.sources.length).toBeGreaterThan(5);
  });
});
