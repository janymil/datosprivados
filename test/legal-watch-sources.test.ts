import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fetchElPeruanoDay, parseElPeruano } from "@/lib/legal-watch/elperuano";
import { parseAnpd } from "@/lib/legal-watch/anpd";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "test/fixtures/legal-watch", name), "utf8");

describe("monitor de normas: fuentes", () => {
  it("El Peruano: 5 normas con emisor, título, fecha ISO, resumen y PDF", () => {
    const { items, structureOk } = parseElPeruano(fixture("elperuano-dia.html"));
    expect(structureOk).toBe(true);
    expect(items).toHaveLength(5);
    expect(items[0]).toMatchObject({
      source: "elperuano",
      external_id: "2575001-1",
      url: "https://busquedas.elperuano.pe/dispositivo/EX/2575001-1",
      pdf_url: "https://busquedas.elperuano.pe/dispositivo/EX/2575001-1/pdf",
      issuer: "DESARROLLO E INCLUSIÓN SOCIAL",
      title: "RESOLUCIÓN N° D000117-2026-MIDIS/P65-DE",
      published_on: "2026-11-14",
    });
    expect(items[0].summary).toMatch(/^Designan Jefa de la Unidad/);
    expect(items[2]).toMatchObject({ title: "DECRETO SUPREMO N° 151-2026-PCM", issuer: "PRESIDENCIA DEL CONSEJO DE MINISTROS" });
  });

  it("El Peruano: sin el marcador de la página, structureOk = false", () => {
    expect(parseElPeruano("<html><body>Mantenimiento</body></html>")).toEqual({ items: [], structureOk: false });
  });

  it("El Peruano: una página válida sin normas (domingo) no es un cambio de estructura", () => {
    expect(parseElPeruano('<div id="NormasEPPortal"></div>').structureOk).toBe(true);
  });

  it("El Peruano: un artículo con otra clase u otro atributo se lee igual", () => {
    const html = '<div id="NormasEPPortal"><article class="edicionesoficiales_articulos destacado" data-id="9"><h4>SALUD</h4><h5><a href="https://busquedas.elperuano.pe/dispositivo/NL/9-1">RESOLUCIÓN N° 1-2027</a></h5><p><b>Fecha: 02/01/2027</b></p><p>Resumen</p></article></div>';
    expect(parseElPeruano(html).items).toHaveLength(1);
  });

  it("El Peruano: artículos que el parser no reconoce son un cambio de estructura, no un día vacío", () => {
    expect(parseElPeruano('<div id="NormasEPPortal"><article class="norma-nueva"><h4>SALUD</h4></article></div>').structureOk).toBe(false);
  });

  it("fetchElPeruanoDay envía cddesde y cdhasta dd/mm/yyyy", async () => {
    const fetchImpl = vi.fn(async () => new Response(fixture("elperuano-dia.html"), { status: 200 }));
    const result = await fetchElPeruanoDay("2026-11-12", fetchImpl as never);
    expect(result.items).toHaveLength(5);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://diariooficial.elperuano.pe/Normas/Filtro?dateparam=");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toBe("cddesde=12%2F11%2F2026&cdhasta=12%2F11%2F2026");
  });

  it("fetchElPeruanoDay: una respuesta HTTP de error lanza (la fuente queda fallando)", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(fetchElPeruanoDay("2026-11-12", fetchImpl as never)).rejects.toThrow("El Peruano HTTP 503");
  });

  it("ANPD: 5 entradas con id, título y fecha", () => {
    const { items, structureOk } = parseAnpd(fixture("anpd-normas.html"));
    expect(structureOk).toBe(true);
    expect(items).toHaveLength(5);
    for (const i of items) {
      expect(i.source).toBe("anpd");
      expect(i.external_id).toMatch(/^\d+$/);
      expect(i.url).toMatch(/^https:\/\/www\.gob\.pe\/institucion\/anpd\/normas-legales\/\d+/);
      expect(i.title.length).toBeGreaterThan(5);
      expect(i.title).not.toBe("Leer más");
    }
    expect(items.some((i) => /29733/.test(i.title))).toBe(true);
    expect(items.some((i) => i.published_on === "2011-07-03")).toBe(true);
  });
});
