import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, verifyPassword, type Company, type User } from "./db";

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

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as unknown as User | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);
  return {};
}
