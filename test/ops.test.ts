import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDb, newId } from "@/lib/db";
import { backupAgeHours, configPresence, dbCheck, operationalAlerts, readiness } from "@/lib/ops";
import { overdueIncidents } from "@/lib/data";
import { OverdueIncidentsBanner } from "@/components/overdue-incidents-banner";
import { logEvent, scrubText } from "@/lib/log";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readyGet } from "@/app/api/ready/route";
import { makeActiveCompany, makeIncident } from "./helpers/db";

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

  it("los endpoints públicos no dicen qué integraciones están configuradas", async () => {
    // `config: { mail, mercadopago, llm, cron }` era un mapa gratis de qué está apagado
    // (p. ej. que el correo no está configurado). Ahora solo queda un booleano agregado
    // en /api/ready; el desglose vive en /api/cron/health, que exige el secreto.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MAIL_PROVIDER", "");
    const health = JSON.parse(await (await healthGet()).text());
    expect(health).not.toHaveProperty("config");
    expect(health.checks).toEqual({ db: true });

    const ready = await readyGet();
    const readyBody = await ready.text();
    expect(ready.status).toBe(503); // falta el correo
    expect(JSON.parse(readyBody)).not.toHaveProperty("config");
    expect(JSON.parse(readyBody).checks).toEqual({ db: true, config: false });
    expect(readyBody).not.toMatch(/mail|mercadopago|llm/i); // ni el desglose ni los nombres
    vi.unstubAllEnvs();
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

  it("«hay IA» significa que la app puede llamar a un modelo, no que exista una clave suelta", () => {
    // El preview tenía OPENAI_API_KEY sin OPENAI_MODEL: la app estaba en modo básico y
    // /api/health decía `llm: true` igualmente (descubierto el 2026-11-03).
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "sk-de-prueba");
    vi.stubEnv("OPENAI_MODEL", "");
    expect(configPresence().llm).toBe(false);

    vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini");
    expect(configPresence().llm).toBe(true);

    vi.stubEnv("AI_DISABLED", "1");
    expect(configPresence().llm).toBe(false); // apagada a propósito tampoco es «hay IA»
    vi.unstubAllEnvs();
  });
});

describe("incidentes pasados de plazo", () => {
  it("lista solo los que vencieron sin notificación registrada", () => {
    const { companyId } = makeActiveCompany();
    const past = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    const future = new Date(NOW.getTime() + 20 * 3_600_000).toISOString();

    const overdueId = makeIncident(companyId, { due_at: past });
    makeIncident(companyId, { due_at: past, notified_at: past }); // ya notificado
    makeIncident(companyId, { due_at: past, status: "cerrado" }); // cerrado
    makeIncident(companyId, { due_at: future }); // aún en plazo

    expect(overdueIncidents(companyId, NOW).map((incident) => incident.id)).toEqual([overdueId]);
  });

  it("el aviso del panel aparece solo con incidentes vencidos", () => {
    expect(renderToStaticMarkup(OverdueIncidentsBanner({ incidentIds: [] }))).toBe("");
    const html = renderToStaticMarkup(OverdueIncidentsBanner({ incidentIds: ["a", "b"] }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("2 incidentes pasados el plazo de 48 horas");
    expect(html).toContain("/app/incidentes");
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

  it("avisa de una factura reembolsada que lleva días sin nota de crédito", () => {
    const db = getDb();
    const companyId = newId();
    const paymentId = newId();
    db.prepare(
      "INSERT INTO companies (id, name, ruc, sector, slug, email, created_at) VALUES (?, 'Ops S.A.C.', '20604567891', 'Otro', ?, 'ops@example.com', ?)"
    ).run(companyId, `ops-${companyId.slice(0, 8)}`, NOW.toISOString());
    db.prepare(
      "INSERT INTO payments (id, company_id, plan, term, amount, status, provider, payment_id, created_at) VALUES (?, ?, 'basico', 'monthly', 19, 'refunded', 'mercadopago', ?, ?)"
    ).run(paymentId, companyId, `mp-${paymentId.slice(0, 8)}`, NOW.toISOString());

    const invoiceId = newId();
    db.prepare(
      `INSERT INTO invoices (id, company_id, payment_id, status, doc_type, buyer_ruc, buyer_name, description, base_amount, igv_amount, total, currency, series, number, created_at)
       VALUES (?, ?, ?, 'credit_note_pending', 'factura', '20604567891', 'Ops S.A.C.', 'Suscripción', 16.1, 2.9, 19, 'PEN', 'F001', '9001', ?)`
    ).run(invoiceId, companyId, paymentId, new Date(NOW.getTime() - 5 * 24 * 3_600_000).toISOString());

    const alert = operationalAlerts(NOW, {}).find((item) => item.code === "credit_note_pending");
    expect(alert?.message).toContain("nota de crédito");

    // Recién creada (dentro de los 3 días) todavía no alerta.
    db.prepare("UPDATE invoices SET created_at = ? WHERE id = ?").run(new Date(NOW.getTime() - 3_600_000).toISOString(), invoiceId);
    expect(operationalAlerts(NOW, {}).some((item) => item.code === "credit_note_pending")).toBe(false);

    db.prepare("DELETE FROM invoices WHERE id = ?").run(invoiceId);
    db.prepare("DELETE FROM payments WHERE id = ?").run(paymentId);
    db.prepare("DELETE FROM companies WHERE id = ?").run(companyId);
  });

  it("avisa de los correos descartados, sin importar su antigüedad", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO email_outbox (id, company_id, to_email, template, payload, status, next_attempt_at, created_at) VALUES (?, NULL, 'rebotado@example.com', 'welcome', '{}', 'dead', ?, ?)"
    ).run(newId(), NOW.toISOString(), NOW.toISOString());
    const alert = operationalAlerts(NOW, {}).find((item) => item.code === "outbox_dead");
    expect(alert?.message).toContain("descartados");
    db.prepare("DELETE FROM email_outbox WHERE status = 'dead'").run();
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
