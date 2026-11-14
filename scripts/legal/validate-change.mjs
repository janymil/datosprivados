#!/usr/bin/env node
/**
 * Valida una rama legal/<id> contra master antes de fusionarla.
 *
 *   node --experimental-strip-types scripts/legal/validate-change.mjs <id> <ref-base>
 *
 * Sale con 1 y lista los problemas si la rama no cumple (src/legal/validate-change.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { validateChange } from "../../src/legal/validate-change.ts";

const [id, base = "origin/master"] = process.argv.slice(2);
if (!/^lc-\d{8}-[0-9a-f]{6}$/.test(id ?? "")) {
  console.error("uso: validate-change.mjs <lc-AAAAMMDD-xxxxxx> [ref-base]");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const changedFiles = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
const read = (path) => (fs.existsSync(path) ? fs.readFileSync(path, "utf8") : null);
const readBase = (path) => {
  try {
    return git("show", `${base}:${path}`);
  } catch {
    return null;
  }
};

const problems = validateChange({ id, changedFiles, read, readBase });
if (problems.length) {
  console.error(`El cambio ${id} no se puede fusionar:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`El cambio ${id} cumple las reglas (${changedFiles.length} archivos).`);
