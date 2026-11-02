#!/usr/bin/env node
// Restaura un respaldo verificando su sha256 y su integridad. Si el respaldo está
// cifrado (`.db.gz.enc`), descifra con BACKUP_ENCRYPTION_KEY.
// Uso: node scripts/restore-db.mjs <respaldo.db.gz[.enc]> <destino.db>
// No sobrescribe un destino existente.
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { decryptBytes, encryptionKeyFromEnv } from "./backup-crypto.mjs";

/** Restaura un respaldo verificado. `encryptionKey` vacío toma `BACKUP_ENCRYPTION_KEY`.
 * @param {{ backupFile: string, target: string, encryptionKey?: Buffer | null }} options
 */
export function restoreDatabase({ backupFile, target, encryptionKey = undefined }) {
  if (!fs.existsSync(backupFile)) throw new Error(`No existe el respaldo: ${backupFile}`);
  if (fs.existsSync(target)) throw new Error(`El destino ya existe, no se sobrescribe: ${target}`);

  const payload = fs.readFileSync(backupFile);
  const shaFile = `${backupFile}.sha256`;
  if (fs.existsSync(shaFile)) {
    const expected = fs.readFileSync(shaFile, "utf8").split(/\s+/)[0];
    // El sha256 se comprueba ANTES de descifrar: detecta un archivo alterado sin gastar la clave.
    const actual = crypto.createHash("sha256").update(payload).digest("hex");
    if (expected !== actual) throw new Error("El sha256 del respaldo no coincide: archivo dañado o alterado.");
  }

  const key = encryptionKey === undefined ? encryptionKeyFromEnv() : encryptionKey;
  const compressed = backupFile.endsWith(".enc") ? decryptBytes(payload, key) : payload;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zlib.gunzipSync(compressed));

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
    if (!backupFile || !target) throw new Error("Uso: node scripts/restore-db.mjs <respaldo.db.gz[.enc]> <destino.db>");
    restoreDatabase({ backupFile: path.resolve(backupFile), target: path.resolve(target) });
    console.log(`OK restaurado en ${target}`);
  } catch (error) {
    console.error(`FALLO: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
