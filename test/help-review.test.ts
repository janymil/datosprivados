import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/help-content";
import { HELP_LEGAL_REVIEW, HELP_REVIEWED, REVIEW_MAX_AGE_DAYS, reviewState, staleArticles } from "@/lib/help-review";
import HelpArticlePage from "@/app/app/ayuda/[slug]/page";

/**
 * Vigencia del contenido de la ayuda (área 12): cada artículo tiene fecha de
 * revisión, el artículo avisa cuando envejece, y el conocimiento del asistente
 * no guarda una segunda copia del texto (que se desincronizaría del que lee el
 * usuario).
 */

const DAY = 86_400_000;
const params = (slug: string) => Promise.resolve({ slug });
const render = async (slug: string) => renderToStaticMarkup(await HelpArticlePage({ params: params(slug) }));

describe("fechas de revisión de la ayuda", () => {
  it("todo artículo tiene fecha y no sobran entradas", () => {
    const slugs = TOPICS.map((topic) => topic.slug).sort();
    expect(Object.keys(HELP_REVIEWED).sort()).toEqual(slugs);
  });

  it("las fechas son válidas y no están en el futuro", () => {
    const now = Date.now();
    for (const [slug, date] of Object.entries(HELP_REVIEWED)) {
      expect(date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const parsed = new Date(`${date}T12:00:00Z`).getTime();
      expect(Number.isNaN(parsed), slug).toBe(false);
      expect(parsed, slug).toBeLessThanOrEqual(now);
    }
  });

  it("marca el artículo como vencido solo pasados los 12 meses", () => {
    const reviewed = new Date(`${HELP_REVIEWED.arco}T12:00:00Z`).getTime();
    const fresh = reviewState("arco", new Date(reviewed + (REVIEW_MAX_AGE_DAYS - 1) * DAY))!;
    expect(fresh.stale).toBe(false);
    const old = reviewState("arco", new Date(reviewed + (REVIEW_MAX_AGE_DAYS + 1) * DAY))!;
    expect(old.stale).toBe(true);
    expect(old.days).toBeGreaterThan(REVIEW_MAX_AGE_DAYS);
  });

  it("sin fecha registrada devuelve null y no entra en la lista de vencidos", () => {
    expect(reviewState("no-existe")).toBeNull();
    const inAYear = new Date(Date.now() + 400 * DAY);
    expect(staleArticles(inAYear).sort()).toEqual(Object.keys(HELP_REVIEWED).sort());
  });

  it("el artículo muestra la fecha y avisa si está vencido", async () => {
    const html = await render("arco");
    expect(html).toContain("revisado el");
    expect(html).not.toContain("puede estar desactualizado");
  });

  it("declara que la revisión legal sigue pendiente", async () => {
    const html = await render("la-ley-en-simple");
    if (HELP_LEGAL_REVIEW.at === null) expect(html).toContain("revisión legal pendiente");
    else expect(html).toContain("revisión legal:");
  });
});

describe("el asistente no tiene una copia aparte de la ayuda", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src", "lib", "help-knowledge.ts"), "utf8");

  it("saca el texto de help-content.ts", () => {
    expect(source).toMatch(/from "\.\/help-content"/);
    expect(source).toContain("TOPICS");
    expect(source).toContain("buildSearchDocs");
  });

  it("no declara sus propios artículos, preguntas ni glosario", () => {
    // Una segunda copia se desincroniza: si alguien la crea, esta prueba lo detecta.
    expect(source).not.toMatch(/^\s*(export )?const (ARTICLES|TOPICS|FAQ|GLOSSARY|TIPS)\s*[:=]/m);
  });

  it("cada título de artículo sale del contenido y no de un literal duplicado", () => {
    for (const topic of TOPICS) {
      if (topic.title.length < 20) continue; // títulos cortos pueden aparecer en una frase
      expect(source, topic.slug).not.toContain(`"${topic.title}"`);
    }
  });
});
