#!/usr/bin/env node
// Restaura un respaldo verificando su sha256 y su integridad.
// Uso: node scripts/restore-db.mjs <respaldo.db.gz> <destino.db>
// No sobrescribe un destino existente.
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export function restoreDatabase({ backupFile, target }) {
  if (!fs.existsSync(backupFile)) throw new Error(`No existe el respaldo: ${backupFile}`);
  if (fs.existsSync(target)) throw new Error(`El destino ya existe, no se sobrescribe: ${target}`);

  const shaFile = `${backupFile}.sha256`;
  if (fs.existsSync(shaFile)) {
    const expected = fs.readFileSync(shaFile, "utf8").split(/\s+/)[0];
    const actual = crypto.createHash("sha256").update(fs.readFileSync(backupFile)).digest("hex");
    if (expected !== actual) throw new Error("El sha256 del respaldo no coincide: archivo dañado o alterado.");
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zlib.gunzipSync(fs.readFileSync(backupFile)));

  const db = new DatabaseSync(target, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (integrity?.integrity_check !== "ok") throw new Error("La base restaurada no pasó integrity_check.");
  } finally {
    db.close();
  }
  return { target };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const [backupFile, target] = process.argv.slice(2);
    if (!backupFile || !target) throw new Error("Uso: node scripts/restore-db.mjs <respaldo.db.gz> <destino.db>");
    restoreDatabase({ backupFile: path.resolve(backupFile), target: path.resolve(target) });
    console.log(`OK restaurado en ${target}`);
  } catch (error) {
    console.error(`FALLO: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
