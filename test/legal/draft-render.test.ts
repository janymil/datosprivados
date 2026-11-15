import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { locateTarget } from "@/legal/draft/locate";
import { clauseCitationsOverFixtures } from "./render-all";
import { renderDetailed, renderTarget } from "./draft/render";

/**
 * El render escribe el borrador un momento en el archivo de la cláusula: se prueba sobre una copia
 * del repositorio, nunca sobre los archivos reales (las demás pruebas los leen en paralelo).
 */
let root = "";
// Solo lo que el render usa: en la copia del servidor test/ tiene gigas de resultados generados.
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "render-repo-"));
  for (const dir of ["src", "test/legal", "test/helpers", "legal/library"]) fs.cpSync(path.join(process.cwd(), dir), path.join(root, dir), { recursive: true });
  for (const file of ["vitest.draft.config.ts", "package.json", "tsconfig.json"]) fs.copyFileSync(path.join(process.cwd(), file), path.join(root, file));
  fs.symlinkSync(path.join(process.cwd(), "node_modules"), path.join(root, "node_modules"));
}, 120_000);

describe("cómo ven los clientes un borrador", () => {
  it("una cláusula modificada se ve con el texto nuevo y el archivo queda como estaba", async () => {
    const span = locateTarget("aviso.nota.regla-practica", root)!;
    const file = path.join(root, span.file);
    const before = fs.readFileSync(file, "utf8");
    const now = await renderTarget(span, span.source, root);
    expect(now[0]).toContain("Regla práctica");
    const changed = await renderTarget(span, span.source.replace("Regla práctica:", "Regla práctica nueva:"), root);
    expect(changed[0]).toContain("Regla práctica nueva:");
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  }, 120_000);

  it("un texto de módulo se ve como su literal", async () => {
    const span = locateTarget("sector-legal:FAMILIES.condominio.cctvDays", root)!;
    expect(await renderTarget(span, '"30 a 60 días hábiles (punto 6.13)"', root)).toEqual(["30 a 60 días hábiles (punto 6.13)"]);
  });

  it("si el borrador rompe el archivo, falla y lo deja como estaba", async () => {
    const span = locateTarget("aviso.nota.regla-practica", root)!;
    const file = path.join(root, span.file);
    const before = fs.readFileSync(file, "utf8");
    await expect(renderTarget(span, span.source.replace('id: "aviso.nota.regla-practica"', 'id: "otro.id"'), root)).rejects.toThrow(/ya no existe/);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  }, 120_000);

  it("da también las citas que el texto produce en todas las combinaciones (como la prueba de citas)", async () => {
    const span = locateTarget("aviso.nota.regla-practica", root)!;
    const out = await renderDetailed(span, span.source, root);
    expect(out.cites).toEqual(clauseCitationsOverFixtures().get("aviso.nota.regla-practica")!.map((c) => ({ norm: c.norm, art: c.art })));
  }, 120_000);
});
