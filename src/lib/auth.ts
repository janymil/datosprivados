import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, verifyPassword, type Company, type Role, type User } from "./db";

const COOKIE = "pdp_session";
const MAX_AGE = 60 * 60 * 24 * 30;

/** Cuenta de demostración que crea /demo; se usa para ofrecer una salida clara. */
export const DEMO_EMAIL = "demo@datosprivados.pe";

export type SessionContext = {
  user: Pick<User, "id" | "name" | "email" | "role">;
  company: Company;
};

export async function createSession(userId: string) {
  const db = getDb();
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + MAX_AGE * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    id,
    userId,
    expires
  );
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    // En producción sobre HTTPS define COOKIE_SECURE=1.
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
    jar.delete(COOKIE);
  }
}

export async function getSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.company_id
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`
    )
    .get(id, new Date().toISOString()) as
    | { id: string; name: string; email: string; role: string; company_id: string }
    | undefined;

  if (!row) return null;

  const company = db
    .prepare("SELECT * FROM companies WHERE id = ?")
    .get(row.company_id) as unknown as Company | undefined;
  if (!company) return null;

  return {
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
    company,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

const ROLE_RANK: Record<Role, number> = { lector: 0, responsable: 1, admin: 2 };

/** Un rol desconocido se trata como solo lectura: ante la duda, no se permite escribir. */
export function normalizeRole(role: string): Role {
  return role === "admin" || role === "responsable" ? role : "lector";
}

export function hasRole(role: string, min: Role): boolean {
  return ROLE_RANK[normalizeRole(role)] >= ROLE_RANK[min];
}

/**
 * Exige un rol mínimo. Toda acción que modifica datos debe usar esta función en
 * lugar de `requireSession`: la interfaz oculta botones, pero la comprobación
 * real está aquí, en el servidor.
 */
export async function requireRole(min: Role): Promise<SessionContext> {
  const session = await requireSession();
  if (!hasRole(session.user.role, min)) redirect("/app?denegado=1");
  return session;
}

const MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

/**
 * Límite de intentos fallidos por correo: 5 en 15 minutos. Frena la adivinanza de
 * contraseñas (medida de control de acceso, art. 46 del DS 016-2024-JUS).
 */
function loginKey(email: string) {
  return email.trim().toLowerCase();
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const db = getDb();
  const key = loginKey(email);
  const attempt = db.prepare("SELECT failures, first_at FROM login_attempts WHERE key = ?").get(key) as
    | { failures: number; first_at: string }
    | undefined;
  const windowOpen = attempt && Date.now() - new Date(attempt.first_at).getTime() < LOCK_WINDOW_MS;
  if (attempt && windowOpen && attempt.failures >= MAX_FAILURES) {
    return { error: "Demasiados intentos fallidos. Espera 15 minutos o pide a tu administrador un enlace para restablecer tu acceso." };
  }

  const user = db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as unknown as User | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    // Limpieza: los contadores fuera de la ventana de 15 minutos ya no sirven.
    db.prepare("DELETE FROM login_attempts WHERE first_at < ?").run(new Date(Date.now() - LOCK_WINDOW_MS).toISOString());
    if (attempt && windowOpen) {
      db.prepare("UPDATE login_attempts SET failures = failures + 1 WHERE key = ?").run(key);
    } else {
      db.prepare(
        "INSERT INTO login_attempts (key, failures, first_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET failures = 1, first_at = excluded.first_at"
      ).run(key, new Date().toISOString());
    }
    return { error: "Correo o contraseña incorrectos." };
  }

  db.prepare("DELETE FROM login_attempts WHERE key = ?").run(key);
  await createSession(user.id);
  return {};
}
