#!/usr/bin/env node
/**
 * Descarga una norma oficial, la separa por artículo (o por punto numerado, `sections`, en las
 * directivas) y la escribe en legal/library/<id>/.
 *
 *   node --experimental-strip-types scripts/legal/ingest.mjs <id>
 *
 * El PDF no se versiona: queda en /var/lib/datosprivados/legal-sources/<id>/source.pdf
 * (LEGAL_SOURCES_DIR para cambiarlo) y norm.json registra su URL y su sha256.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { articlesFromText, normRecord } from "../../src/legal/library/ingest.ts";

const id = process.argv[2];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const sources = JSON.parse(fs.readFileSync(path.join(root, "scripts/legal/sources.json"), "utf8"));
const source = sources[id];
if (!source) {
  console.error(`uso: ingest.mjs <id>; ids conocidos: ${Object.keys(sources).join(", ")}`);
  process.exit(1);
}

const store = path.join(process.env.LEGAL_SOURCES_DIR || "/var/lib/datosprivados/legal-sources", id);
fs.mkdirSync(store, { recursive: true });
const pdf = path.join(store, "source.pdf");
execFileSync("curl", ["-sSfL", "-m", "120", "-A", "Mozilla/5.0", "-o", pdf, source.url], { stdio: "inherit" });
const sourceSha256 = crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex");
const txt = path.join(store, "source.txt");
// -raw: orden de lectura del contenido; sin él, los encabezados de las columnas justificadas se parten (DS 016-2024-JUS arts. 18 y 33).
// `extract: "default"` (sin -raw) para PDFs justificados donde -raw pega palabras (ediciones de Indecopi).
execFileSync("pdftotext", [...(source.extract === "default" ? [] : ["-raw"]), "-enc", "UTF-8", pdf, txt]);
const raw = fs.readFileSync(txt, "utf8").normalize("NFKC");
const articles = articlesFromText(raw, source, id);

const dir = path.join(root, "legal/library", id);
fs.mkdirSync(dir, { recursive: true });
const ordered = normRecord(id, source, sourceSha256, new Date().toISOString().slice(0, 10));
fs.writeFileSync(path.join(dir, "norm.json"), `${JSON.stringify(ordered, null, 2)}\n`);
fs.writeFileSync(path.join(dir, "articles.json"), `${JSON.stringify(articles, null, 1)}\n`);
console.log(`${id}: ${articles.length} artículos · sha256 ${sourceSha256.slice(0, 12)} · ${dir}`);
