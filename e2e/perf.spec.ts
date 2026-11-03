import { expect, test, type Page } from "@playwright/test";

/**
 * Presupuesto de rendimiento (áreas 13 y 19): "Lighthouse o equivalente".
 *
 * Lighthouse no está instalado (añadirlo trae un navegador y ~200 MB de dependencias
 * para medir lo mismo que el navegador ya mide). Lo equivalente aquí son las dos
 * métricas que de verdad mueven la aguja en un móvil peruano: LCP y CLS, medidas con
 * las APIs del navegador bajo una red lenta y una CPU cuatro veces más lenta que la
 * del servidor de pruebas.
 *
 * Los umbrales son de **presupuesto**, no una promesa: en local con 4G simulado la
 * portada da ~2 s de LCP (ver «Rendimiento» en `docs/GO-NO-GO.md`); aquí se exige
 * margen para no fallar por ruido de una máquina compartida, y aun así atrapar una
 * regresión real (una imagen de 2 MB, un bloqueo de render, un salto de maquetación).
 */

const LCP_BUDGET_MS = 4_000; // "necesita mejora" empieza en 4 s
const CLS_BUDGET = 0.1; // el umbral de "bueno" de Core Web Vitals

/** Deja LCP y CLS registrados en `window.__perf` antes de que cargue la app. */
async function watchVitals(page: Page) {
  await page.addInitScript(() => {
    const perf = { lcp: 0, cls: 0 };
    (window as unknown as { __perf: typeof perf }).__perf = perf;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) perf.lcp = Math.max(perf.lcp, entry.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput && typeof entry.value === "number") perf.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

/** Red lenta + CPU lenta, como un móvil de gama media con 4G regular. */
async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // ~1,6 Mbps
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  return cdp;
}

const PAGES = ["/", "/login"];

for (const path of PAGES) {
  test(`presupuesto de rendimiento · ${path}`, async ({ page }) => {
    test.skip(test.info().project.name === "webkit" || test.info().project.name === "firefox", "CDP es solo de Chromium");

    await watchVitals(page);
    await throttle(page);

    const started = Date.now();
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status()).toBe(200);

    // Deja que el navegador emita el LCP final (termina con la primera interacción o el load).
    await page.waitForFunction(() => ((window as unknown as { __perf?: { lcp: number } }).__perf?.lcp ?? 0) > 0, undefined, { timeout: 15_000 });
    const perf = await page.evaluate(() => (window as unknown as { __perf: { lcp: number; cls: number } }).__perf);

    // Se registra en el log para que quede en el informe de la corrida.
    const summary = `${path}: LCP ${Math.round(perf.lcp)} ms, CLS ${perf.cls.toFixed(3)}, total ${Date.now() - started} ms`;
    console.log(`[perf] ${summary}`);
    test.info().annotations.push({ type: "rendimiento", description: summary });

    expect(perf.lcp, `LCP de ${path} = ${Math.round(perf.lcp)} ms (presupuesto ${LCP_BUDGET_MS} ms)`).toBeLessThan(LCP_BUDGET_MS);
    expect(perf.cls, `CLS de ${path} = ${perf.cls.toFixed(3)} (presupuesto ${CLS_BUDGET})`).toBeLessThan(CLS_BUDGET);
  });
}
