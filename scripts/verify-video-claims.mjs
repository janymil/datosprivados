import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = process.env.OUT ?? "shots/audit";
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  locale: "es-PE",
  timezoneId: "America/Lima",
});
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

async function shot(name, full = true) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot", name);
}

// Login demo
await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await page.waitForURL("**/app");
await page.waitForLoadState("networkidle");
await shot("10-dashboard-nuevo");

// Public links on dashboard (should show datosprivados.pe)
const publicLinks = await page.locator("text=datosprivados.pe/p/").count();
console.log("dashboard public link mentions:", publicLinks);

// Ficha SIPDP
await page.goto(`${BASE}/app/bancos/banco-clientes/ficha`, { waitUntil: "networkidle" });
await shot("11-ficha-nueva");
const hasCopy = await page.getByRole("button", { name: /copiar ficha/i }).count();
const hasReady = await page.locator("text=Ficha lista").count();
console.log("ficha: copy button", hasCopy, "ready badge", hasReady);

// Incident detail with criteria
await page.goto(`${BASE}/app/incidentes/inc-1`, { waitUntil: "networkidle" });
await shot("12-incidente-criterios");

// New incident with criteria
await page.goto(`${BASE}/app/incidentes/nuevo`, { waitUntil: "networkidle" });
await shot("13-incidente-nuevo");
await page.fill('input[name="title"]', "Laptop robada con la lista de clientes");
await page.fill(
  'textarea[name="description"]',
  "Robaron la laptop del área de ventas. Tenía una copia del Excel de clientes y el navegador con la sesión de WhatsApp Web abierta."
);
await page.selectOption('select[name="severity"]', "grave");
await page.fill('input[name="affected_people"]', "500");
await page.fill(
  'input[name="affected_sample"]',
  "500 clientes de la campaña de julio — ana@…, luis@…, rosa@… (visibles en el Excel)"
);
await page.fill('input[name="data_categories"]', "Nombre, DNI, correo, teléfono y direcciones de entrega");
await page.check('input[name="criteria"][value="muchas_personas"]');
await page.check('input[name="criteria"][value="gran_volumen"]');
await page.locator('form:has(input[name="title"]) button[type="submit"]').click();
await page.waitForURL(/\/app\/incidentes\/[0-9a-f-]{8}/, { timeout: 20000 });
await page.waitForLoadState("networkidle");
await shot("14-incidente-creado");
console.log("incident url:", page.url());
const clock = await page.locator("text=/^\\d{2}:\\d{2}:\\d{2}$/").first().textContent().catch(() => null);
console.log("countdown looks like:", clock);
const chipActive = await page.locator("text=Afecta a muchas personas").count();
console.log("criteria chip rendered:", chipActive);

// Security checklist on documents tab
await page.goto(`${BASE}/app/documentos?tab=seguridad`, { waitUntil: "networkidle" });
await shot("15-seguridad-checklist");
const boxes = page.getByRole("checkbox");
console.log("security checkboxes:", await boxes.count());
await boxes.first().click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
await shot("16-seguridad-marcada");
const checked = await page.locator('[role="checkbox"][aria-checked="true"]').count();
console.log("checked after click:", checked);

// ARCO detail (fine panel)
await page.goto(`${BASE}/app/arco/arco-2`, { waitUntil: "networkidle" });
await shot("17-arco-multa");
const fine = await page.locator("text=desde S/ 2,750").count();
console.log("fine panel:", fine);

// Public pages
await page.goto(`${BASE}/p/casa-verde`, { waitUntil: "networkidle" });
const polText = await page.locator("body").innerText();
console.log("policy mentions datosprivados.pe:", polText.includes("datosprivados.pe"));
await shot("18-politica-publica", false);

await page.goto(`${BASE}/solicitud/casa-verde`, { waitUntil: "networkidle" });
await shot("19-solicitud-publica");

console.log("ERRORS:", errors.length);
errors.slice(0, 15).forEach((e) => console.log(" -", e));
await browser.close();
