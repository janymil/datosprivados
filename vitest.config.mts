import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" lanza error fuera de React Server Components; en pruebas es un módulo vacío.
      "server-only": path.resolve(import.meta.dirname, "test/helpers/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/helpers/setup.ts"],
    pool: "forks",
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      // Solo el código que importa para el lanzamiento: la lógica de dinero, sesión,
      // cobro, tareas y correo. Se mide el archivo, no el proyecto entero (las
      // pantallas se cubren con E2E, no con unitarias).
      include: [
        "src/lib/billing.ts",
        "src/lib/auth.ts",
        "src/lib/jobs.ts",
        "src/lib/mail.ts",
        "src/lib/account.ts",
        "src/lib/mercadopago.ts",
        "src/lib/invoicing.ts",
        "src/lib/rate-limit.ts",
        "src/lib/client-ip.ts",
        "src/lib/backup-crypto*",
        "scripts/backup-crypto.mjs",
      ],
      // Suelo medido el 2026-11-02. Sube cuando se agreguen pruebas; bajarlo exige
      // justificarlo en el commit (es una puerta de calidad, no un adorno).
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
