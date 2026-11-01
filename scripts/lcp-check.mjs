#!/usr/bin/env node
// Mide LCP, CLS y bytes transferidos en móvil con 4G simulado (sin Lighthouse).
// Uso: node scripts/lcp-check.mjs [url ...]   (por defecto la landing de BASE)
// Objetivo del roadmap: LCP < 2.5 s en móvil 4G y que los videos no se descarguen al cargar.
import { chromium, devices } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:3200";
const urls = process.argv.slice(2).length ? process.argv.slice(2) : [`${base}/`];
const browser = await chromium.launch();

for (const url of urls) {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  // 4G "lento" de Lighthouse: 1.6 Mbps de bajada, 150 ms de latencia; CPU 4x más lenta.
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  let bytes = 0;
  const videos = [];
  page.on("response", async (res) => {
    const length = Number(res.headers()["content-length"] ?? 0);
    bytes += length;
    if (/\.(mp4|webm)(\?|$)/.test(res.url())) videos.push({ url: res.url(), status: res.status(), length });
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(2500);
  const { lcp, cls } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
  console.log(`${url}\n  LCP=${(lcp / 1000).toFixed(2)}s CLS=${cls.toFixed(3)} transferido≈${(bytes / 1024).toFixed(0)} KB (según content-length) videos_descargados_al_cargar=${videos.length}${videos.length ? " " + JSON.stringify(videos) : ""}`);
  await context.close();
}
await browser.close();
