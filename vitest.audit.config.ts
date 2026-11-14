import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * `pnpm legal:audit` (motor legal, plan 5). Mismos alias que vitest.config.ts; lee la
 * clave de la IA del .env de LEGAL_AUDIT_ENV_DIR (por defecto, esta carpeta). La base
 * SQLite es temporal (test/helpers/setup.ts): el registro de uso de IA no toca la real.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/helpers/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/legal/audit/**/*.audit.ts"],
    setupFiles: ["test/helpers/setup.ts"],
    testTimeout: 3_600_000,
    env: loadEnv("audit", process.env.LEGAL_AUDIT_ENV_DIR ?? process.cwd(), ""),
  },
});
