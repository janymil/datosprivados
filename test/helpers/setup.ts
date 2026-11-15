import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, vi } from "vitest";

// Cada archivo de prueba trabaja en su propia carpeta temporal dentro de test/.tmp: su base SQLite
// (la app la abre al primer uso) y todo lo que cree con os.tmpdir() —también los procesos que
// lance—. Al terminar el archivo se borra entera: antes, bases y copias temporales llenaron el
// disco del servidor (más de 25 GB).
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp", crypto.randomUUID());
// En un clon limpio (CI) la carpeta no existe y SQLite falla con "unable to open database file":
// `getDb()` solo crea la carpeta de la base por defecto (`data/`), no la de `DATOSPRIVADOS_DB`.
fs.mkdirSync(dir, { recursive: true });
process.env.TMPDIR = dir;
process.env.DATOSPRIVADOS_DB = path.join(dir, "test.db");
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
process.env.COOKIE_SECURE = "0";
// Sin la pausa de cortesía del monitor de normas entre pedidos a El Peruano y gob.pe.
process.env.LEGAL_WATCH_POLITE_MS = "0";

// Mocks por defecto para que las Server Actions se llamen como funciones normales.
vi.mock("next/headers", async () => (await import("./next")).nextHeadersMock());
vi.mock("next/navigation", async () => (await import("./next")).nextNavigationMock());
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
