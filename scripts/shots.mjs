import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "shots";
fs.mkdirSync(OUT, { recursive: true });

const errors = [];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  deviceScaleFactor: 1,
  locale: "es-PE",
  timezoneId: "America/Lima",
});

const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

async function shot(name, options = {}) {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
  console.log(`shot ${name}`);
}

// Landing
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await shot("01-landing", { fullPage: true });

// Login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot("02-login", { fullPage: true });

// Demo dashboard
await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await page.waitForURL("**/app");
await shot("03-dashboard", { fullPage: true });

// Banks
await page.goto(`${BASE}/app/bancos`, { waitUntil: "networkidle" });
await shot("04-bancos", { fullPage: true });

await page.goto(`${BASE}/app/bancos/banco-clientes`, { waitUntil: "networkidle" });
await shot("05-banco-detalle", { fullPage: true });

// Arco
await page.goto(`${BASE}/app/arco`, { waitUntil: "networkidle" });
await shot("06-arco", { fullPage: true });

await page.goto(`${BASE}/app/arco/arco-2`, { waitUntil: "networkidle" });
await shot("07-arco-detalle", { fullPage: true });

// Documents
await page.goto(`${BASE}/app/documentos?tab=politica`, { waitUntil: "networkidle" });
await shot("08-documentos", { fullPage: true });

// Incident detail
await page.goto(`${BASE}/app/incidentes/inc-1`, { waitUntil: "networkidle" });
await shot("09-incidente", { fullPage: true });

// Public policy + request form
await page.goto(`${BASE}/p/casa-verde`, { waitUntil: "networkidle" });
await shot("10-politica", { fullPage: true });

await page.goto(`${BASE}/solicitud/casa-verde`, { waitUntil: "networkidle" });
await shot("11-solicitud", { fullPage: true });

// Public ARCO submission end-to-end
await page.selectOption('select[name="type"]', "acceso");
await page.fill('input[name="requester_name"]', "Rosa Elena Paredes");
await page.fill('input[name="doc_number"]', "41258963");
await page.fill('input[name="email"]', "rosa.paredes@example.com");
await page.fill('input[name="phone"]', "+51 955 123 456");
await page.fill(
  'textarea[name="description"]',
  "Solicito acceso a los datos personales que mantienen sobre mí y una copia de mi historial de compras."
);
await page.check('input[type="checkbox"]');
await page.locator('form button[type="submit"]').click();
await page.waitForURL(/ok=ARCO-/, { timeout: 20000 });
await page.waitForTimeout(600);
const ticketVisible = await page.locator("text=Solicitud registrada").isVisible();
console.log("public arco submitted:", ticketVisible, page.url());
await shot("12-solicitud-ok", { fullPage: true });

// New bank creation
await page.goto(`${BASE}/app/bancos/nuevo`, { waitUntil: "networkidle" });
await shot("13-banco-nuevo", { fullPage: true });
await page.fill('input[name="name"]', "Postulantes de empleo");
await page.fill('textarea[name="purpose"]', "Evaluación de candidatos y gestión del proceso de selección.");
await page.fill('textarea[name="data_categories"]', "Nombres, DNI, correo, teléfono, CV, referencias laborales.");
await page.selectOption('select[name="legal_basis"]', "consentimiento");
await page.fill('input[name="retention"]', "2 años desde el cierre del proceso.");
await page.fill('input[name="recipients"]', "Ninguno.");
await page.selectOption('select[name="transfers"]', "no");
await page.locator('form:has(input[name="name"]) button[type="submit"]').click();
await page.waitForURL((url) => url.pathname.startsWith("/app/bancos/") && !url.pathname.endsWith("/nuevo"));
await page.waitForLoadState("networkidle");
console.log("created bank:", page.url());
await shot("14-banco-creado", { fullPage: true });

// Incident creation
await page.goto(`${BASE}/app/incidentes/nuevo`, { waitUntil: "networkidle" });
await page.fill('input[name="title"]', "Acceso indebido a una cuenta de prueba");
await page.fill(
  'textarea[name="description"]',
  "Un usuario detectó que podía ver datos de otro cliente en el entorno de pruebas."
);
await page.selectOption('select[name="severity"]', "grave");
await page.fill('input[name="affected_people"]', "3");
await page.fill('input[name="data_categories"]', "Nombre, correo, teléfono");
await page.locator('form:has(input[name="title"]) button[type="submit"]').click();
await page.waitForURL((url) => /\/app\/incidentes\/[0-9a-f-]{8}/.test(url.pathname));
await page.waitForLoadState("networkidle");
console.log("created incident:", page.url());
await shot("15-incidente-nuevo", { fullPage: true });

// Signup flow in a clean context
const context2 = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  locale: "es-PE",
  timezoneId: "America/Lima",
});
const page2 = await context2.newPage();
page2.on("console", (message) => {
  if (message.type() === "error") errors.push(`signup console: ${message.text()}`);
});
await page2.goto(`${BASE}/registro?plan=pro`, { waitUntil: "networkidle" });
await shot2(page2, "16-registro");
await page2.fill('input[name="company"]', "Andes Legaltech S.A.C.");
await page2.fill('input[name="ruc"]', "20609988771");
await page2.selectOption('select[name="sector"]', "Servicios profesionales");
await page2.fill('input[name="name"]', "Diego Salazar");
await page2.fill('input[name="email"]', `diego.${Date.now()}@example.com`);
await page2.fill('input[name="password"]', "demo12345");
await page2.click('button[type="submit"]');
await page2.waitForURL("**/app**");
console.log("signup landed:", page2.url());
await page2.screenshot({ path: `${OUT}/17-registro-ok.png`, fullPage: true });

async function shot2(target, name) {
  await target.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`shot ${name}`);
}

// Mobile
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: "es-PE",
  timezoneId: "America/Lima",
});
const mp = await mobile.newPage();
await mp.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/18-mobile-landing.png`, fullPage: true });
await mp.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await mp.waitForURL("**/app");
await mp.screenshot({ path: `${OUT}/19-mobile-dashboard.png`, fullPage: true });

console.log("ERRORS:", errors.length);
for (const error of errors.slice(0, 20)) console.log(" -", error);

await browser.close();
