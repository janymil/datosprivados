"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso } from "@/lib/db";
import { requireActiveSession } from "@/lib/auth";
import { logActivity } from "@/lib/data";
import { notifyCompany } from "@/lib/notify";
import { formatDateTime } from "@/lib/format";
import { normalizeCriteria, serializeCriteria } from "@/lib/incident-criteria";

const SEVERITIES = ["leve", "moderado", "grave"] as const;
const ACTIONS = ["notificar", "cerrar", "analisis", "guardar"] as const;
const MAX_PEOPLE = 100_000_000;

/** Texto recortado y limitado a `max` caracteres. */
function text(formData: FormData, key: string, max = 4000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function severity(formData: FormData, fallback = "moderado") {
  const value = text(formData, "severity", 20);
  return (SEVERITIES as readonly string[]).includes(value) ? value : fallback;
}

function people(formData: FormData) {
  const n = Math.floor(Number(text(formData, "affected_people", 12)));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_PEOPLE);
}

/** Criterios del art. 34.1 marcados en el formulario (checkbox múltiple). */
function criteria(formData: FormData) {
  return serializeCriteria(formData.getAll("criteria").map(String));
}

function affectedSample(formData: FormData) {
  return text(formData, "affected_sample", 500);
}

export async function createIncidentAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const title = text(formData, "title", 200);
  if (!title) redirect("/app/incidentes/nuevo?error=1");

  const detectedRaw = text(formData, "detected_at", 20);
  if (detectedRaw && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(detectedRaw)) {
    redirect("/app/incidentes/nuevo?error=fecha");
  }
  const detected = detectedRaw ? new Date(`${detectedRaw}:00-05:00`) : new Date();
  // Fecha inválida o en el futuro (con 5 min de tolerancia).
  if (Number.isNaN(detected.getTime()) || detected.getTime() > Date.now() + 5 * 60_000) {
    redirect("/app/incidentes/nuevo?error=fecha");
  }

  const due = new Date(detected.getTime() + 48 * 3_600_000);
  const id = newId();
  const criteriaValue = criteria(formData);
  const hasCriteria = normalizeCriteria(criteriaValue.split(",")).length > 0;

  getDb()
    .prepare(
      `INSERT INTO incidents (id, company_id, title, description, severity, detected_at, due_at, status, affected_people, affected_sample, criteria, data_categories, measures, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'abierto', ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      company.id,
      title,
      text(formData, "description"),
      severity(formData),
      detected.toISOString(),
      due.toISOString(),
      people(formData),
      affectedSample(formData),
      criteriaValue,
      text(formData, "data_categories", 500),
      text(formData, "measures"),
      nowIso()
    );

  logActivity(
    company.id,
    "incidente",
    hasCriteria
      ? `Registraste el incidente «${title}»: cumple criterios del art. 34.1, aviso a la ANPD en 48 h.`
      : `Registraste el incidente «${title}»: no cumple criterios del art. 34.1, se documenta (art. 35).`
  );
  if (hasCriteria) {
    notifyCompany(
      company,
      "incident_opened",
      { title, dueAt: formatDateTime(due.toISOString()), path: `/app/incidentes/${id}` },
      { to: "responsable", dedupeKey: `incident-opened:${id}` }
    );
  }
  revalidatePath("/app", "layout");
  redirect(`/app/incidentes/${id}`);
}

export async function updateIncidentAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id", 64);
  const action = text(formData, "action", 20);
  if (!id || !(ACTIONS as readonly string[]).includes(action)) redirect("/app/incidentes");
  const db = getDb();

  const incident = db
    .prepare("SELECT title, severity, status FROM incidents WHERE id = ? AND company_id = ?")
    .get(id, company.id) as { title: string; severity: string; status: string } | undefined;
  if (!incident) redirect("/app/incidentes");
  // Un incidente cerrado es parte del expediente: ninguna acción lo modifica.
  if (incident.status === "cerrado") redirect(`/app/incidentes/${id}`);

  if (action === "notificar") {
    db.prepare(
      "UPDATE incidents SET status = 'notificado', notified_at = ? WHERE id = ? AND company_id = ?"
    ).run(nowIso(), id, company.id);
    logActivity(company.id, "incidente", `Notificaste el incidente «${incident.title}» a la ANPD.`);
  } else if (action === "cerrar") {
    db.prepare("UPDATE incidents SET status = 'cerrado' WHERE id = ? AND company_id = ?").run(
      id,
      company.id
    );
    logActivity(company.id, "incidente", `Cerraste el incidente «${incident.title}».`);
  } else if (action === "analisis") {
    db.prepare("UPDATE incidents SET status = 'en_analisis' WHERE id = ? AND company_id = ?").run(
      id,
      company.id
    );
    logActivity(company.id, "incidente", `Marcaste el incidente «${incident.title}» en análisis.`);
  } else if (action === "guardar") {
    db.prepare(
      "UPDATE incidents SET description = ?, measures = ?, affected_people = ?, affected_sample = ?, criteria = ?, data_categories = ?, severity = ? WHERE id = ? AND company_id = ?"
    ).run(
      text(formData, "description"),
      text(formData, "measures"),
      people(formData),
      affectedSample(formData),
      criteria(formData),
      text(formData, "data_categories", 500),
      severity(formData, incident.severity),
      id,
      company.id
    );
  }

  revalidatePath("/app", "layout");
  redirect(`/app/incidentes/${id}`);
}
