import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { isValidRuc } from "@/lib/ruc";
import { checkEnvironment } from "@/lib/env";
import { preapprovalMismatch, REASON_MAX_LENGTH, subscriptionReason, validateMercadoPagoSignature } from "@/lib/mercadopago";
import { takeRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/db";
import { backupDatabase } from "../scripts/backup-db.mjs";
import { restoreDatabase } from "../scripts/restore-db.mjs";

describe("RUC", () => {
  it("acepta un RUC con dígito verificador correcto", () => {
    expect(isValidRuc("20604567891")).toBe(true);
  });
  it("rechaza dígito verificador, prefijo y largo inválidos", () => {
    expect(isValidRuc("20604567892")).toBe(false);
    expect(isValidRuc("30604567891")).toBe(false);
    expect(isValidRuc("2060456789")).toBe(false);
    expect(isValidRuc("2060456789a")).toBe(false);
  });
});

describe("checkEnvironment", () => {
  const prod = { NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://x.pe", COOKIE_SECURE: "1", DECOLECTA_API_TOKEN: "t", CRON_SECRET: "0123456789abcdef" } as NodeJS.ProcessEnv;
  it("no exige nada fuera de producción", () => {
    expect(checkEnvironment({ NODE_ENV: "development" } as NodeJS.ProcessEnv).errors).toEqual([]);
  });
  it("rechaza URL http, cookie insegura y bypass de pago en producción", () => {
    const { errors } = checkEnvironment({ ...prod, NEXT_PUBLIC_APP_URL: "http://x.pe", COOKIE_SECURE: "0", PAYMENTS_DEV_BYPASS: "1" });
    expect(errors).toHaveLength(3);
  });
  it("exige el token de Decolecta para verificar el RUC", () => {
    expect(checkEnvironment({ ...prod, DECOLECTA_API_TOKEN: "" }).errors).toEqual([expect.stringContaining("DECOLECTA_API_TOKEN")]);
  });
  it("exige secreto de webhook si hay token de MercadoPago", () => {
    expect(checkEnvironment({ ...prod, MERCADOPAGO_ACCESS_TOKEN: "t" }).errors).toHaveLength(1);
    expect(checkEnvironment({ ...prod, MERCADOPAGO_ACCESS_TOKEN: "t", MERCADOPAGO_WEBHOOK_SECRET: "s" }).errors).toEqual([]);
  });
});

describe("firma del webhook", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });
  const sign = (secret: string, id: string, req: string, ts: string) =>
    crypto.createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");

  it("en producción sin secreto rechaza todo", () => {
    process.env = { ...original, NODE_ENV: "production", MERCADOPAGO_WEBHOOK_SECRET: "" };
    expect(validateMercadoPagoSignature({ signature: null, requestId: null, dataId: "1" })).toBe(false);
  });
  it("sin secreto fuera de producción deja pasar", () => {
    process.env = { ...original, NODE_ENV: "development", MERCADOPAGO_WEBHOOK_SECRET: "" };
    expect(validateMercadoPagoSignature({ signature: null, requestId: null, dataId: "1" })).toBe(true);
  });
  it("valida la firma HMAC y rechaza una alterada", () => {
    process.env = { ...original, NODE_ENV: "production", MERCADOPAGO_WEBHOOK_SECRET: "secreto" };
    const v1 = sign("secreto", "42", "req-1", "1700000000");
    expect(validateMercadoPagoSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "42" })).toBe(true);
    expect(validateMercadoPagoSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "43" })).toBe(false);
    expect(validateMercadoPagoSignature({ signature: `ts=1700000001,v1=${v1}`, requestId: "req-1", dataId: "42" })).toBe(false);
  });
  it("un id alfanumérico se firma en minúsculas, como indica la documentación", () => {
    process.env = { ...original, NODE_ENV: "production", MERCADOPAGO_WEBHOOK_SECRET: "secreto" };
    const v1 = sign("secreto", "2c938084abcdef", "req-1", "1700000000");
    expect(validateMercadoPagoSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "2C938084ABCDEF" })).toBe(true);
  });
});

describe("preapprovalMismatch", () => {
  const ok = {
    id: "p",
    status: "authorized",
    external_reference: "c1",
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 19, currency_id: "PEN" },
  };
  it("acepta la suscripción esperada", () => {
    expect(preapprovalMismatch(ok, { companyId: "c1", amount: 19, term: "monthly" })).toBeNull();
  });
  it("rechaza otra empresa, otro monto, otra moneda y otra frecuencia", () => {
    expect(preapprovalMismatch(ok, { companyId: "c2", amount: 19, term: "monthly" })).toMatch(/empresa/);
    expect(preapprovalMismatch(ok, { companyId: "c1", amount: 39, term: "monthly" })).toMatch(/monto/);
    expect(preapprovalMismatch({ ...ok, auto_recurring: { ...ok.auto_recurring, currency_id: "USD" } }, { companyId: "c1", amount: 19, term: "monthly" })).toMatch(/moneda/);
    expect(preapprovalMismatch(ok, { companyId: "c1", amount: 19, term: "yearly" })).toMatch(/frecuencia/);
  });
});

describe("rate limit", () => {
  it("permite hasta el límite y luego bloquea; la ventana nueva reinicia", () => {
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => takeRateLimit("k", 3, 1000, t0))).toEqual([true, true, true]);
    expect(takeRateLimit("k", 3, 1000, t0 + 10)).toBe(false);
    expect(takeRateLimit("otra", 3, 1000, t0)).toBe(true);
    expect(takeRateLimit("k", 3, 1000, t0 + 1001)).toBe(true);
  });
});

describe("respaldo y restauración", () => {
  it("respalda, verifica y restaura sin sobrescribir", () => {
    const db = getDb();
    const source = process.env.DATOSPRIVADOS_DB!;
    const dir = path.join(path.dirname(source), `bk-${crypto.randomUUID()}`);
    const before = (db.prepare("SELECT COUNT(*) n FROM companies").get() as { n: number }).n;
    const result = backupDatabase({ source, targetDir: dir });
    expect(fs.existsSync(result.file)).toBe(true);
    const target = path.join(dir, "restored.db");
    restoreDatabase({ backupFile: result.file, target });
    expect(() => restoreDatabase({ backupFile: result.file, target })).toThrow(/ya existe/);
    expect(before).toBeGreaterThan(0);
    fs.appendFileSync(result.file, "x");
    expect(() => restoreDatabase({ backupFile: result.file, target: path.join(dir, "otra.db") })).toThrow(/sha256/);
  });
});

describe("reason de la suscripción", () => {
  it("respeta el límite de 60 caracteres de MercadoPago", () => {
    expect(subscriptionReason("Básico", "monthly")).toBe("DatosPrivados Básico — suscripción mensual");
    expect(subscriptionReason("Pro", "yearly")).toBe("DatosPrivados Pro — suscripción anual");
    const long = subscriptionReason("Plan Empresa con un nombre larguísimo", "yearly");
    expect(long.length).toBeLessThanOrEqual(REASON_MAX_LENGTH);
    expect(long.startsWith("DatosPrivados Plan Empresa")).toBe(true);
    expect(long.endsWith("…")).toBe(true);
  });
});

