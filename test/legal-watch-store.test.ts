import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import {
  listWatchItems,
  recordSourceError,
  recordSourceOk,
  setWatchStatus,
  sourceHealth,
  upsertWatchItems,
  type NewWatchItem,
} from "@/lib/legal-watch/store";

const DAY = 24 * 60 * 60 * 1000;
const item = (over: Partial<NewWatchItem> = {}): NewWatchItem => ({
  source: "elperuano",
  external_id: `2575001-${Math.random().toString(36).slice(2, 8)}`,
  url: "https://busquedas.elperuano.pe/dispositivo/NL/2575001-1",
  pdf_url: "https://busquedas.elperuano.pe/dispositivo/NL/2575001-1/pdf",
  issuer: "JUSTICIA Y DERECHOS HUMANOS",
  title: "DECRETO SUPREMO N° 001-2027-JUS",
  summary: "Modifican el Reglamento de la Ley N° 29733",
  published_on: "2027-01-10",
  ...over,
});

describe("monitor de normas: almacén", () => {
  it("migración v19 crea las tablas", () => {
    const tables = (getDb().prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(["legal_watch_items", "legal_watch_sources"]));
  });

  it("inserta una vez por fuente e id externo", () => {
    const a = item({ external_id: "999-1" });
    expect(upsertWatchItems([a, { ...a }, item({ external_id: "999-1", source: "anpd" })])).toBe(2);
    expect(upsertWatchItems([a])).toBe(0);
    const rows = listWatchItems({}).filter((r) => r.external_id === "999-1");
    expect(rows.map((r) => r.source).sort()).toEqual(["anpd", "elperuano"]);
    expect(rows.every((r) => r.status === "nuevo")).toBe(true);
  });

  it("cambia el estado y guarda el triaje", () => {
    upsertWatchItems([item({ external_id: "777-1" })]);
    const row = listWatchItems({}).find((r) => r.external_id === "777-1")!;
    setWatchStatus(row.id, "relevante", { relevance: "amends", reason: "Modifica el art. 69", norms: '["ds-016-2024-jus"]' });
    expect(listWatchItems({ status: ["relevante"] }).find((r) => r.id === row.id)).toMatchObject({ relevance: "amends", reason: "Modifica el art. 69" });
  });

  it("la salud cuenta días seguidos fallando y se reinicia al primer éxito", () => {
    const t0 = new Date("2027-01-10T12:00:00Z");
    recordSourceError("elperuano", "HTTP 503", t0);
    recordSourceError("elperuano", "HTTP 503", new Date(t0.getTime() + 3 * DAY));
    const failing = sourceHealth(new Date(t0.getTime() + 3 * DAY)).find((s) => s.source === "elperuano")!;
    expect(failing.failingDays).toBe(3);
    expect(failing.lastError).toBe("HTTP 503");

    recordSourceOk("elperuano", 71, new Date(t0.getTime() + 4 * DAY), true);
    const ok = sourceHealth(new Date(t0.getTime() + 4 * DAY)).find((s) => s.source === "elperuano")!;
    expect(ok).toMatchObject({ failingDays: 0, lastCount: 71, structureChanged: false });
  });

  it("registra una estructura distinta", () => {
    recordSourceOk("anpd", 0, new Date(), false);
    expect(sourceHealth(new Date()).find((s) => s.source === "anpd")!.structureChanged).toBe(true);
  });
});
