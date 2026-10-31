"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  addEvidence,
  deleteEvidence,
  logActivity,
  syncProviders,
  updateProviderStatus,
} from "@/lib/data";
import { parseToolsInput } from "@/lib/provider-input";
import type { EvidenceType } from "@/lib/db";
import { limaToday } from "@/lib/format";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Guarda la lista de herramientas completa que envía el selector. */
export async function saveToolsAction(formData: FormData) {
  const { company } = await requireSession();
  const tools = parseToolsInput(text(formData, "tools"));
  syncProviders(company.id, tools);
  const abroad = tools.filter((tool) => tool.country !== "Perú").length;
  logActivity(
    company.id,
    "herramientas",
    `Actualizaste tus herramientas: ${tools.length} declaradas, ${abroad} con datos fuera del Perú.`
  );
  revalidatePath("/app", "layout");
  redirect("/app/herramientas?ok=1");
}

/** Marca el estado del contrato de encargo y de la comunicación a la ANPD de una herramienta. */
export async function updateProviderAction(formData: FormData) {
  const { company } = await requireSession();
  updateProviderStatus(company.id, text(formData, "id"), {
    dpa_status: text(formData, "dpa_status"),
    transfer_status: text(formData, "transfer_status"),
  });
  logActivity(company.id, "herramientas", `Actualizaste el estado de contrato de «${text(formData, "name")}».`);
  revalidatePath("/app", "layout");
  redirect("/app/herramientas?saved=1");
}

const EVIDENCE_TYPES: EvidenceType[] = ["consentimiento", "capacitacion", "revision_accesos", "prueba_respaldo", "purga"];

export async function addEvidenceAction(formData: FormData) {
  const { company } = await requireSession();
  const type = text(formData, "type") as EvidenceType;
  if (!EVIDENCE_TYPES.includes(type)) redirect("/app/evidencias");
  const date = text(formData, "occurred_on");
  addEvidence(company.id, {
    type,
    occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= limaToday() ? date : limaToday(),
    detail: text(formData, "detail").slice(0, 600),
    reference: text(formData, "reference").slice(0, 200),
  });
  logActivity(company.id, "evidencia", "Registraste una evidencia de cumplimiento.");
  revalidatePath("/app", "layout");
  redirect(`/app/evidencias?type=${type}&ok=1`);
}

export async function deleteEvidenceAction(formData: FormData) {
  const { company } = await requireSession();
  deleteEvidence(company.id, text(formData, "id"));
  revalidatePath("/app", "layout");
  redirect(`/app/evidencias?type=${text(formData, "type")}`);
}
