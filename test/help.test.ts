import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BANK_PRESETS } from "@/lib/bank-presets";
import { computeCompliance } from "@/lib/compliance";
import { DOCUMENT_TABS } from "@/lib/document-catalog";
import { GLOSSARY } from "@/lib/glossary";
import {
  BASE_NEEDS,
  DOC_LABELS,
  FAQ,
  JOURNEY,
  NEEDS,
  SCREENS,
  SECTIONS,
  TOPICS,
  buildSearchDocs,
  searchDocs,
  topicBySlug,
  topicToPlainText,
} from "@/lib/help-content";
import { TIPS } from "@/lib/help-tips";
import { appKnowledgeForAi, appMap, helpAnswerWithoutLlm } from "@/lib/help-knowledge";
import { answerWithoutLlm } from "@/lib/legal-faq";
import { PLANS } from "@/lib/plans";
import { getCompany, makeActiveCompany } from "./helpers/db";

const APP_DIR = path.join(process.cwd(), "src", "app", "app");

/** ¿Existe una página del panel para esa ruta (`/app/bancos?x=1` → `app/bancos/page.tsx`)? */
function pageExists(href: string) {
  const clean = href.split(/[?#]/)[0].replace(/^\/app\/?/, "");
  return fs.existsSync(path.join(APP_DIR, clean, "page.tsx")) || /^ayuda\/[a-z-]+$/.test(clean);
}

describe("contenido de la ayuda", () => {
  it("los artículos tienen identificador único y todos los datos", () => {
    const slugs = TOPICS.map((topic) => topic.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const topic of TOPICS) {
      expect(topic.title.length, topic.slug).toBeGreaterThan(5);
      expect(topic.tldr.length, topic.slug).toBeGreaterThan(40);
      expect(topic.blocks.length, topic.slug).toBeGreaterThan(1);
      expect(SECTIONS.map((s) => s.id), topic.slug).toContain(topic.section);
    }
  });

  it("los enlaces entre artículos, rutas y tooltips apuntan a algo que existe", () => {
    for (const topic of TOPICS) {
      for (const slug of topic.related) expect(topicBySlug(slug), `${topic.slug} → ${slug}`).toBeDefined();
      if (topic.route) expect(pageExists(topic.route.href), `${topic.slug} → ${topic.route.href}`).toBe(true);
    }
    for (const step of JOURNEY) {
      expect(topicBySlug(step.topic), step.id).toBeDefined();
      expect(pageExists(step.href), `${step.id} → ${step.href}`).toBe(true);
    }
    for (const screen of SCREENS) {
      expect(topicBySlug(screen.topic), screen.label).toBeDefined();
      expect(pageExists(screen.href), screen.href).toBe(true);
    }
    for (const faq of FAQ) if (faq.topic) expect(topicBySlug(faq.topic), faq.q).toBeDefined();
    for (const [key, tip] of Object.entries(TIPS)) {
      if ("topic" in tip && tip.topic) expect(topicBySlug(tip.topic), `tip ${key}`).toBeDefined();
    }
  });

  it("cada pantalla del menú tiene su guía en el mapa", () => {
    const nav = fs.readFileSync(path.join(process.cwd(), "src", "components", "app-nav.tsx"), "utf8");
    const hrefs = [...nav.matchAll(/href: "(\/app[^"]*)"/g)].map((match) => match[1]);
    expect(hrefs.length).toBeGreaterThan(8);
    expect(SCREENS.map((screen) => screen.href).sort()).toEqual([...hrefs].sort());
  });

  it("los pasos que se marcan solos usan claves reales del puntaje", () => {
    const { companyId } = makeActiveCompany();
    const keys = computeCompliance({ company: getCompany(companyId), banks: [], requests: [], incidents: [], documents: [] }).items.map((item) => item.key);
    for (const step of JOURNEY) if (step.doneKey) expect(keys, step.id).toContain(step.doneKey);
    // Ningún paso del puntaje queda sin su paso en la ruta.
    for (const key of keys) expect(JOURNEY.some((step) => step.doneKey === key), key).toBe(true);
  });

  it("documenta los 14 documentos y los usa bien en «¿Qué necesita mi negocio?»", () => {
    const catalog = topicToPlainText(topicBySlug("catalogo-documentos")!).toLowerCase();
    for (const tab of DOCUMENT_TABS) {
      expect(DOC_LABELS[tab.key], tab.key).toBeDefined();
      expect(catalog, tab.key).toContain(tab.label.toLowerCase().split(" (")[0].split(" y ")[0]);
    }
    const presetIds = BANK_PRESETS.map((preset) => preset.id as string);
    for (const need of [...NEEDS, BASE_NEEDS]) {
      for (const key of need.docs) expect(DOCUMENT_TABS.some((tab) => tab.key === key), key).toBe(true);
      for (const id of need.banks) expect(presetIds, id).toContain(id);
    }
  });

  it("los precios y cuotas coinciden con los planes reales", () => {
    const text = topicToPlainText(topicBySlug("plan-y-pagos")!) + topicToPlainText(topicBySlug("asistente-ia")!);
    for (const plan of Object.values(PLANS)) {
      expect(text, plan.id).toContain(`S/ ${plan.prices.monthly}`);
      expect(text, plan.id).toContain(`S/ ${plan.prices.yearly}`);
      expect(text, plan.id).toContain(String(plan.aiMonthlyQuota));
    }
  });
});

describe("buscador de la ayuda", () => {
  const docs = buildSearchDocs();

  it("indexa artículos, preguntas y glosario", () => {
    expect(docs.filter((d) => d.kind === "articulo")).toHaveLength(TOPICS.length);
    expect(docs.filter((d) => d.kind === "pregunta")).toHaveLength(FAQ.length);
    expect(docs.filter((d) => d.kind === "glosario")).toHaveLength(Object.keys(GLOSSARY).length);
  });

  it.each([
    ["plazo para responder una solicitud arco", "/app/ayuda/arco"],
    ["perdi mi laptop con datos", "/app/ayuda/incidentes"],
    ["camaras de seguridad", "/app/ayuda/casos-especiales"],
    ["como inscribo en el sipdp", "/app/ayuda/inscripcion-sipdp"],
    ["transferencia al extranjero google", "/app/ayuda/herramientas"],
    ["cancelar suscripcion", "/app/ayuda/plan-y-pagos"],
  ])("«%s» lleva a %s", (query, href) => {
    const hits = searchDocs(docs, query, 5);
    expect(hits.some((hit) => hit.doc.href === href), JSON.stringify(hits.map((h) => h.doc.href))).toBe(true);
  });

  it("ignora tildes y mayúsculas, y no inventa resultados", () => {
    expect(searchDocs(docs, "CÁMARAS").length).toBeGreaterThan(0);
    expect(searchDocs(docs, "qwertyzxcv")).toHaveLength(0);
    expect(searchDocs(docs, "   ")).toHaveLength(0);
  });
});

describe("conocimiento del asistente de IA", () => {
  it("el mapa lista todos los artículos de la ayuda", () => {
    const map = appMap();
    for (const topic of TOPICS) expect(map, topic.slug).toContain(`/app/ayuda/${topic.slug}`);
  });

  it("incluye el artículo relacionado con la pregunta y respeta un tope de tamaño", () => {
    const knowledge = appKnowledgeForAi("¿Cómo inscribo mi banco de datos en el SIPDP?");
    expect(knowledge).toContain("ARTÍCULO «Inscribir tus bancos en el SIPDP (gratis)»");
    expect(knowledge).toContain("sipdp.minjus.gob.pe");
    expect(knowledge.length).toBeLessThan(appMap().length + 9500 + 1500);
  });

  it("sin coincidencias solo manda el mapa", () => {
    expect(appKnowledgeForAi("qwertyzxcv")).toContain("No hay un artículo específico");
  });

  it("el modo básico explica la app con enlaces internos", () => {
    const { companyId } = makeActiveCompany();
    const base = { company: getCompany(companyId), banks: [], openRequests: [], openIncidents: [], complianceScore: 40 };
    const how = answerWithoutLlm({ ...base, message: "¿Dónde publico mi política de privacidad?" });
    expect(how).toContain("(/app/ayuda/");
    expect(how).toContain("(/app/documentos");
    expect(helpAnswerWithoutLlm("qwertyzxcv")).toBeUndefined();
  });
});
