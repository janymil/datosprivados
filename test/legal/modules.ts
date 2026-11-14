import { legalDataModuleTexts, walkTexts } from "@/legal/index-texts";
import { buildTailoredArcoDraft } from "@/lib/ai";
import { computeCompliance } from "@/lib/compliance";
import type { Incident } from "@/lib/db";
import * as help from "@/lib/help-content";
import { buildAuthorityNotice } from "@/lib/incident-notice";
import { answerWithoutLlm } from "@/lib/legal-faq";
import { representativeFixtures } from "./fixtures";
import { withFrozenWorld } from "./render-all";

/**
 * Todos los textos legales fuera de los 14 documentos, como pares fuente → texto.
 * Los datos exportados se recorren enteros (cada cadena y cada número con su ruta);
 * los textos que se arman al vuelo se renderizan con entradas fijas.
 */
export type ModuleText = { source: string; text: string };

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
    out.push(...legalDataModuleTexts(true));
    help.TOPICS.forEach((topic) => out.push({ source: `help:topicToPlainText:${topic.slug}`, text: help.topicToPlainText(topic) }));

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
      walkTexts(`compliance:${f.id}`, computeCompliance({ company: f.company, banks: f.banks, requests: [], incidents: [], documents: [], providers: f.providers }), out, true);
    }
    return out;
  });
}
