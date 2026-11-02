import { describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => ctx.headers }));

import { clientIp, validIp } from "@/lib/client-ip";

const withHeaders = (values: Record<string, string>) => {
  ctx.headers = new Headers(values);
};

/**
 * `clientIp()` alimenta los límites de intentos (`rate-limit.ts`). Si devuelve un
 * valor que el atacante elige, cada intento estrena cupo.
 */
describe("validIp", () => {
  it("acepta IPv4 e IPv6 y normaliza la IPv6", () => {
    expect(validIp("203.0.113.9")).toBe("203.0.113.9");
    expect(validIp(" 2001:DB8::1 ")).toBe("2001:db8::1");
  });

  it("rechaza lo que no es una IP", () => {
    for (const value of ["", "  ", "no-es-ip", "999.1.1.1", "1.2.3", "1.2.3.4.5", "desconocida", "<script>", null, undefined]) {
      expect(validIp(value), String(value)).toBeUndefined();
    }
    expect(validIp("a".repeat(60))).toBeUndefined();
  });
});

describe("clientIp", () => {
  it("prefiere X-Real-IP: lo escribe nginx y el cliente no puede fijarlo", async () => {
    withHeaders({ "x-real-ip": "203.0.113.9", "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" });
    expect(await clientIp()).toBe("203.0.113.9");
  });

  it("sin nginx delante usa CF-Connecting-IP (desarrollo, pruebas)", async () => {
    withHeaders({ "cf-connecting-ip": "198.51.100.7" });
    expect(await clientIp()).toBe("198.51.100.7");
  });

  it("descarta un encabezado con basura y pasa al siguiente", async () => {
    withHeaders({ "x-real-ip": "basura", "cf-connecting-ip": "198.51.100.7" });
    expect(await clientIp()).toBe("198.51.100.7");
  });

  it("usa el primer valor de X-Forwarded-For como último recurso", async () => {
    withHeaders({ "x-forwarded-for": "192.0.2.10, 10.0.0.1" });
    expect(await clientIp()).toBe("192.0.2.10");
  });

  it("sin encabezados devuelve una clave fija, no un valor elegido por el cliente", async () => {
    withHeaders({});
    expect(await clientIp()).toBe("desconocida");
  });

  it("dos peticiones con IPs distintas no comparten clave", async () => {
    withHeaders({ "x-real-ip": "203.0.113.9" });
    const first = await clientIp();
    withHeaders({ "x-real-ip": "203.0.113.10" });
    expect(await clientIp()).not.toBe(first);
  });
});
