"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { locateTarget } from "@/legal/draft/locate";
import { requestDraft, resetDraft } from "@/lib/legal-drafts";
import { logEvent } from "@/lib/log";
import { requireOperator } from "@/lib/operator";

/** El fundador vuelve a poner en la cola una corrección que no se pudo redactar. */
export async function redraftAction(formData: FormData) {
  const { user } = await requireOperator();
  const id = String(formData.get("id") ?? "");
  if (!resetDraft(id)) redirect("/operador/legal?error=solicitud");
  logEvent("info", "legal_draft_retry", { id, by: user.email });
  revalidatePath("/operador/legal");
  redirect("/operador/legal?ok=redaccion");
}

/** El fundador pide la redacción de un texto (por ejemplo, un hallazgo «revisar» de la auditoría). */
export async function requestDraftAction(formData: FormData) {
  const { user } = await requireOperator();
  const target = String(formData.get("target") ?? "").trim();
  if (!target || !locateTarget(target)) redirect("/operador/legal?error=texto");
  requestDraft(target, new Date());
  logEvent("info", "legal_draft_requested", { target, by: user.email });
  revalidatePath("/operador/legal");
  redirect("/operador/legal?ok=redaccion");
}
