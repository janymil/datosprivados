"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logActivity } from "@/lib/data";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createIncidentAction(formData: FormData) {
  const { company } = await requireSession();
  const title = text(formData, "title");
  if (!title) redirect("/app/incidentes/nuevo?error=1");

  const detectedRaw = text(formData, "detected_at");
  const detected = detectedRaw
    ? new Date(`${detectedRaw}:00-05:00`)
    : new Date();
  if (Number.isNaN(detected.getTime())) redirect("/app/incidentes/nuevo?error=fecha");

  const due = new Date(detected.getTime() + 48 * 3_600_000);
  const id = newId();

  getDb()
    .prepare(
      `INSERT INTO incidents (id, company_id, title, description, severity, detected_at, due_at, status, affected_people, data_categories, measures, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'abierto', ?, ?, ?, ?)`
    )
    .run(
      id,
      company.id,
      title,
      text(formData, "description"),
      text(formData, "severity") || "moderado",
      detected.toISOString(),
      due.toISOString(),
      Number(text(formData, "affected_people")) || 0,
      text(formData, "data_categories"),
      text(formData, "measures"),
      nowIso()
    );

  logActivity(company.id, "incidente", `Registraste el incidente «${title}».`);
  revalidatePath("/app", "layout");
  redirect(`/app/incidentes/${id}`);
}

export async function updateIncidentAction(formData: FormData) {
  const { company } = await requireSession();
  const id = text(formData, "id");
  const action = text(formData, "action");
  const db = getDb();

  const incident = db
    .prepare("SELECT title FROM incidents WHERE id = ? AND company_id = ?")
    .get(id, company.id) as { title: string } | undefined;
  if (!incident) redirect("/app/incidentes");

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
      "UPDATE incidents SET description = ?, measures = ?, affected_people = ?, data_categories = ? WHERE id = ? AND company_id = ?"
    ).run(
      text(formData, "description"),
      text(formData, "measures"),
      Number(text(formData, "affected_people")) || 0,
      text(formData, "data_categories"),
      id,
      company.id
    );
  }

  revalidatePath("/app", "layout");
  redirect(`/app/incidentes/${id}`);
}
