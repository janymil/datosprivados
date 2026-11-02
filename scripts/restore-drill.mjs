#!/usr/bin/env node
// Simulacro mensual de restauración (Fase 7): restaura el respaldo más reciente en una ruta
// temporal, verifica integridad y que los datos básicos estén, y borra la copia.
// Uso: node scripts/restore-drill.mjs [directorio-de-respaldos]   (por defecto BACKUP_DIR)
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { restoreDatabase } from "./restore-db.mjs";

export function latestBackup(dir) {
  const files = fs.readdirSync(dir).filter((name) => /^datosprivados-.*\.db\.gz(\.enc)?$/.test(name));
  if (!files.length) throw new Error(`No hay respaldos en ${dir}`);
  return files.map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs })).sort((a, b) => b.mtime - a.mtime)[0].name;
}

export function restoreDrill({ dir, now = new Date() }) {
  const name = latestBackup(dir);
  const backupFile = path.join(dir, name);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "restore-drill-"));
  const target = path.join(scratch, "drill.db");
  const started = Date.now();
  try {
    restoreDatabase({ backupFile, target });
    const db = new DatabaseSync(target, { readOnly: true });
    try {
      const n = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
      const tables = { companies: n("companies"), users: n("users"), payments: n("payments"), arco_requests: n("arco_requests") };
      if (!tables.users) throw new Error("La base restaurada no tiene usuarios: respaldo sospechoso.");
      return {
        ok: true,
        backup: name,
        backup_age_hours: Math.round((now.getTime() - fs.statSync(backupFile).mtimeMs) / 36_000) / 100,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        tables,
      };
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const dir = path.resolve(process.argv[2] ?? process.env.BACKUP_DIR ?? "backups");
    console.log(JSON.stringify(restoreDrill({ dir }), null, 2));
  } catch (error) {
    console.error(`FALLO el simulacro: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
