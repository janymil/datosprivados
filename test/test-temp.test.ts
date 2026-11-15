import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Las pruebas no dejan basura en el disco: cada archivo de prueba trabaja en su propia carpeta
 * temporal dentro de test/.tmp (incluida su base SQLite), que la configuración borra al terminar.
 * Antes, las copias y carpetas de las pruebas llenaron el disco del servidor (más de 25 GB).
 */
describe("archivos temporales de las pruebas", () => {
  it("os.tmpdir() y la base de la prueba están en la carpeta temporal de este archivo", () => {
    const tmp = os.tmpdir();
    expect(tmp).toContain(`${path.sep}test${path.sep}.tmp${path.sep}`);
    expect(path.dirname(process.env.DATOSPRIVADOS_DB!)).toBe(tmp);
    expect(fs.existsSync(tmp)).toBe(true);
  });
});
