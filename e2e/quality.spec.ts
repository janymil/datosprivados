import { expect, test } from "@playwright/test";

// Fase 5 · calidad: cabeceras de seguridad, accesibilidad básica, desborde en móvil y enlaces legales.
// Solo páginas públicas y estáticas: no depende de datos del recorrido principal.
const PUBLIC_PAGES = ["/", "/login", "/registro", "/terminos", "/privacidad", "/cookies"];

for (const path of PUBLIC_PAGES) {
  test.describe(path, () => {
    test("cabeceras de seguridad", async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const h = res.headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["x-powered-by"]).toBeUndefined();
      // La suite corre con CSP_ENFORCE=1: la política bloqueante debe estar y no
      // debe venir la de observación (mandar las dos sería ambiguo).
      expect(h["content-security-policy"]).toContain("default-src 'self'");
      expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(h["content-security-policy-report-only"]).toBeUndefined();
    });

    test("accesibilidad básica y sin desborde horizontal", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", /^es/);
      await expect(page.locator("h1")).toHaveCount(1);

      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const named = (el: Element) =>
          !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent?.trim() || el.querySelector("svg title"));
        document.querySelectorAll("img").forEach((img) => {
          if (!img.hasAttribute("alt")) out.push(`img sin alt: ${img.src}`);
        });
        document.querySelectorAll("button, a[href]").forEach((el) => {
          if (!named(el)) out.push(`sin nombre accesible: <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 80)}`);
        });
        document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((el) => {
          const input = el as HTMLInputElement;
          const labelled = !!(input.labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
          if (!labelled) out.push(`control sin etiqueta: ${el.outerHTML.slice(0, 80)}`);
        });
        const root = document.scrollingElement!;
        if (root.scrollWidth > window.innerWidth + 1) out.push(`desborde horizontal: ${root.scrollWidth} > ${window.innerWidth}`);
        return out;
      });
      expect(problems).toEqual([]);
    });
  });
}

test("el registro exige aceptar términos y privacidad, con enlaces a los textos", async ({ page }) => {
  await page.goto("/registro");
  const checkbox = page.locator('input[name="accept_legal"]');
  await expect(checkbox).toBeVisible();
  expect(await checkbox.getAttribute("required")).not.toBeNull();
  await expect(page.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terminos");
  await expect(page.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
});

test("el pie de la landing enlaza los documentos legales", async ({ page }) => {
  await page.goto("/");
  for (const href of ["/terminos", "/privacidad", "/cookies"]) {
    await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
  }
});

test("mientras sean borrador, los textos legales avisan y no se indexan", async ({ page, request }) => {
  await page.goto("/terminos");
  await expect(page.getByRole("note")).toContainText("Borrador pendiente de revisión legal");
  const html = await (await request.get("/terminos")).text();
  expect(html).toMatch(/<meta name="robots" content="noindex/);
});

test("la calculadora de multas calcula el rango con la UIT 2026", async ({ page }) => {
  await page.goto("/herramientas/calculadora-multas-ley-29733");
  await page.getByLabel("No inscribí mis bancos de datos en el SIPDP").check();
  await expect(page.getByTestId("fine-result")).toContainText("S/ 2,750");
  await expect(page.getByTestId("fine-result")).toContainText("S/ 27,500");
  await page.getByLabel("Infracciones muy graves").fill("1");
  await expect(page.getByTestId("fine-result")).toContainText("S/ 277,750");
  await expect(page.getByTestId("fine-result")).toContainText("S/ 577,500");
});

test("el checklist del SIPDP cuenta los puntos marcados", async ({ page }) => {
  await page.goto("/plantillas/checklist-inscripcion-sipdp");
  const boxes = page.locator('input[type="checkbox"]');
  const total = await boxes.count();
  expect(total).toBeGreaterThan(20);
  await expect(page.getByText(`0 de ${total} completados`)).toBeVisible();
  await boxes.nth(0).check();
  await expect(page.getByText(`1 de ${total} completados`)).toBeVisible();
});

test("el modelo de política de privacidad es público e indexable", async ({ page, request }) => {
  const html = await (await request.get("/plantillas/politica-de-privacidad")).text();
  expect(html).not.toMatch(/<meta name="robots" content="noindex/);
  await page.goto("/plantillas/politica-de-privacidad");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Modelo de política de privacidad");
  await expect(page.getByText("[RAZÓN SOCIAL]").first()).toBeVisible();
});
