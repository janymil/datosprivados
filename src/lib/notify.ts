import "server-only";

import type { Company } from "./db";
import { enqueueEmail } from "./mail";
import type { MailPayload, MailTemplate } from "./mail-templates";
import { isDemoCompany } from "./demo";

/**
 * Atajos para avisar a una empresa. Dos destinatarios posibles:
 * - cuenta (cobro, seguridad): el correo del titular de la cuenta;
 * - responsable (ARCO, incidentes): el correo del responsable de datos, o el de la cuenta.
 * La empresa de demostración nunca recibe correos.
 */
export function notifyCompany(
  company: Pick<Company, "id" | "name" | "email" | "dpo_email" | "billing_status">,
  template: MailTemplate,
  payload: MailPayload,
  options: { to?: "cuenta" | "responsable"; dedupeKey?: string } = {}
): boolean {
  if (isDemoCompany(company)) return false;
  const to = options.to === "responsable" ? company.dpo_email || company.email : company.email;
  return enqueueEmail({
    to,
    template,
    payload: { company: company.name, ...payload },
    companyId: company.id,
    dedupeKey: options.dedupeKey,
  });
}
