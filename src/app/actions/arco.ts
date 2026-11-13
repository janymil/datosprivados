"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addBusinessDays, arcoLegalBusinessDays, getDb, newId, nowIso } from "@/lib/db";
import { requireActiveSession } from "@/lib/auth";
import { getCompanyBySlug, logActivity, nextTicketNumber } from "@/lib/data";
import { clientIp } from "@/lib/client-ip";
import { isDemoCompany } from "@/lib/demo";
import { notifyCompany } from "@/lib/notify";
import { enqueueEmail } from "@/lib/mail";
import { formatDate } from "@/lib/format";
import { takeRateLimit } from "@/lib/rate-limit";
import { consumeChallenge, formPowEnabled, verifyChallenge } from "@/lib/form-pow";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

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
  // La empresa de demostración se ve en público: no guarda datos de desconocidos.
  if (isDemoCompany(company)) redirect(`/solicitud/${slug}?error=demo`);

  // Límite por persona (IP) y por empresa: el formulario público no debe poder
  // llenar la bandeja de la empresa.
  const ip = await clientIp();
  if (!takeRateLimit(`arco:ip:${ip}`, 5, 10 * MINUTE) || !takeRateLimit(`arco:company:${company.id}`, 300, HOUR)) {
    redirect(`/solicitud/${slug}?error=limite`);
  }

  const name = text(formData, "requester_name").slice(0, 200);
  const description = text(formData, "description").slice(0, 5000);
  const type = text(formData, "type");
  const email = text(formData, "email").slice(0, 200);
  const phone = text(formData, "phone").slice(0, 40);
  // Campo trampa invisible: los bots lo completan, las personas no.
  if (text(formData, "website")) redirect(`/solicitud/${slug}`);
  if (
    !name ||
    !description ||
    (!email && !phone) ||
    !ARCO_TYPES.includes(type)
  ) {
    redirect(`/solicitud/${slug}?error=1`);
  }

  // Prueba de trabajo (si está activada): se comprueba después de las validaciones
  // para no gastar el desafío en un envío con un campo vacío.
  let powSalt: string | null = null;
  if (formPowEnabled()) {
    const check = verifyChallenge({
      salt: text(formData, "pow_salt"),
      signature: text(formData, "pow_signature"),
      difficulty: Number(text(formData, "pow_difficulty")),
      expires: text(formData, "pow_expires"),
      counter: text(formData, "pow_counter"),
    });
    if (!check.ok) redirect(`/solicitud/${slug}?error=verificacion`);
    powSalt = text(formData, "pow_salt");
  }

  const db = getDb();
  // Consumo atómico del desafío: una solución sirve para un solo envío.
  if (powSalt && !consumeChallenge(powSalt)) redirect(`/solicitud/${slug}?error=verificacion`);

  const id = newId();
  const received = todayLima();
  const ticket = nextTicketNumber(company.id);
  const due = addBusinessDays(received, arcoLegalBusinessDays(type));

  db.prepare(
    `INSERT INTO arco_requests (id, company_id, ticket, type, channel, requester_name, doc_number, email, phone, description, status, received_at, due_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?, ?)`
  ).run(
    id,
    company.id,
    ticket,
    type,
    "web",
    name,
    text(formData, "doc_number").slice(0, 30),
    email,
    phone,
    description,
    received,
    due,
    nowIso()
  );

  logActivity(company.id, "arco", `Nueva solicitud ARCO recibida: ${ticket} (${type}).`);
  notifyCompany(
    company,
    "arco_received_owner",
    { ticket, type, requester: name, dueAt: formatDate(due), path: `/app/arco/${id}` },
    { to: "responsable", dedupeKey: `arco-received:${id}` }
  );
  // Acuse al titular: ticket y plazo legal. Solo si dejó un correo.
  if (email) {
    enqueueEmail({
      to: email,
      template: "arco_ack_requester",
      payload: { company: company.name, ticket, type, dueAt: formatDate(due) },
      companyId: company.id,
      dedupeKey: `arco-ack:${id}`,
    });
  }
  revalidatePath("/app", "layout");
  redirect(`/solicitud/${slug}?ok=${ticket}`);
}

const ARCO_TYPES = ["informacion", "acceso", "rectificacion", "cancelacion", "oposicion"];
const MANUAL_CHANNELS = ["whatsapp", "telefono", "correo", "presencial", "carta"];

/** Registra una solicitud que llegó fuera del formulario web (WhatsApp, teléfono, etc.). */
export async function createManualArcoRequestAction(formData: FormData) {
  const { company } = await requireActiveSession();

  const type = text(formData, "type");
  const channel = text(formData, "channel");
  const name = text(formData, "requester_name").slice(0, 200);
  const docNumber = text(formData, "doc_number").slice(0, 30);
  const email = text(formData, "email").slice(0, 200);
  const phone = text(formData, "phone").slice(0, 40);
  const description = text(formData, "description").slice(0, 5000);
  const receivedRaw = text(formData, "received_at");
  const today = todayLima();
  const received = /^\d{4}-\d{2}-\d{2}$/.test(receivedRaw) ? receivedRaw : "";

  if (!ARCO_TYPES.includes(type) || !MANUAL_CHANNELS.includes(channel) || !name || !description) {
    redirect("/app/arco?error=campos#registrar");
  }
  if (!email && !phone) redirect("/app/arco?error=contacto#registrar");
  if (!received || Number.isNaN(Date.parse(`${received}T12:00:00-05:00`))) {
    redirect("/app/arco?error=fecha#registrar");
  }
  if (received > today) redirect("/app/arco?error=futura#registrar");

  const id = newId();
  const ticket = nextTicketNumber(company.id);
  const due = addBusinessDays(received, arcoLegalBusinessDays(type));

  getDb()
    .prepare(
      `INSERT INTO arco_requests (id, company_id, ticket, type, channel, requester_name, doc_number, email, phone, description, status, received_at, due_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?, ?)`
    )
    .run(id, company.id, ticket, type, channel, name, docNumber, email, phone, description, received, due, nowIso());

  logActivity(company.id, "arco", `Registraste una solicitud ARCO recibida por ${channel}: ${ticket} (${type}).`);
  if (email) {
    enqueueEmail({
      to: email,
      template: "arco_ack_requester",
      payload: { company: company.name, ticket, type, dueAt: formatDate(due) },
      companyId: company.id,
      dedupeKey: `arco-ack:${id}`,
    });
  }
  revalidatePath("/app", "layout");
  redirect(`/app/arco/${id}`);
}

export async function respondArcoAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  const response = text(formData, "response");
  const requested = text(formData, "status");
  const db = getDb();

  const request = db
    .prepare("SELECT ticket, status, due_at FROM arco_requests WHERE id = ? AND company_id = ?")
    .get(id, company.id) as { ticket: string; status: string; due_at: string } | undefined;
  if (!request) redirect("/app/arco");

  // Una solicitud ya respondida no vuelve a borrador: se conserva la fecha de
  // respuesta original como evidencia.
  const status = request.status === "respondido" || requested !== "en_proceso" ? "respondido" : "en_proceso";
  db.prepare(
    `UPDATE arco_requests SET response = ?, status = ?,
       responded_at = CASE WHEN ? = 'respondido' THEN COALESCE(responded_at, ?) ELSE NULL END
     WHERE id = ? AND company_id = ?`
  ).run(response, status, status, nowIso(), id, company.id);

  const late = todayLima() > request.due_at;
  logActivity(
    company.id,
    "arco",
    request.status === "respondido"
      ? `Editaste la respuesta de la solicitud ${request.ticket}.`
      : status === "respondido"
        ? `Respondiste la solicitud ${request.ticket}${late ? " fuera del plazo legal" : " dentro del plazo"}.`
        : `Guardaste un borrador de respuesta para ${request.ticket}.`
  );
  revalidatePath("/app", "layout");
  redirect(`/app/arco/${id}?ok=1`);
}

export async function setArcoStatusAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!["nuevo", "en_proceso", "rechazado"].includes(status)) redirect(`/app/arco/${id}`);

  getDb()
    .prepare("UPDATE arco_requests SET status = ? WHERE id = ? AND company_id = ?")
    .run(status, id, company.id);
  revalidatePath("/app", "layout");
  redirect(`/app/arco/${id}`);
}
