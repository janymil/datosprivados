import type { Company, DataBank, DocumentKind, Provider } from "./db";
import {
  buildArcoProcedure,
  buildComplaintBook,
  buildConsentTexts,
  buildCookiePolicy,
  buildImpactAssessment,
  buildInternalClauses,
  buildPrivacyPolicy,
  buildProcessingAgreement,
  buildRetentionPolicy,
  buildSectorProtocol,
  buildSecurityDocument,
  buildShortNotices,
  buildTermsOfService,
  buildWorkerNotice,
} from "./documents";

/**
 * Catálogo único de documentos legales.
 *
 * Vive fuera de las server actions porque un módulo "use server" solo puede
 * exportar funciones asíncronas; aquí están el título y el generador de cada
 * tipo, que usan tanto la pantalla como la acción de generación.
 */

export type DocumentTab = {
  key: DocumentKind;
  label: string;
  short: string;
  where: string;
  group: "publico" | "interno";
  /** Se publica con enlace compartible (hoy solo la política). */
  shareable?: boolean;
  description: string;
  /** Qué hace el dueño con el documento: lo publica, lo hace firmar o lo guarda. */
  action: DocumentAction;
  /** Forma parte del plan de cumplimiento básico (todos los negocios). */
  essential?: boolean;
  /** Cuándo aplica, en una línea, para los documentos que dependen del caso. */
  when?: string;
};

export type DocumentAction = "publicar" | "firmar" | "guardar";

export const DOCUMENT_ACTIONS: Array<{ key: DocumentAction; title: string; hint: string }> = [
  { key: "publicar", title: "Publicar o pegar", hint: "Los ve tu cliente: en tu web, WhatsApp, formularios o local." },
  { key: "firmar", title: "Hacer firmar", hint: "Los firman tu equipo o tus proveedores. No se publican." },
  { key: "guardar", title: "Guardar", hint: "Quedan archivados por si la ANPD los pide." },
];

export const DOCUMENT_TABS: DocumentTab[] = [
  {
    key: "politica",
    action: "publicar",
    essential: true,
    label: "Política de privacidad",
    short: "Política de privacidad",
    where: "Se publica en tu web, pie de página, bio de Instagram o perfil de WhatsApp Business.",
    group: "publico",
    shareable: true,
    description:
      "El documento central del deber de información: quién trata los datos, para qué, con qué base legal, a quién se los entrega y cómo ejercer los derechos ARCO.",
  },
  {
    key: "terminos",
    action: "publicar",
    when: "Si vendes o cobras por web o app.",
    label: "Términos y condiciones",
    short: "Términos y condiciones",
    where: "Se enlaza en el registro, en el checkout y en el pie de página.",
    group: "publico",
    description:
      "Contrato con el usuario: planes, precios con IGV, renovación automática, reembolsos, uso aceptable, responsabilidad y la ley aplicable sin quitarle el INDECOPI al consumidor.",
  },
  {
    key: "cookies",
    action: "publicar",
    when: "Si tu web usa analítica, píxeles o publicidad.",
    label: "Política de cookies",
    short: "Política de cookies",
    where: "Se enlaza desde el banner de cookies y desde el pie de página.",
    group: "publico",
    description:
      "Qué cookies usas, para qué, cuánto duran y cómo se revoca el consentimiento. Debe coincidir con lo que el banner realmente carga.",
  },
  {
    key: "aviso",
    action: "publicar",
    when: "Donde pides datos: formularios, WhatsApp, checkout.",
    label: "Avisos cortos",
    short: "Avisos de privacidad cortos",
    where: "Se pega en formularios, checkout, WhatsApp, firmas de correo, boletas y onboarding de la app.",
    group: "publico",
    description:
      "El aviso del art. 18 se cumple en el punto donde la persona entrega el dato, no solo en la política publicada.",
  },
  {
    key: "reclamaciones",
    action: "publicar",
    when: "Si atiendes a consumidores (Ley 29571).",
    label: "Libro de Reclamaciones",
    short: "Libro de Reclamaciones",
    where: "Aviso en el pie de página y en el local; hoja y procedimiento para el equipo.",
    group: "publico",
    description:
      "Aviso obligatorio, formato de hoja de reclamación y procedimiento interno de 30 días calendario (Ley N.° 29571).",
  },
  {
    key: "consentimiento",
    action: "publicar",
    essential: true,
    label: "Textos de consentimiento",
    short: "Textos de consentimiento",
    where: "Mensajes listos para copiar en formularios web, WhatsApp, correos y cupones.",
    group: "publico",
    description:
      "Casillas separadas por finalidad, opt-in de WhatsApp, doble opt-in de correo y autorización escrita para datos sensibles.",
  },
  {
    key: "seguridad",
    action: "guardar",
    essential: true,
    label: "Documento de seguridad",
    short: "Documento de seguridad",
    where: "Manual interno privado. NO se publica: se guarda firmado con fecha cierta por si la ANPD inspecciona.",
    group: "interno",
    description:
      "Inventario de bancos, accesos y privilegios, respaldos, retención y protocolo de incidentes de 48 horas.",
  },
  {
    key: "retencion",
    action: "guardar",
    when: "Complementa al Documento de seguridad.",
    label: "Retención y eliminación",
    short: "Política de retención",
    where: "Interno. Se adjunta al Documento de Seguridad.",
    group: "interno",
    description:
      "Cuánto se guarda cada banco, qué se elimina al vencer y cómo se acredita la purga (minimización demostrable).",
  },
  {
    key: "encargo",
    action: "firmar",
    when: "Si un proveedor trata datos por ti (contador, nube, courier).",
    label: "Encargo y transferencias",
    short: "Encargo de tratamiento",
    where: "Interno. Se firma con cada proveedor que trata datos por tu cuenta.",
    group: "interno",
    description:
      "Cláusula de encargado, anexo de proveedores y cláusula de flujo transfronterizo para la nube en el exterior.",
  },
  {
    key: "clausulas",
    action: "firmar",
    essential: true,
    label: "Confidencialidad y cartel CCTV",
    short: "Contratos y cláusulas",
    where: "Para hacer firmar a tu equipo, y para pegar el cartel de cámaras en tu local.",
    group: "interno",
    description:
      "Compromiso de confidencialidad, cláusula corta para proveedores, cartel de videovigilancia y acta del responsable de privacidad.",
  },
  {
    key: "eipd",
    action: "guardar",
    when: "Solo si usas IA, perfilado o datos sensibles a gran escala.",
    label: "Evaluación de impacto (EIPD)",
    short: "Evaluación de impacto",
    where: "Interno. Se hace antes de usar IA, perfilado o datos sensibles.",
    group: "interno",
    description:
      "Análisis de necesidad, riesgos y medidas cuando el tratamiento es de alto riesgo (IA, OCR, voz, perfilado). Es facultativa (art. 40) pero se considera al graduar multas (art. 125.4).",
  },
  {
    key: "trabajadores",
    action: "firmar",
    when: "Si tienes trabajadores, practicantes o recibes CVs.",
    label: "Aviso y consentimiento para trabajadores",
    short: "Aviso para trabajadores",
    where: "Interno. Se entrega al firmar el contrato y se archiva el cargo en el legajo.",
    group: "interno",
    description:
      "Aviso de privacidad laboral, autorización para datos sensibles (salud, biometría), aviso a postulantes, aviso de monitoreo y constancia de capacitación.",
  },
  {
    key: "sectorial",
    action: "guardar",
    label: "Protocolo de tu rubro",
    short: "Protocolo del rubro",
    when: "Procedimientos y riesgos propios de tu tipo de negocio.",
    where: "Interno. Lo lee tu equipo; se adjunta al Documento de Seguridad.",
    group: "interno",
    description:
      "Lo que la plantilla general no puede decir: pasos diarios, normas sectoriales, plazos de conservación, riesgos típicos y tus herramientas, según tu rubro.",
  },
  {
    key: "arco",
    action: "guardar",
    essential: true,
    label: "Procedimiento de derechos ARCO",
    short: "Procedimiento ARCO",
    where: "Interno. Lo aplica quien atiende las solicitudes; se guarda por si la ANPD lo pide.",
    group: "interno",
    description:
      "Quién atiende, plazos de 8, 10 y 20 días hábiles, subsanación, ampliación, contenido de cada respuesta, denegatoria y registro de evidencia.",
  },
];

export function documentTab(kind: string): DocumentTab | undefined {
  return DOCUMENT_TABS.find((tab) => tab.key === kind);
}

export function documentTitle(kind: DocumentKind): string {
  const tab = documentTab(kind);
  return tab ? tab.short : kind;
}

export function buildDocument(
  kind: DocumentKind,
  company: Company,
  banks: DataBank[],
  providers: Provider[] = []
): string {
  switch (kind) {
    case "politica":
      return buildPrivacyPolicy(company, banks, providers);
    case "terminos":
      return buildTermsOfService(company, banks);
    case "cookies":
      return buildCookiePolicy(company, providers);
    case "aviso":
      return buildShortNotices(company);
    case "reclamaciones":
      return buildComplaintBook(company);
    case "consentimiento":
      return buildConsentTexts(company);
    case "seguridad":
      return buildSecurityDocument(company, banks, providers);
    case "retencion":
      return buildRetentionPolicy(company, banks);
    case "encargo":
      return buildProcessingAgreement(company, banks, providers);
    case "clausulas":
      return buildInternalClauses(company);
    case "eipd":
      return buildImpactAssessment(company, banks, providers);
    case "trabajadores":
      return buildWorkerNotice(company);
    case "arco":
      return buildArcoProcedure(company);
    case "sectorial":
      return buildSectorProtocol(company, banks, providers);
  }
}

export function isDocumentKind(value: string): value is DocumentKind {
  return DOCUMENT_TABS.some((tab) => tab.key === value);
}
