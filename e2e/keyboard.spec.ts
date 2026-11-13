import { expect, test, type Page } from "@playwright/test";

/**
 * Recorrido solo con teclado (área 20): Tab, Shift+Tab, Enter y Espacio, sin ratón.
 * Comprueba que cada parada de Tab tiene un foco visible, que no hay tabindex
 * positivos que desordenen el orden, que el foco nunca queda atrapado y que los
 * flujos principales se completan sin ratón.
 */

type Stop = { tag: string; name: string; visible: boolean; key: string };

/** Pulsa Tab una vez y describe el elemento que recibe el foco. */
async function tab(page: Page, reverse = false): Promise<Stop> {
  await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { tag: "body", name: "", visible: true, key: "body" };
    const style = getComputedStyle(el);
    const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== "none";
    const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().slice(0, 60);
    const path: string[] = [];
    for (let node: Element | null = el; node && path.length < 6; node = node.parentElement) {
      path.unshift(`${node.tagName}:${Array.from(node.parentElement?.children ?? []).indexOf(node)}`);
    }
    return { tag: el.tagName.toLowerCase(), name, visible: outline || shadow, key: path.join(">") };
  });
}

/** Avanza con Tab hasta un elemento que cumpla `selector`; falla si no llega. */
async function tabTo(page: Page, selector: string, max = 120) {
  for (let i = 0; i < max; i++) {
    const stop = await tab(page);
    expect(stop.visible, `foco invisible en <${stop.tag}> «${stop.name}»`).toBe(true);
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
  }
  throw new Error(`No se llegó con Tab a ${selector}`);
}

/** Recorre toda la página con Tab: foco visible siempre y sin trampas. */
async function walk(page: Page, max = 250) {
  const tabindex = await page.locator("[tabindex]:not([tabindex='-1']):not([tabindex='0'])").count();
  expect(tabindex, "tabindex positivo altera el orden del teclado").toBe(0);
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    const stop = await tab(page);
    if (stop.tag === "body") return seen.length;
    expect(stop.visible, `foco invisible en <${stop.tag}> «${stop.name}»`).toBe(true);
    // Si el mismo elemento vuelve a recibir el foco sin pasar por el final, hay una trampa.
    if (seen.at(-1) === stop.key) throw new Error(`Foco atrapado en <${stop.tag}> «${stop.name}»`);
    if (seen[0] === stop.key) return seen.length; // dio la vuelta completa
    seen.push(stop.key);
  }
  return seen.length;
}

test("la primera parada es «Saltar al contenido» y lleva al contenido principal", async ({ page }) => {
  await page.goto("/");
  const first = await tab(page);
  expect(first.name).toBe("Saltar al contenido");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();
});

for (const path of ["/", "/login", "/registro", "/guias"]) {
  test(`teclado · ${path}: foco visible en cada parada y sin trampas`, async ({ page }) => {
    await page.goto(path);
    expect(await walk(page)).toBeGreaterThan(3);
  });
}

test("el Libro de Reclamaciones oficial se alcanza con teclado desde el pie", async ({ page }) => {
  await page.goto("/");
  const book = 'a[href="https://librodigital.pe/libro/semantikatech"]';
  await tabTo(page, book, 250);
  await expect(page.locator(book)).toHaveAttribute("target", "_blank");
  await expect(page.locator(book)).toHaveAttribute("rel", /noopener/);
});

test("la ruta propia redirige al Libro de Reclamaciones oficial", async ({ request }) => {
  const res = await request.get("/libro-de-reclamaciones", { maxRedirects: 0 });
  expect([307, 308]).toContain(res.status());
  expect(res.headers()["location"]).toBe("https://librodigital.pe/libro/semantikatech");
});

test.describe("panel (cuenta demo)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await page.waitForURL(/\/app/);
  });

  for (const path of ["/app", "/app/bancos", "/app/arco"]) {
    test(`teclado · ${path}: foco visible en cada parada y sin trampas`, async ({ page }) => {
      await page.goto(path);
      expect(await walk(page)).toBeGreaterThan(5);
    });
  }

  test("se llega a un banco de datos y a su ficha solo con teclado", async ({ page }) => {
    await page.goto("/app");
    await tabTo(page, 'a[href="/app/bancos"]');
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/app\/bancos$/);

    await tabTo(page, 'main a[href^="/app/bancos/"]:not([href$="/nuevo"])');
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/app\/bancos\/[^/]+$/);

    await tabTo(page, 'a[href$="/ficha"]');
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/ficha$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("Shift+Tab recorre el panel hacia atrás sin perder el foco", async ({ page }) => {
    await page.goto("/app/bancos");
    for (let i = 0; i < 8; i++) await tab(page);
    for (let i = 0; i < 5; i++) {
      const stop = await tab(page, true);
      expect(stop.tag).not.toBe("body");
      expect(stop.visible, `foco invisible en <${stop.tag}> «${stop.name}»`).toBe(true);
    }
  });
});
