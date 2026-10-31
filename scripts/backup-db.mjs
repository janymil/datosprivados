#!/usr/bin/env node
// Copia consistente de la base SQLite mientras la app está en marcha.
// Uso: node scripts/backup-db.mjs [directorio-destino]
// Variables: DATOSPRIVADOS_DB (origen), BACKUP_RETENTION_DAYS (por defecto 7).
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const source = path.resolve(process.env.DATOSPRIVADOS_DB ?? path.join(process.cwd(), "data", "datosprivados.db"));
const targetDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "backups"));
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 7);

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

export function backupDatabase({ source, targetDir, retentionDays = 7, now = new Date() }) {
  if (!fs.existsSync(source)) throw new Error(`No existe la base: ${source}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const base = `datosprivados-${stamp(now)}`;
  const tmpDb = path.join(targetDir, `${base}.db.tmp`);
  const outFile = path.join(targetDir, `${base}.db.gz`);

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
  fs.writeFileSync(outFile, zlib.gzipSync(raw, { level: 9 }));
  fs.rmSync(tmpDb, { force: true });
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(outFile)).digest("hex");
  fs.writeFileSync(`${outFile}.sha256`, `${sha256}  ${path.basename(outFile)}\n`);

  // Retención: se borran respaldos más viejos que el plazo.
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(targetDir)) {
    if (!/^datosprivados-.*\.db\.gz(\.sha256)?$/.test(name)) continue;
    const full = path.join(targetDir, name);
    if (fs.statSync(full).mtimeMs < cutoff) fs.rmSync(full, { force: true });
  }

  return { file: outFile, bytes: fs.statSync(outFile).size, sha256 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = backupDatabase({ source, targetDir, retentionDays });
    console.log(`OK ${result.file} (${result.bytes} bytes) sha256=${result.sha256}`);
  } catch (error) {
    console.error(`FALLO: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
