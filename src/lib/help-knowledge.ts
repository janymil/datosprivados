import "server-only";

import { GLOSSARY } from "./glossary";
import {
  FAQ,
  JOURNEY,
  SECTIONS,
  TOPICS,
  buildSearchDocs,
  searchDocs,
  topicBySlug,
  topicToPlainText,
  type SearchDoc,
} from "./help-content";

/**
 * Conocimiento de la app para el asistente de IA.
 *
 * Sale del mismo contenido que la página de Ayuda (`help-content.ts`), así que
 * lo que lee el usuario y lo que sabe el asistente no puede divergir. Siempre
 * va un mapa compacto de toda la app; además, los artículos, preguntas y
 * términos más relacionados con la pregunta van completos.
 */

let cachedDocs: SearchDoc[] | undefined;
function docs() {
  return (cachedDocs ??= buildSearchDocs());
}

/** Mapa de toda la app: qué hay, dónde está y qué artículo lo explica. */
export function appMap(): string {
  const bySection = SECTIONS.map((section) => {
    const lines = TOPICS.filter((topic) => topic.section === section.id).map(
      (topic) =>
        `  - ${topic.title} → artículo [${topic.title}](/app/ayuda/${topic.slug})${topic.route ? `; pantalla [${topic.route.label.replace(/^Ir a |^Abrir /, "")}](${topic.route.href})` : ""}: ${topic.summary}`
    );
    return `• ${section.title}\n${lines.join("\n")}`;
  });
  const journey = JOURNEY.map((step, index) => `${index + 1}. ${step.title} (~${step.minutes} min)`).join("\n");
  return `${bySection.join("\n")}\n\nRUTA RECOMENDADA DE LA A A LA Z:\n${journey}`;
}

const MAX_CHARS = 9000;

/** Texto de ayuda más relevante para la pregunta (y el contexto reciente). */
export function relevantHelp(message: string, history: Array<{ role: string; content: string }> = []): string {
  const recentUser = history
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.content)
    .join(" ");
  const hits = searchDocs(docs(), `${message} ${message} ${recentUser}`.trim(), 10).filter((hit) => hit.score >= 8);

  const parts: string[] = [];
  let used = 0;
  const take = (text: string) => {
    if (used + text.length > MAX_CHARS) return false;
    parts.push(text);
    used += text.length;
    return true;
  };

  let articles = 0;
  for (const hit of hits) {
    if (hit.doc.kind === "articulo" && articles < 3) {
      const topic = topicBySlug(hit.doc.id.slice("topic:".length));
      if (topic && take(`### ARTÍCULO «${topic.title}» (/app/ayuda/${topic.slug})\n${topicToPlainText(topic)}`)) articles += 1;
    } else if (hit.doc.kind === "pregunta") {
      const faq = FAQ[Number(hit.doc.id.slice("faq:".length))];
      if (faq) take(`### PREGUNTA FRECUENTE: ${faq.q}\n${faq.a}${faq.topic ? ` (más en /app/ayuda/${faq.topic})` : ""}`);
    } else if (hit.doc.kind === "glosario") {
      const entry = GLOSSARY[hit.doc.id.slice("glosario:".length) as keyof typeof GLOSSARY];
      if (entry) take(`### TÉRMINO «${entry.term}»: ${entry.plain} Ejemplo: ${entry.example}`);
    }
  }
  return parts.join("\n\n");
}

/** Bloque completo para el prompt del sistema. */
export function appKnowledgeForAi(message: string, history: Array<{ role: string; content: string }> = []): string {
  const relevant = relevantHelp(message, history);
  return `GUÍA DE LA APP DATOSPRIVADOS (es la misma que lee el usuario en el Centro de ayuda, /app/ayuda):
Menú del panel: Mi plan · Bancos de datos · Herramientas · Documentos · Evidencias · Solicitudes ARCO · Incidentes · Centro de ayuda · Asistente legal · Empresa · Ajustes.

${appMap()}

${relevant ? `CONTENIDO MÁS RELACIONADO CON LA PREGUNTA (úsalo como fuente; no inventes pantallas ni botones que no estén aquí):\n${relevant}` : "No hay un artículo específico para esta pregunta: si trata de la app, apóyate en el mapa y sugiere abrir el Centro de ayuda."}`;
}

/**
 * Respuesta del modo básico (sin modelo) a preguntas sobre cómo usar la app o a
 * temas que cubre la Ayuda. Devuelve `undefined` si no hay una coincidencia clara.
 */
export function helpAnswerWithoutLlm(message: string): string | undefined {
  const [top, ...rest] = searchDocs(docs(), message, 4).filter((hit) => hit.score >= 10);
  if (!top) return undefined;

  const others = rest
    .filter((hit) => hit.doc.kind === "articulo" && hit.doc.id !== top.doc.id)
    .slice(0, 2)
    .map((hit) => `- [${hit.doc.title}](${hit.doc.href})`);
  const alsoRead = others.length ? `\n\n**También te puede servir:**\n${others.join("\n")}` : "";

  if (top.doc.kind === "articulo") {
    const topic = topicBySlug(top.doc.id.slice("topic:".length));
    if (!topic) return undefined;
    const go = topic.route ? `\n**Ir a la pantalla:** [${topic.route.label}](${topic.route.href})` : "";
    return `### ${topic.title}\n\n${topic.tldr}\n\n**Léelo paso a paso:** [${topic.title}](/app/ayuda/${topic.slug})${go}${alsoRead}`;
  }
  if (top.doc.kind === "pregunta") {
    const route = topicBySlug(top.doc.href.replace("/app/ayuda/", ""))?.route;
    const go = route ? `\n**Ir a la pantalla:** [${route.label}](${route.href})` : "";
    return `### ${top.doc.title}\n\n${top.doc.snippet}\n\n[Ver la explicación completa](${top.doc.href})${go}${alsoRead}`;
  }
  const entry = GLOSSARY[top.doc.id.slice("glosario:".length) as keyof typeof GLOSSARY];
  return entry ? `### ${entry.term}\n\n${entry.plain}\n\n**Ejemplo:** ${entry.example}${alsoRead}` : undefined;
}
