import { describe, expect, it } from "vitest";
import { OPERATOR_LINKS } from "@/components/operator-nav";
import { ROADMAP, ROADMAP_STATUSES, roadmapByStatus } from "@/lib/roadmap";

describe("hoja de ruta del operador", () => {
  it("cada idea tiene id único, título, resumen, estado válido y fuente", () => {
    const ids = ROADMAP.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ROADMAP) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.title.length).toBeGreaterThan(3);
      expect(item.summary.length).toBeGreaterThan(10);
      expect(ROADMAP_STATUSES).toContain(item.status);
      expect(item.source.length).toBeGreaterThan(3);
      expect(item.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("guarda lo acordado para no olvidarlo", () => {
    const ids = ROADMAP.map((item) => item.id);
    for (const id of [
      "oficial-datos-externo",
      "revision-abogado",
      "libro-reclamaciones-incluido",
      "escaner-web-librodigital",
      "motor-legal",
      "politica-precios",
    ])
      expect(ids).toContain(id);
  });

  it("agrupa por estado en el orden en curso, planificado, idea, hecho", () => {
    const groups = roadmapByStatus();
    expect(groups.map((group) => group.status)).toEqual(ROADMAP_STATUSES.filter((s) => groups.some((g) => g.status === s)));
    expect(groups.flatMap((group) => group.items)).toHaveLength(ROADMAP.length);
  });

  it("el menú del operador enlaza la hoja de ruta", () => {
    expect(OPERATOR_LINKS.map((link) => link.href)).toContain("/operador/hoja-de-ruta");
  });
});
