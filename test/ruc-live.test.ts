import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ ip: "203.0.113.1" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers({ "cf-connecting-ip": ctx.ip }),
}));

import { checkRucAction } from "@/app/actions/auth";
import { makeCompany } from "./helpers/db";

const RUC = "20601030013"; // ejemplo de la documentación de Decolecta
const sunat = (over: Record<string, unknown> = {}) => ({
  razon_social: "REXTIE S.A.C.",
  numero_documento: RUC,
  estado: "ACTIVO",
  condicion: "HABIDO",
  direccion: "AV. JOSE GALVEZ BARRENECHEA NRO 566",
  ...over,
});
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const original = { ...process.env };

let run = 0;
beforeEach(() => {
  run += 1;
  ctx.ip = `203.0.113.${run}`; // cada prueba con su IP: el límite no se arrastra entre pruebas
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.DECOLECTA_API_TOKEN = "token-de-prueba";
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...original };
});

describe("verificación del RUC al salir del campo (registro)", () => {
  it("RUC activo: devuelve la razón social y el estado de la SUNAT", async () => {
    fetchMock.mockResolvedValue(reply(200, sunat()));
    expect(await checkRucAction(RUC)).toEqual({ ok: true, razonSocial: "REXTIE S.A.C.", estado: "ACTIVO", condicion: "HABIDO" });
  });

  it("dígito verificador inválido: lo dice sin consultar a la SUNAT", async () => {
    const result = await checkRucAction("20601030014");
    expect(result).toEqual({ ok: false, message: "Revisa tu RUC: son 11 dígitos válidos según SUNAT." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("RUC inexistente o no activo: el mismo mensaje que al crear la cuenta", async () => {
    fetchMock.mockResolvedValueOnce(reply(404, { message: "not found" }));
    expect(await checkRucAction(RUC)).toEqual({ ok: false, message: "No encontramos ese RUC en la SUNAT. Revísalo e inténtalo de nuevo." });
    fetchMock.mockResolvedValueOnce(reply(200, sunat({ estado: "BAJA DE OFICIO" })));
    expect(await checkRucAction(RUC)).toMatchObject({ ok: false, message: expect.stringContaining("«BAJA DE OFICIO»") });
  });

  it("no revela si el RUC ya tiene cuenta aquí (solo lo que dice la SUNAT)", async () => {
    makeCompany({ ruc: RUC, billing_status: "active" });
    fetchMock.mockResolvedValue(reply(200, sunat()));
    const result = await checkRucAction(RUC);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/cuenta|existe/i);
  });

  it("10 consultas por IP cada 10 minutos; la 11.ª no llega a la SUNAT", async () => {
    fetchMock.mockImplementation(async () => reply(200, sunat()));
    for (let i = 0; i < 10; i++) expect((await checkRucAction(RUC)).ok).toBe(true);
    const blocked = await checkRucAction(RUC);
    expect(blocked).toEqual({ ok: false, message: "Demasiadas consultas de RUC. Espera unos minutos o continúa: lo verificamos al crear la cuenta." });
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("servicio caído: no bloquea, avisa que se verificará al crear la cuenta", async () => {
    fetchMock.mockResolvedValue(reply(401, { error: "Limit Exceeded" }));
    expect(await checkRucAction(RUC)).toEqual({ ok: false, message: "No pudimos verificar tu RUC con la SUNAT en este momento. Inténtalo de nuevo en unos minutos.", retry: true });
  });
});
