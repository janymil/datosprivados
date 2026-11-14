#!/usr/bin/env node
/**
 * Registra la rama de corrección actual (legal/<tema>) como cambio legal para que el
 * fundador lo apruebe en /operador/legal (motor legal, plan 5).
 *
 *   node --experimental-strip-types scripts/legal/propose-change.mjs \
 *     --title "Citar el art. III.6 en vez del 2.6" --summary-file /tmp/por-que.md \
 *     --findings a1b2c3d4e5f6,0f9e8d7c6b5a
 *
 * Pasos: id → legal/changes/<id>.md → commit → push → diff exacto contra origin/master →
 * POST ${LEGAL_API_URL:-http://127.0.0.1:3000}/api/legal/changes con el bearer CRON_SECRET.
 * Requiere el árbol limpio y que la rama cumpla las reglas (src/legal/validate-change.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { changeLog, newChangeId, proposalPayload } from "../../src/legal/propose.ts";
import { validateChange } from "../../src/legal/validate-change.ts";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const fail = (message) => {
  console.error(`propose-change: ${message}`);
  process.exit(1);
};

const { values } = parseArgs({
  options: { title: { type: "string" }, "summary-file": { type: "string" }, findings: { type: "string", default: "" } },
});
if (!values.title || !values["summary-file"]) fail("faltan --title y --summary-file");
const summary = fs.readFileSync(values["summary-file"], "utf8").trim();
if (!summary) fail("el resumen está vacío");
const secret = process.env.CRON_SECRET;
if (!secret) fail("falta CRON_SECRET en el entorno");

const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim();
if (!/^legal\/[a-z0-9-]+$/.test(branch)) fail(`hay que estar en una rama legal/<tema> (estás en ${branch})`);
if (git("status", "--porcelain").trim()) fail("el árbol tiene cambios sin commit");

// Hallazgos: id → fuente, del informe más reciente.
const auditDir = path.join(process.cwd(), "legal", "audit");
const latest = fs.existsSync(auditDir) ? fs.readdirSync(auditDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop() : undefined;
const report = latest ? JSON.parse(fs.readFileSync(path.join(auditDir, latest), "utf8")) : { findings: [] };
const ids = values.findings.split(",").map((s) => s.trim()).filter(Boolean);
const findings = ids.map((id) => {
  const found = report.findings.find((f) => f.id === id);
  if (!found) fail(`hallazgo ${id} no está en legal/audit/${latest ?? "(sin informe)"}`);
  return { id, source: found.source };
});

const id = newChangeId();
const log = `legal/changes/${id}.md`;
fs.mkdirSync(path.dirname(log), { recursive: true });
fs.writeFileSync(log, changeLog({ id, title: values.title, summary, findings: ids }));
git("add", log);
git("commit", "-q", "-m", `legal: registro del cambio ${id}`);

git("fetch", "-q", "origin", "master");
const changedFiles = git("diff", "--name-only", "origin/master...HEAD").split("\n").filter(Boolean);
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
const readBase = (p) => {
  try {
    return git("show", `origin/master:${p}`);
  } catch {
    return null;
  }
};
const problems = validateChange({ id, changedFiles, read, readBase });
if (problems.length) fail(`la rama no cumple las reglas (el commit del registro queda local):\n- ${problems.join("\n- ")}`);

git("push", "-q", "origin", `HEAD:refs/heads/${branch}`);
const headSha = git("rev-parse", "HEAD").trim();
const diff = git("diff", "--no-color", "--no-ext-diff", "-M", `origin/master...${headSha}`);

const url = `${(process.env.LEGAL_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "")}/api/legal/changes`;
const response = await fetch(url, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
  body: JSON.stringify(proposalPayload({ id, title: values.title, summary, branch, headSha, diff, findings })),
});
const body = await response.json().catch(() => ({}));
if (!response.ok) fail(`el registro respondió ${response.status}: ${body.error ?? "sin detalle"} (la rama ya está en GitHub; corrige y vuelve a registrar)`);
console.log(`Cambio ${body.id} (${body.status}): /operador/legal/${body.id}`);
