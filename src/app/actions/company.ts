"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso } from "@/lib/db";
import { requireActiveSession } from "@/lib/auth";
import { logActivity } from "@/lib/data";
import { limaToday } from "@/lib/format";
import { cleanUrl, salesBandOrEmpty } from "@/lib/provider-input";
import { isValidRuc } from "@/lib/ruc";
import { checkCompanyRuc } from "@/lib/ruc-lookup";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveBankAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const db = getDb();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) redirect("/app/bancos?error=nombre");

  const values = {
    name,
    purpose: text(formData, "purpose"),
    data_categories: text(formData, "data_categories"),
    legal_basis: text(formData, "legal_basis") || "consentimiento",
    retention: text(formData, "retention"),
    recipients: text(formData, "recipients"),
    transfers: text(formData, "transfers") === "si" ? "si" : "no",
    channel: text(formData, "channel"),
  };

  if (id) {
    // Un banco cancelado ante la ANPD queda tal como estaba al cancelarse.
    const result = db.prepare(
      `UPDATE data_banks SET name = ?, purpose = ?, data_categories = ?, legal_basis = ?, retention = ?,
       recipients = ?, transfers = ?, channel = ?, updated_at = ? WHERE id = ? AND company_id = ? AND status != 'cancelado'`
    ).run(
      values.name,
      values.purpose,
      values.data_categories,
      values.legal_basis,
      values.retention,
      values.recipients,
      values.transfers,
      values.channel,
      nowIso(),
      id,
      company.id
    );
    if (result.changes > 0) logActivity(company.id, "banco", `Actualizaste el banco de datos «${name}».`);
    revalidatePath("/app", "layout");
    redirect(`/app/bancos/${id}`);
  }

  const newBankId = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO data_banks (id, company_id, name, purpose, data_categories, legal_basis, retention, recipients, transfers, channel, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?)`
  ).run(
    newBankId,
    company.id,
    values.name,
    values.purpose,
    values.data_categories,
    values.legal_basis,
    values.retention,
    values.recipients,
    values.transfers,
    values.channel,
    now,
    now
  );
  logActivity(company.id, "banco", `Creaste el banco de datos «${name}».`);
  revalidatePath("/app", "layout");
  redirect(`/app/bancos/${newBankId}`);
}

export async function markBankRegisteredAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  const code = text(formData, "sipdp_code");
  const date = text(formData, "registered_at") || limaToday();

  const result = getDb()
    .prepare(
      `UPDATE data_banks SET status = 'registrado', sipdp_code = ?, registered_at = ?, updated_at = ?
       WHERE id = ? AND company_id = ? AND status != 'cancelado'`
    )
    .run(code || "SIPDP-PENDIENTE", date, nowIso(), id, company.id);

  if (result.changes > 0) {
    const bank = getDb()
      .prepare("SELECT name FROM data_banks WHERE id = ? AND company_id = ?")
      .get(id, company.id) as { name: string } | undefined;
    logActivity(company.id, "banco", `Registraste el banco de datos «${bank?.name ?? "sin nombre"}» en el SIPDP.`);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/bancos/${id}`);
}

export async function reopenBankAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  getDb()
    .prepare("UPDATE data_banks SET status = 'borrador', updated_at = ? WHERE id = ? AND company_id = ? AND status = 'registrado'")
    .run(nowIso(), id, company.id);
  revalidatePath("/app", "layout");
  redirect(`/app/bancos/${id}`);
}

/**
 * Registra que la ANPD canceló la inscripción de un banco (la empresa dejó de
 * tratar esos datos). Solo aplica a un banco inscrito y es definitivo: el banco
 * sale de documentos, puntaje y avisos, pero se conserva en el historial.
 */
export async function cancelBankRegistrationAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  const date = text(formData, "cancelled_at");
  const reference = text(formData, "cancel_reference").slice(0, 200);
  const back = `/app/bancos/${encodeURIComponent(id)}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date > limaToday()) {
    redirect(`${back}?error=fecha`);
  }

  const db = getDb();
  const bank = db
    .prepare("SELECT name, registered_at FROM data_banks WHERE id = ? AND company_id = ? AND status = 'registrado'")
    .get(id, company.id) as { name: string; registered_at: string | null } | undefined;
  if (!bank) redirect(back);
  if (bank.registered_at && date < bank.registered_at.slice(0, 10)) redirect(`${back}?error=fecha`);

  db.prepare(
    `UPDATE data_banks SET status = 'cancelado', cancelled_at = ?, cancel_reference = ?, updated_at = ?
     WHERE id = ? AND company_id = ? AND status = 'registrado'`
  ).run(date, reference || null, nowIso(), id, company.id);
  logActivity(
    company.id,
    "banco",
    `Cancelaste ante la ANPD la inscripción del banco de datos «${bank.name}»${reference ? ` (${reference})` : ""}.`
  );
  revalidatePath("/app", "layout");
  redirect(`${back}?cancelado=1`);
}

/**
 * Elimina un banco en borrador (por ejemplo, uno que el asistente propuso y no aplica).
 * Un banco inscrito no se borra: si dejó de usarse, se cancela su inscripción ante la
 * ANPD y se registra aquí con cancelBankRegistrationAction; así queda en el expediente.
 */
export async function deleteDraftBankAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const id = text(formData, "id");
  const db = getDb();
  const bank = db.prepare("SELECT name FROM data_banks WHERE id = ? AND company_id = ? AND status = 'borrador'").get(id, company.id) as
    | { name: string }
    | undefined;
  if (!bank) redirect(`/app/bancos/${encodeURIComponent(id)}`);
  db.prepare("DELETE FROM data_banks WHERE id = ? AND company_id = ? AND status = 'borrador'").run(id, company.id);
  logActivity(company.id, "banco", `Banco de datos eliminado (borrador): ${bank.name}.`);
  revalidatePath("/app", "layout");
  redirect("/app/bancos?eliminado=1");
}

export async function updateCompanyAction(formData: FormData) {
  const { company } = await requireActiveSession();
  // Perú únicamente: el SIPDP exige una empresa peruana con RUC. Los campos
  // heredados de sociedad extranjera se limpian al guardar.
  const entityType = "peruana";

  // Cambiar el RUC exige verificarlo otra vez: si no, la verificación del registro se esquivaría.
  const newRuc = text(formData, "ruc");
  let name = text(formData, "name") || company.name;
  let verification: { at: string | null; status: string | null; condition: string | null } = {
    at: company.ruc_verified_at,
    status: company.ruc_status,
    condition: company.ruc_condition,
  };
  if (newRuc !== company.ruc) {
    if (!isValidRuc(newRuc)) redirect("/app/empresa?error=ruc_formato");
    const taken = getDb()
      .prepare("SELECT id FROM companies WHERE ruc = ? AND id != ? AND billing_status IN ('active', 'demo') LIMIT 1")
      .get(newRuc, company.id);
    if (taken) redirect("/app/empresa?error=ruc_en_uso");
    const rucCheck = await checkCompanyRuc(newRuc);
    if (!rucCheck.ok) redirect(`/app/empresa?error=ruc_${rucCheck.code}`);
    if (rucCheck.verified) {
      name = rucCheck.razonSocial.slice(0, 200);
      verification = { at: nowIso(), status: rucCheck.estado, condition: rucCheck.condicion };
    } else {
      verification = { at: null, status: null, condition: null };
    }
  }

  getDb()
    .prepare(
      `UPDATE companies SET name = ?, ruc = ?, sector = ?, email = ?, phone = ?, address = ?, dpo_name = ?, dpo_email = ?,
       entity_type = ?, country = ?, representative_name = ?, representative_address = ?,
       website = ?, complaints_url = ?, sales_band = ?,
       ruc_verified_at = ?, ruc_status = ?, ruc_condition = ?
       WHERE id = ?`
    )
    .run(
      name,
      newRuc,
      text(formData, "sector") || company.sector,
      text(formData, "email") || company.email,
      text(formData, "phone"),
      text(formData, "address"),
      text(formData, "dpo_name"),
      text(formData, "dpo_email"),
      entityType,
      "Perú",
      "",
      "",
      cleanUrl(text(formData, "website")),
      cleanUrl(text(formData, "complaints_url")),
      salesBandOrEmpty(text(formData, "sales_band")),
      verification.at,
      verification.status,
      verification.condition,
      company.id
    );
  logActivity(company.id, "empresa", "Actualizaste los datos de tu empresa.");
  revalidatePath("/app", "layout");
  redirect("/app/empresa?ok=1");
}
