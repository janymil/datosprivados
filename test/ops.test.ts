import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDb, newId } from "@/lib/db";
import { backupAgeHours, dbCheck, operationalAlerts, readiness } from "@/lib/ops";
import { logEvent, scrubText } from "@/lib/log";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readyGet } from "@/app/api/ready/route";

const NOW = new Date("2026-11-04T17:00:00Z");

describe("salud", () => {
  it("/api/health responde 200 con la base sana y no filtra valores de configuración", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-supersecreto";
    const res = await healthGet();
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text).checks.db).toBe(true);
    expect(text).not.toContain("supersecreto");
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  });

  it("la prueba de escritura no deja filas ni transacciones abiertas", () => {
    expect(dbCheck().ok).toBe(true);
    expect(dbCheck().ok).toBe(true);
  });

  it("/api/ready en producción exige correo, cobro y CRON_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(readiness().ok).toBe(false);
    expect((await readyGet()).status).toBe(503);
    vi.stubEnv("MAIL_PROVIDER", "resend");
    vi.stubEnv("MAIL_API_KEY", "k");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "t");
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "s");
    vi.stubEnv("CRON_SECRET", "x".repeat(20));
    expect(readiness().ok).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("alertas operativas", () => {
  it("avisa de webhooks fallidos, respaldo viejo y ausencia de respaldos", () => {
    const db = getDb();
    for (let i = 0; i < 3; i += 1) {
      db.prepare("INSERT INTO webhook_events (id, provider, type, data_id, received_at, outcome, error) VALUES (?, 'mercadopago', 'payment', ?, ?, '500', 'boom')").run(newId(), `d${i}`, NOW.toISOString());
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bk-"));
    expect(operationalAlerts(NOW, { BACKUP_DIR: dir }).map((a) => a.code)).toEqual(expect.arrayContaining(["webhook_failures", "backup_missing"]));

    const file = path.join(dir, "datosprivados-20261101-000000.db.gz");
    fs.writeFileSync(file, "x");
    fs.utimesSync(file, new Date(NOW.getTime() - 30 * 3_600_000), new Date(NOW.getTime() - 30 * 3_600_000));
    expect(backupAgeHours(dir, NOW)).toBeCloseTo(30, 0);
    expect(operationalAlerts(NOW, { BACKUP_DIR: dir }).map((a) => a.code)).toContain("backup_old");

    fs.utimesSync(file, new Date(NOW.getTime() - 2 * 3_600_000), new Date(NOW.getTime() - 2 * 3_600_000));
    expect(operationalAlerts(NOW, { BACKUP_DIR: dir }).map((a) => a.code)).not.toContain("backup_old");
    db.prepare("DELETE FROM webhook_events").run();
  });
});

describe("registro estructurado", () => {
  it("emite JSON de una línea y descarta campos y correos sensibles", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const line = logEvent("error", "x", { message: "falló para ana@correo.pe", email: "ana@correo.pe", password: "p", digest: "123" });
    spy.mockRestore();
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "error", event: "x", digest: "123", message: "falló para [correo]" });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("password");
    expect(scrubText("a@b.co y c@d.pe")).toBe("[correo] y [correo]");
  });
});
