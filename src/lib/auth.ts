import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, hashPassword, verifyPassword, type Company, type User } from "./db";
import { isCompanyActive } from "./billing";
import { isDemoCompany } from "./demo";

const COOKIE = "pdp_session";
const MAX_AGE = 60 * 60 * 24 * 30;

/** Cuenta de demostración que crea /demo; se usa para ofrecer una salida clara. */
export const DEMO_EMAIL = "demo@datosprivados.pe";

export type SessionContext = {
  user: Pick<User, "id" | "name" | "email" | "role">;
  company: Company;
};

/** Secure por defecto en producción; COOKIE_SECURE=0 lo desactiva explícitamente. */
function cookieSecure() {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Crea una sesión nueva y destruye la anterior de este navegador (rotación en
 * el inicio de sesión, para que un identificador previo no sirva después).
 */
export async function createSession(userId: string) {
  const db = getDb();
  const jar = await cookies();
  const previous = jar.get(COOKIE)?.value;
  if (previous) db.prepare("DELETE FROM sessions WHERE id = ?").run(previous);

  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());

  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + MAX_AGE * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expires);
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
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

/** Sesión obligatoria. Úsala en páginas de solo lectura de cuenta (ajustes, pago). */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Sesión obligatoria y con suscripción vigente. Toda Server Action que lee o
 * escribe datos del expediente debe usar esta función: la capa de layout no
 * protege las acciones, que son endpoints públicos por HTTP.
 */
export async function requireActiveSession(options: { allowDemo?: boolean } = {}): Promise<SessionContext> {
  const session = await requireSession();
  if (!isCompanyActive(session.company)) redirect("/pago");
  // La cuenta de demostración es de solo lectura: ninguna acción escribe datos.
  // Las acciones de IA la admiten porque responden con un aviso sin llamar al modelo.
  if (isDemoCompany(session.company) && !options.allowDemo) redirect("/app?demo=lectura");
  return session;
}

let dummyHash: string | undefined;

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as unknown as User | undefined;

  // Con un correo inexistente también se calcula un scrypt, para que el tiempo
  // de respuesta no revele qué correos tienen cuenta.
  dummyHash ??= hashPassword("dummy-password-for-timing");
  let valid = false;
  if (user) {
    valid = verifyPassword(password, user.password_hash);
  } else {
    verifyPassword(password, dummyHash);
  }

  if (!user || !valid) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);
  return {};
}
