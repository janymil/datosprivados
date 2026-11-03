#!/usr/bin/env node
// Copia consistente de la base SQLite mientras la app está en marcha.
// Uso: node scripts/backup-db.mjs [directorio-destino]
// Variables: DATOSPRIVADOS_DB (origen), BACKUP_RETENTION_DAYS (por defecto 7),
//            BACKUP_ENCRYPTION_KEY (32 bytes en base64 o 64 hex → respaldo cifrado).
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { encryptBytes, encryptionKeyFromEnv } from "./backup-crypto.mjs";

const source = path.resolve(process.env.DATOSPRIVADOS_DB ?? path.join(process.cwd(), "data", "datosprivados.db"));
const targetDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "backups"));
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 7);

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

/**
 * Respaldo + verificación + (opcional) cifrado + retención.
 * `encryptionKey === undefined` toma `BACKUP_ENCRYPTION_KEY`; pasa `null` para
 * forzar un respaldo en claro (pruebas, máquinas sin la clave).
 * @param {{ source: string, targetDir: string, retentionDays?: number, now?: Date, encryptionKey?: Buffer | null }} options
 */
export function backupDatabase({ source, targetDir, retentionDays = 7, now = new Date(), encryptionKey = undefined }) {
  if (!fs.existsSync(source)) throw new Error(`No existe la base: ${source}`);
  const key = encryptionKey === undefined ? encryptionKeyFromEnv() : encryptionKey;
  fs.mkdirSync(targetDir, { recursive: true });

  const base = `datosprivados-${stamp(now)}`;
  const tmpDb = path.join(targetDir, `${base}.db.tmp`);
  const outFile = path.join(targetDir, key ? `${base}.db.gz.enc` : `${base}.db.gz`);

  // VACUUM INTO produce una copia consistente aunque haya escrituras en curso (WAL).
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${tmpDb.replaceAll("'", "''")}'`);
  } finally {
    db.close();
  }

  const copy = new DatabaseSync(tmpDb, { readOnly: true });
  let integrity;
  try {
    integrity = copy.prepare("PRAGMA integrity_check").get();
  } finally {
    copy.close();
  }
  if (integrity?.integrity_check !== "ok") {
    fs.rmSync(tmpDb, { force: true });
    throw new Error(`La copia no pasó integrity_check: ${JSON.stringify(integrity)}`);
  }

  const raw = fs.readFileSync(tmpDb);
  const gzipped = zlib.gzipSync(raw, { level: 9 });
  // Se cifra el gzip ya comprimido: el compresor no ve texto plano de más tamaño.
  fs.writeFileSync(outFile, key ? encryptBytes(gzipped, key) : gzipped);
  fs.rmSync(tmpDb, { force: true });
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(outFile)).digest("hex");
  fs.writeFileSync(`${outFile}.sha256`, `${sha256}  ${path.basename(outFile)}\n`);
  // Un respaldo es la base entera: datos personales de todos los clientes. Se deja en 600
  // aunque el directorio ya sea 700, para que un cambio de permisos del directorio (o
  // mover los archivos) no lo exponga al resto de usuarios de la máquina. El 2026-11-03
  // estaban en 644 (y la base viva también).
  for (const file of [outFile, `${outFile}.sha256`]) fs.chmodSync(file, 0o600);

  // Retención: se borran respaldos más viejos que el plazo, cifrados o no.
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(targetDir)) {
    if (!/^datosprivados-.*\.db\.gz(\.enc)?(\.sha256)?$/.test(name)) continue;
    const full = path.join(targetDir, name);
    if (fs.statSync(full).mtimeMs < cutoff) fs.rmSync(full, { force: true });
  }

  return { file: outFile, bytes: fs.statSync(outFile).size, sha256, encrypted: Boolean(key) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = backupDatabase({ source, targetDir, retentionDays });
    console.log(`OK ${result.file} (${result.bytes} bytes${result.encrypted ? ", cifrado" : ", SIN cifrar"}) sha256=${result.sha256}`);
  } catch (error) {
    console.error(`FALLO: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
