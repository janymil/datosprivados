"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dispatchLegalChange } from "@/lib/github-dispatch";
import { decideLegalChange, markLegalChange } from "@/lib/legal-changes";
import { logEvent } from "@/lib/log";
import { requireOperator } from "@/lib/operator";

/**
 * Decisiones del fundador sobre un cambio legal propuesto. Aprobar lo envía a
 * GitHub, que valida, prueba y fusiona; el servidor despliega después. Ningún
 * cambio llega a los clientes sin esta aprobación (diseño §10a).
 */

const PATH = "/operador/legal";

function back(id: string, query: string): never {
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  redirect(`${PATH}/${id}?${query}`);
}

export async function approveLegalChangeAction(formData: FormData) {
  const { user } = await requireOperator();
  const id = String(formData.get("id") ?? "");
  const decided = decideLegalChange(id, "aprobado", user.email);
  if (!decided.ok) back(id, `error=${decided.error}`);

  const sent = await dispatchLegalChange(decided.change);
  if (!sent.ok) {
    markLegalChange(id, { status: "fallo", error: sent.error });
    logEvent("warn", "legal_change_dispatch_failed", { id, error: sent.error });
    back(id, "error=envio");
  }
  markLegalChange(id, { dispatched_at: new Date().toISOString() });
  logEvent("info", "legal_change_approved", { id, by: user.email });
  back(id, "ok=aprobado");
}

export async function rejectLegalChangeAction(formData: FormData) {
  const { user } = await requireOperator();
  const id = String(formData.get("id") ?? "");
  const decided = decideLegalChange(id, "rechazado", user.email, String(formData.get("reason") ?? ""));
  if (!decided.ok) back(id, `error=${decided.error}`);
  logEvent("info", "legal_change_rejected", { id, by: user.email });
  back(id, "ok=rechazado");
}

export async function lawyerLegalChangeAction(formData: FormData) {
  const { user } = await requireOperator();
  const id = String(formData.get("id") ?? "");
  const decided = decideLegalChange(id, "abogado", user.email, String(formData.get("reason") ?? ""));
  if (!decided.ok) back(id, `error=${decided.error}`);
  logEvent("info", "legal_change_to_lawyer", { id, by: user.email });
  back(id, "ok=abogado");
}
