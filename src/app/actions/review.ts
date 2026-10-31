"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import { createReview, getDocument, getReviewByToken, logAs, sha256 } from "@/lib/data";
import { isDocumentKind } from "@/lib/document-catalog";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Crea un enlace de revisión para un abogado externo. No se envían correos: el enlace se copia y se manda. */
export async function requestReviewAction(formData: FormData) {
  const { company, user } = await requireRole("responsable");
  const kind = text(formData, "kind");
  if (!isDocumentKind(kind) || !getDocument(company.id, kind)) redirect("/app/documentos");

  const token = createReview(company.id, kind, user.id, {
    name: text(formData, "reviewer_name").slice(0, 120),
    email: text(formData, "reviewer_email").slice(0, 160),
  });
  const jar = await cookies();
  jar.set("pdp_review", token, { httpOnly: true, sameSite: "lax", path: "/app/documentos", maxAge: 120 });
  logAs(user.name, company.id, "documento", "Pediste una revisión legal de un documento.");
  revalidatePath("/app/documentos");
  redirect(`/app/documentos?tab=${kind}&review=1`);
}

/** Pública: el abogado responde con el enlace secreto, sin cuenta. */
export async function submitReviewAction(formData: FormData) {
  const token = text(formData, "token");
  const back = (error: string): never => redirect(`/revision/${token}?error=${error}`);

  const review = getReviewByToken(token);
  if (!review || review.status !== "pendiente" || review.expires_at < nowIso()) back("invalida");
  const r = review!;

  const decision = text(formData, "decision");
  if (decision !== "aprobado" && decision !== "observado") back("decision");
  const name = text(formData, "name").slice(0, 120);
  if (name.length < 3) back("nombre");
  const notes = text(formData, "notes").slice(0, 3000);
  if (decision === "observado" && notes.length < 5) back("notas");

  // La revisión vale solo para el texto que el abogado tuvo delante.
  const doc = getDocument(r.company_id, r.document_kind);
  if (!doc) back("invalida");
  if (sha256(doc!.content) !== text(formData, "content_hash")) back("cambio");

  getDb()
    .prepare(
      `UPDATE document_reviews SET status = ?, reviewer_name = ?, reviewer_license = ?, reviewer_email = ?, notes = ?,
       content_hash = ?, document_version = ?, responded_at = ? WHERE id = ?`
    )
    .run(
      decision,
      name,
      text(formData, "license").slice(0, 60),
      text(formData, "email").slice(0, 160) || r.reviewer_email,
      notes,
      sha256(doc!.content),
      doc!.version,
      nowIso(),
      r.id
    );
  logAs(
    `${name} (abogado revisor)`,
    r.company_id,
    "documento",
    `${name} revisó «${doc!.title}» (v${doc!.version}): ${decision === "aprobado" ? "aprobado" : "con observaciones"}.`
  );
  redirect(`/revision/${token}?done=1`);
}
