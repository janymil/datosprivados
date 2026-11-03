import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { E2E_DB } from "./e2e/paths";

const APP_PORT = 3100;
const MOCK_PORT = 4010;
const APP_ORIGIN = `http://localhost:${APP_PORT}`;

// Cada ejecución empieza con una base vacía. Se limpia aquí, antes de que arranquen los servidores.
fs.mkdirSync(path.dirname(E2E_DB), { recursive: true });
for (const suffix of ["", "-wal", "-shm", "-journal"]) fs.rmSync(`${E2E_DB}${suffix}`, { force: true });

// Requiere `next build` previo (pnpm test:e2e lo hace). Ejecuta `next start`, es decir, modo producción real.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: APP_ORIGIN, trace: "retain-on-failure", locale: "es-PE", timezoneId: "America/Lima" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Android Chrome (Pixel 7): solo las pruebas de calidad; el recorrido completo ya corre en escritorio.
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, testMatch: "**/quality.spec.ts" },
    // Firefox y WebKit (motor de Safari): las páginas públicas y sus cabeceras, para no
    // descubrir en producción que algo solo funciona en Chrome. El recorrido completo
    // (registro, pago, documentos) sigue solo en Chromium para no triplicar el tiempo de CI.
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testMatch: "**/quality.spec.ts" },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: "**/quality.spec.ts" },
    // axe: reglas WCAG sobre las mismas pantallas públicas. Solo en Chromium (axe analiza el DOM, no el motor).
    { name: "axe", use: { ...devices["Desktop Chrome"] }, testMatch: "**/axe.spec.ts" },
  ],
  webServer: [
    {
      command: "node e2e/mock-server.mjs",
      url: `http://localhost:${MOCK_PORT}/health`,
      env: { MOCK_PORT: String(MOCK_PORT), APP_ORIGIN },
      reuseExistingServer: false,
    },
    {
      command: `pnpm exec next start --port ${APP_PORT}`,
      url: APP_ORIGIN,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATOSPRIVADOS_DB: E2E_DB,
        // Producción exige URL https; el servidor simulado ignora el back_url y vuelve a APP_ORIGIN.
        NEXT_PUBLIC_APP_URL: "https://localhost:3100",
        MERCADOPAGO_ACCESS_TOKEN: "TEST-e2e-token",
        MERCADOPAGO_WEBHOOK_SECRET: "e2e-webhook-secret",
        MERCADOPAGO_API_BASE: `http://localhost:${MOCK_PORT}`,
        DECOLECTA_API_TOKEN: "e2e-token",
        DECOLECTA_API_BASE: `http://localhost:${MOCK_PORT}`,
        MAIL_PROVIDER: "resend",
        MAIL_API_KEY: "e2e-mail-key",
        MAIL_API_BASE: `http://localhost:${MOCK_PORT}`,
        CRON_SECRET: "e2e-cron-secret-0123456789",
        // La CSP se emite bloqueante en las pruebas: si algo dependiera de un origen
        // externo o de un inline que la política corta, aquí se rompe primero.
        CSP_ENFORCE: "1",
        ANTHROPIC_API_KEY: "",
        OPENAI_API_KEY: "",
      },
    },
  ],
});
