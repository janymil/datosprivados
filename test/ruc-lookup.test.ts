import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ store: new Map<string, string>(), ip: "198.51.100.1" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (ctx.store.has(name) ? { name, value: ctx.store.get(name)! } : undefined),
    set: (name: string, value: string) => void ctx.store.set(name, value),
    delete: (name: string) => void ctx.store.delete(name),
  }),
  headers: async () => new Headers({ "cf-connecting-ip": ctx.ip }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { checkCompanyRuc, lookupRuc } from "@/lib/ruc-lookup";
import { signupAction } from "@/app/actions/auth";
import { updateCompanyAction } from "@/app/actions/company";
import { getCompanyRow, makeCompany } from "./helpers/db";

const RUC_A = "20601030013"; // ejemplo de la documentación de Decolecta
const RUC_B = "20100070970";
const RUC_C = "20512345671"; // «pendiente» en la prueba de registro
const RUC_D = "20512345680"; // empresa activa en la prueba de registro
const RUC_E = "20512345698"; // cambio de RUC con verificación correcta
const RUC_F = "20523456718"; // cambio de RUC rechazado
const DAY = 24 * 60 * 60 * 1000;

const sunat = (over: Record<string, unknown> = {}) => ({
  razon_social: "REXTIE S.A.C.",
  numero_documento: RUC_A,
  estado: "ACTIVO",
  condicion: "HABIDO",
  direccion: "AV. JOSE GALVEZ BARRENECHEA NRO 566 INT. 101 URB. CORPAC ",
  ...over,
});
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const fetchMock = vi.fn();
const original = { ...process.env };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const signupForm = (over: Record<string, string> = {}) =>
  form({ company: "Mi Tienda", ruc: RUC_A, name: "Ana", email: `ana-${Math.random().toString(36).slice(2)}@example.com`, password: "clave-larga-123", plan: "basico", term: "monthly", ...over });
const count = (sql: string, ...p: string[]) => (getDb().prepare(sql).get(...p) as { n: number }).n;

let run = 0;
beforeEach(() => {
  run += 1;
  ctx.ip = `198.51.100.${run}`; // cada prueba usa su IP para no agotar el límite de registros
  ctx.store.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.DECOLECTA_API_TOKEN = "token-de-prueba";
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...original };
});

describe("lookupRuc / checkCompanyRuc", () => {
  it("consulta el endpoint documentado con el token en el encabezado, no en la URL", async () => {
    fetchMock.mockResolvedValue(reply(200, sunat()));
    const result = await checkCompanyRuc(RUC_A);
    expect(result).toMatchObject({ ok: true, verified: true, razonSocial: "REXTIE S.A.C.", estado: "ACTIVO", condicion: "HABIDO" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.decolecta.com/v1/sunat/ruc?numero=${RUC_A}`);
    expect(String(url)).not.toContain("token");
    expect(init.headers.Authorization).toBe("Bearer token-de-prueba");
  });

  it("422 y 404 significan que el RUC no existe", async () => {
    fetchMock.mockResolvedValueOnce(reply(422, { message: "ruc no valido" }));
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: false, code: "no_existe" });
    fetchMock.mockResolvedValueOnce(reply(404, {}));
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: false, code: "no_existe" });
  });

  it("un RUC que no está ACTIVO se rechaza con su estado", async () => {
    fetchMock.mockResolvedValue(reply(200, sunat({ estado: "BAJA DE OFICIO" })));
    const result = await checkCompanyRuc(RUC_A);
    expect(result).toMatchObject({ ok: false, code: "inactivo" });
    expect(!result.ok && result.message).toContain("BAJA DE OFICIO");
  });

  it.each([400, 401, 403, 429, 500, 503])("el HTTP %i NO se toma como «no existe»: servicio no disponible", async (status) => {
    fetchMock.mockResolvedValue(reply(status, { error: "x" }));
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: false, code: "no_disponible" });
  });

  it("errores de red y tiempo agotado son «no disponible»", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: false, code: "no_disponible" });
  });

  it("una respuesta de otro RUC o sin razón social se descarta", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, sunat({ numero_documento: RUC_B })));
    expect(await lookupRuc(RUC_A)).toMatchObject({ status: "unavailable" });
    fetchMock.mockResolvedValueOnce(reply(200, sunat({ razon_social: "" })));
    expect(await lookupRuc(RUC_A)).toMatchObject({ status: "unavailable" });
  });

  it("sin token: en desarrollo no verifica; en producción rechaza", async () => {
    delete process.env.DECOLECTA_API_TOKEN;
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: true, verified: false });
    (process.env as Record<string, string>).NODE_ENV = "production";
    expect(await checkCompanyRuc(RUC_A)).toMatchObject({ ok: false, code: "no_disponible" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("registro con verificación de RUC", () => {
  it("con el RUC verificado usa la razón social y el domicilio de la SUNAT", async () => {
    fetchMock.mockResolvedValue(reply(200, sunat()));
    await expect(signupAction({}, signupForm())).rejects.toThrow("REDIRECT:/pago");
    const company = getDb().prepare("SELECT * FROM companies WHERE ruc = ? AND billing_status = 'pending' ORDER BY created_at DESC").get(RUC_A) as Record<string, string>;
    expect(company.name).toBe("REXTIE S.A.C.");
    expect(company.address).toBe("AV. JOSE GALVEZ BARRENECHEA NRO 566 INT. 101 URB. CORPAC");
    expect(company.ruc_status).toBe("ACTIVO");
    expect(company.ruc_condition).toBe("HABIDO");
    expect(company.ruc_verified_at).toBeTruthy();
  });

  it("si la SUNAT no responde no se crea nada", async () => {
    fetchMock.mockResolvedValue(reply(503, {}));
    const email = `caida-${run}@example.com`;
    const result = await signupAction({}, signupForm({ email }));
    expect(result.error).toMatch(/No pudimos verificar tu RUC/);
    expect(count("SELECT COUNT(*) n FROM users WHERE email = ?", email)).toBe(0);
  });

  it("un RUC inexistente o inactivo no crea cuenta", async () => {
    fetchMock.mockResolvedValueOnce(reply(422, { message: "ruc no valido" }));
    expect((await signupAction({}, signupForm({ ruc: RUC_B }))).error).toMatch(/No encontramos ese RUC/);
    fetchMock.mockResolvedValueOnce(reply(200, sunat({ numero_documento: RUC_B, estado: "SUSPENSION TEMPORAL" })));
    expect((await signupAction({}, signupForm({ ruc: RUC_B }))).error).toMatch(/SUSPENSION TEMPORAL/);
    expect(count("SELECT COUNT(*) n FROM companies WHERE ruc = ?", RUC_B)).toBe(0);
  });

  it("no consulta a la SUNAT si el RUC ni siquiera pasa la validación local", async () => {
    const result = await signupAction({}, signupForm({ ruc: "20601030014" }));
    expect(result.error).toMatch(/Revisa tu RUC/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un RUC con cuenta activa no se registra otra vez; uno solo pendiente sí", async () => {
    makeCompany({ ruc: RUC_D, billing_status: "active", paid_until: new Date(Date.now() + DAY).toISOString() });
    fetchMock.mockResolvedValue(reply(200, sunat({ numero_documento: RUC_D })));
    const blocked = await signupAction({}, signupForm({ ruc: RUC_D }));
    expect(blocked.error).toMatch(/Ya existe una cuenta activa para ese RUC/);
    expect(fetchMock).not.toHaveBeenCalled();

    makeCompany({ ruc: RUC_C, billing_status: "pending" });
    fetchMock.mockResolvedValue(reply(200, sunat({ numero_documento: RUC_C })));
    await expect(signupAction({}, signupForm({ ruc: RUC_C }))).rejects.toThrow("REDIRECT:/pago");
  });
});

describe("cambiar el RUC en Empresa", () => {
  async function activeCompany(ruc: string) {
    const { companyId, userId } = makeCompany({ ruc, billing_status: "active", paid_until: new Date(Date.now() + DAY).toISOString() });
    ctx.store.clear();
    await createSession(userId);
    return companyId;
  }
  const empresaForm = (ruc: string) => form({ name: "Nombre viejo", ruc, sector: "Otro tipo de negocio", email: "a@b.pe" });

  it("con el mismo RUC no consulta a la SUNAT", async () => {
    const companyId = await activeCompany(RUC_A);
    await expect(updateCompanyAction(empresaForm(RUC_A))).rejects.toThrow("REDIRECT:/app/empresa?ok=1");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getCompanyRow(companyId).name).toBe("Nombre viejo");
  });

  it("un RUC nuevo se verifica y toma la razón social de la SUNAT", async () => {
    const companyId = await activeCompany(RUC_A);
    fetchMock.mockResolvedValue(reply(200, sunat({ numero_documento: RUC_E, razon_social: "OTRA EMPRESA S.A." })));
    await expect(updateCompanyAction(empresaForm(RUC_E))).rejects.toThrow("REDIRECT:/app/empresa?ok=1");
    const row = getCompanyRow(companyId);
    expect(row.ruc).toBe(RUC_E);
    expect(row.name).toBe("OTRA EMPRESA S.A.");
    expect(row.ruc_verified_at).toBeTruthy();
  });

  it("un RUC nuevo inexistente, inactivo o en uso no se guarda", async () => {
    const companyId = await activeCompany(RUC_A);
    const before = getCompanyRow(companyId).ruc;
    fetchMock.mockResolvedValueOnce(reply(422, {}));
    await expect(updateCompanyAction(empresaForm(RUC_F))).rejects.toThrow("REDIRECT:/app/empresa?error=ruc_no_existe");
    await expect(updateCompanyAction(empresaForm("123"))).rejects.toThrow("REDIRECT:/app/empresa?error=ruc_formato");
    expect(getCompanyRow(companyId).ruc).toBe(before);
  });
});
