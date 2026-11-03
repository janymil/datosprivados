import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accesibilidad automatizada (área 20): axe-core recorre las pantallas públicas y
 * falla el build si aparece una violación WCAG 2.1 A/AA. Cubre lo que una prueba
 * manual se salta por cansancio: contraste, nombres accesibles, jerarquía de
 * encabezados, etiquetas de formulario y regiones.
 *
 * No sustituye la revisión con lector de pantalla (NVDA/VoiceOver) ni la navegación
 * solo con teclado, que siguen pendientes de una persona.
 */

const PAGES = ["/", "/login", "/registro", "/terminos", "/privacidad", "/cookies", "/olvide", "/restablecer"];

for (const path of PAGES) {
  test(`axe · ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // La demo pública y la política de un cliente dependen de datos sembrados; se
      // revisan aparte en el recorrido, donde la cuenta existe.
      .analyze();

    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
