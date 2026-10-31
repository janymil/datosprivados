"use server";

import { requireActiveSession } from "@/lib/auth";
import { getIncident, getRequest, listBanks, listDocuments, listIncidents, listRequests, listProviders, listEvidence } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
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

  return runAnonymizedLegalChat({
    company,
    banks,
    requests,
    incidents,
    complianceScore: compliance.score,
    userMessage: userMessage.slice(0, 4000),
    history: history.filter((m) => m.role === "user" || m.role === "assistant"),
  });
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
  const data = await analyzeAndDraftArcoWithAi({ company, request, banks });
  return { ok: true, data };
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
  const data = await generateBankFieldsWithAi({ company, rawDescription });
  return { ok: true, data };
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
  const data = await evaluateIncidentWithAi({ company, incident });
  return { ok: true, data };
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
  const data = await auditMarketingOrFormTextWithAi({
    company,
    rawText: input.rawText,
    channelType: input.channelType,
  });
  return { ok: true, data };
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
  const data = await recommendDocumentsForBusinessWithAi({
    company,
    banks,
    businessWayDescription: trimmed,
  });
  return { ok: true, data };
}

