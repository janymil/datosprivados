import * as aiPolicy from "@/lib/ai-policy";
import { buildTailoredArcoDraft, PERU_LEGAL_RAG } from "@/lib/ai";
import * as bankPresets from "@/lib/bank-presets";
import { computeCompliance } from "@/lib/compliance";
import type { Incident } from "@/lib/db";
import * as fines from "@/lib/fines";
import * as glossary from "@/lib/glossary";
import * as guides from "@/lib/guides";
import * as help from "@/lib/help-content";
import * as tips from "@/lib/help-tips";
import * as incidentCriteria from "@/lib/incident-criteria";
import { buildAuthorityNotice } from "@/lib/incident-notice";
import { answerWithoutLlm } from "@/lib/legal-faq";
import * as platformLegal from "@/lib/platform-legal";
import { FAMILIES, SALES_BANDS } from "@/lib/sector-legal";
import * as securityChecks from "@/lib/security-checks";
import { representativeFixtures } from "./fixtures";
import { withFrozenWorld } from "./render-all";

/**
 * Todos los textos legales fuera de los 14 documentos, como pares fuente → texto.
 * Los datos exportados se recorren enteros (cada cadena y cada número con su ruta);
 * los textos que se arman al vuelo se renderizan con entradas fijas.
 */
export type ModuleText = { source: string; text: string };

/** Recorre un valor exportado y guarda cada hoja (cadena, número, booleano) con su ruta. */
function walk(prefix: string, value: unknown, out: ModuleText[]): void {
  if (typeof value === "string") out.push({ source: prefix, text: value });
  else if (typeof value === "number" || typeof value === "boolean") out.push({ source: prefix, text: String(value) });
  else if (Array.isArray(value)) value.forEach((item, i) => walk(`${prefix}[${i}]`, item, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(`${prefix}.${k}`, v, out);
}

/** Exportaciones de datos de un módulo (las funciones se ignoran). */
function walkModule(name: string, mod: Record<string, unknown>, out: ModuleText[]): void {
  for (const [key, value] of Object.entries(mod)) if (typeof value !== "function") walk(`${name}:${key}`, value, out);
}

const FAQ_QUESTIONS = [
  "¿me ayudas a redactar una carta?",
  "nos hackearon el correo, ¿qué hago?",
  "¿qué plazo tengo para responder una solicitud arco?",
  "¿puedo mandar promociones por whatsapp?",
  "¿necesito un oficial de datos?",
  "¿de cuánto es la multa en uit?",
  "tengo cámaras de video en la tienda",
  "manejo datos de salud de pacientes",
  "uso servidores en la nube de google",
  "¿cómo inscribo mi banco en el sipdp?",
  "¿qué debe decir mi política de privacidad?",
  "¿cómo va mi expediente?",
  "soy una clínica dental, ¿qué necesito?",
  "hola",
];

const INCIDENTS: Array<Pick<Incident, "title" | "description" | "severity" | "detected_at" | "due_at" | "data_categories" | "affected_people" | "affected_sample" | "criteria" | "measures">> = [
  {
    title: "Robo de laptop",
    description: "Se robó una laptop con la base de clientes.",
    severity: "grave",
    detected_at: "2026-11-10T14:00:00.000Z",
    due_at: "2026-11-12T14:00:00.000Z",
    data_categories: "Nombre, DNI, teléfono",
    affected_people: 1200,
    affected_sample: "",
    criteria: '["sensibles","volumen"]',
    measures: "Bloqueo remoto y cambio de contraseñas.",
  },
  {
    title: "Correo enviado a otro destinatario",
    description: "Se envió una planilla a un proveedor por error.",
    severity: "leve",
    detected_at: "2026-11-10T14:00:00.000Z",
    due_at: "2026-11-12T14:00:00.000Z",
    data_categories: "Nombre, sueldo",
    affected_people: 8,
    affected_sample: "",
    criteria: "[]",
    measures: "",
  },
];

export function legalModuleTexts(): ModuleText[] {
  return withFrozenWorld(() => {
    const out: ModuleText[] = [];
    walkModule("guides", guides, out);
    walkModule("help", help, out);
    help.TOPICS.forEach((topic) => out.push({ source: `help:topicToPlainText:${topic.slug}`, text: help.topicToPlainText(topic) }));
    walkModule("fines", fines, out);
    walkModule("incident-criteria", incidentCriteria, out);
    walkModule("security-checks", securityChecks, out);
    walkModule("glossary", glossary, out);
    walkModule("platform-legal", platformLegal, out);
    walkModule("tips", tips, out);
    walkModule("bank-presets", bankPresets, out);
    walkModule("ai-policy", aiPolicy, out);
    walk("sector-legal:FAMILIES", FAMILIES, out);
    walk("sector-legal:SALES_BANDS", SALES_BANDS, out);
    out.push({ source: "ai:PERU_LEGAL_RAG", text: PERU_LEGAL_RAG });

    const fixture = representativeFixtures()[0];
    for (const right of ["informacion", "acceso", "rectificacion", "cancelacion", "oposicion"] as const) {
      out.push({
        source: `ai:arco-draft:${right}`,
        text: buildTailoredArcoDraft({
          detectedRight: right,
          declaredType: right,
          sanitizedDescription: "Quiero saber qué datos tienen de mí",
          ticket: "ARCO-2026-0001",
          receivedAt: "13/11/2026",
          banks: fixture.banks,
        }),
      });
    }
    FAQ_QUESTIONS.forEach((message, i) =>
      out.push({
        source: `faq:${i}`,
        text: answerWithoutLlm({ message, company: fixture.company, banks: fixture.banks, openRequests: [], openIncidents: [], complianceScore: 40 }),
      })
    );
    INCIDENTS.forEach((incident, i) =>
      out.push({ source: `incident-notice:${i}`, text: buildAuthorityNotice({ company: fixture.company, incident, now: new Date("2026-11-11T10:00:00.000Z") }) })
    );
    for (const f of representativeFixtures()) {
      walk(`compliance:${f.id}`, computeCompliance({ company: f.company, banks: f.banks, requests: [], incidents: [], documents: [], providers: f.providers }), out);
    }
    return out;
  });
}
