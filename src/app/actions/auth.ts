"use server";

import { redirect } from "next/navigation";
import { getDb, hashPassword, newId, nowIso } from "@/lib/db";
import { destroySession, signIn } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { findSectorById } from "@/lib/sectors";
import { takeRateLimit } from "@/lib/rate-limit";
import { isValidRuc } from "@/lib/ruc";
import { checkCompanyRuc } from "@/lib/ruc-lookup";
import { MIN_PASSWORD_LENGTH, sendVerificationEmail } from "@/lib/account";
import { recordConsents } from "@/lib/platform-legal";
import { headers } from "next/headers";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

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

  const ip = await clientIp();
  const attemptsOk =
    takeRateLimit(`login:ip:${ip}`, 30, 15 * MINUTE) &&
    takeRateLimit(`login:email:${email.toLowerCase()}`, 10, 15 * MINUTE);
  if (!attemptsOk) {
    return { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
  }

  const result = await signIn(email, password);
  if (result.error) return result;

  redirect("/app");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = text(formData, "company");
  const ruc = text(formData, "ruc");
  const ownerName = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const plan = text(formData, "plan") === "pro" ? "pro" : "basico";
  // Todo alta nueva es anual (primer año con implementación); el plan mensual quedó solo para cuentas antiguas.
  const term = "yearly";
  const sectorId = text(formData, "sector");
  const sector = sectorId ? findSectorById(sectorId)?.label ?? "" : "";

  if (!companyName || !ownerName || !email || !password) {
    return { error: "Completa todos los campos obligatorios." };
  }
  if (!isValidRuc(ruc)) {
    return { error: "Revisa tu RUC: son 11 dígitos válidos según SUNAT." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (text(formData, "accept_legal") !== "on") {
    return { error: "Para crear tu cuenta debes aceptar los Términos y la Política de privacidad." };
  }

  const ip = await clientIp();
  if (!takeRateLimit(`signup:ip:${ip}`, 5, HOUR)) {
    return { error: "Demasiados registros desde tu conexión. Intenta más tarde." };
  }

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  if (exists) return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };

  // Un RUC con cuenta activa o de demostración no se registra otra vez. Las cuentas
  // pendientes de pago no bloquean: así nadie puede reservar el RUC de otra empresa sin pagar.
  const rucTaken = db
    .prepare("SELECT id FROM companies WHERE ruc = ? AND billing_status IN ('active', 'demo') LIMIT 1")
    .get(ruc);
  if (rucTaken) {
    return {
      error:
        "Ya existe una cuenta activa para ese RUC. Si es tu empresa y no la creaste tú, escríbenos a hola@datosprivados.pe.",
    };
  }

  // Se consulta a la SUNAT al final de las validaciones locales, para gastar la mínima cuota.
  const rucCheck = await checkCompanyRuc(ruc);
  if (!rucCheck.ok) return { error: rucCheck.message };

  const companyId = newId();
  const now = nowIso();
  // Con el RUC verificado, la razón social y el domicilio fiscal son los de la SUNAT:
  // son los que deben figurar en los documentos legales.
  const legalName = rucCheck.verified ? rucCheck.razonSocial.slice(0, 200) : companyName;
  let slug = slugify(legalName) || "empresa";
  const taken = db.prepare("SELECT id FROM companies WHERE slug = ?").get(slug);
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  db.prepare(
    `INSERT INTO companies (id, name, ruc, sector, slug, email, phone, address, plan, billing_term, billing_status, dpo_name, dpo_email, ruc_verified_at, ruc_status, ruc_condition, created_at)
     VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
  ).run(
    companyId,
    legalName,
    ruc,
    sector,
    slug,
    email,
    rucCheck.verified ? rucCheck.direccion.slice(0, 300) : "",
    plan,
    term,
    ownerName,
    email,
    rucCheck.verified ? now : null,
    rucCheck.verified ? rucCheck.estado : null,
    rucCheck.verified ? rucCheck.condicion : null,
    now
  );

  const userId = newId();
  db.prepare(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, 'admin', ?)`
  ).run(userId, companyId, ownerName, email, hashPassword(password), now);
  recordConsents({
    userId,
    companyId,
    documents: ["terms", "privacy"],
    context: "signup",
    ip,
    userAgent: (await headers()).get("user-agent") ?? "",
  });
  sendVerificationEmail(userId);

  db.prepare(
    "INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, 'cuenta', ?, ?)"
  ).run(
    newId(),
    companyId,
    rucCheck.verified
      ? `Creaste tu cuenta. RUC ${ruc} verificado en la SUNAT (${legalName}). El plan queda pendiente hasta confirmar el pago del primer mes.`
      : "Creaste tu cuenta. El plan queda pendiente hasta confirmar el pago del primer mes.",
    now
  );

  await signIn(email, password);
  redirect(`/pago?plan=${plan}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
