"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changePassword,
  confirmEmailChange,
  deleteAccount,
  requestEmailChange,
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerificationEmail,
  verifyEmailWithToken,
} from "@/lib/account";
import { setAiConsent } from "@/lib/ai-guard";
import { currentSessionId, destroySession, requireSession } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { getDb, verifyPassword } from "@/lib/db";
import { isDemoCompany } from "@/lib/demo";
import { logActivity } from "@/lib/data";
import { cancelPreapproval, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { takeRateLimit } from "@/lib/rate-limit";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export type AccountState = { error?: string; ok?: string };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const raw = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** Siempre responde igual, exista o no el correo. */
export async function requestPasswordResetAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = text(formData, "email").toLowerCase();
  if (!email) return { error: "Escribe tu correo." };
  const ip = await clientIp();
  if (!takeRateLimit(`reset:ip:${ip}`, 10, HOUR) || !takeRateLimit(`reset:email:${email}`, 3, HOUR)) {
    return { error: "Demasiados pedidos. Espera un rato e inténtalo de nuevo." };
  }
  requestPasswordReset(email);
  return { ok: "Si existe una cuenta con ese correo, te enviamos un enlace para elegir una contraseña nueva. Vence en 1 hora." };
}

export async function resetPasswordAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ip = await clientIp();
  if (!takeRateLimit(`reset-use:ip:${ip}`, 10, HOUR)) return { error: "Demasiados intentos. Espera un rato." };
  const result = resetPasswordWithToken(text(formData, "token"), raw(formData, "password"));
  if (!result.ok) return { error: result.error };
  redirect("/login?restablecida=1");
}

/** Confirma el correo (o el cambio de correo) desde el enlace. Es una acción, no un GET, para que un antivirus que abre el enlace no lo consuma. */
export async function verifyEmailAction(formData: FormData) {
  const token = text(formData, "token");
  const change = text(formData, "cambio") === "1";
  const ok = change ? confirmEmailChange(token).ok : verifyEmailWithToken(token);
  redirect(ok ? "/login?verificado=1" : "/verificar?error=1");
}

export async function resendVerificationAction() {
  const { user } = await requireSession();
  const ip = await clientIp();
  if (takeRateLimit(`verify:user:${user.id}`, 3, HOUR) && takeRateLimit(`verify:ip:${ip}`, 10, HOUR)) {
    sendVerificationEmail(user.id);
  }
  redirect("/app/ajustes?ok=verificacion");
}

export async function changePasswordAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { user, company } = await requireSession();
  if (isDemoCompany(company)) return { error: "La cuenta de demostración es de solo lectura." };
  if (!takeRateLimit(`pwd:user:${user.id}`, 5, 15 * MINUTE)) return { error: "Demasiados intentos. Espera unos minutos." };
  const result = changePassword(user.id, raw(formData, "current"), raw(formData, "next"), await currentSessionId());
  if (!result.ok) return { error: result.error };
  logActivity(company.id, "cuenta", "Cambiaste tu contraseña. Se cerraron tus otras sesiones.");
  return { ok: "Contraseña cambiada. Cerramos tus otras sesiones." };
}

export async function requestEmailChangeAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { user, company } = await requireSession();
  if (isDemoCompany(company)) return { error: "La cuenta de demostración es de solo lectura." };
  if (!takeRateLimit(`email-change:user:${user.id}`, 5, HOUR)) return { error: "Demasiados intentos. Espera un rato." };
  const result = requestEmailChange(user.id, raw(formData, "password"), text(formData, "email"));
  if (!result.ok) return { error: result.error };
  return { ok: "Te enviamos un enlace al correo nuevo. Tu correo de acceso cambia cuando lo confirmes." };
}

export async function setAiConsentAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app/ajustes");
  setAiConsent(company.id, text(formData, "accept") === "1");
  revalidatePath("/app", "layout");
  redirect("/app/ajustes?ok=ia");
}

export async function setMailOptoutAction(formData: FormData) {
  const { company } = await requireSession();
  if (isDemoCompany(company)) redirect("/app/ajustes");
  getDb().prepare("UPDATE companies SET mail_optout = ? WHERE id = ?").run(text(formData, "optout") === "1" ? 1 : 0, company.id);
  redirect("/app/ajustes?ok=correo");
}

/**
 * Elimina la cuenta y los datos. Exige la contraseña y escribir ELIMINAR.
 * Si la suscripción no se puede cancelar en MercadoPago se aborta: borrar la
 * cuenta y seguir cobrando sería el peor resultado.
 */
export async function deleteAccountAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { user, company } = await requireSession();
  if (isDemoCompany(company)) return { error: "La cuenta de demostración no se puede eliminar." };
  if (!takeRateLimit(`delete:user:${user.id}`, 5, 15 * MINUTE)) return { error: "Demasiados intentos. Espera unos minutos." };
  if (text(formData, "confirm").toUpperCase() !== "ELIMINAR") return { error: "Escribe ELIMINAR para confirmar." };

  const row = getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string } | undefined;
  if (!row || !verifyPassword(raw(formData, "password"), row.password_hash)) return { error: "La contraseña no es correcta." };

  if (isMercadoPagoConfigured()) {
    const ids = [
      company.subscription_status === "cancelled" ? null : company.subscription_id,
      company.pending_subscription_id,
    ].filter((id): id is string => Boolean(id));
    for (const id of ids) {
      try {
        await cancelPreapproval(id);
      } catch (error) {
        console.error("[mercadopago] No se pudo cancelar al eliminar la cuenta:", error);
        return { error: "No pudimos cancelar tu suscripción en MercadoPago, así que no eliminamos la cuenta. Inténtalo de nuevo o escríbenos." };
      }
    }
  }

  deleteAccount(company.id);
  await destroySession();
  redirect("/?cuenta=eliminada");
}
