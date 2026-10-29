"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listBanks, logActivity, upsertDocument } from "@/lib/data";
import {
  buildConsentTexts,
  buildInternalClauses,
  buildPrivacyPolicy,
  buildSecurityDocument,
} from "@/lib/documents";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const TITLES: Record<string, string> = {
  politica: "Política de Privacidad",
  consentimiento: "Textos de consentimiento",
  seguridad: "Documento de Seguridad",
  clausulas: "Contratos, Confidencialidad y Cartel CCTV",
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
        : kind === "seguridad"
          ? buildSecurityDocument(company, banks)
          : buildInternalClauses(company);

  const version = upsertDocument(company.id, kind, TITLES[kind], content);

  logActivity(company.id, "documento", `Generaste «${TITLES[kind]}» (v${version}).`);
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?tab=${kind}&ok=1`);
}

export async function togglePublishAction(formData: FormData) {
  const { company } = await requireSession();
  // Solo la Política de Privacidad tiene enlace público.
  const kind = "politica";
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
