import type { Company, DataBank } from "./db";
import { companyShortId, legalBasisLabel } from "./documents";
import { formatDate } from "./format";

/**
 * Ficha del banco de datos con los campos numerados como el formulario oficial
 * de inscripción del RNPDP / Portal SIPDP (MINJUSDH).
 *
 * El orden reproduce los rubros del formulario del Estado: por eso la
 * finalidad es el rubro **V** y el flujo transfronterizo el **VI**. La pantalla
 * y el texto que se copia al portapapeles salen de aquí para que no se
 * desincronicen.
 */

export type BankSheetRow = { label: string; value: string };

export function bankSheetRows(bank: DataBank): BankSheetRow[] {
  return [
    { label: "I. Denominación del banco de datos", value: bank.name },
    {
      label: "II. Categorías de datos personales",
      value: bank.data_categories || "—",
    },
    {
      label: "III. Base legal del tratamiento",
      value: legalBasisLabel(bank.legal_basis),
    },
    { label: "IV. Plazo de conservación", value: bank.retention || "—" },
    { label: "V. Finalidad y usos previstos", value: bank.purpose || "—" },
    {
      label: "VI. Flujo transfronterizo (transferencia internacional)",
      value:
        bank.transfers === "si"
          ? "Sí (alojamiento o servicios en nube fuera del Perú)"
          : "No (solo en territorio peruano)",
    },
    {
      label: "VII. Destinatarios / encargados externos",
      value: bank.recipients || "—",
    },
    { label: "VIII. Canal de obtención de los datos", value: bank.channel || "—" },
    {
      label: "IX. Código de inscripción RNPDP / SIPDP",
      value: bank.sipdp_code || "Pendiente de inscripción",
    },
    {
      label: "X. Fecha de inscripción",
      value: bank.registered_at ? formatDate(bank.registered_at) : "Pendiente",
    },
  ];
}

/** Versión en texto plano para pegar en el portal del Estado o en un correo. */
export function bankSheetText(company: Company, bank: DataBank): string {
  const rows = bankSheetRows(bank)
    .map((row) => `${row.label}\n${row.value}`)
    .join("\n\n");

  return `FICHA TÉCNICA DE BANCO DE DATOS PERSONALES
${company.name} — ${companyShortId(company)}
Inscripción gratuita en el RNPDP / Portal SIPDP (MINJUSDH) · Ley N.° 29733 y DS N.° 016-2024-JUS

${rows}

Estado: ${bank.status === "registrado" ? "Inscrito en el SIPDP" : "Borrador por inscribir"}
Generado con DatosPrivados · datosprivados.pe`;
}
