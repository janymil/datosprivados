"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removeHoliday, setHoliday } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { requireOperator } from "@/lib/operator";

/**
 * Feriados que mueven los plazos legales (ARCO y demás). Se editan aquí porque el
 * calendario cambia por decreto supremo: un día no laborable nuevo alarga el plazo
 * del cliente y no puede depender de una migración de base de datos.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PATH = "/operador/feriados";

function back(query: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?${query}`);
}

export async function addHolidayAction(formData: FormData) {
  const { user } = await requireOperator();
  const date = String(formData.get("date") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) back("error=fecha");
  if (name.length < 3 || name.length > 80) back("error=nombre");

  setHoliday(date, name.slice(0, 80), "decreto");
  logEvent("info", "holiday_set", { date, by: user.id });
  back(`ok=${date}`);
}

export async function removeHolidayAction(formData: FormData) {
  const { user } = await requireOperator();
  const date = String(formData.get("date") ?? "").trim();
  if (!ISO_DATE.test(date)) back("error=fecha");

  removeHoliday(date);
  logEvent("warn", "holiday_removed", { date, by: user.id });
  back(`ok=${date}`);
}
