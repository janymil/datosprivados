import type { Company, DataBank, Provider } from "./db";
import { legalContext } from "@/legal/context";
import { SPECS } from "@/legal/registry";
import { renderDocument } from "@/legal/render";

/**
 * Generadores de documentos legales conforme a la Ley N.° 29733 (Ley de
 * Protección de Datos Personales del Perú) y su Reglamento vigente aprobado
 * por Decreto Supremo N.° 016-2024-JUS.
 *
 * Son borradores operativos que parten de la declaración de la empresa en
 * DatosPrivados. El texto vive en la biblioteca de cláusulas (`src/legal/`):
 * cada documento es una lista de cláusulas con sus condiciones y sus citas.
 * Estas funciones mantienen la firma pública de siempre.
 */

export { legalBasisLabel, appUrl, companyShortId, companyIdentityLine, controllerParagraph } from "@/legal/shared";

export function buildPrivacyPolicy(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(SPECS.politica, legalContext(company, banks, providers));
}

export function buildConsentTexts(company: Company): string {
  return renderDocument(SPECS.consentimiento, legalContext(company, [], []));
}

export function buildSecurityDocument(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(SPECS.seguridad, legalContext(company, banks, providers));
}

export function buildInternalClauses(company: Company): string {
  return renderDocument(SPECS.clausulas, legalContext(company, [], []));
}

/**
 * Términos y Condiciones: variante de plataforma digital o de venta de bienes y
 * servicios, según el perfil del rubro. El precio y el IGV se informan antes de
 * pagar, y la ley aplicable no le quita al consumidor peruano el INDECOPI ni los
 * tribunales de su domicilio (arts. 49-51 de la Ley 29571).
 */
export function buildTermsOfService(company: Company, banks: DataBank[]): string {
  return renderDocument(SPECS.terminos, legalContext(company, banks, []));
}

export function buildCookiePolicy(company: Company, providers: Provider[] = []): string {
  return renderDocument(SPECS.cookies, legalContext(company, [], providers));
}

export function buildShortNotices(company: Company): string {
  return renderDocument(SPECS.aviso, legalContext(company, [], []));
}

export function buildComplaintBook(company: Company): string {
  return renderDocument(SPECS.reclamaciones, legalContext(company, [], []));
}

export function buildProcessingAgreement(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(SPECS.encargo, legalContext(company, banks, providers));
}

export function buildRetentionPolicy(company: Company, banks: DataBank[]): string {
  return renderDocument(SPECS.retencion, legalContext(company, banks, []));
}

/**
 * EIPD: el Reglamento la regula como facultativa, pero es la mejor prueba de
 * diligencia cuando se usan proveedores de IA sobre datos financieros.
 */
export function buildImpactAssessment(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(SPECS.eipd, legalContext(company, banks, providers));
}

export function buildWorkerNotice(company: Company): string {
  return renderDocument(SPECS.trabajadores, legalContext(company, [], []));
}

export function buildArcoProcedure(company: Company): string {
  return renderDocument(SPECS.arco, legalContext(company, [], []));
}

export function buildSectorProtocol(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(SPECS.sectorial, legalContext(company, banks, providers));
}
