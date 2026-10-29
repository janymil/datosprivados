"use server";

import { redirect } from "next/navigation";
import { getDb, hashPassword, newId, nowIso } from "@/lib/db";
import { destroySession, signIn } from "@/lib/auth";

export type AuthState = { error?: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email");
  const password = text(formData, "password");

  if (!email || !password) return { error: "Ingresa tu correo y contraseña." };

  const result = await signIn(email, password);
  if (result.error) return result;

  redirect("/app");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = text(formData, "company");
  const ruc = text(formData, "ruc");
  const sector = text(formData, "sector");
  const ownerName = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!companyName || !ownerName || !email || !password) {
    return { error: "Completa todos los campos obligatorios." };
  }
  if (!/^\d{11}$/.test(ruc)) {
    return { error: "El RUC debe tener 11 dígitos." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  if (exists) return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  const companyId = newId();
  const now = nowIso();
  let slug = slugify(companyName) || "empresa";
  const taken = db.prepare("SELECT id FROM companies WHERE slug = ?").get(slug);
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  db.prepare(
    `INSERT INTO companies (id, name, ruc, sector, slug, email, phone, address, plan, dpo_name, dpo_email, created_at)
     VALUES (?, ?, ?, ?, ?, ?, '', '', 'basico', ?, ?, ?)`
  ).run(companyId, companyName, ruc, sector || "Otros", slug, email, ownerName, email, now);

  db.prepare(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, 'admin', ?)`
  ).run(newId(), companyId, ownerName, email, hashPassword(password), now);

  db.prepare(
    "INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, 'cuenta', ?, ?)"
  ).run(newId(), companyId, "Creaste tu cuenta en PrivadoPE.", now);

  await signIn(email, password);
  redirect("/app?bienvenida=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
