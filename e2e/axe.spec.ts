import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accesibilidad automatizada (área 20): axe-core recorre las pantallas públicas y
 * las del panel y falla el build si aparece una violación WCAG 2.1 A/AA. Cubre lo
 * que una prueba manual se salta por cansancio: contraste, nombres accesibles,
 * jerarquía de encabezados, etiquetas de formulario y regiones.
 *
 * No sustituye la revisión con lector de pantalla (NVDA/VoiceOver) ni la navegación
 * solo con teclado, que siguen pendientes de una persona.
 */

// Las animaciones de entrada (`.rise`) parten de opacidad 0: en un runner lento axe
// puede medir el contraste a mitad del fundido y reportar un falso «color-contrast».
// Con movimiento reducido el CSS las desactiva y se mide el estado final, que es el
// que cuenta para WCAG (globals.css, prefers-reduced-motion).
test.use({ reducedMotion: "reduce" });

const PAGES = [
  "/",
  "/login",
  "/registro",
  "/terminos",
  "/privacidad",
  "/cookies",
  "/olvide",
  "/restablecer",
  "/guias",
  "/guias/inscribir-banco-de-datos-personales",
  "/sectores/clinicas-y-centros-medicos",
  "/glosario",
  "/plantillas",
  "/diagnostico",
  "/herramientas",
  "/herramientas/calculadora-multas-ley-29733",
  "/plantillas/politica-de-privacidad",
  "/plantillas/checklist-inscripcion-sipdp",
  "/guias/plazos-ds-016-2024-jus",
  "/sectores/tiendas-online-y-ecommerce",
  "/contadores",
];

// Pantallas del panel. Se entra con la cuenta demo (GET /demo inicia sesión y vuelve
// a /app): así axe cubre el panel sin repetir en cada prueba un alta y un pago.
const PANEL_PAGES = [
  "/app",
  "/app/bancos",
  "/app/documentos",
  "/app/arco",
  "/app/incidentes",
  "/app/asistente",
  "/app/ayuda",
  "/app/ajustes",
  "/app/empresa",
  "/app/evidencias",
  "/app/herramientas",
];

/** Analiza la página actual y devuelve las violaciones en un formato corto y legible. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
}

for (const path of PAGES) {
  test(`axe · ${path}`, async ({ page }) => {
    await page.goto(path);
    const violations = await audit(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test.describe("panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await page.waitForURL(/\/app/);
  });

  for (const path of PANEL_PAGES) {
    test(`axe · ${path}`, async ({ page }) => {
      await page.goto(path);
      const violations = await audit(page);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }
});
