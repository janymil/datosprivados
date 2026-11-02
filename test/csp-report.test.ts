import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ headers: new Headers(), ip: "0" }));

vi.mock("next/headers", () => ({ headers: async () => ctx.headers }));

import { POST } from "@/app/api/csp-report/route";

let run = 0;
beforeEach(() => {
  run += 1;
  ctx.ip = `198.51.100.${run}`;
  ctx.headers = new Headers({ "x-real-ip": ctx.ip });
});
afterEach(() => vi.restoreAllMocks());

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://x.pe/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

const violation = {
  "csp-report": {
    "document-uri": "https://x.pe/app/documentos?tab=politica",
    "blocked-uri": "https://cdn.example.com/widget.js?email=ana@example.com",
    "effective-directive": "script-src",
    disposition: "report",
  },
};

describe("POST /api/csp-report", () => {
  it("acepta el informe y registra solo un resumen, sin datos del cliente", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await post(violation);
    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);

    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("csp_violation");
    expect(line).toContain("script-src");
    expect(line).toContain("/app/documentos"); // la ruta, sin la consulta
    expect(line).not.toContain("tab=politica");
    expect(line).not.toContain("ana@example.com");
    expect(line).not.toContain("https://x.pe/app"); // ni la URL completa
  });

  it("ignora un cuerpo que no es un informe (no rompe ni registra)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await post("no es json")).status).toBe(204);
    expect((await post({ cualquier: "cosa" })).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("rechaza cuerpos grandes sin leerlos", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await post("x".repeat(9000), { "content-length": "9000" });
    expect(response.status).toBe(413);
    expect(warn).not.toHaveBeenCalled();
  });

  it("limita los avisos por IP", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (let index = 0; index < 30; index += 1) expect((await post(violation)).status).toBe(204);
    expect((await post(violation)).status).toBe(429);
  });
});
