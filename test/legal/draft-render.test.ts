import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locateTarget } from "@/legal/draft/locate";
import { clauseCitationsOverFixtures } from "./render-all";
import { renderDetailed, renderTarget } from "./draft/render";

describe("cómo ven los clientes un borrador", () => {
  it("una cláusula modificada se ve con el texto nuevo y el archivo queda como estaba", async () => {
    const span = locateTarget("aviso.nota.regla-practica")!;
    const file = path.join(process.cwd(), span.file);
    const before = fs.readFileSync(file, "utf8");
    const now = await renderTarget(span, span.source);
    expect(now[0]).toContain("Regla práctica");
    const changed = await renderTarget(span, span.source.replace("Regla práctica:", "Regla práctica nueva:"));
    expect(changed[0]).toContain("Regla práctica nueva:");
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  }, 120_000);

  it("un texto de módulo se ve como su literal", async () => {
    const span = locateTarget("sector-legal:FAMILIES.condominio.cctvDays")!;
    expect(await renderTarget(span, '"30 a 60 días hábiles (punto 6.13)"')).toEqual(["30 a 60 días hábiles (punto 6.13)"]);
  });

  it("si el borrador rompe el archivo, falla y lo deja como estaba", async () => {
    const span = locateTarget("aviso.nota.regla-practica")!;
    const file = path.join(process.cwd(), span.file);
    const before = fs.readFileSync(file, "utf8");
    await expect(renderTarget(span, span.source.replace('id: "aviso.nota.regla-practica"', 'id: "otro.id"'))).rejects.toThrow(/ya no existe/);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  }, 120_000);
  it("da también las citas que el texto produce en todas las combinaciones (como la prueba de citas)", async () => {
    const span = locateTarget("aviso.nota.regla-practica")!;
    const out = await renderDetailed(span, span.source);
    expect(out.cites).toEqual(clauseCitationsOverFixtures().get("aviso.nota.regla-practica")!.map((c) => ({ norm: c.norm, art: c.art })));
  }, 120_000);
});
