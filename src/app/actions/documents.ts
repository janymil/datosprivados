"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, nowIso } from "@/lib/db";
import { requireActiveSession } from "@/lib/auth";
import { emailVerificationGate } from "@/lib/account";
import { generateAndSaveDocument, listBanks, listDocuments, listProviders, logActivity, publishDocument, unpublishDocument } from "@/lib/data";
import { documentTitle, isDocumentKind } from "@/lib/document-catalog";
import { documentFreshness } from "@/lib/document-freshness";
import { SECURITY_CHECKS, isSecurityCheckId } from "@/lib/security-checks";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function generateDocumentAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const kind = text(formData, "kind");
  if (!isDocumentKind(kind)) redirect("/app/documentos");

  const banks = listBanks(company.id);
  const title = documentTitle(kind);
  const version = generateAndSaveDocument(company, banks, kind);

  logActivity(company.id, "documento", `Generaste «${title}» (v${version}).`);
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?tab=${kind}&ok=1`);
}

/**
 * Regenera de una vez todos los documentos ya creados que quedaron
 * desactualizados (plantilla nueva o cambios en empresa, rubro o bancos).
 * No crea documentos que la empresa nunca generó y conserva el estado de
 * publicación de la política.
 */
export async function regenerateOutdatedAction() {
  const { company } = await requireActiveSession();
  const banks = listBanks(company.id);
  const providers = listProviders(company.id);
  const outdated = listDocuments(company.id).filter((doc) => documentFreshness(doc, company, banks, providers).stale);

  for (const doc of outdated) {
    if (!isDocumentKind(doc.kind)) continue;
    generateAndSaveDocument(company, banks, doc.kind);
  }

  if (outdated.length) {
    logActivity(
      company.id,
      "documento",
      `Actualizaste ${outdated.length} ${outdated.length === 1 ? "documento desactualizado" : "documentos desactualizados"}.`
    );
  }
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?regen=${outdated.length}`);
}

export async function togglePublishAction(formData: FormData) {
  const { company, user } = await requireActiveSession();
  // Solo la Política de Privacidad tiene enlace público.
  const kind = "politica";
  const publish = text(formData, "publish") === "1";
  if (publish) {
    // Publicar expone la empresa y activa el formulario ARCO: sin correo confirmado,
    // las solicitudes llegarían a una dirección que nadie lee (ver DECISIONS.md).
    const gate = emailVerificationGate(user.id);
    if (!gate.ok) redirect(`/app/documentos?tab=${kind}&error=correo`);
    const result = publishDocument(company.id, kind);
    if (!result.ok) redirect(`/app/documentos?tab=${kind}&error=${result.reason}`);
    logActivity(company.id, "documento", `Publicaste la versión ${result.version} de tu Política de Privacidad.`);
  } else {
    unpublishDocument(company.id, kind);
    logActivity(company.id, "documento", "Despublicaste tu Política de Privacidad.");
  }
  revalidatePath("/app", "layout");
  redirect(`/app/documentos?tab=${kind}`);
}

/**
 * Marca o desmarca una medida del Documento de Seguridad ya implementada en el
 * negocio. La ANPD no pide solo el texto: pide evidencia de que la medida opera.
 */
export async function toggleSecurityCheckAction(formData: FormData) {
  const { company } = await requireActiveSession();
  const item = text(formData, "item");
  if (!isSecurityCheckId(item)) redirect("/app/documentos?tab=seguridad");

  const db = getDb();
  const existing = db
    .prepare("SELECT item FROM security_checks WHERE company_id = ? AND item = ?")
    .get(company.id, item) as { item: string } | undefined;

  if (existing) {
    db.prepare("DELETE FROM security_checks WHERE company_id = ? AND item = ?").run(company.id, item);
    const label = SECURITY_CHECKS.find((check) => check.id === item)?.label ?? item;
    logActivity(company.id, "documento", `Marcaste como pendiente la medida «${label}».`);
  } else {
    db.prepare("INSERT INTO security_checks (company_id, item, done_at) VALUES (?, ?, ?)").run(
      company.id,
      item,
      nowIso()
    );
    const label = SECURITY_CHECKS.find((check) => check.id === item)?.label ?? item;
    logActivity(company.id, "documento", `Registraste la medida «${label}» como implementada.`);
  }

  revalidatePath("/app", "layout");
  redirect("/app/documentos?tab=seguridad");
}
