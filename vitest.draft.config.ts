import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Redactor automático (motor legal, plan 7): lo corre deploy/datosprivados-draft.sh en su copia
 * del repositorio. Mismos alias que vitest.config.ts; la clave de la IA sale del .env de
 * DRAFT_ENV_DIR. La base SQLite es temporal (test/helpers/setup.ts).
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
    include: ["test/legal/draft/**/*.draft.ts"],
    setupFiles: ["test/helpers/setup.ts"],
    testTimeout: 3_600_000,
    env: loadEnv("draft", process.env.DRAFT_ENV_DIR ?? process.cwd(), ""),
  },
});
