import { beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({ preapprovals: new Map<string, unknown>() }));

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mercadopago")>();
  return {
    ...original,
    isMercadoPagoConfigured: () => true,
    getPreapproval: async (id: string) => mp.preapprovals.get(id) ?? { id, status: "pending" },
  };
});

import { getDb, newId } from "@/lib/db";
import { setSubscriptionPending } from "@/lib/billing";
import { JOB_NAMES, jobsHealth, runJob } from "@/lib/jobs";
import { POST as cronPost, GET as cronGet } from "@/app/api/cron/[job]/route";
import { makeActiveCompany, makeArcoRequest, makeCompany, makeIncident } from "./helpers/db";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Miércoles 2026-11-04 12:00 en Lima.
const NOW = new Date("2026-11-04T17:00:00Z");

const outbox = (template?: string) =>
  getDb()
    .prepare(`SELECT * FROM email_outbox ${template ? "WHERE template = ?" : ""}`)
    .all(...(template ? [template] : [])) as unknown as Array<{ template: string; to_email: string; payload: string }>;

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM email_outbox; DELETE FROM job_runs; DELETE FROM arco_requests; DELETE FROM incidents");
});

describe("recordatorios de plazos ARCO", () => {
  it("avisa cuando faltan ≤3 días hábiles y no repite al correr otra vez", async () => {
    const { companyId } = makeActiveCompany();
    makeArcoRequest(companyId, { due_at: "2026-11-06" }); // faltan 2 días hábiles
    makeArcoRequest(companyId, { due_at: "2026-11-20" }); // lejos: sin aviso

    await runJob("arco-deadline-reminders", NOW);
    await runJob("arco-deadline-reminders", new Date(NOW.getTime() + HOUR));
    const mails = outbox("arco_due_soon");
    expect(mails).toHaveLength(1);
    expect(JSON.parse(mails[0].payload).days).toBe(2);
  });

  it("avisa una sola vez cuando el plazo ya venció, y no de lo ya respondido", async () => {
    const { companyId } = makeActiveCompany();
    makeArcoRequest(companyId, { due_at: "2026-11-02" });
    makeArcoRequest(companyId, { due_at: "2026-11-02", status: "respondido" });
    await runJob("arco-deadline-reminders", NOW);
    await runJob("arco-deadline-reminders", NOW);
    expect(outbox("arco_overdue")).toHaveLength(1);
  });

  it("ignora cuentas sin suscripción vigente, demo y eliminadas", async () => {
    const lapsed = makeCompany({ billing_status: "active", paid_until: "2026-10-01T00:00:00Z" });
    makeArcoRequest(lapsed.companyId, { due_at: "2026-11-02" });
    const demo = makeCompany({ billing_status: "demo" });
    makeArcoRequest(demo.companyId, { due_at: "2026-11-02" });
    await runJob("arco-deadline-reminders", NOW);
    expect(outbox()).toHaveLength(0);
  });

  it("le escribe al responsable de datos, no solo al titular de la cuenta", async () => {
    const { companyId } = makeActiveCompany();
    getDb().prepare("UPDATE companies SET dpo_email = 'odp@empresa.pe' WHERE id = ?").run(companyId);
    makeArcoRequest(companyId, { due_at: "2026-11-02" });
    await runJob("arco-deadline-reminders", NOW);
    expect(outbox("arco_overdue")[0].to_email).toBe("odp@empresa.pe");
  });
});

describe("recordatorios de incidentes (48 h)", () => {
  const inHours = (h: number) => new Date(NOW.getTime() + h * HOUR).toISOString();

  it("avisa a 12 h y a 2 h, una vez cada vez", async () => {
    const { companyId } = makeActiveCompany();
    const id = makeIncident(companyId, { criteria: "datos_sensibles", due_at: inHours(10) });

    await runJob("incident-deadline-reminders", NOW);
    await runJob("incident-deadline-reminders", NOW);
    expect(outbox("incident_deadline")).toHaveLength(1);

    getDb().prepare("UPDATE incidents SET due_at = ? WHERE id = ?").run(inHours(1.5), id);
    await runJob("incident-deadline-reminders", NOW);
    const hours = outbox("incident_deadline").map((m) => JSON.parse(m.payload).hours).sort((a: number, b: number) => a - b);
    expect(hours).toEqual([2, 12]);
  });

  it("no avisa si falta mucho, si ya se notificó, si no hay criterios o si ya venció", async () => {
    const { companyId } = makeActiveCompany();
    makeIncident(companyId, { criteria: "datos_sensibles", due_at: inHours(30) });
    makeIncident(companyId, { criteria: "datos_sensibles", due_at: inHours(5), status: "notificado", notified_at: NOW.toISOString() });
    makeIncident(companyId, { criteria: "", due_at: inHours(5) });
    makeIncident(companyId, { criteria: "datos_sensibles", due_at: inHours(-3) });
    await runJob("incident-deadline-reminders", NOW);
    expect(outbox("incident_deadline")).toHaveLength(0);
  });
});

describe("cobro y cuentas vencidas", () => {
  it("marca como vencidas las cuentas cuyo periodo terminó", async () => {
    const lapsed = makeCompany({ billing_status: "active", paid_until: new Date(NOW.getTime() - DAY).toISOString() });
    const fine = makeActiveCompany();
    const result = await runJob("billing-reconcile", NOW);
    expect(result.status).toBe("ok");
    const status = (id: string) => (getDb().prepare("SELECT billing_status FROM companies WHERE id = ?").get(id) as { billing_status: string }).billing_status;
    expect(status(lapsed.companyId)).toBe("expired");
    expect(status(fine.companyId)).toBe("active");
  });

  it("avisa de la renovación (con suscripción) o del vencimiento (sin ella), una vez por periodo", async () => {
    const renewing = makeCompany({
      billing_status: "active",
      paid_until: new Date(NOW.getTime() + 2 * DAY).toISOString(),
      subscription_id: "sub-1",
      subscription_status: "authorized",
    });
    const ending = makeCompany({
      billing_status: "active",
      paid_until: new Date(NOW.getTime() + 2 * DAY).toISOString(),
      subscription_id: "sub-2",
      subscription_status: "cancelled",
    });
    await runJob("billing-reconcile", NOW);
    await runJob("billing-reconcile", NOW);
    const to = (template: string) => outbox(template).map((m) => m.to_email);
    expect(to("renewal_soon")).toEqual([renewing.email]);
    expect(to("subscription_expiring")).toEqual([ending.email]);
  });

  it("avisa del borrado a los 30, 60 y 7 días antes, sin repetir", async () => {
    const { companyId, email } = makeCompany({ billing_status: "expired", paid_until: new Date(NOW.getTime() - 31 * DAY).toISOString() });
    const mine = () => outbox("lapsed_notice").filter((m) => m.to_email === email);
    await runJob("lapsed-account-notices", NOW);
    await runJob("lapsed-account-notices", NOW);
    expect(mine()).toHaveLength(1);

    await runJob("lapsed-account-notices", new Date(NOW.getTime() + 30 * DAY));
    await runJob("lapsed-account-notices", new Date(NOW.getTime() + 53 * DAY));
    expect(mine()).toHaveLength(3);
    expect((getDb().prepare("SELECT lapsed_notice FROM companies WHERE id = ?").get(companyId) as { lapsed_notice: number }).lapsed_notice).toBe(3);
  });

  it("no borra a nadie que no recibió el último aviso, y sí a quien ya pasó el plazo", async () => {
    const warned = makeCompany({ billing_status: "expired", paid_until: new Date(NOW.getTime() - 95 * DAY).toISOString() });
    const unwarned = makeCompany({ billing_status: "expired", paid_until: new Date(NOW.getTime() - 95 * DAY).toISOString() });
    const recent = makeCompany({ billing_status: "expired", paid_until: new Date(NOW.getTime() - 40 * DAY).toISOString() });
    const db = getDb();
    db.prepare("UPDATE companies SET lapsed_notice = 3 WHERE id IN (?, ?)").run(warned.companyId, recent.companyId);

    await runJob("purge-old-data", NOW);
    const deleted = (id: string) => (db.prepare("SELECT deleted_at FROM companies WHERE id = ?").get(id) as { deleted_at: string | null }).deleted_at;
    expect(deleted(warned.companyId)).not.toBeNull();
    expect(deleted(unwarned.companyId)).toBeNull();
    expect(deleted(recent.companyId)).toBeNull();
  });

  it("elimina altas que nunca pagaron después de 30 días", async () => {
    const stale = makeCompany({ billing_status: "pending" });
    const fresh = makeCompany({ billing_status: "pending" });
    getDb().prepare("UPDATE companies SET created_at = ? WHERE id = ?").run(new Date(NOW.getTime() - 40 * DAY).toISOString(), stale.companyId);
    await runJob("purge-old-data", NOW);
    const deleted = (id: string) => (getDb().prepare("SELECT deleted_at FROM companies WHERE id = ?").get(id) as { deleted_at: string | null }).deleted_at;
    expect(deleted(stale.companyId)).not.toBeNull();
    expect(deleted(fresh.companyId)).toBeNull();
  });
});

describe("avisos de documentos y feriados", () => {
  it("avisa de documentos desactualizados una vez por semana", async () => {
    const { companyId } = makeActiveCompany();
    getDb()
      .prepare(
        "INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at, template_version, built_from) VALUES (?, ?, 'politica', 'P', 'x', 1, 0, ?, 0, NULL)"
      )
      .run(newId(), companyId, NOW.toISOString());
    await runJob("document-staleness-notice", NOW);
    await runJob("document-staleness-notice", new Date(NOW.getTime() + HOUR));
    expect(outbox("document_outdated")).toHaveLength(1);
    await runJob("document-staleness-notice", new Date(NOW.getTime() + 8 * DAY));
    expect(outbox("document_outdated")).toHaveLength(2);
  });

  it("verifica que los dos próximos años tengan feriados", async () => {
    getDb().exec("DELETE FROM holidays WHERE date LIKE '2027-%'");
    const result = await runJob("holidays-check", NOW);
    expect(result.status).toBe("ok");
    const n = (getDb().prepare("SELECT COUNT(*) AS n FROM holidays WHERE date LIKE '2027-%'").get() as { n: number }).n;
    expect(n).toBeGreaterThanOrEqual(15);
  });
});

describe("candado, registro y salud", () => {
  it("una tarea en curso bloquea a otra igual; un candado viejo (proceso muerto) no", async () => {
    const db = getDb();
    db.prepare("INSERT INTO job_runs (id, job, started_at) VALUES (?, 'expire-sessions', ?)").run(newId(), NOW.toISOString());
    expect((await runJob("expire-sessions", new Date(NOW.getTime() + 60_000))).status).toBe("locked");
    expect((await runJob("expire-sessions", new Date(NOW.getTime() + 20 * 60_000))).status).toBe("ok");
  });

  it("cada ejecución queda registrada con su detalle", async () => {
    await runJob("expire-sessions", NOW);
    const run = getDb().prepare("SELECT * FROM job_runs WHERE job = 'expire-sessions'").get() as { ok: number; finished_at: string; detail: string };
    expect(run.ok).toBe(1);
    expect(run.finished_at).toBeTruthy();
    expect(JSON.parse(run.detail)).toHaveProperty("sessions");
  });

  it("ejecutar todas las tareas dos veces seguidas no duplica ningún correo", async () => {
    const { companyId } = makeActiveCompany();
    makeArcoRequest(companyId, { due_at: "2026-11-02" });
    makeIncident(companyId, { criteria: "datos_sensibles", due_at: new Date(NOW.getTime() + 5 * HOUR).toISOString() });
    for (const job of JOB_NAMES.filter((name) => name !== "send-outbox")) await runJob(job, NOW);
    const first = outbox().length;
    expect(first).toBeGreaterThan(0);
    for (const job of JOB_NAMES.filter((name) => name !== "send-outbox")) await runJob(job, NOW);
    expect(outbox()).toHaveLength(first);
  });

  it("la salud falla si una tarea no corre a tiempo o hay correos atascados, y se recupera", async () => {
    const stale = jobsHealth(NOW);
    expect(stale.healthy).toBe(false);
    expect(stale.jobs.every((job) => job.overdue)).toBe(true);

    for (const job of JOB_NAMES) await runJob(job, NOW);
    // runJob guarda finished_at con el reloj real; se alinea con NOW para la comprobación.
    getDb().prepare("UPDATE job_runs SET finished_at = ? WHERE ok = 1").run(NOW.toISOString());
    // Los avisos que generaron las tareas se envían; aquí solo importa la salud de las tareas.
    getDb().exec("DELETE FROM email_outbox");
    expect(jobsHealth(NOW).healthy).toBe(true);

    getDb()
      .prepare("INSERT INTO email_outbox (id, to_email, template, payload, status, next_attempt_at, created_at) VALUES (?, 'a@b.pe', 'welcome', '{}', 'pending', ?, ?)")
      .run(newId(), new Date(NOW.getTime() - 3 * HOUR).toISOString(), new Date(NOW.getTime() - 3 * HOUR).toISOString());
    const stuck = jobsHealth(NOW);
    expect(stuck.healthy).toBe(false);
    expect(stuck.outboxStuck).toBe(1);

    expect(jobsHealth(new Date(NOW.getTime() + 30 * HOUR)).jobs.find((j) => j.job === "send-outbox")?.overdue).toBe(true);
  });
});

describe("ruta /api/cron", () => {
  const SECRET = "secreto-de-prueba-0123456789";
  const call = (job: string, headers: Record<string, string> = {}, method: "POST" | "GET" = "POST") =>
    (method === "POST" ? cronPost : cronGet)(new Request(`http://x/api/cron/${job}`, { method, headers }), { params: Promise.resolve({ job }) });

  it("rechaza sin secreto configurado, sin cabecera o con cabecera equivocada", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("expire-sessions", { authorization: `Bearer ${SECRET}` })).status).toBe(401);
    process.env.CRON_SECRET = SECRET;
    expect((await call("expire-sessions")).status).toBe(401);
    expect((await call("expire-sessions", { authorization: "Bearer otro" })).status).toBe(401);
    process.env.CRON_SECRET = "corto";
    expect((await call("expire-sessions", { authorization: "Bearer corto" })).status).toBe(401);
  });

  it("con el secreto ejecuta la tarea; una tarea desconocida es 404; /health informa", async () => {
    process.env.CRON_SECRET = SECRET;
    const auth = { authorization: `Bearer ${SECRET}` };
    const ran = await call("expire-sessions", auth);
    expect(ran.status).toBe(200);
    expect((await ran.json()).status).toBe("ok");
    expect((await call("no-existe", auth)).status).toBe(404);
    const health = await call("health", auth, "GET");
    expect([200, 503]).toContain(health.status);
    expect(await health.json()).toHaveProperty("jobs");
    expect((await call("health", {}, "GET")).status).toBe(401);
  });
});

describe("conciliación con MercadoPago", () => {
  it("billing-sync activa una suscripción autorizada cuyo webhook se perdió", async () => {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const subscriptionId = `sub-perdida-${newId()}`;
    setSubscriptionPending(companyId, subscriptionId, "basico", "monthly");
    mp.preapprovals.set(subscriptionId, {
      id: subscriptionId,
      status: "authorized",
      external_reference: companyId,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 19, currency_id: "PEN" },
    });

    const result = await runJob("billing-sync", NOW);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("la tarea debía correr");
    expect(result.detail.activated).toBe(1);

    const company = getDb()
      .prepare("SELECT billing_status, subscription_id, paid_until FROM companies WHERE id = ?")
      .get(companyId) as { billing_status: string; subscription_id: string | null; paid_until: string | null };
    expect(company.billing_status).toBe("active");
    expect(company.subscription_id).toBe(subscriptionId);
    expect(company.paid_until).toBeTruthy();
  });

  it("billing-sync no activa una suscripción que sigue sin autorizar", async () => {
    const { companyId } = makeCompany({ billing_status: "pending" });
    const subscriptionId = `sub-espera-${newId()}`;
    setSubscriptionPending(companyId, subscriptionId, "basico", "monthly");
    mp.preapprovals.set(subscriptionId, { id: subscriptionId, status: "pending", external_reference: companyId });

    const result = await runJob("billing-sync", NOW);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("la tarea debía correr");
    expect(result.detail.activated).toBe(0);

    const row = getDb().prepare("SELECT billing_status FROM companies WHERE id = ?").get(companyId) as {
      billing_status: string;
    };
    expect(row.billing_status).toBe("pending");
  });
});

