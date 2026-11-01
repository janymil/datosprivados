import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.store.has(name) ? { name, value: jar.store.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.store.set(name, value),
    delete: (name: string) => void jar.store.delete(name),
  }),
  headers: async () => new Headers({ "cf-connecting-ip": "203.0.113.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { saveBankAction } from "@/app/actions/company";
import { createManualArcoRequestAction, createArcoRequestAction } from "@/app/actions/arco";
import { runBankAiWizardAction } from "@/app/actions/ai";
import { loginAction, signupAction } from "@/app/actions/auth";
import { makeCompany } from "./helpers/db";

const DAY = 24 * 60 * 60 * 1000;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function loginAs(userId: string) {
  jar.store.clear();
  await createSession(userId);
}

const count = (sql: string, ...params: string[]) =>
  (getDb().prepare(sql).get(...params) as { n: number }).n;

beforeEach(() => {
  jar.store.clear();
});

describe("las acciones exigen sesión y suscripción vigente", () => {
  it("sin sesión redirige a /login", async () => {
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow("REDIRECT:/login");
  });

  it("una cuenta pendiente de pago no puede escribir datos", async () => {
    const { companyId, userId } = makeCompany({ billing_status: "pending" });
    await loginAs(userId);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow("REDIRECT:/pago");
    await expect(
      createManualArcoRequestAction(form({ type: "acceso", channel: "correo", requester_name: "A", description: "d", email: "a@b.pe", received_at: "2026-10-01" }))
    ).rejects.toThrow("REDIRECT:/pago");
    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = ?", companyId)).toBe(0);
    expect(count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = ?", companyId)).toBe(0);
  });

  it("una cuenta vencida tampoco", async () => {
    const { companyId, userId } = makeCompany({
      billing_status: "active",
      paid_until: new Date(Date.now() - DAY).toISOString(),
    });
    await loginAs(userId);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow("REDIRECT:/pago");
    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = ?", companyId)).toBe(0);
  });

  it("una cuenta pendiente que eligió Pro no puede usar la IA Pro", async () => {
    const { userId } = makeCompany({ billing_status: "pending", plan: "pro" });
    await loginAs(userId);
    await expect(runBankAiWizardAction("tengo una tienda")).rejects.toThrow("REDIRECT:/pago");
  });

  it("una cuenta activa sí escribe, solo en su empresa", async () => {
    const a = makeCompany({ billing_status: "active", paid_until: new Date(Date.now() + DAY).toISOString() });
    const b = makeCompany({ billing_status: "active", paid_until: new Date(Date.now() + DAY).toISOString() });
    await loginAs(a.userId);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow(/REDIRECT:\/app\/bancos\//);
    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = ?", a.companyId)).toBe(1);
    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = ?", b.companyId)).toBe(0);
  });

  it("la cuenta demo no llama al modelo de IA", async () => {
    const demo = getDb().prepare("SELECT u.id FROM users u WHERE u.company_id = 'casa-verde'").get() as { id: string };
    await loginAs(demo.id);
    const result = await runBankAiWizardAction("tengo una tienda");
    expect(result).toEqual({ ok: false, error: expect.stringContaining("demostración") });
  });
});

describe("limites de intentos", () => {
  it("bloquea el inicio de sesión tras demasiados intentos para un correo", async () => {
    const attempt = () => loginAction({}, form({ email: "nadie@example.com", password: "mala-clave-123" }));
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await attempt());
    expect(results[0].error).toMatch(/incorrectos/);
    expect(results[10].error).toMatch(/Demasiados intentos/);
  });

  it("rechaza RUC inválido y contraseña corta en el registro", async () => {
    const base = { company: "X SAC", name: "Ana", email: "ana@example.com", plan: "basico", term: "monthly", accept_legal: "on" };
    expect((await signupAction({}, form({ ...base, ruc: "20604567892", password: "una-clave-larga" }))).error).toMatch(/RUC/);
    expect((await signupAction({}, form({ ...base, ruc: "20604567891", password: "corta" }))).error).toMatch(/10 caracteres/);
  });

  it("el formulario público ARCO limita a 5 envíos por IP", async () => {
    const { companyId } = makeCompany();
    const slug = (getDb().prepare("SELECT slug FROM companies WHERE id = ?").get(companyId) as { slug: string }).slug;
    const send = () =>
      createArcoRequestAction(form({ slug, requester_name: "Persona", description: "Quiero mis datos", email: "p@example.com", type: "acceso" }));
    const outcomes: string[] = [];
    for (let i = 0; i < 6; i++) {
      await send().catch((error: Error) => outcomes.push(error.message));
    }
    expect(outcomes.slice(0, 5).every((m) => m.includes("?ok=ARCO-"))).toBe(true);
    expect(outcomes[5]).toContain("error=limite");
    expect(count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = ?", companyId)).toBe(5);
  });
});
