"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, normalizeRole, requireRole } from "@/lib/auth";
import { getDb, hashPassword, newId, nowIso } from "@/lib/db";
import { findInvitation, logAs, newToken } from "@/lib/data";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const INVITATION_DAYS = 7;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El enlace se muestra una sola vez, en una cookie de corta vida que solo ve el administrador. */
async function flashLink(token: string) {
  const jar = await cookies();
  jar.set("pdp_invite", token, { httpOnly: true, sameSite: "lax", path: "/app/equipo", maxAge: 120 });
}

function createInvitation(companyId: string, email: string, role: string, invitedBy: string, userId: string | null) {
  const db = getDb();
  // Una sola invitación vigente por correo.
  db.prepare("DELETE FROM invitations WHERE company_id = ? AND lower(email) = lower(?) AND accepted_at IS NULL").run(
    companyId,
    email
  );
  const { token, hash } = newToken();
  db.prepare(
    `INSERT INTO invitations (id, company_id, email, role, user_id, token_hash, invited_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    companyId,
    email,
    normalizeRole(role),
    userId,
    hash,
    invitedBy,
    new Date(Date.now() + INVITATION_DAYS * 86_400_000).toISOString(),
    nowIso()
  );
  return token;
}

export async function inviteMemberAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  const email = text(formData, "email").toLowerCase();
  const role = normalizeRole(text(formData, "role"));
  if (!EMAIL.test(email)) redirect("/app/equipo?error=email");

  const exists = getDb().prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  if (exists) redirect("/app/equipo?error=existe");

  await flashLink(createInvitation(company.id, email, role, user.id, null));
  logAs(user.name, company.id, "equipo", `Invitaste a ${email} con el rol «${role}».`);
  revalidatePath("/app/equipo");
  redirect("/app/equipo?ok=invitado");
}

/** Genera un enlace para que un integrante defina una contraseña nueva (no enviamos correos). */
export async function resetAccessAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  const target = getDb()
    .prepare("SELECT id, email, role FROM users WHERE id = ? AND company_id = ?")
    .get(text(formData, "id"), company.id) as { id: string; email: string; role: string } | undefined;
  if (!target) redirect("/app/equipo");

  await flashLink(createInvitation(company.id, target.email, target.role, user.id, target.id));
  logAs(user.name, company.id, "equipo", `Generaste un enlace para restablecer el acceso de ${target.email}.`);
  redirect("/app/equipo?ok=restablecer");
}

export async function revokeInvitationAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  getDb().prepare("DELETE FROM invitations WHERE id = ? AND company_id = ?").run(text(formData, "id"), company.id);
  revalidatePath("/app/equipo");
  redirect("/app/equipo");
}

function adminCount(companyId: string) {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE company_id = ? AND role = 'admin'").get(companyId) as {
    n: number;
  };
  return row.n;
}

export async function changeRoleAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  const id = text(formData, "id");
  const role = normalizeRole(text(formData, "role"));
  const target = getDb().prepare("SELECT id, email, role FROM users WHERE id = ? AND company_id = ?").get(id, company.id) as
    | { id: string; email: string; role: string }
    | undefined;
  if (!target) redirect("/app/equipo");
  // Siempre debe quedar al menos un administrador.
  if (target.role === "admin" && role !== "admin" && adminCount(company.id) <= 1) redirect("/app/equipo?error=ultimo");

  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  logAs(user.name, company.id, "equipo", `Cambiaste el rol de ${target.email} a «${role}».`);
  revalidatePath("/app", "layout");
  redirect("/app/equipo?ok=rol");
}

export async function removeMemberAction(formData: FormData) {
  const { company, user } = await requireRole("admin");
  const id = text(formData, "id");
  if (id === user.id) redirect("/app/equipo?error=tu");
  const target = getDb().prepare("SELECT id, email, role FROM users WHERE id = ? AND company_id = ?").get(id, company.id) as
    | { id: string; email: string; role: string }
    | undefined;
  if (!target) redirect("/app/equipo");
  if (target.role === "admin" && adminCount(company.id) <= 1) redirect("/app/equipo?error=ultimo");

  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  logAs(user.name, company.id, "equipo", `Quitaste el acceso de ${target.email}.`);
  revalidatePath("/app", "layout");
  redirect("/app/equipo?ok=quitado");
}

/** Pública: la persona invitada define su nombre y contraseña con el enlace que recibió. */
export async function acceptInvitationAction(formData: FormData) {
  const token = text(formData, "token");
  const back = (error: string): never => redirect(`/invitacion/${token}?error=${error}`);

  const invitation = findInvitation(token);
  if (!invitation || invitation.accepted_at || invitation.expires_at < nowIso()) back("invalida");
  const inv = invitation!;

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) back("corta");
  if (password !== confirm) back("distinta");

  const db = getDb();
  let userId: string;
  if (inv.user_id) {
    const target = db.prepare("SELECT id FROM users WHERE id = ? AND company_id = ?").get(inv.user_id, inv.company_id) as
      | { id: string }
      | undefined;
    if (!target) back("invalida");
    userId = target!.id;
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM login_attempts WHERE key = ?").run(inv.email.toLowerCase());
  } else {
    const name = text(formData, "name");
    if (name.length < 2) back("nombre");
    if (db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(inv.email)) back("existe");
    userId = newId();
    db.prepare(
      "INSERT INTO users (id, company_id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, inv.company_id, name, inv.email, hashPassword(password), inv.role, nowIso());
  }
  db.prepare("UPDATE invitations SET accepted_at = ? WHERE id = ?").run(nowIso(), inv.id);
  logAs(inv.email, inv.company_id, "equipo", `${inv.email} aceptó la invitación (${inv.user_id ? "nuevo acceso" : "rol " + inv.role}).`);

  await createSession(userId);
  redirect("/app");
}
