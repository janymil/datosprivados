import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { decryptBytes, encryptBytes, encryptionKeyFromEnv, isEncrypted } from "../scripts/backup-crypto.mjs";
import { backupDatabase } from "../scripts/backup-db.mjs";
import { restoreDatabase } from "../scripts/restore-db.mjs";

/**
 * Respaldos cifrados: el archivo que sale del servidor contiene datos personales
 * de clientes y de quienes ejercen derechos ARCO. Sin cifrado, una copia filtrada
 * es una brecha notificable. Estas pruebas fijan el formato, la detección de
 * alteraciones y que la retención borre también las copias cifradas.
 */

const KEY = crypto.randomBytes(32);
const OTHER_KEY = crypto.randomBytes(32);
const root = fs.mkdtempSync(path.join(process.cwd(), "test", ".tmp", "backup-"));
const source = process.env.DATOSPRIVADOS_DB!;

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

// La base de pruebas se crea al primer uso (esquema + semillas): el respaldo necesita el archivo.
beforeAll(() => {
  getDb();
  expect(fs.existsSync(source)).toBe(true);
});

describe("cifrado de respaldos", () => {
  it("cifra y descifra sin perder un byte", () => {
    const plain = Buffer.from("datos privados de clientes");
    const sealed = encryptBytes(plain, KEY);
    expect(isEncrypted(sealed)).toBe(true);
    expect(sealed.subarray(0, 8).toString()).toBe("PDPENC01");
    expect(sealed.includes(plain)).toBe(false); // el texto no viaja en claro
    expect(decryptBytes(sealed, KEY).equals(plain)).toBe(true);
  });

  it("rechaza una clave distinta o un archivo alterado", () => {
    const sealed = encryptBytes(Buffer.from("x"), KEY);
    expect(() => decryptBytes(sealed, OTHER_KEY)).toThrow();
    const tampered = Buffer.from(sealed);
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => decryptBytes(tampered, KEY)).toThrow();
  });

  it("no intenta descifrar un archivo que no tiene el formato", () => {
    expect(() => decryptBytes(zlib.gzipSync("no cifrado"), KEY)).toThrow(/formato/);
  });

  it("lee la clave del entorno en base64 o en hex y rechaza largos incorrectos", () => {
    expect(encryptionKeyFromEnv({})).toBeNull();
    const base64 = encryptionKeyFromEnv({ BACKUP_ENCRYPTION_KEY: KEY.toString("base64") })!;
    const hex = encryptionKeyFromEnv({ BACKUP_ENCRYPTION_KEY: KEY.toString("hex") })!;
    expect(base64.equals(KEY)).toBe(true);
    expect(hex.equals(KEY)).toBe(true);
    expect(() => encryptionKeyFromEnv({ BACKUP_ENCRYPTION_KEY: "corta" })).toThrow(/32 bytes/);
  });
});

describe("respaldo y restauración cifrados", () => {
  it("el respaldo cifrado se restaura con la clave y pasa la verificación", () => {
    const dir = path.join(root, "cifrado");
    const backup = backupDatabase({ source, targetDir: dir, encryptionKey: KEY });
    expect(backup.file.endsWith(".db.gz.enc")).toBe(true);
    expect(backup.encrypted).toBe(true);
    expect(fs.readFileSync(backup.file).subarray(0, 8).toString()).toBe("PDPENC01");
    // La copia cifrada no es un gzip legible: el contenido no se puede abrir sin la clave.
    expect(() => zlib.gunzipSync(fs.readFileSync(backup.file))).toThrow();

    const target = path.join(root, "restaurada-cifrada.db");
    restoreDatabase({ backupFile: backup.file, target, encryptionKey: KEY });
    const db = new DatabaseSync(target, { readOnly: true });
    try {
      expect((db.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number }).n).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  it("sin la clave, el respaldo cifrado no se restaura ni deja archivo a medias", () => {
    const dir = path.join(root, "cifrado-2");
    const backup = backupDatabase({ source, targetDir: dir, encryptionKey: KEY });
    const target = path.join(root, "no-debe-existir.db");
    expect(() => restoreDatabase({ backupFile: backup.file, target, encryptionKey: null })).toThrow(/define BACKUP_ENCRYPTION_KEY/);
    expect(fs.existsSync(target)).toBe(false);
  });

  it("un respaldo cifrado alterado se rechaza por sha256 antes de descifrar", () => {
    const dir = path.join(root, "alterado");
    const backup = backupDatabase({ source, targetDir: dir, encryptionKey: KEY });
    const bytes = fs.readFileSync(backup.file);
    bytes[bytes.length - 5] ^= 0xff;
    fs.writeFileSync(backup.file, bytes);
    expect(() => restoreDatabase({ backupFile: backup.file, target: path.join(root, "alterado.db"), encryptionKey: KEY })).toThrow(/sha256/);
  });

  it("sin clave configurada el respaldo sigue siendo válido y restaurable", () => {
    const dir = path.join(root, "claro");
    const backup = backupDatabase({ source, targetDir: dir, encryptionKey: null });
    expect(backup.file.endsWith(".db.gz")).toBe(true);
    expect(backup.encrypted).toBe(false);
    const target = path.join(root, "restaurada-clara.db");
    restoreDatabase({ backupFile: backup.file, target, encryptionKey: null });
    expect(fs.existsSync(target)).toBe(true);
  });

  it("la retención borra copias viejas cifradas y en claro, y conserva las recientes", () => {
    const dir = path.join(root, "retencion");
    fs.mkdirSync(dir, { recursive: true });
    const old = new Date(Date.now() - 30 * 86_400_000);
    const staleGz = path.join(dir, "datosprivados-20260101-000000.db.gz");
    const staleEnc = path.join(dir, "datosprivados-20260101-000000.db.gz.enc");
    fs.writeFileSync(staleGz, "viejo");
    fs.writeFileSync(staleEnc, "viejo");
    fs.utimesSync(staleGz, old, old);
    fs.utimesSync(staleEnc, old, old);

    const fresh = backupDatabase({ source, targetDir: dir, retentionDays: 7, encryptionKey: KEY });
    expect(fs.existsSync(staleGz)).toBe(false);
    expect(fs.existsSync(staleEnc)).toBe(false);
    expect(fs.existsSync(fresh.file)).toBe(true);
    expect(fs.existsSync(`${fresh.file}.sha256`)).toBe(true);
  });
});
