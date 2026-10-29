import { chromium } from "playwright";

const browser = await chromium.launch();
const errors = [];

async function capture(viewport, name) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: "es-PE",
    timezoneId: "America/Lima",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.locator("#video video").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const video = document.querySelector("#video video");
    if (!(video instanceof HTMLVideoElement)) return null;
    return {
      currentSrc: video.currentSrc,
      paused: video.paused,
      muted: video.muted,
      readyState: video.readyState,
      size: `${video.videoWidth}x${video.videoHeight}`,
      duration: Math.round(video.duration),
    };
  });
  console.log(name, info);

  await page.locator("#video").screenshot({ path: `shots/${name}.png` });
  await context.close();
}

await capture({ width: 1440, height: 950 }, "video-desktop");
await capture({ width: 390, height: 844 }, "video-mobile");

console.log("console errors:", errors.length);
for (const error of errors.slice(0, 8)) console.log("-", error);
await browser.close();
