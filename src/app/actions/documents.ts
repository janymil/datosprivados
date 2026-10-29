"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, newId, nowIso } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listBanks, logActivity } from "@/lib/data";
import { buildConsentTexts, buildPrivacyPolicy, buildSecurityDocument } from "@/lib/documents";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const TITLES: Record<string, string> = {
  politica: "Política de Privacidad",
  consentimiento: "Textos de consentimiento",
  seguridad: "Documento de Seguridad",
};

export async function generateDocumentAction(formData: FormData) {
  const { company } = await requireSession();
  const kind = text(formData, "kind");
  if (!TITLES[kind]) redirect("/app/documentos");

  const banks = listBanks(company.id);
  const content =
    kind === "politica"
      ? buildPrivacyPolicy(company, banks)
      : kind === "consentimiento"
        ? buildConsentTexts(company)
        : buildSecurityDocument(company, banks);

  const db = getDb();
  const existing = db
    .prepare("SELECT id, version FROM documents WHERE company_id = ? AND kind = ? ORDER BY version DESC LIMIT 1")
    .get(company.id, kind) as { id: string; version: number } | undefined;

  if (existing) {
    db.prepare("UPDATE documents SET content = ?, version = ?, updated_at = ? WHERE id = ?").run(
      content,
      existing.version + 1,
      nowIso(),
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at) VALUES (?, ?, ?, ?, ?, 1, 0, ?)"
    ).run(newId(), company.id, kind, TITLES[kind], content, nowIso());
  }

  logActivity(company.id, "documento", `Generaste «${TITLES[kind]}» (v${(existing?.version ?? 0) + 1}).`);
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?tab=${kind}&ok=1`);
}

export async function togglePublishAction(formData: FormData) {
  const { company } = await requireSession();
  const kind = text(formData, "kind");
  const publish = text(formData, "publish") === "1";
  getDb()
    .prepare("UPDATE documents SET published = ? WHERE company_id = ? AND kind = ?")
    .run(publish ? 1 : 0, company.id, kind);
  logActivity(
    company.id,
    "documento",
    publish ? "Publicaste tu Política de Privacidad." : "Despublicaste tu Política de Privacidad."
  );
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?tab=${kind}`);
}
