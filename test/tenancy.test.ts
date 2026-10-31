import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { createIncidentAction, updateIncidentAction } from "@/app/actions/incidents";
import { markBankRegisteredAction, reopenBankAction, saveBankAction } from "@/app/actions/company";
import { respondArcoAction, setArcoStatusAction } from "@/app/actions/arco";
import { deleteEvidenceAction, updateProviderAction } from "@/app/actions/tools";
import { jar, freezeTime } from "./helpers/next";
import { makeActiveCompany, makeArcoRequest, makeBank, makeEvidence, makeIncident, makeProvider } from "./helpers/db";
import { limaDateTimeLocal } from "@/lib/format";

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

async function loginAs(userId: string) {
  jar.store.clear();
  await createSession(userId);
}

const row = <T>(sql: string, ...params: string[]) => getDb().prepare(sql).get(...params) as T;

beforeEach(() => jar.store.clear());

describe("una empresa no toca los datos de otra (company_id)", () => {
  it("banco: no puede editar, inscribir ni reabrir el de otra empresa", async () => {
    const a = makeActiveCompany();
    const b = makeActiveCompany();
    const bankB = makeBank(b.companyId, { name: "Clientes B" });
    await loginAs(a.userId);

    await expect(saveBankAction(form({ id: bankB, name: "Hackeado" }))).rejects.toThrow("REDIRECT:");
    await expect(markBankRegisteredAction(form({ id: bankB, sipdp_code: "X" }))).rejects.toThrow("REDIRECT:");
    expect(row<{ name: string; status: string }>("SELECT name, status FROM data_banks WHERE id = ?", bankB)).toEqual({ name: "Clientes B", status: "borrador" });

    getDb().prepare("UPDATE data_banks SET status = 'registrado' WHERE id = ?").run(bankB);
    await expect(reopenBankAction(form({ id: bankB }))).rejects.toThrow("REDIRECT:");
    expect(row<{ status: string }>("SELECT status FROM data_banks WHERE id = ?", bankB).status).toBe("registrado");
  });

  it("ARCO: no puede responder ni cambiar el estado de la solicitud de otra empresa", async () => {
    const a = makeActiveCompany();
    const b = makeActiveCompany();
    const requestB = makeArcoRequest(b.companyId);
    await loginAs(a.userId);

    await expect(respondArcoAction(form({ id: requestB, response: "texto", status: "respondido" }))).rejects.toThrow("REDIRECT:/app/arco");
    await expect(setArcoStatusAction(form({ id: requestB, status: "rechazado" }))).rejects.toThrow("REDIRECT:");
    expect(row<{ status: string; response: string | null }>("SELECT status, response FROM arco_requests WHERE id = ?", requestB)).toEqual({ status: "nuevo", response: null });
  });

  it("incidente: no puede notificar, cerrar ni editar el de otra empresa", async () => {
    const a = makeActiveCompany();
    const b = makeActiveCompany();
    const incidentB = makeIncident(b.companyId);
    await loginAs(a.userId);

    for (const action of ["notificar", "cerrar", "analisis", "guardar"]) {
      await expect(updateIncidentAction(form({ id: incidentB, action, description: "x" }))).rejects.toThrow("REDIRECT:/app/incidentes");
    }
    expect(row<{ status: string }>("SELECT status FROM incidents WHERE id = ?", incidentB).status).toBe("abierto");
  });

  it("herramientas y evidencias: IDs ajenos se ignoran", async () => {
    const a = makeActiveCompany();
    const b = makeActiveCompany();
    const providerB = makeProvider(b.companyId);
    const evidenceB = makeEvidence(b.companyId);
    await loginAs(a.userId);

    await expect(updateProviderAction(form({ id: providerB, name: "x", dpa_status: "firmado", transfer_status: "comunicada" }))).rejects.toThrow("REDIRECT:");
    await expect(deleteEvidenceAction(form({ id: evidenceB, type: "capacitacion" }))).rejects.toThrow("REDIRECT:");
    expect(row<{ dpa_status: string }>("SELECT dpa_status FROM providers WHERE id = ?", providerB).dpa_status).toBe("pendiente");
    expect(row<{ n: number }>("SELECT COUNT(*) n FROM evidence WHERE id = ?", evidenceB).n).toBe(1);
  });
});

describe("incidentes", () => {
  it("48 h desde la detección en hora de Lima", async () => {
    const { userId, companyId } = makeActiveCompany();
    await loginAs(userId);
    await expect(
      createIncidentAction(form({ title: "Robo de laptop", detected_at: "2026-10-01T23:30", criteria: ["gran_volumen"] }))
    ).rejects.toThrow(/REDIRECT:\/app\/incidentes\//);
    const incident = row<{ detected_at: string; due_at: string; criteria: string }>("SELECT detected_at, due_at, criteria FROM incidents WHERE company_id = ?", companyId);
    expect(incident.detected_at).toBe("2026-10-02T04:30:00.000Z"); // 23:30 Lima = 04:30 UTC
    expect(incident.due_at).toBe("2026-10-04T04:30:00.000Z");
    expect(incident.criteria).toBe("gran_volumen");
  });

  it("sin título o con fecha mal formada se rechaza", async () => {
    const { userId, companyId } = makeActiveCompany();
    await loginAs(userId);
    await expect(createIncidentAction(form({ title: "" }))).rejects.toThrow("REDIRECT:/app/incidentes/nuevo?error=1");
    await expect(createIncidentAction(form({ title: "x", detected_at: "ayer" }))).rejects.toThrow("error=fecha");
    expect(row<{ n: number }>("SELECT COUNT(*) n FROM incidents WHERE company_id = ?", companyId).n).toBe(0);
  });

  it("rechaza fechas futuras, con 5 minutos de tolerancia", async () => {
    const { userId, companyId } = makeActiveCompany();
    await loginAs(userId);
    const frozen = freezeTime("2026-10-15T15:00:00Z"); // 10:00 en Lima
    try {
      expect(limaDateTimeLocal()).toBe("2026-10-15T10:00");
      await expect(createIncidentAction(form({ title: "Futuro", detected_at: "2026-10-15T10:30" }))).rejects.toThrow("error=fecha");
      await expect(createIncidentAction(form({ title: "Dentro de tolerancia", detected_at: "2026-10-15T10:04" }))).rejects.toThrow(/REDIRECT:\/app\/incidentes\//);
      await expect(createIncidentAction(form({ title: "Pasado", detected_at: "2026-10-15T09:00" }))).rejects.toThrow(/REDIRECT:\/app\/incidentes\//);
    } finally {
      frozen.restore();
    }
    expect(row<{ n: number }>("SELECT COUNT(*) n FROM incidents WHERE company_id = ?", companyId).n).toBe(2);
  });

  it("sin criterios queda registrado solo para documentar", async () => {
    const { userId, companyId } = makeActiveCompany();
    await loginAs(userId);
    await expect(createIncidentAction(form({ title: "Pérdida menor" }))).rejects.toThrow(/REDIRECT:/);
    expect(row<{ criteria: string }>("SELECT criteria FROM incidents WHERE company_id = ?", companyId).criteria).toBe("");
    expect(row<{ message: string }>("SELECT message FROM activity WHERE company_id = ? ORDER BY created_at DESC", companyId).message).toContain("se documenta");
  });

  it("un incidente cerrado es inmutable", async () => {
    const { userId, companyId } = makeActiveCompany();
    const id = makeIncident(companyId, { status: "cerrado", criteria: "gran_volumen" });
    getDb().prepare("UPDATE incidents SET description = 'original' WHERE id = ?").run(id);
    await loginAs(userId);

    for (const action of ["guardar", "notificar", "analisis", "cerrar"]) {
      await expect(updateIncidentAction(form({ id, action, description: "cambiado", criteria: [] }))).rejects.toThrow("REDIRECT:");
    }
    const after = row<{ status: string; description: string; criteria: string; notified_at: string | null }>(
      "SELECT status, description, criteria, notified_at FROM incidents WHERE id = ?", id
    );
    expect(after).toEqual({ status: "cerrado", description: "original", criteria: "gran_volumen", notified_at: null });
  });

  it("notificar registra la fecha y cambia el estado", async () => {
    const { userId, companyId } = makeActiveCompany();
    const id = makeIncident(companyId, { criteria: "datos_sensibles" });
    await loginAs(userId);
    await expect(updateIncidentAction(form({ id, action: "notificar" }))).rejects.toThrow(`REDIRECT:/app/incidentes/${id}`);
    const after = row<{ status: string; notified_at: string | null }>("SELECT status, notified_at FROM incidents WHERE id = ?", id);
    expect(after.status).toBe("notificado");
    expect(after.notified_at).toBeTruthy();
  });
});
