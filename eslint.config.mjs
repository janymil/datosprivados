import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "test/.tmp/**", "playwright-report/**", "test-results/**", "data/**", "scripts/**", ".deploy/**", "graft/**", "graphify-out/**", ".pnpm-store/**"]),
  {
    // `const { secreto: _omitido, ...resto } = obj` es la forma de quitar una clave: no es una variable olvidada.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, varsIgnorePattern: "^_" }] },
  },
]);
