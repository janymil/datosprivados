#!/usr/bin/env node
/**
 * Descarga una norma oficial, la separa por artículo y la escribe en legal/library/<id>/.
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
import { splitArticles } from "../../src/legal/library/split.ts";

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
execFileSync("pdftotext", ["-raw", "-enc", "UTF-8", pdf, txt]);
const raw = fs.readFileSync(txt, "utf8").normalize("NFKC");

// La norma empieza en la N-ésima aparición del marcador (antes puede haber un índice o el decreto aprobatorio).
const startRe = new RegExp(source.start, "gm");
let match;
for (let n = 0; n < source.startOccurrence; n++) {
  match = startRe.exec(raw);
  if (!match) throw new Error(`${id}: no aparece la ocurrencia ${n + 1} de ${source.start}`);
}
const articles = splitArticles(raw.slice(match.index), {
  start: new RegExp(source.start, "m"),
  end: source.end ? new RegExp(source.end, "m") : undefined,
});

const dir = path.join(root, "legal/library", id);
fs.mkdirSync(dir, { recursive: true });
const norm = {
  id,
  ...source.norm,
  officialUrl: source.url,
  sourceSha256,
  retrievedAt: new Date().toISOString().slice(0, 10),
};
const ordered = Object.fromEntries(
  ["id", "title", "type", "number", "publishedAt", "officialUrl", "sourceSha256", "retrievedAt", "status", "consolidated", "amendedBy", "aliases"].map((k) => [k, norm[k]])
);
fs.writeFileSync(path.join(dir, "norm.json"), `${JSON.stringify(ordered, null, 2)}\n`);
fs.writeFileSync(path.join(dir, "articles.json"), `${JSON.stringify(articles, null, 1)}\n`);
console.log(`${id}: ${articles.length} artículos · sha256 ${sourceSha256.slice(0, 12)} · ${dir}`);
