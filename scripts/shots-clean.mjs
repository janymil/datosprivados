import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  deviceScaleFactor: 1,
  locale: "es-PE",
  timezoneId: "America/Lima",
});

const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

const shots = [
  ["/", "01-landing", { fullPage: true }],
  ["/login", "02-login", { fullPage: true }],
  ["/app", "03-dashboard", { fullPage: true }],
  ["/app/bancos", "04-bancos", { fullPage: true }],
  ["/app/bancos/banco-clientes", "05-banco-detalle", { fullPage: true }],
  ["/app/bancos/banco-clientes/ficha", "06-ficha-sipdp", { fullPage: true }],
  ["/app/arco", "07-arco", { fullPage: true }],
  ["/app/arco/arco-2", "08-arco-detalle", { fullPage: true }],
  ["/app/incidentes", "09-incidentes", { fullPage: true }],
  ["/app/incidentes/inc-1", "10-incidente-detalle", { fullPage: true }],
  ["/app/documentos?tab=politica", "11-documentos", { fullPage: true }],
  ["/app/empresa", "12-empresa", { fullPage: true }],
  ["/app/ajustes", "13-ajustes", { fullPage: true }],
  ["/p/casa-verde", "14-politica-publica", { fullPage: true }],
  ["/solicitud/casa-verde", "15-solicitud-publica", { fullPage: true }],
];

// Auth once, then visit everything.
await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await page.waitForURL("**/app");

for (const [path, name, options] of shots) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
  console.log(`shot ${name}`);
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  locale: "es-PE",
  timezoneId: "America/Lima",
});
const mp = await mobile.newPage();
await mp.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/16-mobile-hero.png` });
await mp.locator("#precios").scrollIntoViewIfNeeded();
await mp.waitForTimeout(400);
await mp.screenshot({ path: `${OUT}/17-mobile-precios.png` });
await mp.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await mp.waitForURL("**/app");
await mp.screenshot({ path: `${OUT}/18-mobile-dashboard.png`, fullPage: true });
console.log("shot mobile");

console.log("console errors:", errors.length);
for (const error of errors.slice(0, 10)) console.log("-", error);
await browser.close();
