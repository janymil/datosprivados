import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { JOB_NAMES, jobEnabled, jobsHealth, runJob } from "@/lib/jobs";
import { makeActiveCompany, makeArcoRequest, makeBank, makeIncident } from "./helpers/db";

/**
 * Resumen semanal opcional (área 6). Lo que hay que demostrar no es que el correo
 * salga, sino que: (1) con la bandera apagada no hace nada y **no** ensucia la salud
 * del sistema, (2) encendido cuenta solo lo pendiente, (3) no repite en la misma
 * semana y (4) una cuenta al día no recibe correo.
 */

// Miércoles 2026-11-04 12:00 en Lima.
const NOW = new Date("2026-11-04T17:00:00Z");
const previous = { ...process.env };

const outbox = () =>
  getDb().prepare("SELECT template, to_email, payload, essential FROM email_outbox").all() as unknown as Array<{
    template: string;
    to_email: string;
    payload: string;
    essential: number;
  }>;

beforeEach(() => {
  process.env = { ...previous };
  delete process.env.WEEKLY_DIGEST;
  const db = getDb();
  db.exec("DELETE FROM email_outbox; DELETE FROM job_runs; DELETE FROM arco_requests; DELETE FROM incidents; DELETE FROM data_banks; DELETE FROM documents");
});

afterEach(() => {
  process.env = { ...previous };
});

describe("resumen semanal (WEEKLY_DIGEST)", () => {
  it("apagado por defecto: no manda nada y no se le exige a la salud del sistema", async () => {
    makeActiveCompany();
    makeArcoRequest(makeActiveCompany().companyId, { due_at: "2026-11-02" });

    expect(jobEnabled("weekly-digest")).toBe(false);
    expect(await runJob("weekly-digest", NOW)).toEqual({ job: "weekly-digest", status: "ok", detail: { saltado: "desactivada" } });
    expect(outbox()).toHaveLength(0);

    // Ni siquiera aparece como tarea esperada: una función apagada no puede poner
    // `/api/health` en rojo por «no ejecutada».
    expect(JOB_NAMES).toContain("weekly-digest");
    expect(jobsHealth(NOW).jobs.map((job) => job.job)).not.toContain("weekly-digest");
  });

  it("encendido manda lo pendiente al responsable y no repite en la misma semana", async () => {
    process.env.WEEKLY_DIGEST = "1";
    const { companyId } = makeActiveCompany();
    // El ayudante de pruebas deja `dpo_email` = correo del titular; aquí se pone uno
    // distinto para comprobar que el resumen va al responsable de datos.
    getDb().prepare("UPDATE companies SET dpo_email = ? WHERE id = ?").run("responsable@example.com", companyId);
    makeArcoRequest(companyId, { due_at: "2026-11-02" }); // vencida
    makeIncident(companyId, { status: "abierto" });
    makeBank(companyId, { name: "Clientes web" }); // queda en borrador

    const first = await runJob("weekly-digest", NOW);
    expect(first.status).toBe("ok");
    expect(first).toMatchObject({ detail: { sent: 1 } });

    const [mail] = outbox();
    expect(mail.template).toBe("weekly_digest");
    expect(mail.to_email).toBe("responsable@example.com"); // va al responsable de datos
    expect(mail.essential).toBe(0); // no esencial: se puede desactivar en Ajustes
    const payload = JSON.parse(mail.payload) as { pending: string };
    expect(payload.pending).toContain("ARCO");
    expect(payload.pending).toContain("fuera de plazo");
    expect(payload.pending).toContain("incidente");
    expect(payload.pending).toContain("SIPDP");

    // Misma semana, otra ejecución: nada nuevo (dedupe por semana y empresa).
    await runJob("weekly-digest", NOW);
    expect(outbox()).toHaveLength(1);

    // Semana siguiente: vuelve a avisar.
    await runJob("weekly-digest", new Date(NOW.getTime() + 7 * 24 * 3_600_000));
    expect(outbox()).toHaveLength(2);
  });

  it("una cuenta al día no recibe correo", async () => {
    process.env.WEEKLY_DIGEST = "1";
    // Banco ya inscrito y sin solicitudes, incidentes ni documentos.
    const { companyId } = makeActiveCompany();
    makeBank(companyId, { name: "Clientes web", status: "registrado" });

    const outcome = await runJob("weekly-digest", NOW);
    expect(outcome).toMatchObject({ detail: { sent: 0 } });
    expect(outbox()).toHaveLength(0);
  });

  it("con la bandera encendida vuelve a ser una tarea que la salud espera", async () => {
    process.env.WEEKLY_DIGEST = "1";
    const health = jobsHealth(NOW);
    expect(health.jobs.map((job) => job.job)).toContain("weekly-digest");
    // Nunca corrió: se considera atrasada desde el origen, como cualquier otra.
    expect(health.jobs.find((job) => job.job === "weekly-digest")?.overdue).toBe(true);

    await runJob("weekly-digest", NOW);
    getDb().prepare("UPDATE job_runs SET finished_at = ? WHERE job = 'weekly-digest'").run(NOW.toISOString());
    expect(jobsHealth(NOW).jobs.find((job) => job.job === "weekly-digest")?.overdue).toBe(false);
  });
});
