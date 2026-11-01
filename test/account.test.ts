import { beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({ configured: false, cancelled: [] as string[], failWith: null as Error | null }));
vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return {
    ...original,
    isMercadoPagoConfigured: () => mp.configured,
    cancelPreapproval: async (id: string) => {
      if (mp.failWith) throw mp.failWith;
      mp.cancelled.push(id);
    },
  };
});

import { getDb, hashPassword, newId, nowIso, verifyPassword } from "@/lib/db";
import {
  changePassword,
  confirmEmailChange,
  consumeAuthToken,
  createAuthToken,
  deleteAccount,
  exportCompanyData,
  requestEmailChange,
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerificationEmail,
  verifyEmailWithToken,
} from "@/lib/account";
import { createSession, getSession } from "@/lib/auth";
import { generateAndSaveDocument, getCompanyBySlug, listBanks } from "@/lib/data";
import {
  changePasswordAction,
  deleteAccountAction,
  requestEmailChangeAction,
  requestPasswordResetAction,
  resetPasswordAction,
  setAiConsentAction,
  setMailOptoutAction,
  verifyEmailAction,
} from "@/app/actions/account";
import { GET as exportRoute } from "@/app/cuenta/exportar/route";
import { getCompany, makeActiveCompany, makeArcoRequest, makeBank, makeCompany, makeEvidence, makeIncident, makeProvider } from "./helpers/db";
import { jar } from "./helpers/next";

const PASSWORD = "contraseña-larga-1";

function withPassword(overrides = {}) {
  const made = makeActiveCompany(overrides);
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(PASSWORD), made.userId);
  return made;
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

async function loginAs(userId: string) {
  jar.store.clear();
  await createSession(userId);
}

const outbox = (template?: string) =>
  getDb().prepare(`SELECT * FROM email_outbox ${template ? "WHERE template = ?" : ""} ORDER BY created_at`).all(...(template ? [template] : [])) as unknown as Array<{
    to_email: string; template: string; payload: string;
  }>;

const countOf = (table: string, companyId: string) =>
  (getDb().prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).get(companyId) as { n: number }).n;

/** Una empresa con datos en todas las tablas. */
function populated() {
  const made = withPassword();
  const { companyId } = made;
  makeBank(companyId);
  makeArcoRequest(companyId);
  makeIncident(companyId);
  makeProvider(companyId);
  makeEvidence(companyId);
  generateAndSaveDocument(getCompany(companyId), listBanks(companyId), "politica");
  getDb().prepare("INSERT INTO security_checks (company_id, item, done_at) VALUES (?, 'backups', ?)").run(companyId, nowIso());
  getDb().prepare("INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, 'x', 'hecho', ?)").run(newId(), companyId, nowIso());
  getDb()
    .prepare("INSERT INTO payments (id, company_id, plan, term, amount, status, payment_id, raw, created_at) VALUES (?, ?, 'basico', 'monthly', 19, 'approved', ?, ?, ?)")
    .run(newId(), companyId, `pay-${newId()}`, '{"payer":{"email":"pagador@x.pe"}}', nowIso());
  getDb().prepare("INSERT INTO ai_usage (id, company_id, feature, model, ok, created_at) VALUES (?, ?, 'chat', 'm', 1, ?)").run(newId(), companyId, nowIso());
  return made;
}

beforeEach(() => {
  mp.configured = false;
  mp.cancelled = [];
  mp.failWith = null;
  getDb().exec("DELETE FROM email_outbox; DELETE FROM rate_limits");
});

describe("exportación completa", () => {
  it("incluye todo el expediente y nunca hashes ni respuestas crudas de pago", () => {
    const { companyId } = populated();
    const data = exportCompanyData(companyId)!;
    expect(data.company.id).toBe(companyId);
    for (const key of ["data_banks", "arco_requests", "incidents", "documents", "document_versions", "providers", "evidence", "activity", "security_checks", "payments", "ai_usage", "users"] as const) {
      expect((data[key] as unknown[]).length, key).toBeGreaterThan(0);
    }
    const json = JSON.stringify(data);
    expect(json).not.toContain("password_hash");
    expect(json).not.toContain("pagador@x.pe");
    expect(json).not.toMatch(/"raw"/);
  });

  it("no mezcla datos de otra empresa", () => {
    const a = populated();
    const b = populated();
    const dataA = exportCompanyData(a.companyId)!;
    const ids = (rows: unknown[]) => (rows as Array<{ company_id?: string }>).map((r) => r.company_id);
    for (const rows of [dataA.data_banks, dataA.arco_requests, dataA.incidents, dataA.documents, dataA.providers, dataA.evidence, dataA.activity]) {
      expect(new Set(ids(rows))).toEqual(new Set([a.companyId]));
    }
    expect(JSON.stringify(dataA)).not.toContain(b.companyId);
  });

  it("la ruta devuelve un archivo adjunto para quien tiene sesión, también con la suscripción vencida", async () => {
    const lapsed = makeCompany({ billing_status: "expired", paid_until: "2026-01-01T00:00:00Z" });
    await loginAs(lapsed.userId);
    const response = await exportRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename="expediente-/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).company.id).toBe(lapsed.companyId);
  });

  it("sin sesión es 401 y la demo no exporta", async () => {
    jar.store.clear();
    expect((await exportRoute()).status).toBe(401);
    const demo = makeCompany({ billing_status: "demo" });
    await loginAs(demo.userId);
    expect((await exportRoute()).status).toBe(403);
  });
});

describe("eliminación de la cuenta", () => {
  it("borra todos los datos, conserva los pagos sin datos de contacto y anula la dirección pública", () => {
    const a = populated();
    const other = populated();
    const slug = getCompany(a.companyId).slug;
    const result = deleteAccount(a.companyId);
    expect(result.deleted).toBe(true);

    for (const table of ["data_banks", "arco_requests", "incidents", "documents", "document_versions", "providers", "evidence", "activity", "security_checks", "ai_usage"]) {
      expect(countOf(table, a.companyId), table).toBe(0);
    }
    expect(countOf("users", a.companyId)).toBe(0);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(a.userId)).toEqual({ n: 0 });

    // Registros tributarios: el pago queda, sin la respuesta cruda del proveedor.
    expect(countOf("payments", a.companyId)).toBe(1);
    expect((getDb().prepare("SELECT raw FROM payments WHERE company_id = ?").get(a.companyId) as { raw: string | null }).raw).toBeNull();

    const tomb = getCompany(a.companyId);
    expect(tomb).toMatchObject({ name: "Cuenta eliminada", email: "", phone: "", address: "", dpo_email: "", billing_status: "deleted" });
    expect(tomb.deleted_at).toBeTruthy();
    expect(tomb.slug).not.toBe(slug);
    expect(getCompanyBySlug(slug)).toBeUndefined();

    // La otra empresa queda intacta.
    expect(countOf("data_banks", other.companyId)).toBe(1);
    expect(countOf("documents", other.companyId)).toBe(1);
    expect(getCompany(other.companyId).name).not.toBe("Cuenta eliminada");
  });

  it("borra también los correos pendientes de la empresa y avisa al titular de que se eliminó", () => {
    const a = populated();
    getDb().prepare("INSERT INTO email_outbox (id, company_id, to_email, template, payload, status, next_attempt_at, created_at) VALUES (?, ?, 'ana@example.com', 'arco_ack_requester', '{}', 'pending', ?, ?)").run(newId(), a.companyId, nowIso(), nowIso());
    deleteAccount(a.companyId);
    const mails = outbox();
    expect(mails.map((m) => m.template)).toEqual(["account_deleted"]);
    expect(mails[0].to_email).toBe(a.email);
  });

  it("es idempotente y el RUC queda libre para registrarse de nuevo", () => {
    const a = populated();
    expect(deleteAccount(a.companyId).deleted).toBe(true);
    expect(deleteAccount(a.companyId).deleted).toBe(false);
    expect(outbox("account_deleted")).toHaveLength(1);
    const taken = getDb().prepare("SELECT id FROM companies WHERE ruc = ? AND billing_status IN ('active','demo') AND id = ?").get(getCompany(a.companyId).ruc, a.companyId);
    expect(taken).toBeUndefined();
  });

  it("la acción exige contraseña y la palabra ELIMINAR", async () => {
    const { companyId, userId } = populated();
    await loginAs(userId);
    expect(await deleteAccountAction({}, form({ password: PASSWORD, confirm: "eliminar ya" }))).toEqual({ error: "Escribe ELIMINAR para confirmar." });
    expect(await deleteAccountAction({}, form({ password: "equivocada-123", confirm: "ELIMINAR" }))).toEqual({ error: "La contraseña no es correcta." });
    expect(getCompany(companyId).deleted_at).toBeNull();
    expect(countOf("data_banks", companyId)).toBe(1);
  });

  it("cancela la suscripción en MercadoPago, borra, cierra la sesión y redirige", async () => {
    mp.configured = true;
    const { companyId, userId } = populated();
    getDb().prepare("UPDATE companies SET subscription_id = 'sub-1', subscription_status = 'authorized', pending_subscription_id = 'sub-2' WHERE id = ?").run(companyId);
    await loginAs(userId);
    await expect(deleteAccountAction({}, form({ password: PASSWORD, confirm: "ELIMINAR" }))).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
    expect(mp.cancelled.sort()).toEqual(["sub-1", "sub-2"]);
    expect(getCompany(companyId).deleted_at).toBeTruthy();
    expect(await getSession()).toBeNull();
  });

  it("si MercadoPago no confirma la cancelación NO se borra nada", async () => {
    mp.configured = true;
    mp.failWith = new Error("MP caído");
    const { companyId, userId } = populated();
    getDb().prepare("UPDATE companies SET subscription_id = 'sub-1', subscription_status = 'authorized' WHERE id = ?").run(companyId);
    await loginAs(userId);
    const result = await deleteAccountAction({}, form({ password: PASSWORD, confirm: "ELIMINAR" }));
    expect(result.error).toMatch(/no eliminamos la cuenta/);
    expect(getCompany(companyId).deleted_at).toBeNull();
    expect(countOf("data_banks", companyId)).toBe(1);
  });

  it("una suscripción ya cancelada no bloquea la eliminación", async () => {
    mp.configured = true;
    mp.failWith = new Error("ya estaba cancelada");
    const { companyId, userId } = populated();
    getDb().prepare("UPDATE companies SET subscription_id = 'sub-1', subscription_status = 'cancelled' WHERE id = ?").run(companyId);
    await loginAs(userId);
    await expect(deleteAccountAction({}, form({ password: PASSWORD, confirm: "ELIMINAR" }))).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
    expect(getCompany(companyId).deleted_at).toBeTruthy();
  });

  it("la demo no se puede eliminar y funciona con la suscripción vencida", async () => {
    const demo = makeCompany({ billing_status: "demo" });
    await loginAs(demo.userId);
    expect((await deleteAccountAction({}, form({ password: PASSWORD, confirm: "ELIMINAR" }))).error).toMatch(/demostración/);

    const lapsed = makeCompany({ billing_status: "expired", paid_until: "2026-01-01T00:00:00Z" });
    getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(PASSWORD), lapsed.userId);
    await loginAs(lapsed.userId);
    await expect(deleteAccountAction({}, form({ password: PASSWORD, confirm: "ELIMINAR" }))).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
  });
});

describe("restablecer contraseña", () => {
  it("el correo lleva un enlace de un solo uso que cambia la contraseña y cierra las sesiones", async () => {
    const { userId, email } = withPassword();
    await loginAs(userId);
    requestPasswordReset(email.toUpperCase());
    const [mail] = outbox("password_reset");
    expect(mail.to_email).toBe(email);
    const token = new URL(JSON.parse(mail.payload).url).searchParams.get("token")!;
    expect(token.length).toBeGreaterThan(30);

    expect(resetPasswordWithToken(token, "otra-contraseña-larga")).toEqual({ ok: true });
    const hash = (getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string }).password_hash;
    expect(verifyPassword("otra-contraseña-larga", hash)).toBe(true);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(userId)).toEqual({ n: 0 });
    // Un solo uso.
    expect(resetPasswordWithToken(token, "tercera-contraseña-larga").ok).toBe(false);
  });

  it("el token vence a la hora, se guarda solo su hash y un token nuevo invalida al anterior", () => {
    const { userId } = withPassword();
    const now = new Date("2026-11-01T10:00:00Z");
    const token = createAuthToken(userId, "password_reset", undefined, now);
    expect(getDb().prepare("SELECT 1 FROM auth_tokens WHERE token_hash = ?").get(token)).toBeUndefined();
    expect(consumeAuthToken(token, "password_reset", new Date(now.getTime() + 61 * 60_000))).toBeNull();
    const first = createAuthToken(userId, "password_reset", undefined, now);
    const second = createAuthToken(userId, "password_reset", undefined, now);
    expect(consumeAuthToken(first, "password_reset", now)).toBeNull();
    expect(consumeAuthToken(second, "password_reset", now)).not.toBeNull();
  });

  it("un token de otro tipo no sirve", () => {
    const { userId } = withPassword();
    const token = createAuthToken(userId, "verify_email");
    expect(resetPasswordWithToken(token, "otra-contraseña-larga").ok).toBe(false);
  });

  it("rechaza contraseñas cortas sin gastar el token", () => {
    const { userId } = withPassword();
    const token = createAuthToken(userId, "password_reset");
    expect(resetPasswordWithToken(token, "corta").ok).toBe(false);
    expect(resetPasswordWithToken(token, "suficientemente-larga").ok).toBe(true);
  });

  it("responde igual para un correo que no existe (no revela cuentas) y no envía nada", async () => {
    const real = withPassword();
    const known = await requestPasswordResetAction({}, form({ email: real.email }));
    const unknown = await requestPasswordResetAction({}, form({ email: "nadie@nunca.pe" }));
    expect(unknown).toEqual(known);
    expect(outbox("password_reset")).toHaveLength(1);
  });

  it("limita los pedidos por correo y no escribe a la demo ni a cuentas eliminadas", async () => {
    const real = withPassword();
    for (let i = 0; i < 3; i += 1) await requestPasswordResetAction({}, form({ email: real.email }));
    expect((await requestPasswordResetAction({}, form({ email: real.email }))).error).toMatch(/Demasiados/);

    const demo = makeCompany({ billing_status: "demo" });
    requestPasswordReset(demo.email);
    const gone = withPassword();
    deleteAccount(gone.companyId);
    requestPasswordReset(gone.email);
    expect(outbox("password_reset").some((m) => m.to_email === demo.email || m.to_email === gone.email)).toBe(false);
  });

  it("la acción cambia la contraseña con el token y manda a iniciar sesión", async () => {
    const { userId, email } = withPassword();
    requestPasswordReset(email);
    const token = new URL(JSON.parse(outbox("password_reset")[0].payload).url).searchParams.get("token")!;
    await expect(resetPasswordAction({}, form({ token, password: "contraseña-nueva-123" }))).rejects.toThrow("REDIRECT:/login?restablecida=1");
    const hash = (getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string }).password_hash;
    expect(verifyPassword("contraseña-nueva-123", hash)).toBe(true);
    expect((await resetPasswordAction({}, form({ token, password: "contraseña-nueva-456" }))).error).toMatch(/no es válido/);
  });
});

describe("verificación y cambio de correo", () => {
  it("verifica el correo con el enlace, una sola vez", () => {
    const { userId } = withPassword();
    expect(sendVerificationEmail(userId)).toBe(true);
    const token = new URL(JSON.parse(outbox("verify_email")[0].payload).url).searchParams.get("token")!;
    expect(verifyEmailWithToken(token)).toBe(true);
    expect(verifyEmailWithToken(token)).toBe(false);
    expect((getDb().prepare("SELECT email_verified_at FROM users WHERE id = ?").get(userId) as { email_verified_at: string }).email_verified_at).toBeTruthy();
    expect(sendVerificationEmail(userId)).toBe(false);
  });

  it("la acción de verificar manda a login o a la página de error", async () => {
    const { userId } = withPassword();
    sendVerificationEmail(userId);
    const token = new URL(JSON.parse(outbox("verify_email")[0].payload).url).searchParams.get("token")!;
    await expect(verifyEmailAction(form({ token, cambio: "0" }))).rejects.toThrow("REDIRECT:/login?verificado=1");
    await expect(verifyEmailAction(form({ token, cambio: "0" }))).rejects.toThrow("REDIRECT:/verificar?error=1");
  });

  it("cambiar el correo exige la contraseña, valida el formato y rechaza correos ya usados", () => {
    const a = withPassword();
    const b = withPassword();
    expect(requestEmailChange(a.userId, "equivocada", "nuevo@x.pe")).toEqual({ ok: false, error: "La contraseña no es correcta." });
    expect(requestEmailChange(a.userId, PASSWORD, "no-es-correo").ok).toBe(false);
    expect(requestEmailChange(a.userId, PASSWORD, a.email.toUpperCase()).ok).toBe(false);
    expect(requestEmailChange(a.userId, PASSWORD, b.email).ok).toBe(false);
    expect(outbox("verify_email")).toHaveLength(0);
  });

  it("el correo de acceso no cambia hasta confirmar desde el correo nuevo; después se avisa al anterior", () => {
    const { userId, companyId, email } = withPassword();
    expect(requestEmailChange(userId, PASSWORD, "Nuevo@Empresa.pe").ok).toBe(true);
    const [mail] = outbox("verify_email");
    expect(mail.to_email).toBe("nuevo@empresa.pe");
    const url = new URL(JSON.parse(mail.payload).url);
    expect(url.searchParams.get("cambio")).toBe("1");
    expect((getDb().prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string }).email).toBe(email);

    expect(confirmEmailChange(url.searchParams.get("token")!)).toEqual({ ok: true });
    expect((getDb().prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string }).email).toBe("nuevo@empresa.pe");
    expect(getCompany(companyId).email).toBe("nuevo@empresa.pe");
    const notice = outbox("email_changed");
    expect(notice).toHaveLength(1);
    expect(notice[0].to_email).toBe(email);
  });

  it("si el correo nuevo lo tomó otra cuenta mientras tanto, el cambio falla", () => {
    const a = withPassword();
    requestEmailChange(a.userId, PASSWORD, "disputado@empresa.pe");
    const token = new URL(JSON.parse(outbox("verify_email")[0].payload).url).searchParams.get("token")!;
    const c = withPassword();
    getDb().prepare("UPDATE users SET email = 'disputado@empresa.pe' WHERE id = ?").run(c.userId);
    expect(confirmEmailChange(token)).toEqual({ ok: false });
  });

  it("la acción de cambio de correo responde con el aviso de confirmación", async () => {
    const { userId } = withPassword();
    await loginAs(userId);
    const result = await requestEmailChangeAction({}, form({ email: "otro@empresa.pe", password: PASSWORD }));
    expect(result.ok).toMatch(/correo nuevo/);
  });
});

describe("cambiar contraseña con sesión", () => {
  it("exige la actual, aplica el largo mínimo y cierra las demás sesiones pero no la actual", async () => {
    const { userId } = withPassword();
    await loginAs(userId);
    const current = jar.store.get("pdp_session")!;
    getDb().prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES ('otra', ?, ?)").run(userId, new Date(Date.now() + 1e9).toISOString());

    expect((await changePasswordAction({}, form({ current: "mala", next: "nueva-contraseña-1" }))).error).toMatch(/actual/);
    expect((await changePasswordAction({}, form({ current: PASSWORD, next: "corta" }))).error).toMatch(/10 caracteres/);
    expect((await changePasswordAction({}, form({ current: PASSWORD, next: "nueva-contraseña-1" }))).ok).toBeTruthy();

    const ids = (getDb().prepare("SELECT id FROM sessions WHERE user_id = ?").all(userId) as { id: string }[]).map((s) => s.id);
    expect(ids).toEqual([current]);
    expect(changePassword(userId, "nueva-contraseña-1", "otra-contraseña-2").ok).toBe(true);
  });

  it("la demo no puede cambiar nada", async () => {
    const demo = makeCompany({ billing_status: "demo" });
    await loginAs(demo.userId);
    expect((await changePasswordAction({}, form({ current: "x", next: "nueva-contraseña-1" }))).error).toMatch(/demostración/);
    expect((await requestEmailChangeAction({}, form({ email: "a@b.pe", password: "x" }))).error).toMatch(/demostración/);
  });
});

describe("preferencias", () => {
  it("activar y desactivar los avisos no esenciales", async () => {
    const { companyId, userId } = withPassword();
    await loginAs(userId);
    await expect(setMailOptoutAction(form({ optout: "1" }))).rejects.toThrow("REDIRECT:/app/ajustes?ok=correo");
    expect(getCompany(companyId).mail_optout).toBe(1);
    await expect(setMailOptoutAction(form({ optout: "0" }))).rejects.toThrow("REDIRECT:");
    expect(getCompany(companyId).mail_optout).toBe(0);
  });

  it("aceptar la IA queda con fecha; la demo no puede", async () => {
    const { companyId, userId } = withPassword();
    await loginAs(userId);
    await expect(setAiConsentAction(form({ accept: "1" }))).rejects.toThrow("REDIRECT:/app/ajustes?ok=ia");
    expect(getCompany(companyId).ai_consent_at).toBeTruthy();

    const demo = makeCompany({ billing_status: "demo" });
    await loginAs(demo.userId);
    await expect(setAiConsentAction(form({ accept: "1" }))).rejects.toThrow("REDIRECT:/app/ajustes");
    expect(getCompany(demo.companyId).ai_consent_at).toBeNull();
  });
});
