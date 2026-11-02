#!/usr/bin/env node
/**
 * Escaneo de secretos sin dependencias (`pnpm scan:secrets`), equivalente mínimo
 * a gitleaks para lo que este repositorio puede filtrar: claves privadas y
 * tokens con prefijo reconocible. Corre en CI y en local.
 *
 * Reglas de diseño:
 * - Solo informa archivo, línea y tipo de hallazgo: **nunca** imprime el valor.
 * - Escanea lo que está versionado (`git ls-files`), no el árbol entero: es lo
 *   que se publica.
 * - Los archivos de ejemplo/documentación que sí llevan un token ficticio van en
 *   `ALLOW` con su motivo.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

export const PATTERNS = [
  { name: "clave privada", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "token de Resend", re: /whsec_[A-Za-z0-9]{20,}/ },
  { name: "token de MercadoPago", re: /\b(?:APP_USR|TEST)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
  { name: "clave de OpenAI o Anthropic", re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}/ },
  { name: "clave de AWS", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "token de GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "token de Slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
];

/** Archivos con valores ficticios a propósito (patrón → motivo). */
export const ALLOW = [
  { file: "docs/MERCADOPAGO-SANDBOX.md", reason: "credenciales de sandbox documentadas; el archivo no se versiona" },
];

const SKIP = /^(?:pnpm-lock\.yaml|node_modules\/|\.next\/|playwright-report\/|test-results\/|\.deploy\/)/;
const MAX_BYTES = 512 * 1024;

/** Busca patrones en un texto. Devuelve líneas (sin el valor del secreto). */
export function scanText(text) {
  const found = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of PATTERNS) {
      if (pattern.re.test(lines[index])) found.push({ line: index + 1, name: pattern.name });
    }
  }
  return found;
}

export function scanFiles(files) {
  const findings = [];
  for (const file of files) {
    if (SKIP.test(file)) continue;
    if (ALLOW.some((entry) => entry.file === file)) continue;
    let text;
    try {
      if (fs.statSync(file).size > MAX_BYTES) continue;
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue; // binario
    for (const hit of scanText(text)) findings.push({ file, ...hit });
  }
  return findings;
}

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = scanFiles(trackedFiles());
  if (findings.length === 0) {
    console.log("[scan-secrets] sin hallazgos");
  } else {
    for (const finding of findings) console.error(`[scan-secrets] ${finding.file}:${finding.line} — ${finding.name}`);
    console.error(`[scan-secrets] ${findings.length} hallazgo(s). Rota el secreto y quítalo del historial.`);
    process.exitCode = 1;
  }
}
