import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "es-PE" });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.locator("#video").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.locator("#video").screenshot({ path: "shots/video-restored.png" });
console.log("errors:", errors.length);
await browser.close();
