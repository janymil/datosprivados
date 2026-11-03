import "server-only";

import crypto from "node:crypto";
import { getDb, nowIso } from "./db";

/**
 * Prueba de trabajo del formulario ARCO público (área 8).
 *
 * Los límites por IP son débiles detrás de un NAT compartido (un cibercafé, una
 * universidad) y gratis para un bot con muchas IPs. Un captcha resuelve esto
 * mejor, pero exige claves y un tercero (Cloudflare Turnstile, P0). Mientras
 * tanto: el formulario pide resolver un hash con N bits en cero, lo que cuesta
 * ~0,1 s a una persona y encarece cada envío automatizado.
 *
 * Diseño sin estado en el cliente ni dependencias:
 * - El servidor firma `salt|dificultad|expira` con HMAC (clave derivada de
 *   `FORM_POW_SECRET` o, si no existe, de `CRON_SECRET`).
 * - El navegador busca un contador tal que `sha256(salt + contador)` tenga N bits
 *   en cero y devuelve contador + el desafío firmado.
 * - El servidor comprueba firma, vigencia, dificultad y que el `salt` no se haya
 *   usado antes (tabla `pow_challenges`, consumo atómico).
 *
 * Se activa con `FORM_POW=1` y una clave. Apagado por defecto a propósito: el
 * formulario ARCO es la vía legal de una persona para ejercer sus derechos y no
 * puede romperse por un fallo de JavaScript. Ver docs/DECISIONS.md.
 */

const DEFAULT_BITS = 16; // ~65 000 hashes: imperceptible en un móvil
const CHALLENGE_TTL_MS = 30 * 60_000;
const RATE_LIMIT_CLEANUP_MS = 24 * 3_600_000;

export function powKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const secret = env.FORM_POW_SECRET?.trim() || env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return crypto.createHmac("sha256", secret).update("datosprivados/form-pow").digest();
}

export function formPowEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.FORM_POW === "1" && powKey(env) !== null;
}

export function powDifficulty(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.FORM_POW_BITS);
  if (Number.isInteger(configured) && configured >= 4 && configured <= 28) return configured;
  return DEFAULT_BITS;
}

/** Bits en cero al comienzo del hash. */
export function leadingZeroBits(hash: crypto.BinaryLike): number {
  const bytes = typeof hash === "string" ? Buffer.from(hash, "hex") : Buffer.from(hash as Buffer);
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    for (let mask = 0x80; mask > 0; mask >>= 1) {
      if ((byte & mask) === 0) bits += 1;
      else return bits;
    }
  }
  return bits;
}

/** Comprueba un contador contra el desafío. Exportado para pruebas y para el cliente. */
export function solveChallenge(salt: string, difficulty: number, maxIterations = 20_000_000): number | null {
  for (let counter = 0; counter < maxIterations; counter += 1) {
    const digest = crypto.createHash("sha256").update(`${salt}${counter}`).digest();
    if (leadingZeroBits(digest) >= difficulty) return counter;
  }
  return null;
}

export type Challenge = { salt: string; difficulty: number; expires: string; signature: string };

function sign(salt: string, difficulty: number, expires: string, key: Buffer): string {
  return crypto.createHmac("sha256", key).update(`${salt}|${difficulty}|${expires}`).digest("hex");
}

/** Crea un desafío, lo firma y reserva su `salt` para que solo sirva una vez. */
export function createChallenge(now = new Date()): Challenge | null {
  const key = powKey();
  if (!key) return null;
  const salt = crypto.randomBytes(16).toString("hex");
  const difficulty = powDifficulty();
  const expires = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();

  const db = getDb();
  // Limpieza oportunista: la tabla solo guarda desafíos de las últimas 24 h.
  db.prepare("DELETE FROM pow_challenges WHERE created_at <= ?").run(new Date(now.getTime() - RATE_LIMIT_CLEANUP_MS).toISOString());
  db.prepare("INSERT INTO pow_challenges (salt, created_at) VALUES (?, ?)").run(salt, now.toISOString());

  return { salt, difficulty, expires, signature: sign(salt, difficulty, expires, key) };
}

export type PowCheck = { ok: true } | { ok: false; reason: "formato" | "firma" | "expirado" | "dificultad" };

/** Comprobaciones sin estado: formato, firma, vigencia y que el contador cumpla la dificultad. */
export function verifyChallenge(input: Challenge & { counter: string }, now = new Date()): PowCheck {
  const key = powKey();
  if (!key) return { ok: false, reason: "firma" };

  const difficulty = Number(input.difficulty);
  const counter = Number(input.counter);
  if (
    !/^[0-9a-f]{32}$/i.test(input.salt ?? "") ||
    !Number.isInteger(difficulty) ||
    difficulty < 4 ||
    difficulty > 28 ||
    !Number.isInteger(counter) ||
    counter < 0 ||
    !/^[0-9a-f]{64}$/i.test(input.signature ?? "") ||
    !input.expires ||
    Number.isNaN(Date.parse(input.expires))
  ) {
    return { ok: false, reason: "formato" };
  }

  const expected = sign(input.salt, difficulty, input.expires, key);
  const given = input.signature.toLowerCase();
  if (expected.length !== given.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) {
    return { ok: false, reason: "firma" };
  }

  if (Date.parse(input.expires) <= now.getTime()) return { ok: false, reason: "expirado" };

  const digest = crypto.createHash("sha256").update(`${input.salt}${counter}`).digest();
  if (leadingZeroBits(digest) < difficulty) return { ok: false, reason: "dificultad" };

  return { ok: true };
}

/**
 * Marca el desafío como usado. Devuelve false si ya se había usado (reintento de
 * un mismo envío o alguien reutilizando una solución): sin esto, una sola
 * solución serviría para siempre.
 */
export function consumeChallenge(salt: string): boolean {
  const result = getDb()
    .prepare("UPDATE pow_challenges SET used_at = ? WHERE salt = ? AND used_at IS NULL")
    .run(nowIso(), salt);
  return Number(result.changes) === 1;
}
