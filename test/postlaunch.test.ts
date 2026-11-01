import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { getDb, newId } from "@/lib/db";
import { backupDatabase } from "../scripts/backup-db.mjs";
import { restoreDrill } from "../scripts/restore-drill.mjs";
import { attentionItems, weeklyReport } from "../scripts/weekly-report.mjs";

const NOW = new Date("2026-11-04T17:00:00Z");

describe("informe semanal", () => {
  it("sin fallos operativos solo quedan los plazos legales de la semilla", () => {
    const items = attentionItems(weeklyReport(getDb(), NOW, {} as NodeJS.ProcessEnv));
    expect(items.filter((line) => !/ARCO|incidentes/.test(line))).toEqual([]);
  });

  it("señala webhooks fallidos, correos muertos y tareas fallidas", () => {
    const db = getDb();
    const recent = "2026-11-02T10:00:00.000Z";
    db.prepare("INSERT INTO webhook_events (id, provider, type, data_id, received_at, outcome, error) VALUES (?, 'mercadopago', 'payment', '1', ?, '500', 'boom')").run(newId(), recent);
    db.prepare("INSERT INTO email_outbox (id, to_email, template, status, next_attempt_at, created_at, error) VALUES (?, 'a@b.pe', 'recibo', 'dead', ?, ?, 'rebotó')").run(newId(), recent, recent);
    db.prepare("INSERT INTO job_runs (id, job, started_at, ok, error) VALUES (?, 'send-outbox', ?, 0, 'x')").run(newId(), recent);
    db.prepare("INSERT INTO ai_usage (id, feature, model, input_tokens, output_tokens, created_at) VALUES (?, 'chat', 'm', 1000000, 100000, ?)").run(newId(), "2026-11-01T10:00:00.000Z");

    const report = weeklyReport(db, NOW, { ...process.env, AI_MONTHLY_BUDGET_USD: "5" });
    expect(report.webhooks.failed).toBe(1);
    expect(report.ai.month_spend_usd).toBe(4.5);
    expect(report.ai.budget_used_pct).toBe(90);
    const text = attentionItems(report).join("\n");
    expect(text).toMatch(/webhooks fallidos/);
    expect(text).toMatch(/agotaron reintentos/);
    expect(text).toMatch(/tareas fallidas/);
    expect(text).toMatch(/90 %/);
  });
});

describe("simulacro de restauración", () => {
  it("restaura el último respaldo, cuenta filas y no deja copias", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drill-"));
    const source = path.join(dir, "src.db");
    const db = new DatabaseSync(source);
    db.exec("CREATE TABLE companies(id); CREATE TABLE users(id); CREATE TABLE payments(id); CREATE TABLE arco_requests(id); INSERT INTO users VALUES ('u')");
    db.close();
    backupDatabase({ source, targetDir: path.join(dir, "b") });
    const result = restoreDrill({ dir: path.join(dir, "b") });
    expect(result.ok).toBe(true);
    expect(result.tables.users).toBe(1);
  });

  it("falla si no hay respaldos", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drill-"));
    expect(() => restoreDrill({ dir })).toThrow(/No hay respaldos/);
  });
});
