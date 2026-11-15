"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWatchItem, setWatchStatus } from "@/lib/legal-watch/store";
import { logEvent } from "@/lib/log";
import { requireOperator } from "@/lib/operator";

/** El fundador marca una norma detectada como revisada (ya se atendió) o como «no aplica». */
export async function markWatchItemAction(formData: FormData) {
  const { user } = await requireOperator();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "revisado" && status !== "irrelevante") redirect("/operador/legal?error=estado");
  const item = getWatchItem(id);
  if (!item) redirect("/operador/legal?error=norma");
  setWatchStatus(id, status, status === "irrelevante" ? { reason: `${item.reason ?? ""} · No aplica (fundador)`.trim() } : {});
  logEvent("info", "legal_watch_marked", { id, status, by: user.email });
  revalidatePath("/operador/legal");
  redirect("/operador/legal");
}
