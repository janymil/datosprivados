import path from "node:path";

/** Base temporal de la prueba E2E; `pnpm test:e2e` se ejecuta siempre desde la raíz del proyecto. */
export const E2E_DB = path.join(process.cwd(), "test", ".tmp", "e2e.db");
