import "server-only";

import { getDb } from "./db";

/**
 * Ventana fija por clave: permite `limit` intentos cada `windowMs`.
 * Devuelve false cuando la clave ya agotó su cupo en la ventana actual.
 * Vive en SQLite porque el despliegue es de un solo proceso (ver DECISIONS.md).
 */
export function takeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const db = getDb();
  const row = db.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").get(key) as
    | { window_start: number; count: number }
    | undefined;

  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`
    ).run(key, now);
    // Limpieza de ventanas viejas: se hace al abrir una ventana nueva.
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(now - 24 * 60 * 60 * 1000);
    return true;
  }

  if (row.count >= limit) return false;
  db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(key);
  return true;
}
