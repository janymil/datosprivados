"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso, type Company } from "@/lib/db";
import { requireActiveSession } from "@/lib/auth";
import { generateAndSaveDocument, getDocument, listBanks, logActivity, syncProviders } from "@/lib/data";
import { cleanUrl, parseToolsInput, salesBandOrEmpty } from "@/lib/provider-input";
import { getBankPreset, type BankPreset } from "@/lib/bank-presets";
import { findSectorByLabel } from "@/lib/sectors";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function completeOnboardingAction(formData: FormData) {
  const { company, user } = await requireActiveSession();
  const db = getDb();
  const now = nowIso();

  const sector = findSectorByLabel(text(formData, "sector"))?.label ?? "Otro tipo de negocio";
  const presets = formData
    .getAll("banks")
    .map((id) => getBankPreset(String(id)))
    .filter((preset): preset is BankPreset => Boolean(preset));

  db.prepare(
    `UPDATE companies SET sector = ?, address = ?, phone = ?, dpo_name = ?, dpo_email = ?, onboarded_at = ?,
     website = ?, sales_band = ?, complaints_url = ?
     WHERE id = ?`
  ).run(
    sector,
    text(formData, "address"),
    text(formData, "phone"),
    text(formData, "dpo_name") || user.name,
    text(formData, "dpo_email") || company.email,
    now,
    cleanUrl(text(formData, "website")),
    salesBandOrEmpty(text(formData, "sales_band")),
    cleanUrl(text(formData, "complaints_url")),
    company.id
  );

  // Herramientas declaradas en el onboarding (lista vacía = «no uso ninguna»).
  syncProviders(company.id, parseToolsInput(text(formData, "tools")));

  const existingNames = new Set(listBanks(company.id).map((bank) => bank.name));
  const insertBank = db.prepare(
    `INSERT INTO data_banks (id, company_id, name, purpose, data_categories, legal_basis, retention, recipients, transfers, channel, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?)`
  );
  for (const preset of presets) {
    if (existingNames.has(preset.name)) continue;
    insertBank.run(
      newId(),
      company.id,
      preset.name,
      preset.purpose,
      preset.data_categories,
      preset.legal_basis,
      preset.retention,
      preset.recipients,
      preset.transfers,
      preset.channel,
      now,
      now
    );
  }

  // Primer borrador de los documentos públicos con los datos recién declarados.
  const updated = db.prepare("SELECT * FROM companies WHERE id = ?").get(company.id) as unknown as Company;
  // Solo se crean si no existen: repetir el onboarding no debe reemplazar (ni
  // republicar) documentos que el usuario ya revisó.
  if (!getDocument(company.id, "politica")) {
    generateAndSaveDocument(updated, listBanks(company.id), "politica");
  }
  if (!getDocument(company.id, "consentimiento")) {
    generateAndSaveDocument(updated, listBanks(company.id), "consentimiento");
  }

  logActivity(
    company.id,
    "cuenta",
    `Completaste la configuración inicial (${sector}) con ${presets.length} ${presets.length === 1 ? "banco de datos" : "bancos de datos"} en borrador.`
  );
  revalidatePath("/app", "layout");
  redirect("/app?bienvenida=1");
}
