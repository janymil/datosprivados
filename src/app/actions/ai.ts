"use server";

import { requireActiveSession } from "@/lib/auth";
import { getIncident, getRequest, listBanks, listDocuments, listIncidents, listRequests, listProviders, listEvidence } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
import { aiGate, withAiContext, type AiBlock } from "@/lib/ai-guard";
import type { Company } from "@/lib/db";
import {
  analyzeAndDraftArcoWithAi,
  auditMarketingOrFormTextWithAi,
  evaluateIncidentWithAi,
  generateBankFieldsWithAi,
  recommendDocumentsForBusinessWithAi,
  runAnonymizedLegalChat,
  type ArcoAiAnalysis,
  type AuditedTextResult,
  type BusinessDocumentRecommendation,
  type ChatAssistantResult,
  type GeneratedBankSuggestion,
  type IncidentAiTriage,
} from "@/lib/ai";

const DEMO_AI_MESSAGE =
  "La IA está desactivada en la cuenta de demostración. Crea tu cuenta para usarla.";

/** Bloqueos que el usuario debe ver como mensaje (límite alcanzado, falta consentimiento). El resto cae en modo básico. */
const VISIBLE_BLOCKS: AiBlock["code"][] = ["quota", "rate", "consent"];

/**
 * Aplica los controles de IA (interruptor, presupuesto, consentimiento, cuota y
 * límite por minuto) y ejecuta `run` asociando el uso a la empresa.
 * Si hay un bloqueo visible devuelve su mensaje sin llamar al modelo; si el
 * bloqueo es interno (apagado, presupuesto) corre `run` con la IA desactivada
 * para que responda el modo básico.
 */
async function guardedAi<T>(
  company: Company,
  feature: string,
  run: () => Promise<T>
): Promise<{ blocked: AiBlock; value?: undefined } | { blocked: null; value: T } | { blocked: AiBlock; value: T }> {
  const block = aiGate(company);
  if (block && VISIBLE_BLOCKS.includes(block.code)) return { blocked: block };
  const value = await withAiContext({ companyId: company.id, feature, blocked: Boolean(block) }, run);
  return block ? { blocked: block, value } : { blocked: null, value };
}

export async function askAiAssistantAction(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<ChatAssistantResult> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { answer: DEMO_AI_MESSAGE, mode: "basico", sanitizedPromptSentToAi: "", redactedItems: [], model: "modo-basico" };
  }
  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const compliance = computeCompliance({
    company,
    banks,
    requests,
    incidents,
    documents,
    providers: listProviders(company.id),
    evidence: listEvidence(company.id),
  });

  const input = {
    company,
    banks,
    requests,
    incidents,
    complianceScore: compliance.score,
    userMessage: userMessage.slice(0, 4000),
    history: history.filter((m) => m.role === "user" || m.role === "assistant"),
  };
  const result = await guardedAi(company, "chat", () => runAnonymizedLegalChat(input));
  if (result.value) return result.value;
  // Bloqueo visible: se responde igual con el modo básico y se explica por qué no hay IA.
  const basic = await withAiContext({ companyId: company.id, feature: "chat", blocked: true }, () => runAnonymizedLegalChat(input));
  return { ...basic, answer: `> ${result.blocked.message}\n\n${basic.answer}` };
}

export async function runArcoAiCopilotAction(
  requestId: string
): Promise<{ ok: true; data: ArcoAiAnalysis } | { ok: false; error: string }> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { ok: false, error: DEMO_AI_MESSAGE };
  }
  if (company.plan !== "pro") {
    return {
      ok: false,
      error: "El Copiloto IA de Solicitudes ARCO está incluido en el Plan Pro.",
    };
  }
  const request = getRequest(company.id, requestId);
  if (!request) {
    return { ok: false, error: "Solicitud ARCO no encontrada." };
  }
  const banks = listBanks(company.id);
  const result = await guardedAi(company, "arco", () => analyzeAndDraftArcoWithAi({ company, request, banks }));
  if (!result.value) return { ok: false, error: result.blocked.message };
  return { ok: true, data: result.value };
}

export async function runBankAiWizardAction(
  rawDescription: string
): Promise<{ ok: true; data: GeneratedBankSuggestion } | { ok: false; error: string }> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { ok: false, error: DEMO_AI_MESSAGE };
  }
  if (company.plan !== "pro") {
    return {
      ok: false,
      error: "El Autocompletado Inteligente SIPDP con IA es exclusivo del Plan Pro.",
    };
  }
  const result = await guardedAi(company, "banco", () => generateBankFieldsWithAi({ company, rawDescription: rawDescription.slice(0, 4000) }));
  if (!result.value) return { ok: false, error: result.blocked.message };
  return { ok: true, data: result.value };
}

export async function runIncidentAiTriageAction(
  incidentId: string
): Promise<{ ok: true; data: IncidentAiTriage } | { ok: false; error: string }> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { ok: false, error: DEMO_AI_MESSAGE };
  }
  if (company.plan !== "pro") {
    return {
      ok: false,
      error: "El Evaluador IA de Incidentes 48 h está disponible en el Plan Pro.",
    };
  }
  const incident = getIncident(company.id, incidentId);
  if (!incident) {
    return { ok: false, error: "Incidente no encontrado." };
  }
  const result = await guardedAi(company, "incidente", () => evaluateIncidentWithAi({ company, incident }));
  if (!result.value) return { ok: false, error: result.blocked.message };
  return { ok: true, data: result.value };
}

export async function runTextComplianceAuditAction(input: {
  rawText: string;
  channelType: "whatsapp" | "formulario_web" | "sorteo_redes";
}): Promise<{ ok: true; data: AuditedTextResult } | { ok: false; error: string }> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { ok: false, error: DEMO_AI_MESSAGE };
  }
  if (company.plan !== "pro") {
    return {
      ok: false,
      error: "El Auditor IA de Formularios y WhatsApp es exclusivo del Plan Pro.",
    };
  }
  const rawText = input.rawText.slice(0, 8000);
  const result = await guardedAi(company, "auditor", () =>
    auditMarketingOrFormTextWithAi({ company, rawText, channelType: input.channelType })
  );
  if (!result.value) return { ok: false, error: result.blocked.message };
  return { ok: true, data: result.value };
}

export async function runBusinessDocumentAdvisorAction(
  businessWayDescription: string
): Promise<{ ok: true; data: BusinessDocumentRecommendation } | { ok: false; error: string }> {
  const { company } = await requireActiveSession({ allowDemo: true });
  if (company.billing_status === "demo") {
    return { ok: false, error: DEMO_AI_MESSAGE };
  }
  const trimmed = businessWayDescription.trim();
  if (!trimmed) {
    return { ok: false, error: "Cuéntanos brevemente cómo vendes o atiendes a tus clientes." };
  }
  const banks = listBanks(company.id);
  const description = trimmed.slice(0, 4000);
  const result = await guardedAi(company, "asesor", () =>
    recommendDocumentsForBusinessWithAi({ company, banks, businessWayDescription: description })
  );
  if (!result.value) return { ok: false, error: result.blocked.message };
  return { ok: true, data: result.value };
}

