"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";
import { markInvoiceIssued } from "@/lib/invoicing";
import { confirmTransferPaid } from "@/lib/transfers";

function back(result: { ok: boolean; error?: string }, okKey: string): never {
  revalidatePath("/operador");
  redirect(result.ok ? `/operador?ok=${okKey}` : `/operador?error=${encodeURIComponent(result.error ?? "No se pudo completar.")}`);
}

export async function issueInvoiceAction(formData: FormData) {
  await requireOperator();
  const result = markInvoiceIssued(String(formData.get("id") ?? ""), {
    series: String(formData.get("series") ?? ""),
    number: String(formData.get("number") ?? ""),
    pdfUrl: String(formData.get("pdfUrl") ?? ""),
  });
  back(result, "invoice");
}

export async function confirmTransferAction(formData: FormData) {
  await requireOperator();
  const result = confirmTransferPaid(String(formData.get("id") ?? ""), String(formData.get("operation") ?? ""));
  back(result, "transfer");
}
