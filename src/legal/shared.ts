import type { Company, DataBank, Provider } from "@/lib/db";
import { isAbroad, toolCategory } from "@/lib/provider-catalog";
import type { SectorLegalProfile } from "@/lib/sector-legal";
import { siteUrl } from "@/lib/site";

/**
 * Utilidades compartidas por los documentos legales (movidas sin cambios desde
 * src/lib/documents.ts). Las exportadas por documents.ts se reexportan allí.
 */

export const LEGAL_BASIS: Record<string, string> = {
  consentimiento:
    "Consentimiento libre, previo, expreso, informado e inequívoco del titular (art. 5 y 13.5 de la Ley N.° 29733)",
  ejecucion_contrato:
    "Preparación, celebración y ejecución de una relación contractual en la que el titular es parte (art. 14, num. 5 de la Ley N.° 29733)",
  obligacion_legal:
    "Cumplimiento de obligaciones legales (laborales, tributarias, contables o sectoriales) aplicables al responsable (art. 14 de la Ley N.° 29733)",
  // La Ley N.° 29733 no reconoce un «interés legítimo del responsable» autónomo (como el art. 6.1.f del
  // RGPD): su art. 14 exime del consentimiento la salvaguarda de intereses legítimos *del titular*. Para
  // la seguridad del local se usa el aviso previo (cartel) y el consentimiento inequívoco por actos
  // concluyentes (art. 5.2 del DS N.° 016-2024-JUS), según la Directiva 01-2020-JUS/DGTAIPD.
  interes_legitimo:
    "Seguridad de personas y bienes con aviso previo: consentimiento inequívoco por actos concluyentes al ingresar a la zona informada (art. 5.2 del DS N.° 016-2024-JUS y Directiva 01-2020-JUS/DGTAIPD) y salvaguarda de intereses legítimos del titular (art. 14 de la Ley N.° 29733)",
  interes_publico:
    "Ejercicio de funciones o encargos de interés público conforme a ley (art. 14, num. 1 de la Ley N.° 29733)",
};

export function legalBasisLabel(value: string) {
  return LEGAL_BASIS[value] ?? value;
}

/**
 * Host público del producto. Única fuente: `siteUrl()` (`lib/site.ts`), que lee
 * `NEXT_PUBLIC_APP_URL`; si queda vacío se usa el dominio comercial.
 */
export function appUrl() {
  return siteUrl();
}

export function sentence(value: string) {
  return `${value.trim().replace(/[.\s]+$/, "")}.`;
}

export function isForeign(company: Company) {
  return company.entity_type === "extranjera";
}

/**
 * Enlace al Libro de Reclamaciones virtual. DatosPrivados todavía no aloja ese
 * libro: hasta que exista la ruta, el texto pide a la empresa completar su propio
 * enlace en lugar de apuntar a una página que devuelve 404.
 */
export function complaintsLink(company: Pick<Company, "complaints_url">): string {
  return company.complaints_url?.trim() || "[enlace de tu Libro de Reclamaciones virtual]";
}

export const AUTOMATED_BANK = /\b(ia|ocr)\b|inteligencia artificial|voz|audio|perfil|scoring|automatiz/i;

export function usesAutomation(profile: SectorLegalProfile, banks: DataBank[]) {
  return (
    profile.automated ||
    banks.some((bank) => AUTOMATED_BANK.test(`${bank.name} ${bank.purpose} ${bank.data_categories}`))
  );
}

export const COUNTRY_LABEL = (country: string) => (country === "No sé" ? "país por verificar" : country);

export function foreignProviders(providers: Provider[]) {
  return providers.filter((provider) => isAbroad(provider.country));
}

export function categoryLabel(id: string) {
  return toolCategory(id)?.label ?? id;
}

export const DPA_LABEL: Record<string, string> = { pendiente: "Pendiente", firmado: "Firmado", no_aplica: "No aplica" };
export const TRANSFER_LABEL: Record<string, string> = {
  no_aplica: "No aplica",
  pendiente: "Pendiente",
  comunicado: "Comunicado a la ANPD",
};

export function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function table(head: string[], rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

/**
 * Identificación corta, para encabezados y firmas.
 * Una sociedad extranjera no tiene RUC peruano: lo que la identifica ante la
 * ANPD es su país de constitución y su representante en el Perú.
 */
export function companyShortId(company: Company): string {
  if (isForeign(company)) {
    return `sociedad constituida en ${company.country || "el extranjero"}`;
  }
  return `RUC ${company.ruc || "por completar"}`;
}

/** Línea de identificación para el encabezado de una página pública. */
export function companyIdentityLine(company: Company): string {
  if (isForeign(company)) {
    const rep = company.representative_name
      ? ` · representante en el Perú: ${company.representative_name}`
      : " · representante en el Perú: por designar";
    return `${company.name} · ${companyShortId(company)}${rep}`;
  }
  return `${company.name} · ${companyShortId(company)}`;
}

/** Párrafo de identidad del responsable que abre un documento legal. */
export function controllerParagraph(company: Company): string {
  const address = company.address || "[completar domicilio]";
  const email = company.dpo_email || company.email;
  if (isForeign(company)) {
    const rep = company.representative_name || "[completar nombre del representante]";
    const repAddress = company.representative_address || "[completar domicilio del representante]";
    return `**${company.name}**, sociedad constituida en **${company.country || "el extranjero"}**, con domicilio en **${address}** y correo de contacto **${email}**, que no cuenta con establecimiento permanente en el Perú y que actúa como responsable del tratamiento. Para efectos de la Ley N.° 29733 y su Reglamento, ha designado como representante en el Perú a **${rep}**, con domicilio en **${repAddress}**`;
  }
  return `**${company.name}**, identificada con RUC N.° **${company.ruc || "[completar RUC]"}**, con domicilio legal en **${address}** y correo electrónico de contacto **${email}**`;
}
