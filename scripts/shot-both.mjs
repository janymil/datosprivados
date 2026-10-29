import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "es-PE" });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

const explainer = await page.locator("#video").count();
const promo = await page.locator("#video-promo").count();
const promoVideo = await page.locator("#video-promo video").count();
console.log({ explainer, promo, promoVideo });

await page.locator("#video").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator("#video").screenshot({ path: "shots/both-explainer.png" });

await page.locator("#video-promo").scrollIntoViewIfNeeded();
await page.waitForTimeout(2200);
await page.locator("#video-promo").screenshot({ path: "shots/both-promo.png" });

console.log("errors:", errors.length);
for (const error of errors.slice(0, 6)) console.log("-", error);
await browser.close();
