"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addBusinessDays, getDb, newId, nowIso } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCompanyBySlug, logActivity, nextTicketNumber } from "@/lib/data";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function todayLima() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export async function createArcoRequestAction(formData: FormData) {
  const slug = text(formData, "slug");
  const company = getCompanyBySlug(slug);
  if (!company) redirect("/");

  const name = text(formData, "requester_name");
  const description = text(formData, "description");
  const type = text(formData, "type");
  if (!name || !description || !["acceso", "rectificacion", "cancelacion", "oposicion"].includes(type)) {
    redirect(`/solicitud/${slug}?error=1`);
  }

  const db = getDb();
  const id = newId();
  const received = todayLima();
  const ticket = nextTicketNumber(company.id);
  const due = addBusinessDays(received, 20);

  db.prepare(
    `INSERT INTO arco_requests (id, company_id, ticket, type, channel, requester_name, doc_number, email, phone, description, status, received_at, due_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?, ?)`
  ).run(
    id,
    company.id,
    ticket,
    type,
    text(formData, "channel") || "web",
    name,
    text(formData, "doc_number"),
    text(formData, "email"),
    text(formData, "phone"),
    description,
    received,
    due,
    nowIso()
  );

  logActivity(company.id, "arco", `Nueva solicitud ARCO recibida: ${ticket} (${type}).`);
  revalidatePath("/app", "layout");
  redirect(`/solicitud/${slug}?ok=${ticket}`);
}

export async function respondArcoAction(formData: FormData) {
  const { company } = await requireSession();
  const id = text(formData, "id");
  const response = text(formData, "response");
  const status = text(formData, "status") || "respondido";
  const db = getDb();

  const request = db
    .prepare("SELECT ticket FROM arco_requests WHERE id = ? AND company_id = ?")
    .get(id, company.id) as { ticket: string } | undefined;
  if (!request) redirect("/app/arco");

  db.prepare(
    `UPDATE arco_requests SET response = ?, status = ?, responded_at = ?
     WHERE id = ? AND company_id = ?`
  ).run(
    response,
    status,
    status === "respondido" ? nowIso() : null,
    id,
    company.id
  );

  logActivity(
    company.id,
    "arco",
    status === "respondido"
      ? `Respondiste la solicitud ${request.ticket} dentro del plazo.`
      : `Actualizaste la solicitud ${request.ticket} a «${status.replace("_", " ")}».`
  );
  revalidatePath("/app", "layout");
  redirect(`/app/arco/${id}?ok=1`);
}

export async function setArcoStatusAction(formData: FormData) {
  const { company } = await requireSession();
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!["nuevo", "en_proceso", "rechazado"].includes(status)) redirect(`/app/arco/${id}`);

  getDb()
    .prepare("UPDATE arco_requests SET status = ? WHERE id = ? AND company_id = ?")
    .run(status, id, company.id);
  revalidatePath("/app", "layout");
  redirect(`/app/arco/${id}`);
}
