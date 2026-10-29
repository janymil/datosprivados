import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-PE",
  timezoneId: "America/Lima",
});
const page = await context.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator("#video").scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots/video-mobile-viewport.png" });
await page.locator("#video video").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/video-mobile-player.png" });
console.log(await page.evaluate(() => {
  const v = document.querySelector("#video video");
  return v instanceof HTMLVideoElement ? { paused: v.paused, muted: v.muted, t: Math.round(v.currentTime) } : null;
}));
await browser.close();
