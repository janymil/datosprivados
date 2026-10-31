"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logActivity } from "@/lib/data";
import { limaToday } from "@/lib/format";
import { cleanUrl, salesBandOrEmpty } from "@/lib/provider-input";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveBankAction(formData: FormData) {
  const { company } = await requireSession();
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
    db.prepare(
      `UPDATE data_banks SET name = ?, purpose = ?, data_categories = ?, legal_basis = ?, retention = ?,
       recipients = ?, transfers = ?, channel = ?, updated_at = ? WHERE id = ? AND company_id = ?`
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
    logActivity(company.id, "banco", `Actualizaste el banco de datos «${name}».`);
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
  const { company } = await requireSession();
  const id = text(formData, "id");
  const code = text(formData, "sipdp_code");
  const date = text(formData, "registered_at") || limaToday();

  getDb()
    .prepare(
      `UPDATE data_banks SET status = 'registrado', sipdp_code = ?, registered_at = ?, updated_at = ?
       WHERE id = ? AND company_id = ?`
    )
    .run(code || "SIPDP-PENDIENTE", date, nowIso(), id, company.id);

  const bank = getDb()
    .prepare("SELECT name FROM data_banks WHERE id = ? AND company_id = ?")
    .get(id, company.id) as { name: string } | undefined;

  logActivity(
    company.id,
    "banco",
    `Registraste el banco de datos «${bank?.name ?? "sin nombre"}» en el SIPDP.`
  );
  revalidatePath("/app", "layout");
  redirect(`/app/bancos/${id}`);
}

export async function reopenBankAction(formData: FormData) {
  const { company } = await requireSession();
  const id = text(formData, "id");
  getDb()
    .prepare("UPDATE data_banks SET status = 'borrador', updated_at = ? WHERE id = ? AND company_id = ?")
    .run(nowIso(), id, company.id);
  revalidatePath("/app", "layout");
  redirect(`/app/bancos/${id}`);
}

export async function updateCompanyAction(formData: FormData) {
  const { company } = await requireSession();
  // Perú únicamente: el SIPDP exige una empresa peruana con RUC. Los campos
  // heredados de sociedad extranjera se limpian al guardar.
  const entityType = "peruana";
  getDb()
    .prepare(
      `UPDATE companies SET name = ?, ruc = ?, sector = ?, email = ?, phone = ?, address = ?, dpo_name = ?, dpo_email = ?,
       entity_type = ?, country = ?, representative_name = ?, representative_address = ?,
       website = ?, complaints_url = ?, sales_band = ?
       WHERE id = ?`
    )
    .run(
      text(formData, "name") || company.name,
      text(formData, "ruc"),
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
      company.id
    );
  logActivity(company.id, "empresa", "Actualizaste los datos de tu empresa.");
  revalidatePath("/app", "layout");
  redirect("/app/empresa?ok=1");
}
