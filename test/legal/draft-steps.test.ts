import { afterEach, describe, expect, it } from "vitest";
import { childEnv } from "@/legal/draft/steps";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("entorno de los procesos del redactor (revisión I2)", () => {
  it("las pruebas y los renders no heredan secretos de producción", () => {
    process.env.OPENAI_API_KEY = "sk-secreto";
    process.env.CRON_SECRET = "c".repeat(32);
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-x";
    process.env.PATH = "/usr/bin";
    process.env.HOME = "/root";
    const env = childEnv();
    expect(env).toMatchObject({ PATH: "/usr/bin", HOME: "/root", NODE_ENV: "test" });
    expect(Object.keys(env).sort()).not.toContain("OPENAI_API_KEY");
    expect(env.CRON_SECRET).toBeUndefined();
    expect(env.MERCADOPAGO_ACCESS_TOKEN).toBeUndefined();
  });

  it("lo que un paso necesita se pasa explícito", () => {
    process.env.CRON_SECRET = "c".repeat(32);
    expect(childEnv({ CRON_SECRET: "x", LEGAL_API_URL: "http://127.0.0.1:3000" })).toMatchObject({ CRON_SECRET: "x", LEGAL_API_URL: "http://127.0.0.1:3000" });
  });
});
