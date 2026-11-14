import type { Company, DataBank, Provider } from "./db";
import { isAbroad } from "./provider-catalog";
import { formatDate } from "./format";
import {
  isSensitiveBank,
  odpDeadline,
  sectorLegalProfile,
  sectorProtocol,
  type SectorLegalProfile,
} from "./sector-legal";

/**
 * Generadores de documentos legales conforme a la Ley N.° 29733 (Ley de
 * Protección de Datos Personales del Perú) y su Reglamento vigente aprobado
 * por Decreto Supremo N.° 016-2024-JUS.
 *
 * Son borradores operativos que parten de la declaración de la empresa en
 * DatosPrivados.
 */

import {
  legalBasisLabel,
  appUrl,
  sentence,
  isForeign,
  complaintsLink,
  usesAutomation,
  COUNTRY_LABEL,
  foreignProviders,
  categoryLabel,
  DPA_LABEL,
  TRANSFER_LABEL,
  bullets,
  table,
  companyShortId,
  controllerParagraph,
} from "@/legal/shared";
import { legalContext } from "@/legal/context";
import { renderDocument } from "@/legal/render";
import { sectorialSpec } from "@/legal/documents/sectorial";
import { eipdSpec } from "@/legal/documents/eipd";
import { encargoSpec } from "@/legal/documents/encargo";
import { terminosSpec } from "@/legal/documents/terminos";
import { arcoSpec } from "@/legal/documents/arco";
import { trabajadoresSpec } from "@/legal/documents/trabajadores";
import { clausulasSpec } from "@/legal/documents/clausulas";
import { retencionSpec } from "@/legal/documents/retencion";
import { seguridadSpec } from "@/legal/documents/seguridad";
import { politicaSpec } from "@/legal/documents/politica";
import { consentimientoSpec } from "@/legal/documents/consentimiento";
import { cookiesSpec } from "@/legal/documents/cookies";
import { reclamacionesSpec } from "@/legal/documents/reclamaciones";
import { avisoSpec } from "@/legal/documents/aviso";

export { legalBasisLabel, appUrl, companyShortId, companyIdentityLine, controllerParagraph } from "@/legal/shared";

export function buildPrivacyPolicy(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(politicaSpec, legalContext(company, banks, providers));
}

export function buildConsentTexts(company: Company): string {
  return renderDocument(consentimientoSpec, legalContext(company, [], []));
}

export function buildSecurityDocument(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(seguridadSpec, legalContext(company, banks, providers));
}

export function buildInternalClauses(company: Company): string {
  return renderDocument(clausulasSpec, legalContext(company, [], []));
}

/* -------------------------------------------------------------------------- */
/*  Documentos públicos del canal digital (términos, cookies, avisos)         */
/* -------------------------------------------------------------------------- */

/**
 * Términos y Condiciones del servicio.
 *
 * Dos decisiones que resuelven los problemas típicos de las plantillas
 * extranjeras: (1) el precio y el IGV se informan antes de pagar, y (2) la ley
 * aplicable y la jurisdicción no le quitan al consumidor peruano el INDECOPI ni
 * los tribunales de su domicilio (cláusula abusiva, arts. 49-51 de la Ley 29571).
 */
export function buildTermsOfService(company: Company, banks: DataBank[]): string {
  return renderDocument(terminosSpec, legalContext(company, banks, []));
}

/**
 * Política de cookies: lo que la ANPD y la práctica del mercado esperan ver
 * cuando el sitio carga analítica o publicidad de terceros.
 */
export function buildCookiePolicy(company: Company, providers: Provider[] = []): string {
  return renderDocument(cookiesSpec, legalContext(company, [], providers));
}

/**
 * Avisos cortos: el deber de información del art. 18 de la Ley 29733 se cumple
 * en el punto de recolección, no solo en la política publicada.
 */
export function buildShortNotices(company: Company): string {
  return renderDocument(avisoSpec, legalContext(company, [], []));
}

/**
 * Libro de Reclamaciones: aviso obligatorio + hoja + procedimiento interno.
 * (Ley N.° 29571, arts. 150 a 152, y su Reglamento.)
 */
export function buildComplaintBook(company: Company): string {
  return renderDocument(reclamacionesSpec, legalContext(company, [], []));
}

/* -------------------------------------------------------------------------- */
/*  Documentos internos de gobernanza (encargados, retención, EIPD)           */
/* -------------------------------------------------------------------------- */

/**
 * Encargo de tratamiento + transferencia internacional.
 *
 * La cláusula de cuatro puntos del documento de cláusulas sirve para un
 * contador o un courier. Un SaaS firma con una decena de proveedores cloud: el
 * Reglamento exige contenido mínimo y, cuando el proveedor está fuera del Perú,
 * una base para el flujo transfronterizo.
 */
export function buildProcessingAgreement(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(encargoSpec, legalContext(company, banks, providers));
}

/**
 * Política de retención: el principio de minimización se demuestra con una
 * tabla y con evidencia de las purgas, no con una frase en la política.
 */
export function buildRetentionPolicy(company: Company, banks: DataBank[]): string {
  return renderDocument(retencionSpec, legalContext(company, banks, []));
}

/**
 * EIPD: el Reglamento la regula como facultativa, pero es la mejor prueba de
 * diligencia cuando se usan proveedores de IA sobre datos financieros.
 */
export function buildImpactAssessment(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(eipdSpec, legalContext(company, banks, providers));
}

/* -------------------------------------------------------------------------- */
/*  Trabajadores y procedimiento ARCO                                         */
/* -------------------------------------------------------------------------- */

/**
 * Aviso y consentimientos para el personal. El banco «Colaboradores y
 * postulantes» se sugiere a todos los rubros, pero hasta ahora no había ningún
 * documento que informara al trabajador (deber de información, art. 18 de la Ley).
 */
export function buildWorkerNotice(company: Company): string {
  return renderDocument(trabajadoresSpec, legalContext(company, [], []));
}

/**
 * Procedimiento interno de derechos ARCO: lo que el reglamento exige que el
 * responsable tenga resuelto antes de que llegue la primera solicitud.
 */
export function buildArcoProcedure(company: Company): string {
  return renderDocument(arcoSpec, legalContext(company, [], []));
}



/**
 * Protocolo operativo propio del rubro: lo que la plantilla general no puede
 * decir. Reúne los procedimientos, normas, plazos de conservación y riesgos de
 * la familia legal del negocio, y las herramientas que declaró.
 */
export function buildSectorProtocol(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(sectorialSpec, legalContext(company, banks, providers));
}
