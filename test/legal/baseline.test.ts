import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lib/document-catalog";
import { renderAll } from "./render-all";

/**
 * Huellas de todos los documentos (cada tipo × cada fixture). Protege contra
 * cambios en los datos compartidos (`sector-legal.ts`), que la copia legacy
 * seguiría en silencio, y queda como guardia permanente tras la migración.
 *
 * Actualizar este archivo solo se permite con un motivo registrado y subiendo
 * TEMPLATE_VERSIONS de los tipos afectados (diseño §5).
 */
const FILE = path.join(import.meta.dirname, "baseline-hashes.json");
const sha = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

describe("huellas base de los documentos", () => {
  it("cada documento coincide con su huella", () => {
    const current = Object.fromEntries([...renderAll(buildDocument)].map(([key, text]) => [key, sha(text)]));
    if (!fs.existsSync(FILE) && process.env.WRITE_LEGAL_BASELINE === "1") {
      fs.writeFileSync(FILE, `${JSON.stringify(current, null, 1)}\n`);
    }
    const expected = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, string>;
    expect(Object.keys(current).sort()).toEqual(Object.keys(expected).sort());
    const changed = Object.keys(expected).filter((key) => expected[key] !== current[key]);
    expect(changed).toEqual([]);
  });
});
