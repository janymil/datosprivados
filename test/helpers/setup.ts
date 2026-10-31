import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cada archivo de prueba usa su propia base SQLite, ya que la app la abre al primer uso.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp");
process.env.DATOSPRIVADOS_DB = path.join(dir, `${crypto.randomUUID()}.db`);
process.env.COOKIE_SECURE = "0";
