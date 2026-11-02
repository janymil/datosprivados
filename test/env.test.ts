import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkEnvironment } from "@/lib/env";

/**
 * Configuración de producción: el arranque falla (`instrumentation.ts` lanza)
 * cuando falta algo imprescindible, y `.env.example` es la lista de lo que la app
 * lee de verdad. Estas pruebas fijan ambas cosas para que no se separen.
 */

type Env = Record<string, string | undefined>;

const PRODUCTION: Env = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://app.datosprivados.pe",
  DECOLECTA_API_TOKEN: "token",
  MERCADOPAGO_ACCESS_TOKEN: "APP_USR-1",
  MERCADOPAGO_WEBHOOK_SECRET: "secreto",
  CRON_SECRET: "0123456789abcdef",
};

const production = (patch: Env = {}) => checkEnvironment({ ...PRODUCTION, ...patch } as NodeJS.ProcessEnv);

/** Variables internas de Node/Next, no configuración del producto. */
const INTERNAL = new Set(["NODE_ENV", "NEXT_RUNTIME"]);

function envVarsReadByTheApp(): string[] {
  const root = path.join(process.cwd(), "src");
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        for (const match of fs.readFileSync(full, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)) found.add(match[1]);
      }
    }
  };
  walk(root);
  return [...found].filter((name) => !INTERNAL.has(name)).sort();
}

describe("configuración de producción", () => {
  it("con lo mínimo imprescindible arranca sin errores", () => {
    expect(production().errors).toEqual([]);
  });

  it("en desarrollo no bloquea nunca", () => {
    expect(checkEnvironment({ NODE_ENV: "development" } as NodeJS.ProcessEnv).errors).toEqual([]);
  });

  const ERRORS: Array<[string, Env, RegExp]> = [
    ["sin URL https", { NEXT_PUBLIC_APP_URL: "http://app.datosprivados.pe" }, /NEXT_PUBLIC_APP_URL/],
    ["sin URL", { NEXT_PUBLIC_APP_URL: "" }, /NEXT_PUBLIC_APP_URL/],
    ["cookie insegura", { COOKIE_SECURE: "0" }, /COOKIE_SECURE/],
    ["pago simulado", { PAYMENTS_DEV_BYPASS: "1" }, /PAYMENTS_DEV_BYPASS/],
    ["base relativa", { DATOSPRIVADOS_DB: "data/x.db" }, /DATOSPRIVADOS_DB/],
    ["sin verificación de RUC", { DECOLECTA_API_TOKEN: "" }, /DECOLECTA_API_TOKEN/],
    ["MercadoPago sin secreto de webhook", { MERCADOPAGO_WEBHOOK_SECRET: "" }, /MERCADOPAGO_WEBHOOK_SECRET/],
    ["Resend sin clave", { MAIL_PROVIDER: "resend" }, /MAIL_API_KEY/],
    ["sin CRON_SECRET", { CRON_SECRET: "" }, /CRON_SECRET/],
    ["CRON_SECRET corto", { CRON_SECRET: "corto" }, /CRON_SECRET/],
  ];

  it.each(ERRORS)("falla el arranque: %s", (_name, patch, message) => {
    const { errors } = production(patch);
    expect(errors.some((error) => message.test(error))).toBe(true);
  });

  it("avisa (sin bloquear) de lo que desactiva funciones", () => {
    const { errors, warnings } = production({ MERCADOPAGO_ACCESS_TOKEN: "", OPERATOR_EMAILS: "", MAIL_PROVIDER: "" });
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toMatch(/MERCADOPAGO_ACCESS_TOKEN/);
    expect(warnings.join(" ")).toMatch(/OPERATOR_EMAILS/);
    expect(warnings.join(" ")).toMatch(/MAIL_PROVIDER/);
  });

  it(".env.example documenta todas las variables que lee la app", () => {
    const example = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    const documented = new Set(
      [...example.matchAll(/^#?\s*([A-Z0-9_]+)=/gm)].map((match) => match[1])
    );
    const missing = envVarsReadByTheApp().filter((name) => !documented.has(name));
    expect(missing).toEqual([]);
  });

  it("el arranque del servidor lanza cuando hay errores", () => {
    const instrumentation = fs.readFileSync(path.join(process.cwd(), "src", "instrumentation.ts"), "utf8");
    expect(instrumentation).toContain("checkEnvironment");
    expect(instrumentation).toMatch(/if \(errors\.length\)[\s\S]*throw new Error/);
  });
});
