import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * .github/workflows/legal-change.yml: invariantes de seguridad (revisión final del plan 4).
 * La rama aprobada es código ajeno: nunca corre con permiso de escritura, nunca se juzga
 * con sus propias reglas, y lo que se fusiona es exactamente el diff que vio el fundador.
 */
const text = fs.readFileSync(path.join(process.cwd(), ".github/workflows/legal-change.yml"), "utf8");
const job = (name: string) => {
  const start = text.indexOf(`\n  ${name}:\n`);
  expect(start, `falta el job ${name}`).toBeGreaterThan(-1);
  const next = text.slice(start + 1).search(/\n {2}[a-z-]+:\n/);
  return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
};

describe("flujo de cambio legal aprobado", () => {
  it("sin permisos por defecto; solo el job de fusión escribe", () => {
    expect(text).toMatch(/^permissions: \{\}$/m);
    expect(job("verify")).toMatch(/permissions:\n\s+contents: read/);
    expect(job("merge")).toMatch(/permissions:\n\s+contents: write/);
  });

  it("el job que corre código de la rama no guarda credenciales", () => {
    const verify = job("verify");
    const checkouts = verify.match(/uses: actions\/checkout@v4/g) ?? [];
    const noCreds = verify.match(/persist-credentials: false/g) ?? [];
    expect(checkouts.length).toBe(2);
    expect(noCreds.length).toBe(checkouts.length);
  });

  it("las reglas se cargan desde master, no desde la rama", () => {
    const verify = job("verify");
    expect(verify).toMatch(/ref: master\n\s+path: rules/);
    expect(verify).toContain("node --experimental-strip-types ../rules/scripts/legal/validate-change.mjs");
  });

  it("el diff fusionado es el aprobado (sha256) y se prueba el resultado de la fusión, con E2E", () => {
    const verify = job("verify");
    expect(verify).toContain("git diff --no-color --no-ext-diff -M origin/master...HEAD | sha256sum");
    expect(verify).toContain("DIFF_SHA256");
    expect(verify.indexOf("git merge --no-ff")).toBeLessThan(verify.indexOf("pnpm install"));
    expect(verify).toContain("playwright test");
  });

  it("el job de fusión no ejecuta código de la rama y exige master sin cambios", () => {
    const merge = job("merge");
    expect(merge).not.toMatch(/pnpm|node |npm |npx /);
    expect(merge).toContain("needs.verify.outputs.base");
    expect(merge).toContain("git push origin master");
  });

  it("el run lleva el intento en su título y no comparte cola con otros cambios", () => {
    expect(text).toContain("run-name: legal ${{ github.event.client_payload.id }} ${{ github.event.client_payload.attempt }}");
    expect(text).toContain("group: legal-change-${{ github.event.client_payload.id }}");
  });
});
