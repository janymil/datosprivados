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
  },
});
