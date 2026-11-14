import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lib/document-catalog";
import { changedByKind, renderAll } from "./render-all";

/**
 * Huellas de todos los documentos (cada tipo × cada fixture). Guardia permanente
 * del motor legal: cualquier cambio de texto, aunque no esté en las instantáneas
 * legibles, hace fallar esta prueba e indica qué tipos y fixtures cambiaron.
 *
 * - `WRITE_LEGAL_BASELINE=1` solo AGREGA huellas nuevas (por ejemplo, un rubro
 *   nuevo); nunca sobrescribe una existente.
 * - Cambiar una huella existente exige borrar el archivo y regenerarlo, con un
 *   motivo registrado y subiendo TEMPLATE_VERSIONS de los tipos afectados
 *   (diseño §5). El plan 3 automatiza ese paso con alcance por tipo.
 */
const FILE = path.join(import.meta.dirname, "baseline-hashes.json");
const sha = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

describe("huellas base de los documentos", () => {
  it("changedByKind agrupa por tipo los fixtures cambiados o ausentes", () => {
    const expected = { "a__1|politica": "x", "b__2|politica": "y", "a__1|cookies": "z", "c__3|arco": "w" };
    const current = { "a__1|politica": "x2", "b__2|politica": "y", "a__1|cookies": "z2" };
    expect(changedByKind(expected, current)).toEqual({ politica: ["a__1"], cookies: ["a__1"], arco: ["c__3 (falta)"] });
    expect(changedByKind(expected, { ...expected })).toEqual({});
  });

  it("cada documento coincide con su huella", () => {
    const current = Object.fromEntries([...renderAll(buildDocument)].map(([key, text]) => [key, sha(text)]));
    const stored: Record<string, string> = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
    if (process.env.WRITE_LEGAL_BASELINE === "1") {
      const added = Object.keys(current).filter((key) => !(key in stored));
      for (const key of added) stored[key] = current[key];
      if (added.length) fs.writeFileSync(FILE, `${JSON.stringify(stored, null, 1)}\n`);
    }
    const changed = changedByKind(stored, current);
    expect(changed, `documentos cambiados, por tipo:\n${JSON.stringify(changed, null, 1)}`).toEqual({});
    const unknown = Object.keys(current).filter((key) => !(key in stored));
    expect(unknown.length, `huellas nuevas sin registrar (agrégalas con WRITE_LEGAL_BASELINE=1): ${unknown.slice(0, 5).join(", ")}`).toBe(0);
  }, 180_000);
});
