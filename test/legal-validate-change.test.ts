import { describe, expect, it } from "vitest";
import { validateChange } from "@/legal/validate-change";

const ID = "lc-20261114-abcdef";
const FRESH = (versions: string) => `export const TEMPLATE_VERSIONS: Record<DocumentKind, number> = {\n${versions}\n};\n`;
const BASE_FRESH = FRESH("  politica: 3,\n  terminos: 3,");
const KF = (entries: string[]) => JSON.stringify(entries.map((e) => ({ rule: "cite-misnumbered", clause: e, detail: "x" })));

function check(files: Record<string, string | null>, base: Record<string, string | null> = {}) {
  return validateChange({
    id: ID,
    changedFiles: Object.keys(files),
    read: (p) => (p in files ? files[p] : null),
    readBase: (p) => (p in base ? base[p] : p === "src/lib/document-freshness.ts" ? BASE_FRESH : null),
  });
}

describe("validateChange", () => {
  const log = { [`legal/changes/${ID}.md`]: "# Cambio\nMotivo." };

  it("acepta un cambio válido: registro, cláusula corregida, falla conocida quitada y versión subida", () => {
    expect(
      check(
        {
          ...log,
          "src/legal/documents/politica.ts": "…",
          "legal/known-failures/citations.json": KF(["a"]),
          "test/legal/baseline-hashes.json": "{}",
          "src/lib/document-freshness.ts": FRESH("  politica: 4,\n  terminos: 3,"),
        },
        { "legal/known-failures/citations.json": KF(["a", "b"]) }
      )
    ).toEqual([]);
  });

  it("exige el registro del cambio", () => {
    expect(check({ "src/legal/documents/politica.ts": "…" })).toEqual([`falta legal/changes/${ID}.md`]);
  });

  it("rechaza agregar fallas conocidas", () => {
    expect(
      check({ ...log, "legal/known-failures/citations.json": KF(["a", "b", "c"]) }, { "legal/known-failures/citations.json": KF(["a", "b"]) })
    ).toEqual(["legal/known-failures/citations.json agrega 1 falla(s) conocida(s): cite-misnumbered c x"]);
  });

  it("si cambia el texto de los documentos exige subir TEMPLATE_VERSIONS", () => {
    expect(check({ ...log, "test/legal/__snapshots__/comercio/politica.md": "nuevo" })).toEqual([
      "cambió el texto de los documentos pero no subió ninguna versión en TEMPLATE_VERSIONS (src/lib/document-freshness.ts)",
    ]);
    expect(check({ ...log, "test/legal/baseline-hashes.json": "{}" })).toHaveLength(1);
  });

  it("una rama legal no puede cambiar el validador que la juzga", () => {
    expect(check({ ...log, "src/legal/validate-change.ts": "export const validateChange = () => [];" })).toEqual([
      "una rama legal no puede cambiar sus propias reglas: src/legal/validate-change.ts",
    ]);
  });

  it("rechaza archivos fuera del área legal", () => {
    expect(check({ ...log, ".github/workflows/ci.yml": "x", "package.json": "{}" })).toEqual([
      "archivo fuera del área permitida: .github/workflows/ci.yml",
      "archivo fuera del área permitida: package.json",
    ]);
  });
});
