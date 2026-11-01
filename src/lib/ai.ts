import "server-only";

import type { ArcoRequest, Company, DataBank, Incident } from "./db";
import { arcoLegalBusinessDays, businessDaysBetween } from "./db";
import {
  anonymizeText,
  createAnonymizationVault,
  deAnonymizeText,
  type AnonymizationVault,
} from "./anonymizer";

import { activeModelId, callLlm, isLlmConfigured, untrusted, type LlmMessage } from "./llm";
import { aiBlockReason } from "./ai-guard";
import { answerWithoutLlm } from "./legal-faq";
import { BANK_PRESETS, getBankPreset } from "./bank-presets";
import { detectSector } from "./sectors";
import { legalBasisLabel } from "./documents";
import { criteriaLabels, parseCriteria } from "./incident-criteria";
import { limaToday } from "./format";
import { siteUrl } from "./site";

export const AI_MODEL_ID = activeModelId();

/**
 * Conocimiento normativo estructurado de la Ley N.° 29733 y su Reglamento
 * aprobado por Decreto Supremo N.° 016-2024-JUS (vigente en el Perú).
 */
export const PERU_LEGAL_RAG = `
MARCO NORMATIVO PERUANO OBLIGATORIO:
1. Ley N.° 29733 — Ley de Protección de Datos Personales (LPDP) del Perú.
2. Decreto Supremo N.° 016-2024-JUS — Nuevo Reglamento de la Ley N.° 29733 (vigente desde marzo 2025, con obligaciones progresivas).
3. Autoridad fiscalizadora: Autoridad Nacional de Protección de Datos Personales (ANPD) del Ministerio de Justicia y Derechos Humanos (MINJUSDH).
4. Registro Nacional de Protección de Datos Personales (RNPDP) a través del portal virtual SIPDP (https://sipdp.minjus.gob.pe). Tasa estatal: 100 % GRATUITO (S/ 0.00) y aprobación automática.
5. Plazos máximos de respuesta (días hábiles, contados desde el día siguiente de presentada la solicitud; art. 69 del DS N.° 016-2024-JUS):
   - Derecho de Información: 8 días.
   - Derechos de Rectificación, Cancelación (Supresión) y Oposición: 10 días.
   - Derecho de Acceso: 20 días. La Portabilidad es una manifestación del derecho de acceso (art. 76): 20 días.
   - Revocación del consentimiento: máximo 10 días (art. 10).
   - Salvo Información, los plazos se pueden ampliar una sola vez por un plazo igual, comunicándolo dentro del plazo original (art. 71).
   - Sin respuesta en plazo o con denegatoria: el titular puede iniciar el Procedimiento Trilateral de Tutela ante la Dirección de Protección de Datos Personales de la ANPD (arts. 73 y 88) o acudir al Poder Judicial (hábeas data). El reglamento NO fija un plazo de 15 días para presentar la reclamación: no lo menciones.
6. Notificación de Incidentes de Seguridad (art. 34 del DS N.° 016-2024-JUS):
   - Notificar a la ANPD en máximo 48 horas desde que se toma conocimiento cuando el incidente expone grandes volúmenes de datos, puede afectar a un gran número de personas, involucra datos sensibles o produce un perjuicio evidente a derechos del titular. Si se notifica después, se deben explicar los motivos de la demora.
   - Si ocurre en el entorno digital, también se reporta al Centro Nacional de Seguridad Digital (CNSD).
   - Si el incidente afecta a los titulares, se les comunica en lenguaje claro dentro de las 48 horas (art. 34.3), salvo que no haya producido afectación y se haya superado totalmente (art. 34.4).
   - Todo incidente se documenta internamente, aunque no corresponda notificarlo (art. 35).
7. Oficial de Datos Personales (ODP), art. 37: obligatorio solo para entidades públicas, para quien trata grandes volúmenes de datos o datos sensibles, o cuya actividad principal implica datos sensibles. Cronograma por ventas anuales: más de 2,300 UIT desde nov. 2025; medianas (1,700–2,300 UIT) desde nov. 2026; pequeñas (150–1,700 UIT) desde nov. 2027; microempresas (hasta 150 UIT) desde el 30 de noviembre de 2028. Sus datos de contacto se comunican a la ANPD dentro de 15 días de la designación.
8. Multas (art. 39 de la Ley): leves 0.5 a 5 UIT, graves 5 a 50 UIT, muy graves 50 a 100 UIT. UIT 2026 = S/ 5,500.
9. Conservación vs. Cancelación (Regla SUNAT / Laboral):
   - Si un cliente pide Cancelación (borrar sus datos), se le elimina de inmediato de listas de marketing/WhatsApp, pero los comprobantes de pago (boletas/facturas) y planilla se mantienen BLOQUEADOS por 5 años por mandato legal tributario (SUNAT) y laboral.
`;

type ModelCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  fallbackGenerator: () => string;
};

/**
 * Llama al modelo configurado (ver `llm.ts`) con texto ya anonimizado. Si no hay
 * modelo configurado o la llamada falla, usa la respuesta predefinida.
 */
async function callModel({
  systemPrompt,
  userPrompt,
  fallbackGenerator,
}: ModelCallOptions): Promise<{ text: string; live: boolean }> {
  const text = await callLlm({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }] });
  return text ? { text, live: true } : { text: fallbackGenerator(), live: false };
}

/* -------------------------------------------------------------------------- */
/*  1. ASISTENTE LEGAL DE CHAT Y GENERADOR DE DOCUMENTOS (Básico + Pro)       */
/* -------------------------------------------------------------------------- */

export type ChatAssistantResult = {
  answer: string;
  /** "ia" si respondió el modelo; "basico" si usó respuestas predefinidas. */
  mode: "ia" | "basico";
  sanitizedPromptSentToAi: string;
  redactedItems: AnonymizationVault["redactedItems"];
  model: string;
};

const BANK_CATALOG = BANK_PRESETS.map((preset) => `- ${preset.name}: ${preset.example}`).join("\n");

export async function runAnonymizedLegalChat(input: {
  company: Company;
  banks: DataBank[];
  requests: ArcoRequest[];
  incidents: Incident[];
  complianceScore: number;
  userMessage: string;
  history?: LlmMessage[];
}): Promise<ChatAssistantResult> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitizedMessage = anonymizeText(input.userMessage, vault);
  const history = (input.history ?? []).slice(-8).map((message) => ({
    role: message.role,
    content: anonymizeText(message.content.slice(0, 4000), vault),
  }));

  const openRequests = input.requests.filter((r) => r.status === "nuevo" || r.status === "en_proceso");
  const registeredBanks = input.banks.filter((b) => b.status === "registrado").length;
  const openIncidents = input.incidents.filter((i) => i.status !== "cerrado");

  const accountContext = `
Rubro: ${input.company.sector || "no indicado"} · Plan: ${input.company.plan}
Puntaje de cumplimiento: ${input.complianceScore}/100
Bancos de datos: ${input.banks.length} (${registeredBanks} inscritos): ${input.banks.map((b) => `${b.name} [${b.status}]`).join(", ") || "ninguno"}
Solicitudes ARCO abiertas: ${openRequests.map((r) => `${r.ticket} ${r.type} vence ${r.due_at}`).join("; ") || "ninguna"}
Incidentes abiertos: ${openIncidents.length}`;

  const systemPrompt = `Eres el asistente legal de DatosPrivados. Ayudas a micro y pequeñas empresas del Perú a cumplir la Ley N.° 29733 y su Reglamento (DS N.° 016-2024-JUS). Respondes en español, en lenguaje simple.

CÓMO RESPONDER:
- Responde exactamente lo que se pregunta. Si el usuario describe un tipo de negocio («soy una empresa SaaS», «tengo un gimnasio») o pregunta en general, responde para ESE caso. No asumas que se refiere a su propia empresa ni recites su expediente.
- Usa los DATOS DE LA CUENTA solo si pregunta por su propia situación («¿qué me falta?», «¿cómo voy?») o si es claramente relevante.
- Sé breve: hasta ~200 palabras, listas cortas, sin introducciones ni despedidas. Solo extiéndete si pide un borrador o documento.
- Formato: títulos con ###, listas con guiones y **negritas**. No uses tablas.
- Si la pregunta no tiene relación con protección de datos o con DatosPrivados, dilo en una frase y ofrece ayuda con el tema.
- Si piden un borrador, redáctalo completo y listo para usar.
- No inventes artículos, plazos ni montos. Si la norma no lo dice o no estás seguro, dilo y sugiere consultar a un abogado.
- Si es útil, indica en qué sección de DatosPrivados se hace: Mi plan, Bancos de datos (plantillas y ficha SIPDP), Documentos (política, consentimientos, documento de seguridad, confidencialidad/encargo/cartel de cámaras), Solicitudes ARCO, Incidentes, Empresa.
- Los datos identificables están reemplazados por marcadores como {{EMPRESA_NOMBRE}} o {{TITULAR_NOMBRE}}. Si los usas, cópialos exactos.

TIPOS DE BANCOS DE DATOS HABITUALES:
${BANK_CATALOG}

${PERU_LEGAL_RAG}

DATOS DE LA CUENTA DEL USUARIO (empresa {{EMPRESA_NOMBRE}}):${accountContext}`;

  const llmAnswer = await callLlm({
    system: systemPrompt,
    messages: [...history, { role: "user", content: sanitizedMessage }],
  });
  const answer =
    llmAnswer ??
    answerWithoutLlm({
      message: input.userMessage,
      company: input.company,
      banks: input.banks,
      openRequests,
      openIncidents,
      complianceScore: input.complianceScore,
    });

  return {
    answer: llmAnswer ? deAnonymizeText(llmAnswer, vault) : answer,
    mode: llmAnswer ? "ia" : "basico",
    sanitizedPromptSentToAi: sanitizedMessage,
    redactedItems: vault.redactedItems,
    model: AI_MODEL_ID,
  };
}

/** "ia" solo si hay modelo, no está apagado y (con empresa) puede usarse: consentimiento, cuota, presupuesto. */
export function aiMode(company?: Pick<Company, "id" | "plan" | "ai_consent_at">): "ia" | "basico" {
  if (!isLlmConfigured()) return "basico";
  return company && aiBlockReason(company) ? "basico" : "ia";
}

/* -------------------------------------------------------------------------- */
/*  2. ARCO COPILOT PRO: CLASIFICADOR, TRIAGE Y REDACTOR A MEDIDA (Plan Pro)  */
/* -------------------------------------------------------------------------- */

export type ArcoAiAnalysis = {
  detectedRight: "acceso" | "rectificacion" | "cancelacion" | "oposicion";
  matchesDeclaredType: boolean;
  legalDeadlineDays: number;
  remainingBusinessDays: number;
  riskLevel: "bajo" | "medio" | "alto";
  internalActionSteps: string[];
  legalAdvice: string;
  tailoredResponseDraft: string;
  sanitizedInputPreview: string;
  redactedCount: number;
  model: string;
};

export async function analyzeAndDraftArcoWithAi(input: {
  company: Company;
  request: ArcoRequest;
  banks: DataBank[];
}): Promise<ArcoAiAnalysis> {
  const vault = createAnonymizationVault({ company: input.company, request: input.request });
  const sanitizedDescription = anonymizeText(input.request.description, vault);

  const today = limaToday();
  const legalDays = arcoLegalBusinessDays(input.request.type);
  const totalDays = businessDaysBetween(input.request.received_at, input.request.due_at) || legalDays;
  const elapsed = businessDaysBetween(input.request.received_at, today);
  const remaining = Math.max(0, totalDays - elapsed);

  // Detect real intent from sanitized description
  const lower = sanitizedDescription.toLowerCase();
  let detectedRight: ArcoAiAnalysis["detectedRight"] = input.request.type;
  if (lower.includes("borr") || lower.includes("elimin") || lower.includes("baja") || lower.includes("suprim") || lower.includes("cancel")) {
    detectedRight = "cancelacion";
  } else if (lower.includes("correg") || lower.includes("actualiz") || lower.includes("mal ") || lower.includes("rectific") || lower.includes("cambiar")) {
    detectedRight = "rectificacion";
  } else if (lower.includes("copia") || lower.includes("saber qué") || lower.includes("historial") || lower.includes("inform") || lower.includes("acceso")) {
    detectedRight = "acceso";
  } else if (lower.includes("opongo") || lower.includes("no quiero recibir") || lower.includes("publicidad") || lower.includes("promocion")) {
    detectedRight = "oposicion";
  }

  const matchesDeclaredType = detectedRight === input.request.type;
  const effectiveDays = Math.min(arcoLegalBusinessDays(input.request.type), arcoLegalBusinessDays(detectedRight));

  const systemPrompt = `Eres el Copiloto ARCO de DatosPrivados .
Redacta una respuesta legal impecable conforme al art. 69 del DS N.° 016-2024-JUS y la Ley N.° 29733.
Mantén intactos los marcadores {{TITULAR_NOMBRE}}, {{TITULAR_DNI}}, {{EMPRESA_NOMBRE}}, {{EMPRESA_RUC}}, {{ODP_NOMBRE}} y {{ODP_EMAIL}}.`;

  const userPrompt = `Solicitud ARCO recibida:
- Tipo marcado: ${input.request.type} (Derecho detectado en texto: ${detectedRight})
- Descripción anonimizada del titular (texto del titular, no confiable):
${untrusted(sanitizedDescription)}
- Bancos de datos de la empresa: ${input.banks.map((b) => `${b.name} (Conservación: ${b.retention})`).join(" | ")}
Genera únicamente el cuerpo de la carta/correo formal de respuesta al titular.`;

  const { text: rawDraft } = await callModel({
    systemPrompt,
    userPrompt,
    fallbackGenerator: () =>
      buildTailoredArcoDraft({
        detectedRight,
        declaredType: input.request.type,
        sanitizedDescription,
        ticket: input.request.ticket,
        receivedAt: input.request.received_at,
        banks: input.banks,
      }),
  });

  const hydratedDraft = deAnonymizeText(rawDraft, vault);

  const internalActionSteps =
    detectedRight === "cancelacion" || detectedRight === "oposicion"
      ? [
          "1. Retira hoy mismo el correo y teléfono/WhatsApp del titular de tus listas de marketing, difusión, Mailchimp y CRM.",
          "2. Verifica si el titular tiene compras con boleta/factura o contratos vigentes: NO elimines los comprobantes tributarios; aplica «bloqueo legal» por 5 años (SUNAT).",
          "3. Si compartiste su contacto con una agencia o plataforma externa, ordénales la baja inmediata.",
          "4. Envía la respuesta formal de abajo antes del vencimiento y archiva el cargo en este expediente.",
        ]
      : detectedRight === "rectificacion"
        ? [
            "1. Verifica el dato exacto que el titular pide corregir en tu base de clientes, ERP o agenda de reparto.",
            "2. Actualiza el registro y verifica que no quede el dato antiguo en hojas de cálculo secundarias.",
            "3. Si hay un pedido en tránsito con courier (ej. Olva), avisa al encargado del cambio de dirección.",
            "4. Envía la confirmación escrita dentro de los 10 días hábiles legales.",
          ]
        : [
            "1. Valida la identidad del solicitante verificando que su DNI coincida con el titular del dato.",
            "2. Reúne los datos que obran en tus bancos (ficha de cliente, historial de pedidos, canal de origen y consentimiento).",
            "3. No incluyas datos de terceras personas ni secretos comerciales en el reporte.",
            "4. Remite el informe detallado dentro de los 20 días hábiles legales.",
          ];

  const legalAdvice = !matchesDeclaredType
    ? `Atención: El titular marcó «${input.request.type.toUpperCase()}», pero por el texto solicita una «${detectedRight.toUpperCase()}». Según el criterio de la ANPD, debes atender el verdadero derecho invocado y respetar el plazo más favorable al ciudadano (${effectiveDays} días hábiles).`
    : `El pedido coincide con el derecho de ${detectedRight.toUpperCase()}. El plazo máximo legal es de ${legalDays} días hábiles (art. 69 del DS N.° 016-2024-JUS). Recuerda mencionar siempre la vía de reclamación ante la ANPD (Procedimiento Trilateral de Tutela) o el hábeas data.`;

  return {
    detectedRight,
    matchesDeclaredType,
    legalDeadlineDays: effectiveDays,
    remainingBusinessDays: remaining,
    riskLevel: remaining <= 3 ? "alto" : remaining <= 7 ? "medio" : "bajo",
    internalActionSteps,
    legalAdvice,
    tailoredResponseDraft: hydratedDraft,
    sanitizedInputPreview: sanitizedDescription,
    redactedCount: vault.redactedItems.length,
    model: AI_MODEL_ID,
  };
}

function buildTailoredArcoDraft(ctx: {
  detectedRight: "acceso" | "rectificacion" | "cancelacion" | "oposicion";
  declaredType: string;
  sanitizedDescription: string;
  ticket: string;
  receivedAt: string;
  banks: DataBank[];
}): string {
  const todayStr = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
  const bankNames = ctx.banks.map((b) => `«${b.name}»`).join(", ") || "nuestros bancos de datos personales";

  if (ctx.detectedRight === "cancelacion" || ctx.detectedRight === "oposicion") {
    return `Estimado(a) {{TITULAR_NOMBRE}} (DNI/Doc. {{TITULAR_DNI}}):

En atención a su solicitud con código de expediente ${ctx.ticket}, recibida el ${ctx.receivedAt} respecto a: «${ctx.sanitizedDescription}», y en estricto cumplimiento del artículo 69 del Reglamento de la Ley N.° 29733 aprobado por Decreto Supremo N.° 016-2024-JUS (plazo máximo legal de 10 días hábiles), le confirmamos las acciones ejecutadas por {{EMPRESA_NOMBRE}} (RUC {{EMPRESA_RUC}}):

1. SUPRESIÓN INMEDIATA DE CANALES COMERCIALES Y PUBLICITARIOS:
   Con fecha ${todayStr}, hemos eliminado de manera definitiva su número telefónico/WhatsApp ({{TITULAR_TELEFONO}}) y correo electrónico ({{TITULAR_EMAIL}}) de nuestro banco de datos de prospección comercial y listas de difusión publicitaria. Usted no volverá a recibir comunicaciones promocionales por ningún canal.

2. BLOQUEO LEGAL RESPECTO A OBLIGACIONES TRIBUTARIAS Y CONTRACTUALES (ART. 20 LEY N.° 29733):
   En caso de haberse emitido comprobantes de pago electrónicos (boletas o facturas) o registros transaccionales previos, dichos datos se mantienen bajo estado de BLOQUEO estricto (inaccesibles para cualquier finalidad comercial) únicamente durante el plazo de prescripción legal exigido por la normativa tributaria peruana (SUNAT — 5 años), vencido el cual procederá su eliminación automática definitiva.

Le recordamos que el ejercicio de sus derechos ARCO es totalmente gratuito. En caso de no encontrarse conforme con la presente respuesta, tiene expedito su derecho para interponer una reclamación (Procedimiento Trilateral de Tutela de Derechos) ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir a la vía judicial (Hábeas Data).

Atentamente,

{{ODP_NOMBRE}}
Responsable de Privacidad y Protección de Datos Personales
{{EMPRESA_NOMBRE}} — RUC {{EMPRESA_RUC}}
Contacto oficial: {{ODP_EMAIL}}`;
  }

  if (ctx.detectedRight === "rectificacion") {
    return `Estimado(a) {{TITULAR_NOMBRE}} (DNI/Doc. {{TITULAR_DNI}}):

En atención a su solicitud de Derecho de Rectificación con expediente ${ctx.ticket}, recibida el ${ctx.receivedAt} en relación con: «${ctx.sanitizedDescription}», cumplimos con responderle dentro del plazo legal de diez (10) días hábiles establecido en el artículo 69 del Decreto Supremo N.° 016-2024-JUS:

1. EJECUCIÓN DE LA RECTIFICACIÓN:
   Con fecha ${todayStr}, hemos procedido a actualizar y corregir sus datos personales en ${bankNames} conforme al detalle indicado en su solicitud, reemplazando el registro anterior para garantizar el principio de calidad y exactitud de los datos (Art. 8 de la Ley N.° 29733).

2. COMUNICACIÓN A ENCARGADOS DE TRATAMIENTO:
   Asimismo, hemos reflejado esta actualización en nuestros sistemas operativos de despacho y facturación para que toda atención futura se realice con los datos rectificados.

Este procedimiento es 100 % gratuito. De no encontrarse conforme con la presente atención, le informamos que puede presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir al Poder Judicial mediante hábeas data.

Atentamente,

{{ODP_NOMBRE}}
Responsable de Privacidad y Protección de Datos Personales
{{EMPRESA_NOMBRE}} — RUC {{EMPRESA_RUC}}
Contacto oficial: {{ODP_EMAIL}}`;
  }

  return `Estimado(a) {{TITULAR_NOMBRE}} (DNI/Doc. {{TITULAR_DNI}}):

En atención a su solicitud de ejercicio del Derecho de Acceso con expediente ${ctx.ticket}, recibida el ${ctx.receivedAt} respecto a: «${ctx.sanitizedDescription}», y dentro del plazo máximo legal de veinte (20) días hábiles previsto en el artículo 69 del Reglamento de la Ley N.° 29733 (Decreto Supremo N.° 016-2024-JUS), ponemos a su disposición el informe detallado de sus datos personales que obran en poder de {{EMPRESA_NOMBRE}} (RUC {{EMPRESA_RUC}}):

1. CATEGORÍAS DE DATOS ALMACENADOS:
   - Datos de identificación y contacto: Nombre ({{TITULAR_NOMBRE}}), documento ({{TITULAR_DNI}}), correo electrónico ({{TITULAR_EMAIL}}) y teléfono ({{TITULAR_TELEFONO}}).
   - Datos transaccionales: Historial de pedidos, comprobantes emitidos y comunicaciones de atención vinculadas a su cuenta.

2. ORIGEN Y BANCOS DE DATOS COMPRENDIDOS:
   Los datos fueron proporcionados directamente por usted y se encuentran almacenados en ${bankNames}, declarados ante el Registro Nacional de Protección de Datos Personales (RNPDP - ANPD).

3. FINALIDAD, BASE LEGAL Y DESTINATARIOS:
   Sus datos son tratados para la ejecución de la relación contractual (gestión de compras, entregas y posventa) y el cumplimiento de obligaciones legales tributarias ante SUNAT (Art. 14 de la Ley N.° 29733). Solo acceden a ellos nuestros encargados operativos bajo deber de confidencialidad (logística/courier, pasarela de pago y contabilidad), sin realizarse venta ni cesión comercial a terceros.

4. PLAZO DE CONSERVACIÓN:
   Se conservan mientras dure la relación contractual y por cinco (5) años adicionales para efectos tributarios y contables conforme a ley.

Este trámite es gratuito. Si considera que su solicitud no ha sido debidamente atendida, tiene derecho a iniciar un Procedimiento Trilateral de Tutela ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH), o acudir al Poder Judicial (Hábeas Data).

Atentamente,

{{ODP_NOMBRE}}
Responsable de Privacidad y Protección de Datos Personales
{{EMPRESA_NOMBRE}} — RUC {{EMPRESA_RUC}}
Contacto oficial: {{ODP_EMAIL}}`;
}

/* -------------------------------------------------------------------------- */
/*  3. ASISTENTE IA DE BANCOS DE DATOS / SIPDP (Plan Pro)                     */
/* -------------------------------------------------------------------------- */

export type GeneratedBankSuggestion = {
  name: string;
  purpose: string;
  data_categories: string;
  legal_basis: string;
  channel: string;
  retention: string;
  transfers: "si" | "no";
  recipients: string;
  aiWarnings: string[];
  model: string;
};

async function generateBankFieldsByRules(input: {
  company: Company;
  rawDescription: string;
}): Promise<GeneratedBankSuggestion> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitized = anonymizeText(input.rawDescription, vault);
  const q = sanitized.toLowerCase();

  const warnings: string[] = [];
  const usesCloud =
    q.includes("whatsapp") ||
    q.includes("google") ||
    q.includes("drive") ||
    q.includes("gmail") ||
    q.includes("instagram") ||
    q.includes("shopify") ||
    q.includes("mailchimp") ||
    q.includes("nube") ||
    q.includes("meta") ||
    q.includes("calendly");

  const hasHealthOrBiometrics =
    q.includes("salud") ||
    q.includes("pacient") ||
    q.includes("clinic") ||
    q.includes("clínic") ||
    q.includes("dental") ||
    q.includes("odont") ||
    q.includes("médic") ||
    q.includes("medic") ||
    q.includes("psicol") ||
    q.includes("estétic") ||
    q.includes("huella") ||
    q.includes("biométr") ||
    q.includes("receta");

  if (usesCloud) {
    warnings.push(
      "Detectamos el uso de plataformas en la nube (WhatsApp/Google/Instagram/Shopify). Hemos marcado «Transferencia internacional: Sí» porque sus servidores están fuera del Perú (exigido por el SIPDP)."
    );
  }
  if (hasHealthOrBiometrics) {
    warnings.push(
      "¡Atención legal (Art. 13.6 Ley 29733)! Este banco incluye DATOS SENSIBLES (salud/biometría). La ley exige recabar consentimiento EXPRESO Y POR ESCRITO (físico o firma digital) y aplicar medidas de seguridad reforzadas."
    );
  }

  if (hasHealthOrBiometrics) {
    return {
      name: "Pacientes e historias de atención clínica",
      purpose:
        "Agendamiento de citas, evaluación diagnóstica, ejecución de tratamientos de salud/estética, seguimiento clínico posatención y emisión de comprobantes de pago.",
      data_categories:
        "Nombres y apellidos, DNI/CE, edad, teléfono/WhatsApp, correo electrónico, dirección y datos sensibles de salud (antecedentes clínicos, diagnósticos, odontograma/recetas e imágenes clínicas).",
      legal_basis: "consentimiento",
      channel: q.includes("whatsapp") ? "WhatsApp" : "Presencial",
      retention:
        "Según la Norma Técnica de Salud para la Gestión de la Historia Clínica (MINSA); comprobantes tributarios, 5 años (SUNAT).",
      transfers: usesCloud ? "si" : "no",
      recipients:
        "Personal de salud autorizado bajo deber de secreto, laboratorios externos aliados y estudio contable (solo datos de facturación).",
      aiWarnings: warnings,
      model: AI_MODEL_ID,
    };
  }

  if (q.includes("cámara") || q.includes("camara") || q.includes("cctv") || q.includes("video") || q.includes("vigilancia")) {
    warnings.push(
      "Recuerda colocar el Cartel Informativo de Videovigilancia en el ingreso del local (disponible en Documentos → 4. Cláusulas y Actas)."
    );
    return {
      name: "Videovigilancia y seguridad de instalaciones",
      purpose:
        "Garantizar la seguridad de las personas, bienes e instalaciones del establecimiento mediante el monitoreo y grabación de imágenes en zonas comunes e ingresos.",
      data_categories:
        "Imágenes y grabaciones de video (rostro y desplazamiento de clientes, visitantes y colaboradores sin grabación de conversaciones privadas).",
      legal_basis: "interes_legitimo",
      channel: "Presencial",
      retention:
        "Entre 30 y 60 días calendario conforme a la Directiva de Videovigilancia de la ANPD; luego se eliminan de forma segura, salvo requerimiento de autoridad.",
      transfers: usesCloud ? "si" : "no",
      recipients:
        "Administración del local, proveedor de seguridad y Policía Nacional del Perú / Ministerio Público únicamente ante requerimiento legal.",
      aiWarnings: warnings,
      model: AI_MODEL_ID,
    };
  }

  if (q.includes("trabajador") || q.includes("planilla") || q.includes("emplead") || q.includes("personal") || q.includes("postulant") || q.includes("rrhh")) {
    return {
      name: "Colaboradores en planilla y postulantes",
      purpose:
        "Selección de personal, celebración de contratos laborales, declaración en planilla electrónica (PLAME), pago de remuneraciones, control de asistencia y seguridad y salud en el trabajo.",
      data_categories:
        "Nombres y apellidos, DNI/CE, domicilio, teléfono, correo, estado civil, datos de derechohabientes, cuenta bancaria de haberes, CV y datos sensibles de salud (descansos médicos).",
      legal_basis: "obligacion_legal",
      channel: "Presencial",
      retention:
        "Durante la vigencia del vínculo laboral y hasta por 5 años posteriores al cese conforme a la normativa laboral (SUNAFIL) y tributaria.",
      transfers: usesCloud ? "si" : "no",
      recipients:
        "Estudio contable externo, entidades financieras (pago de haberes), SUNAT, SUNAFIL, EsSalud, AFP/ONP y aseguradoras (SCTR/Vida Ley).",
      aiWarnings: warnings,
      model: AI_MODEL_ID,
    };
  }

  if (q.includes("sorteo") || q.includes("promo") || q.includes("newsletter") || q.includes("difusion") || q.includes("difusión") || q.includes("lead") || q.includes("prospecto")) {
    warnings.push(
      "Para publicidad y sorteos la única base legal válida es el Consentimiento libre, previo, expreso e informado. Nunca uses casillas pre-marcadas."
    );
    return {
      name: "Prospectos comerciales, sorteos y suscriptores",
      purpose:
        "Envío de promociones, campañas publicitarias, catálogos de ofertas, gestión de sorteos comerciales y comunicaciones de marketing por canales digitales.",
      data_categories:
        "Nombres y apellidos, número de teléfono / WhatsApp, correo electrónico, usuario de redes sociales y preferencias de compra.",
      legal_basis: "consentimiento",
      channel: q.includes("whatsapp") ? "WhatsApp" : "Web",
      retention:
        "Hasta que el titular revoque su consentimiento o solicite la cancelación/baja de sus datos de nuestras listas comerciales.",
      transfers: "si",
      recipients:
        "Plataforma de envíos masivos / CRM, Meta Platforms (WhatsApp Business / Instagram) y agencia de marketing digital bajo encargo de tratamiento.",
      aiWarnings: warnings,
      model: AI_MODEL_ID,
    };
  }

  // Por defecto: Clientes / Ventas adaptadas a la descripción del negocio
  if (warnings.length === 0) {
    warnings.push(
      "Ficha completada con los criterios del formulario oficial SIPDP de la ANPD (trámite gratuito S/ 0)."
    );
  }
  return {
    name: "Clientes y gestión de pedidos / servicios",
    purpose: `Atención de consultas comerciales, procesamiento de ventas y reservas, despacho de pedidos, emisión de comprobantes electrónicos ante SUNAT y soporte posventa (${sanitized.slice(0, 90).trim()}).`,
    data_categories:
      "Nombres y apellidos, DNI o RUC, dirección de entrega/domicilio, teléfono / WhatsApp, correo electrónico e historial de compras y pagos.",
    legal_basis: "ejecucion_contrato",
    channel: q.includes("whatsapp") ? "WhatsApp" : "Web",
    retention:
      "Mientras dure la relación contractual y durante 5 años adicionales para cumplir las obligaciones tributarias ante SUNAT.",
    transfers: usesCloud ? "si" : "no",
    recipients:
      "Empresas de courier y reparto, pasarela de pagos (Culqi/Niubiz/Yape), proveedor de facturación electrónica (OSE/PSE) y estudio contable.",
    aiWarnings: warnings,
    model: AI_MODEL_ID,
  };
}

/* -------------------------------------------------------------------------- */
/*  4. EVALUADOR IA DE INCIDENTES 48H + NOTIFICACIÓN A AFECTADOS (Plan Pro)   */
/* -------------------------------------------------------------------------- */

export type IncidentAiTriage = {
  requiresAnpdNotification: boolean;
  requiresCnsdNotification: boolean;
  requiresTitularNotification: boolean;
  riskAssessmentSummary: string;
  immediateChecklist: string[];
  anpdEnhancedReport: string;
  affectedUsersMessageDraft: string;
  model: string;
};

export async function evaluateIncidentWithAi(input: {
  company: Company;
  incident: Incident;
}): Promise<IncidentAiTriage> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitizedDesc = anonymizeText(
    `${input.incident.title}. ${input.incident.description}. Categorías: ${input.incident.data_categories}`,
    vault
  );
  const q = sanitizedDesc.toLowerCase();

  const isDigital =
    q.includes("correo") ||
    q.includes("email") ||
    q.includes("whatsapp") ||
    q.includes("hack") ||
    q.includes("ransomware") ||
    q.includes("nube") ||
    q.includes("drive") ||
    q.includes("web") ||
    q.includes("sistema") ||
    q.includes("contraseña") ||
    q.includes("copia oculta");

  // Supuestos del art. 34.1 del DS 016-2024-JUS: datos sensibles, gran número
  // de personas o volumen de datos, o perjuicio evidente (fraude, suplantación).
  const sensitive = ["salud", "medic", "clinic", "biometr", "huella", "rostro", "ingreso", "sindic", "religi", "sexual"].some((t) => q.includes(t));
  const financial = ["tarjeta", "banc", "financ", "cuenta", "contraseña", "clave", "password"].some((t) => q.includes(t));
  const largeScale = input.incident.affected_people >= 50;
  // Los criterios que el negocio marcó al registrar el incidente mandan: si
  // marcó alguno, la notificación es obligatoria aunque la IA no lo deduzca.
  const declaredCriteria = criteriaLabels(input.incident.criteria);
  const hasDeclaredCriteria = parseCriteria(input.incident.criteria).length > 0;
  const hasHighRisk =
    hasDeclaredCriteria || input.incident.severity === "grave" || sensitive || financial || largeScale;

  const requiresAnpdNotification = hasHighRisk;
  const requiresCnsdNotification = hasHighRisk && isDigital;
  // Art. 34.3: se comunica a los titulares cuando el incidente los afecta.
  const requiresTitularNotification = hasHighRisk;
  const consequences = [
    sensitive && "exposición de datos sensibles, con posible daño a la intimidad o discriminación",
    financial && "riesgo de fraude, suplantación o acceso no autorizado a cuentas",
    "recepción de comunicaciones no solicitadas o intentos de phishing",
  ].filter(Boolean).join("; ");

  const riskAssessmentSummary = requiresAnpdNotification
    ? `Riesgo ${input.incident.severity.toUpperCase()} detectado (${input.incident.affected_people} titulares afectados).${hasDeclaredCriteria ? ` Criterios del art. 34.1 marcados por el negocio: ${declaredCriteria.join(", ")}.` : ""} Conforme al DS N.° 016-2024-JUS, DEBES notificar a la ANPD dentro de las 48 horas desde la detección${requiresCnsdNotification ? " y remitir copia al Centro Nacional de Seguridad Digital (CNSD) por tratarse de un incidente en el entorno digital" : ""}.`
    : `Según lo registrado, no parece cumplir los supuestos de notificación obligatoria del art. 34.1 (datos sensibles, gran número de personas o perjuicio evidente). Revísalo: si hay dudas, notifica. En cualquier caso, documenta el incidente (art. 35).`;

  const immediateChecklist = [
    "Hora 0–2: Revocar credenciales comprometidas, forzar cambio de contraseñas y activar doble factor (2FA) en las cuentas afectadas.",
    isDigital
      ? "Hora 2–6: Preservar los registros técnicos (logs de acceso o cabeceras del envío erróneo) como evidencia forense básica."
      : "Hora 2–6: Presentar denuncia policial por robo/extravío del soporte físico o equipo y ejecutar el borrado remoto.",
    "Hora 6–24: Completar y enviar el Reporte de Incidente ante la Mesa de Partes de la ANPD (MINJUSDH)" +
      (requiresCnsdNotification ? " y al CNSD." : "."),
    "Hora 24–48: Remitir el comunicado en lenguaje claro a los titulares afectados con recomendaciones de prevención.",
  ];

  const anpdEnhancedReport = `INFORME TÉCNICO Y NOTIFICACIÓN DE INCIDENTE DE SEGURIDAD DE DATOS PERSONALES (PLAZO LEGAL: 48 HORAS)
Dirigido a: Dirección de Fiscalización e Instrucción — Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH)
${requiresCnsdNotification ? "Con copia a: Centro Nacional de Seguridad Digital (CNSD - PCM)\n" : ""}Base normativa: Ley N.° 29733 y Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS

I. DATOS DEL RESPONSABLE DEL TRATAMIENTO
- Razón Social: ${input.company.name} (RUC N.° ${input.company.ruc})
- Domicilio legal: ${input.company.address || "Lima, Perú"}
- Responsable / Contacto de Privacidad: ${input.company.dpo_name || "Administración"} (${input.company.dpo_email || input.company.email} / ${input.company.phone})

II. LÍNEA DE TIEMPO Y CUMPLIMIENTO DEL PLAZO DE 48 HORAS
- Fecha y hora de detección (Hora 0): ${input.incident.detected_at}
- Vencimiento del plazo legal de 48 h: ${input.incident.due_at}
- Estado del expediente: ${input.incident.status.toUpperCase()}

III. DESCRIPCIÓN TÉCNICA DEL EVENTO Y DATOS COMPROMETIDOS
- Incidente: ${input.incident.title}
- Severidad evaluada: ${input.incident.severity.toUpperCase()}
- Titulares potencialmente afectados: ${input.incident.affected_people} personas
- Titulares / identificadores identificados: ${input.incident.affected_sample || "[Por precisar]"}
- Criterios del art. 34.1 que se cumplen: ${declaredCriteria.join(", ") || "Ninguno declarado"}
- Categorías de datos involucrados: ${input.incident.data_categories || "Datos de contacto e identificación"}
- Detalle de los hechos: ${deAnonymizeText(sanitizedDesc, vault)}

IV. EVALUACIÓN DE IMPACTO Y MEDIDAS CORRECTIVAS EJECUTADAS
- Posibles consecuencias para los titulares: ${consequences}. [Revisar y ajustar al caso concreto]
- Medidas de contención y mitigación aplicadas: ${input.incident.measures || "[Describir las medidas adoptadas o propuestas]"}

V. COMUNICACIÓN A LOS TITULARES AFECTADOS
${requiresTitularNotification ? "[Indicar la fecha y el medio por el que se comunicó a los titulares afectados, o la fecha prevista]" : "[Indicar si se comunicó a los titulares o, si no corresponde, el motivo (art. 34.4)]"}

Firma del Responsable: _______________________________
${input.company.name} — RUC ${input.company.ruc}`;

  const affectedUsersMessageDraft = `Asunto: Aviso importante de seguridad y privacidad de datos — ${input.company.name}

Estimado(a) cliente / usuario(a):

En ${input.company.name} (RUC ${input.company.ruc}) tenemos como prioridad proteger su información personal. En cumplimiento de la Ley N.° 29733 y el Decreto Supremo N.° 016-2024-JUS, le escribimos con total transparencia para informarle sobre un incidente puntual detectado el ${new Date(input.incident.detected_at).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}:

1. ¿Qué ocurrió?: ${input.incident.title} (${input.incident.description || "se produjo una exposición involuntaria y acotada en uno de nuestros canales operativos"}).
2. ¿Qué datos estuvieron involucrados?: ${input.incident.data_categories || "[Indicar los datos involucrados]"}. [Si es cierto, indique qué datos NO se vieron afectados, por ejemplo contraseñas o tarjetas.]
3. ¿Qué hicimos?: ${input.incident.measures || "[Describir las medidas adoptadas]"}
4. Recomendación preventiva: Le sugerimos desconfiar de correos o mensajes inusuales que soliciten claves o pagos a nombre nuestro${financial ? ", cambiar sus contraseñas y revisar los movimientos de sus cuentas" : ""}.

Para cualquier consulta o ejercicio gratuito de sus derechos ARCO, nuestro responsable de privacidad (${input.company.dpo_name || "Área de Privacidad"}) está a su disposición en ${input.company.dpo_email || input.company.email}.

Atentamente,
${input.company.name}`;

  return {
    requiresAnpdNotification,
    requiresCnsdNotification,
    requiresTitularNotification,
    riskAssessmentSummary,
    immediateChecklist,
    anpdEnhancedReport,
    affectedUsersMessageDraft,
    model: AI_MODEL_ID,
  };
}

/* -------------------------------------------------------------------------- */
/*  5. AUDITOR IA DE FORMULARIOS, WHATSAPP Y TEXTOS COMERCIALES (Plan Pro)    */
/* -------------------------------------------------------------------------- */

export type AuditedTextResult = {
  score: number;
  verdict: "cumple" | "observado" | "riesgo_multa";
  findings: Array<{ severity: "alta" | "media" | "ok"; rule: string; detail: string }>;
  rewrittenCompliantText: string;
  model: string;
};

async function auditTextByRules(input: {
  company: Company;
  rawText: string;
  channelType: "whatsapp" | "formulario_web" | "sorteo_redes";
}): Promise<AuditedTextResult> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitized = anonymizeText(input.rawText, vault);
  const lower = sanitized.toLowerCase();

  const findings: AuditedTextResult["findings"] = [];
  let score = 100;

  // Palabras completas: «estructura» contiene «ruc» y «rebajas» contiene «baja».
  const mentionsRucOrIdentity =
    /\bruc\b/.test(lower) || lower.includes("{{empresa_nombre}}") || lower.includes("{{empresa_ruc}}");
  if (!mentionsRucOrIdentity) {
    score -= 25;
    findings.push({
      severity: "alta",
      rule: "Identidad del Responsable (Art. 18 Ley 29733)",
      detail: "El texto no identifica la razón social ni el RUC de tu empresa. La ANPD exige informar siempre quién recopila el dato.",
    });
  } else {
    findings.push({
      severity: "ok",
      rule: "Identidad del Responsable (Art. 18 Ley 29733)",
      detail: "Se identifica a la empresa responsable del tratamiento.",
    });
  }

  const mentionsPolicy = lower.includes("política") || lower.includes("politica") || lower.includes("/p/");
  if (!mentionsPolicy) {
    score -= 25;
    findings.push({
      severity: "alta",
      rule: "Enlace a la Política de Privacidad (Art. 18 LPDP)",
      detail: "No incluyes el enlace a tu Política de Privacidad donde se detallan los bancos de datos y plazos de conservación.",
    });
  } else {
    findings.push({
      severity: "ok",
      rule: "Enlace a la Política de Privacidad",
      detail: "Hace referencia a la Política de Privacidad.",
    });
  }

  const mentionsArco = /\b(arco|solicitud|baja|revocar|revocaci[oó]n)\b/.test(lower);
  if (!mentionsArco) {
    score -= 20;
    findings.push({
      severity: "media",
      rule: "Canal gratuito de Derechos ARCO y Revocación",
      detail: "Falta indicar dónde el cliente puede ejercer gratis sus derechos ARCO o darse de baja en cualquier momento.",
    });
  } else {
    findings.push({
      severity: "ok",
      rule: "Canal de Derechos ARCO",
      detail: "Informa sobre la posibilidad de baja o ejercicio de derechos ARCO.",
    });
  }

  // Publicidad atada a la compra/registro, o casillas marcadas por defecto.
  const bundlesPurposes =
    /al (comprar|registrarte|enviar|continuar|participar)[^.]{0,80}acept/.test(lower) ||
    /\[x\]/.test(lower) ||
    lower.includes("premarcad") ||
    lower.includes("marcada por defecto");

  if (bundlesPurposes && input.channelType !== "whatsapp") {
    score -= 25;
    findings.push({
      severity: "alta",
      rule: "Consentimiento libre y separación de finalidades (Art. 5 Ley 29733)",
      detail: "No puedes condicionar una compra o consulta a que el cliente acepte recibir publicidad. La casilla de marketing debe ser separada, opcional y sin pre-marcar.",
    });
  }

  score = Math.max(15, score);
  const verdict: AuditedTextResult["verdict"] =
    score >= 85 ? "cumple" : score >= 55 ? "observado" : "riesgo_multa";

  const appUrl = siteUrl();
  const policyUrl = `${appUrl}/p/${input.company.slug}`;
  const arcoUrl = `${appUrl}/solicitud/${input.company.slug}`;
  const contact = input.company.dpo_email || input.company.email;

  let rewrittenCompliantText = "";
  if (input.channelType === "whatsapp") {
    rewrittenCompliantText = `Hola, te saluda ${input.company.name} (RUC ${input.company.ruc}). Tus datos serán tratados para atender tu pedido o consulta conforme a nuestra Política de Privacidad (${policyUrl}).

¿Nos autorizas adicionalmente de forma voluntaria a enviarte promociones, sorteos y descuentos por WhatsApp? Responde «SÍ ACEPTO» para suscribirte en nuestro banco de datos de «Prospectos y Promociones». Puedes darte de baja o ejercer gratis tus derechos ARCO en cualquier momento en ${arcoUrl} o escribiendo a ${contact}.`;
  } else if (input.channelType === "sorteo_redes") {
    rewrittenCompliantText = `BASES DE PRIVACIDAD DEL SORTEO — ${input.company.name} (RUC ${input.company.ruc}):
Al participar, tus datos serán tratados para gestionar el sorteo y publicar al ganador conforme a nuestra Política de Privacidad (${policyUrl}).
[ ] (Opcional) Autorizo de forma libre, previa y expresa a ${input.company.name} a enviarme futuras promociones y descuentos comerciales por WhatsApp o correo. Sé que puedo revocar mi permiso o ejercer mis derechos ARCO gratis en ${arcoUrl}.`;
  } else {
    rewrittenCompliantText = `[ ] He leído la Política de Privacidad de ${input.company.name} (RUC ${input.company.ruc}) disponible en ${policyUrl} para la atención de mi compra o consulta.

[ ] (Opcional — sin pre-marcar) Autorizo de forma libre, previa, expresa, informada e inequívoca a ${input.company.name} a tratar mis datos en su banco de «Prospectos y Promociones» para enviarme ofertas y novedades comerciales. Puedo revocar mi consentimiento o ejercer gratuitamente mis derechos ARCO en ${arcoUrl} o en ${contact}.`;
  }

  return {
    score,
    verdict,
    findings,
    rewrittenCompliantText,
    model: AI_MODEL_ID,
  };
}

/* -------------------------------------------------------------------------- */
/*  6. ASESOR IA: ¿QUÉ DOCUMENTOS Y BANCOS NECESITA MI NEGOCIO? (Básico + Pro)*/
/* -------------------------------------------------------------------------- */

export type BusinessDocumentRecommendation = {
  summaryAdvice: string;
  recommendedBanks: Array<{
    name: string;
    why: string;
    legalBasisLabel: string;
  }>;
  recommendedDocs: Array<{
    tabKey: "politica" | "consentimiento" | "seguridad" | "clausulas";
    title: string;
    priority: "Obligatorio hoy" | "Importante" | "Condicional";
    whyNeeded: string;
    whereToUse: string;
    howToDoIt: string;
  }>;
  stepByStepPlan: string[];
};

async function recommendDocumentsByRules(input: {
  company: Company;
  banks: DataBank[];
  businessWayDescription: string;
}): Promise<BusinessDocumentRecommendation> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitized = anonymizeText(input.businessWayDescription, vault);
  const q = sanitized.toLowerCase();
  const sector = detectSector(input.businessWayDescription);

  const usesWhatsappOrSocial =
    q.includes("whatsapp") ||
    q.includes("instagram") ||
    q.includes("tiktok") ||
    q.includes("facebook") ||
    q.includes("redes") ||
    q.includes("chat");
  const usesWebOrEcommerce =
    q.includes("web") ||
    q.includes("tienda online") ||
    q.includes("ecommerce") ||
    q.includes("shopify") ||
    q.includes("woocommerce") ||
    q.includes("formulario");
  const sendsPromos =
    q.includes("promo") ||
    q.includes("oferta") ||
    q.includes("sorteo") ||
    q.includes("catalogo") ||
    q.includes("catálogo") ||
    q.includes("publicidad") ||
    q.includes("difusion") ||
    q.includes("difusión") ||
    q.includes("newsletter") ||
    Boolean(sector?.banks.includes("marketing"));
  const hasEmployees =
    q.includes("trabajador") ||
    q.includes("emplead") ||
    q.includes("planilla") ||
    q.includes("personal") ||
    q.includes("vendedor") ||
    q.includes("equipo");
  const hasCameras =
    q.includes("camara") ||
    q.includes("cámara") ||
    q.includes("cctv") ||
    q.includes("videovigilancia") ||
    Boolean(sector?.banks.includes("camaras"));
  const hasDeliveryOrAccountant =
    q.includes("delivery") ||
    q.includes("motorizado") ||
    q.includes("courier") ||
    q.includes("olva") ||
    q.includes("shalo") ||
    q.includes("contador") ||
    q.includes("boleta") ||
    q.includes("factura") ||
    true; // Toda MYPE con RUC usa contador o facturador electrónico
  const hasHealthOrSensitive =
    q.includes("salud") ||
    q.includes("clinic") ||
    q.includes("clínic") ||
    q.includes("dental") ||
    q.includes("odont") ||
    q.includes("pacient") ||
    q.includes("médic") ||
    q.includes("medic") ||
    q.includes("psicol");

  const recommendedBanks: BusinessDocumentRecommendation["recommendedBanks"] = [
    {
      name: hasHealthOrSensitive ? "Pacientes e historias clínicas" : "Clientes y compradores",
      why: hasHealthOrSensitive
        ? "Guardas nombres, DNI, teléfonos y datos sensibles de salud para agendar citas y atender pacientes."
        : "Pides nombre, DNI/RUC, celular o dirección para atender pedidos, entregar productos y emitir boletas o facturas en SUNAT.",
      legalBasisLabel: hasHealthOrSensitive
        ? "Consentimiento expreso y escrito (datos sensibles)"
        : "Ejecución de contrato y Obligación legal (SUNAT)",
    },
  ];

  if (sendsPromos) {
    recommendedBanks.push({
      name: "Prospectos y suscriptores de promociones (WhatsApp / Redes)",
      why: "Si guardas el número de quienes te preguntan precios por WhatsApp o Instagram para mandarles ofertas, catálogos o sorteos después, la ANPD exige declararlo como una lista separada.",
      legalBasisLabel: "Consentimiento libre y expreso («SÍ ACEPTO»)",
    });
  }

  if (hasEmployees) {
    recommendedBanks.push({
      name: "Colaboradores y trabajadores",
      why: "Manejas contratos, DNI, cuentas bancarias de haberes y descansos médicos de tu equipo.",
      legalBasisLabel: "Obligación legal laboral (PLAME / SUNAFIL)",
    });
  }

  if (hasCameras) {
    recommendedBanks.push({
      name: "Videovigilancia (Cámaras de seguridad)",
      why: "Las cámaras de tu local o almacén graban el rostro de clientes y trabajadores.",
      legalBasisLabel: "Interés legítimo (seguridad del local)",
    });
  }

  // Si se reconoce el rubro, las listas salen del catálogo de rubros.
  if (sector) {
    const ids = new Set<string>([
      ...sector.banks,
      ...(hasEmployees ? ["trabajadores"] : []),
      ...(sendsPromos ? ["marketing"] : []),
    ]);
    recommendedBanks.splice(
      0,
      recommendedBanks.length,
      ...[...ids]
        .map((id) => getBankPreset(id))
        .filter((preset) => preset !== undefined)
        .map((preset) => ({
          name: preset.name,
          why: preset.example,
          legalBasisLabel: legalBasisLabel(preset.legal_basis).split(" (")[0],
        }))
    );
  }

  const recommendedDocs: BusinessDocumentRecommendation["recommendedDocs"] = [
    {
      tabKey: "politica",
      title: "1. Política de Privacidad Pública + Enlace ARCO",
      priority: "Obligatorio hoy",
      whyNeeded:
        "El Art. 18 de la Ley 29733 obliga a informar a tus clientes quién eres (RUC), en qué bancos guardas sus datos, por cuánto tiempo y cómo pueden pedir borrarlos o verlos gratis.",
      whereToUse: usesWhatsappOrSocial
        ? `Pega tu enlace público (/p/${input.company.slug}) en la descripción de tu perfil de WhatsApp Business, en tu bio de Instagram y en tu mensaje automático de bienvenida.`
        : usesWebOrEcommerce
          ? `Coloca el enlace público (/p/${input.company.slug}) en el pie de página de tu web y junto al botón de compra o registro.`
          : `Comparte tu enlace público (/p/${input.company.slug}) en tus cotizaciones, correos y perfil de WhatsApp.`,
      howToDoIt:
        "Haz clic en la pestaña «1. Política de privacidad», presiona «Generar» y luego «Publicar enlace público».",
    },
    {
      tabKey: "consentimiento",
      title: usesWhatsappOrSocial
        ? "2. Mensaje corto de permiso para WhatsApp y Redes"
        : "2. Cláusula de consentimiento para formularios y ventas",
      priority: sendsPromos || hasHealthOrSensitive ? "Obligatorio hoy" : "Condicional",
      whyNeeded:
        "Atender una venta no te da permiso automático para enviar publicidad. Necesitas un texto corto que separe la atención del pedido del permiso opcional («SÍ ACEPTO») para promociones.",
      whereToUse: usesWhatsappOrSocial
        ? "Guárdalo en las «Respuestas rápidas» de tu WhatsApp Business (ej. atajo /privacidad) para enviarlo cuando te escriba un cliente nuevo o antes de meterlo a una lista de difusión."
        : "Debajo de tus formularios de contacto, checkout web o fichas de inscripción.",
      howToDoIt:
        "Abre la pestaña «2. Textos de consentimiento», copia la plantilla de WhatsApp/Web o pasa tu propio mensaje por el Revisor con IA.",
    },
    {
      tabKey: "seguridad",
      title: "3. Documento de Seguridad Interno",
      priority: "Obligatorio hoy",
      whyNeeded:
        "El DS 016-2024-JUS exige que todo negocio tenga por escrito quién tiene acceso al celular o computadora con datos de clientes, cómo hacen copias de respaldo y qué harán si les roban un equipo (protocolo de 48 h).",
      whereToUse:
        "NO se publica en internet. Se descarga o imprime, lo firma el representante legal y se guarda en una carpeta de la empresa para mostrarlo si la ANPD te fiscaliza.",
      howToDoIt:
        "Abre la pestaña «3. Documento de seguridad» y haz clic en «Generar».",
    },
    {
      tabKey: "clausulas",
      title:
        hasCameras && hasEmployees
          ? "4. Contratos de Confidencialidad (Personal / Contador / Courier) + Cartel de Cámaras"
          : hasCameras
            ? "4. Cartel de Videovigilancia (CCTV) + Contrato con Contador y Courier"
            : hasDeliveryOrAccountant
              ? "4. Adenda para tu Contador / Courier + Designación de Responsable"
              : "4. Cláusulas de Confidencialidad y Actas Internas",
      priority: "Importante",
      whyNeeded:
        "Porque terceras personas ven los datos de tus clientes: tu contador ve las boletas, el motorizado/courier ve direcciones y celulares" +
        (hasEmployees ? ", tus empleados atienden el WhatsApp" : "") +
        (hasCameras ? " y tus cámaras graban en el local" : "") +
        ". Si no firmas un acuerdo con ellos, tú asumes toda la multa si filtran algo.",
      whereToUse:
        (hasCameras ? "Imprime el Aviso de Videovigilancia y pégalo en la entrada de tu local. " : "") +
        "Envía la Adenda de Encargo de Tratamiento a tu contador/courier y haz firmar el acuerdo de confidencialidad a quien te ayude con las ventas.",
      howToDoIt:
        "Abre la pestaña «4. Contratos, Confidencialidad y Cartel CCTV» y genera el paquete completo con un clic.",
    },
  ];

  const stepByStepPlan = [
    `Paso 1 (5 min): Ve a «Bancos de datos → Nuevo» y declara tus ${recommendedBanks.length} listas recomendadas (${recommendedBanks.map((b) => b.name).join(", ")}).`,
    `Paso 2 (3 min): En esta misma página de «Documentos», genera los 4 documentos en orden y activa el enlace público de tu Política (/p/${input.company.slug}).`,
    usesWhatsappOrSocial
      ? "Paso 3 (2 min): Pon el enlace de tu Política en tu perfil de WhatsApp Business / Instagram y guarda el texto corto de consentimiento en tus respuestas rápidas."
      : "Paso 3 (2 min): Coloca tu enlace de Política y tu enlace de Solicitudes ARCO en el pie de tu web o correos.",
    "Paso 4 (10 min): Copia las fichas generadas en «Bancos de datos» e inscríbelas gratis (S/ 0) en el portal oficial sipdp.minjus.gob.pe.",
  ];

  const summaryAdvice = usesWhatsappOrSocial
    ? `Para un negocio que atiende y vende por WhatsApp o redes sociales como ${input.company.name}, el mayor riesgo de multa ante la ANPD es atender consultas en el chat y luego mandar promociones sin haber mostrado la Política de Privacidad ni haber pedido el «SÍ ACEPTO». Con los documentos de abajo quedas 100 % cubierto.`
    : `Según la forma en que opera ${input.company.name}, necesitas cubrir dos frentes: lo que ven tus clientes por fuera (Política de Privacidad y textos de permiso) y tu respaldo interno ante una inspección de la ANPD (Bancos inscritos en el SIPDP, Documento de Seguridad y acuerdos con quienes manejan tus datos).`;

  return {
    summaryAdvice,
    recommendedBanks,
    recommendedDocs,
    stepByStepPlan,
  };
}

/* -------------------------------------------------------------------------- */
/*  Versiones con modelo de lenguaje (con respaldo en las reglas de arriba)    */
/* -------------------------------------------------------------------------- */

/** Pide al modelo un objeto JSON. Devuelve null si no hay modelo o no es JSON válido. */
async function callModelJson(system: string, user: string): Promise<Record<string, unknown> | null> {
  const text = await callLlm({
    system: `${system}

Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código.`,
    messages: [{ role: "user", content: untrusted(user) }],
  });
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const textList = (value: unknown, max: number) =>
  Array.isArray(value) ? value.filter(isText).slice(0, max) : [];

const plain = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Acepta variaciones del modelo («Sí», «WhatsApp Business», «ejecución de contrato»). */
function pickOption(value: unknown, options: string[]): string | undefined {
  const v = plain(value).replace(/\s+/g, "_");
  return (
    options.find((option) => plain(option).replace(/\s+/g, "_") === v) ??
    options.find((option) => v.includes(plain(option).replace(/\s+/g, "_")))
  );
}

const LEGAL_BASES = ["consentimiento", "ejecucion_contrato", "obligacion_legal", "interes_legitimo", "interes_publico"];
const BANK_CHANNELS = ["Web", "WhatsApp", "Correo electrónico", "Presencial", "Teléfono", "Aplicación móvil"];

export async function generateBankFieldsWithAi(input: {
  company: Company;
  rawDescription: string;
}): Promise<GeneratedBankSuggestion> {
  const vault = createAnonymizationVault({ company: input.company });
  const sanitized = anonymizeText(input.rawDescription, vault);
  const json = await callModelJson(
    `Eres experto en la Ley N.° 29733 del Perú. A partir de la descripción, completa la ficha de UN banco de datos personales para inscribirlo en el SIPDP.
Campos: name (nombre corto del banco), purpose (finalidades), data_categories (datos que contiene), legal_basis (uno de: ${LEGAL_BASES.join(", ")}), channel (uno de: ${BANK_CHANNELS.join(", ")}), retention (plazo de conservación con su fundamento), transfers ("si" si usa servicios con servidores fuera del Perú, si no "no"), recipients (destinatarios o encargados), aiWarnings (hasta 3 advertencias legales breves; datos sensibles, menores, consentimiento por escrito, etc.).
Escribe en español claro. No inventes normas ni plazos.
${PERU_LEGAL_RAG}`,
    sanitized
  );
  // El modelo a veces devuelve listas en vez de texto: se unen con comas.
  const field = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter(isText)
          .map((item) => item.trim().replace(/[.;]+$/, ""))
          .join(", ")
      : isText(value)
        ? value
        : "";
  const legalBasis = pickOption(json?.legal_basis, LEGAL_BASES);
  const channel = pickOption(json?.channel, BANK_CHANNELS) ?? "Web";
  const transfers = ["si", "yes", "true"].includes(plain(json?.transfers)) ? "si" : plain(json?.transfers) === "no" || json?.transfers === false ? "no" : undefined;
  if (
    json &&
    [json.name, json.purpose, json.data_categories, json.retention, json.recipients].every((v) => field(v)) &&
    legalBasis &&
    transfers
  ) {
    const clean = (value: unknown) => deAnonymizeText(String(value), vault);
    return {
      name: clean(field(json.name)),
      purpose: clean(field(json.purpose)),
      data_categories: clean(field(json.data_categories)),
      legal_basis: legalBasis,
      channel,
      retention: clean(field(json.retention)),
      transfers,
      recipients: clean(field(json.recipients)),
      aiWarnings: textList(json.aiWarnings, 3).map(clean),
      model: AI_MODEL_ID,
    };
  }
  if (json) console.warn("[ai] Ficha de banco del modelo descartada por formato:", JSON.stringify(json).slice(0, 300));
  return generateBankFieldsByRules(input);
}

const AUDIT_CHANNELS: Record<string, string> = {
  whatsapp: "mensaje de WhatsApp",
  formulario_web: "formulario web",
  sorteo_redes: "bases de un sorteo en redes sociales",
};

export async function auditMarketingOrFormTextWithAi(input: {
  company: Company;
  rawText: string;
  channelType: "whatsapp" | "formulario_web" | "sorteo_redes";
}): Promise<AuditedTextResult> {
  // El texto corregido se arma siempre con plantilla (enlaces y datos reales).
  const rules = await auditTextByRules(input);
  const vault = createAnonymizationVault({ company: input.company });
  const json = await callModelJson(
    `Eres auditor de cumplimiento de la Ley N.° 29733 del Perú. Revisa si el texto (${AUDIT_CHANNELS[input.channelType]}) cumple el deber de información (art. 18: identidad del responsable, finalidad, dónde ejercer derechos, enlace a la política) y las reglas del consentimiento para publicidad (libre, previo, expreso, informado; separado de la compra; sin casillas premarcadas).
Devuelve: score (0-100), verdict ("cumple" si score>=85, "observado" si >=55, si no "riesgo_multa"), findings (lista de {severity: "alta"|"media"|"ok", rule, detail}, máximo 6, incluye también lo que sí cumple).
El nombre de la empresa puede aparecer como {{EMPRESA_NOMBRE}}: eso cuenta como identificación.
${PERU_LEGAL_RAG}`,
    anonymizeText(input.rawText, vault)
  );
  const score = Number(json?.score);
  const findings = Array.isArray(json?.findings)
    ? (json.findings as Array<Record<string, unknown>>).filter(
        (f) => f && ["alta", "media", "ok"].includes(String(f.severity)) && isText(f.rule) && isText(f.detail)
      )
    : [];
  if (json && Number.isFinite(score) && findings.length > 0) {
    const bounded = Math.max(0, Math.min(100, Math.round(score)));
    return {
      ...rules,
      score: bounded,
      verdict: bounded >= 85 ? "cumple" : bounded >= 55 ? "observado" : "riesgo_multa",
      findings: findings.slice(0, 6).map((f) => ({
        severity: f.severity as "alta" | "media" | "ok",
        rule: deAnonymizeText(String(f.rule), vault),
        detail: deAnonymizeText(String(f.detail), vault),
      })),
    };
  }
  return rules;
}

export async function recommendDocumentsForBusinessWithAi(input: {
  company: Company;
  banks: DataBank[];
  businessWayDescription: string;
}): Promise<BusinessDocumentRecommendation> {
  // Los documentos se mapean a las pestañas de la app; eso queda con reglas.
  const rules = await recommendDocumentsByRules(input);
  const vault = createAnonymizationVault({ company: input.company });
  const json = await callModelJson(
    `Eres asesor de la Ley N.° 29733 del Perú para micro y pequeñas empresas. Según cómo opera el negocio descrito, indica:
- summaryAdvice: 2 o 3 frases con el riesgo principal y qué priorizar.
- recommendedBanks: lista de {name, why, legalBasisLabel} con los bancos de datos que probablemente debe declarar (solo los que apliquen).
- stepByStepPlan: 3 o 4 pasos concretos y cortos.
Tipos de bancos habituales:
${BANK_CATALOG}
${PERU_LEGAL_RAG}`,
    anonymizeText(input.businessWayDescription, vault)
  );
  const banks = Array.isArray(json?.recommendedBanks)
    ? (json.recommendedBanks as Array<Record<string, unknown>>).filter(
        (b) => b && isText(b.name) && isText(b.why) && isText(b.legalBasisLabel)
      )
    : [];
  const plan = textList(json?.stepByStepPlan, 5);
  if (json && isText(json.summaryAdvice) && banks.length > 0 && plan.length > 0) {
    const clean = (value: unknown) => deAnonymizeText(String(value), vault);
    return {
      ...rules,
      summaryAdvice: clean(json.summaryAdvice),
      recommendedBanks: banks.slice(0, 8).map((b) => ({
        name: clean(b.name),
        why: clean(b.why),
        legalBasisLabel: clean(b.legalBasisLabel),
      })),
      stepByStepPlan: plan.map(clean),
    };
  }
  return rules;
}
