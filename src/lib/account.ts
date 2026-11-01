import "server-only";

import crypto from "node:crypto";
import { getDb, hashPassword, newId, nowIso, verifyPassword, type Company, type User } from "./db";
import { enqueueEmail } from "./mail";
import { siteUrl } from "./site";

/**
 * Ciclo de vida de la cuenta: exportación completa, eliminación, cambio de
 * correo y contraseña, y los enlaces de un solo uso (verificar correo,
 * restablecer contraseña).
 */

export const MIN_PASSWORD_LENGTH = 10;

/* -------------------------------------------------------------------------- */
/*  Exportación                                                               */
/* -------------------------------------------------------------------------- */

const TENANT_TABLES = [
  "data_banks",
  "arco_requests",
  "incidents",
  "documents",
  "document_versions",
  "providers",
  "evidence",
  "activity",
] as const;

/** Expediente completo de la empresa. Nunca incluye hashes de contraseña ni respuestas crudas de pago. */
export function exportCompanyData(companyId: string) {
  const db = getDb();
  const rows = (sql: string, ...params: string[]) => db.prepare(sql).all(...params);

  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as Company | undefined;
  if (!company) return null;

  const tables = Object.fromEntries(
    TENANT_TABLES.map((table) => [table, rows(`SELECT * FROM ${table} WHERE company_id = ? ORDER BY 1`, companyId)])
  ) as Record<(typeof TENANT_TABLES)[number], unknown[]>;

  return {
    exported_at: nowIso(),
    format_version: 2,
    company,
    users: rows("SELECT id, name, email, role, email_verified_at, created_at FROM users WHERE company_id = ?", companyId),
    ...tables,
    security_checks: rows("SELECT item, done_at FROM security_checks WHERE company_id = ?", companyId),
    payments: rows(
      "SELECT id, plan, term, amount, currency, status, provider, payment_id, subscription_id, paid_at, created_at FROM payments WHERE company_id = ? ORDER BY created_at",
      companyId
    ),
    ai_usage: rows(
      "SELECT feature, model, input_tokens, output_tokens, latency_ms, ok, created_at FROM ai_usage WHERE company_id = ? ORDER BY created_at",
      companyId
    ),
  };
}

/* -------------------------------------------------------------------------- */
/*  Eliminación                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Borra todos los datos de la empresa y de las personas que figuran en ellos
 * (titulares ARCO, afectados, usuarios). Se conserva una fila mínima de la
 * empresa y sus pagos, porque la ley tributaria obliga a guardar los
 * comprobantes (obligación legal, no uso comercial). La fila queda sin
 * nombre de contacto, correo, dirección ni dirección pública (`slug`).
 */
export function deleteCompanyData(companyId: string): { deleted: boolean; ownerEmails: string[]; companyName: string } {
  const db = getDb();
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as unknown as Company | undefined;
  if (!company || company.deleted_at) return { deleted: false, ownerEmails: [], companyName: "" };

  const owners = (db.prepare("SELECT email FROM users WHERE company_id = ?").all(companyId) as { email: string }[]).map((u) => u.email);
  const now = nowIso();

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const table of ["security_checks", ...TENANT_TABLES]) {
      db.prepare(`DELETE FROM ${table} WHERE company_id = ?`).run(companyId);
    }
    db.prepare("DELETE FROM ai_usage WHERE company_id = ?").run(companyId);
    db.prepare("DELETE FROM email_outbox WHERE company_id = ?").run(companyId);
    db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE company_id = ?)").run(companyId);
    db.prepare("DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE company_id = ?)").run(companyId);
    db.prepare("DELETE FROM users WHERE company_id = ?").run(companyId);
    // La respuesta cruda de MercadoPago puede traer el correo del pagador.
    db.prepare("UPDATE payments SET raw = NULL WHERE company_id = ?").run(companyId);
    db.prepare(
      `UPDATE companies SET name = 'Cuenta eliminada', slug = ?, email = '', phone = '', address = '', dpo_name = '', dpo_email = '',
         website = '', complaints_url = '', representative_name = '', representative_address = '',
         billing_status = 'deleted', paid_until = NULL, subscription_status = 'cancelled',
         pending_subscription_id = NULL, pending_plan = NULL, pending_term = NULL, ai_consent_at = NULL, deleted_at = ?
       WHERE id = ?`
    ).run(`eliminada-${crypto.randomUUID().slice(0, 12)}`, now, companyId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { deleted: true, ownerEmails: owners, companyName: company.name };
}

/** Elimina la cuenta y avisa a los correos que tenía registrados. */
export function deleteAccount(companyId: string) {
  const result = deleteCompanyData(companyId);
  if (result.deleted) {
    for (const email of new Set(result.ownerEmails)) {
      enqueueEmail({ to: email, template: "account_deleted", payload: { company: result.companyName }, dedupeKey: `deleted:${companyId}:${email}` });
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Enlaces de un solo uso                                                    */
/* -------------------------------------------------------------------------- */

export type TokenKind = "verify_email" | "password_reset" | "change_email";
const TOKEN_TTL_MS: Record<TokenKind, number> = {
  verify_email: 48 * 3_600_000,
  password_reset: 3_600_000,
  change_email: 48 * 3_600_000,
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Crea un token y devuelve el valor en claro (solo se guarda su hash). Reemplaza los anteriores del mismo tipo. */
export function createAuthToken(userId: string, kind: TokenKind, payload?: string, now = new Date()): string {
  const db = getDb();
  db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND kind = ?").run(userId, kind);
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO auth_tokens (id, user_id, kind, token_hash, payload, expires_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId(),
    userId,
    kind,
    hashToken(token),
    payload ?? null,
    new Date(now.getTime() + TOKEN_TTL_MS[kind]).toISOString()
  );
  return token;
}

/** Consume un token válido (un solo uso). Devuelve el usuario y el payload, o null. */
export function consumeAuthToken(token: string, kind: TokenKind, now = new Date()): { userId: string; payload: string | null } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, user_id, payload FROM auth_tokens WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ?")
    .get(hashToken(token), kind, now.toISOString()) as { id: string; user_id: string; payload: string | null } | undefined;
  if (!row) return null;
  const claimed = db.prepare("UPDATE auth_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL").run(now.toISOString(), row.id);
  if (Number(claimed.changes) === 0) return null;
  return { userId: row.user_id, payload: row.payload };
}

type UserWithCompany = User & { company_name: string; billing_status: string };

function userWithCompany(where: string, value: string) {
  return getDb()
    .prepare(
      `SELECT u.*, c.name AS company_name, c.billing_status FROM users u JOIN companies c ON c.id = u.company_id WHERE ${where}`
    )
    .get(value) as unknown as UserWithCompany | undefined;
}

export function sendVerificationEmail(userId: string): boolean {
  const user = userWithCompany("u.id = ?", userId);
  if (!user || user.billing_status === "demo" || user.email_verified_at) return false;
  const token = createAuthToken(user.id, "verify_email");
  return enqueueEmail({
    to: user.email,
    template: "verify_email",
    payload: { company: user.company_name, name: user.name, url: `${siteUrl()}/verificar?token=${token}` },
    companyId: user.company_id,
  });
}

/** Pide restablecer la contraseña. Responde igual exista o no el correo (sin enumerar cuentas). */
export function requestPasswordReset(email: string): void {
  const user = userWithCompany("lower(u.email) = lower(?)", email.trim());
  if (!user || user.billing_status === "demo" || user.billing_status === "deleted") return;
  const token = createAuthToken(user.id, "password_reset");
  enqueueEmail({
    to: user.email,
    template: "password_reset",
    payload: { company: user.company_name, name: user.name, url: `${siteUrl()}/restablecer?token=${token}` },
    companyId: user.company_id,
  });
}

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export function checkNewPassword(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  return { ok: true };
}

/** Cambia la contraseña con un token de restablecimiento. Cierra todas las sesiones del usuario. */
export function resetPasswordWithToken(token: string, newPassword: string): PasswordCheck {
  const check = checkNewPassword(newPassword);
  if (!check.ok) return check;
  const consumed = consumeAuthToken(token, "password_reset");
  if (!consumed) return { ok: false, error: "El enlace no es válido o ya venció. Pide uno nuevo." };
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), consumed.userId);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(consumed.userId);
  return { ok: true };
}

/** Cambia la contraseña de un usuario que ya inició sesión (exige la actual). Cierra las demás sesiones. */
export function changePassword(userId: string, current: string, next: string, keepSessionId?: string): PasswordCheck {
  const db = getDb();
  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string } | undefined;
  if (!user || !verifyPassword(current, user.password_hash)) return { ok: false, error: "La contraseña actual no es correcta." };
  const check = checkNewPassword(next);
  if (!check.ok) return check;
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), userId);
  if (keepSessionId) db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(userId, keepSessionId);
  else db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return { ok: true };
}

/** Marca el correo como verificado. */
export function verifyEmailWithToken(token: string): boolean {
  const consumed = consumeAuthToken(token, "verify_email");
  if (!consumed) return false;
  getDb().prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(nowIso(), consumed.userId);
  return true;
}

/**
 * Cambio de correo: se confirma desde el correo nuevo. Hasta entonces el
 * correo de acceso no cambia. Exige la contraseña actual.
 */
export function requestEmailChange(userId: string, password: string, newEmail: string): PasswordCheck {
  const db = getDb();
  const user = userWithCompany("u.id = ?", userId);
  if (!user || !verifyPassword(password, user.password_hash)) return { ok: false, error: "La contraseña no es correcta." };
  const email = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { ok: false, error: "Escribe un correo válido." };
  if (email === user.email.toLowerCase()) return { ok: false, error: "Ese ya es tu correo." };
  if (db.prepare("SELECT 1 FROM users WHERE lower(email) = ?").get(email)) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }
  const token = createAuthToken(userId, "change_email", email);
  enqueueEmail({
    to: email,
    template: "verify_email",
    payload: { company: user.company_name, name: user.name, url: `${siteUrl()}/verificar?token=${token}&cambio=1` },
    companyId: user.company_id,
  });
  return { ok: true };
}

/** Aplica el cambio de correo confirmado desde el enlace. Avisa al correo anterior. */
export function confirmEmailChange(token: string): { ok: boolean } {
  const consumed = consumeAuthToken(token, "change_email");
  if (!consumed?.payload) return { ok: false };
  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE lower(email) = ? AND id <> ?").get(consumed.payload, consumed.userId)) {
    return { ok: false };
  }
  const user = userWithCompany("u.id = ?", consumed.userId);
  if (!user) return { ok: false };
  const previous = user.email;
  db.prepare("UPDATE users SET email = ?, email_verified_at = ? WHERE id = ?").run(consumed.payload, nowIso(), consumed.userId);
  // El correo de la cuenta de la empresa sigue al del titular cuando eran el mismo.
  db.prepare("UPDATE companies SET email = ? WHERE id = ? AND lower(email) = lower(?)").run(consumed.payload, user.company_id, previous);
  db.prepare("UPDATE companies SET dpo_email = ? WHERE id = ? AND lower(dpo_email) = lower(?)").run(consumed.payload, user.company_id, previous);
  enqueueEmail({
    to: previous,
    template: "email_changed",
    payload: { company: user.company_name, newEmail: consumed.payload },
    companyId: user.company_id,
  });
  return { ok: true };
}

