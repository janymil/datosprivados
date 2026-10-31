import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

// Cada archivo de prueba usa su propia base SQLite, ya que la app la abre al primer uso.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp");
process.env.DATOSPRIVADOS_DB = path.join(dir, `${crypto.randomUUID()}.db`);
process.env.COOKIE_SECURE = "0";

// Mocks por defecto para que las Server Actions se llamen como funciones normales.
vi.mock("next/headers", async () => (await import("./next")).nextHeadersMock());
vi.mock("next/navigation", async () => (await import("./next")).nextNavigationMock());
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
