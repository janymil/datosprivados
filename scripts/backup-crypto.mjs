#!/usr/bin/env node
/**
 * Cifrado de los respaldos en reposo, sin dependencias.
 *
 * Formato: `PDPENC01` (8 bytes) | IV (12) | etiqueta GCM (16) | ciphertext.
 * AES-256-GCM autentica: si alguien altera un byte, el descifrado falla en vez de
 * devolver una base corrupta. La clave va en `BACKUP_ENCRYPTION_KEY` (32 bytes en
 * base64 o 64 hex), fuera del servidor de respaldos y de la carpeta de respaldos:
 *   openssl rand -base64 32
 */
import crypto from "node:crypto";

export const MAGIC = Buffer.from("PDPENC01");
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Clave de 32 bytes desde el entorno, o null si no hay cifrado configurado.
 * @param {Record<string, string | undefined>} [env]
 * @returns {Buffer | null}
 */
export function encryptionKeyFromEnv(env = process.env) {
  const raw = env.BACKUP_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("BACKUP_ENCRYPTION_KEY debe tener 32 bytes (base64 o 64 hex): genera una con `openssl rand -base64 32`.");
  }
  return key;
}

export function isEncrypted(bytes) {
  return Buffer.isBuffer(bytes) && bytes.length >= MAGIC.length && bytes.subarray(0, MAGIC.length).equals(MAGIC);
}

/** @param {Buffer} plain @param {Buffer} key @returns {Buffer} */
export function encryptBytes(plain, key) {
  if (!key || key.length !== 32) throw new Error("Falta BACKUP_ENCRYPTION_KEY (32 bytes) para cifrar el respaldo.");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

/** @param {Buffer} payload @param {Buffer | null | undefined} key @returns {Buffer} */
export function decryptBytes(payload, key) {
  if (!isEncrypted(payload)) throw new Error("El archivo no tiene el formato cifrado de los respaldos.");
  if (!key || key.length !== 32) throw new Error("El respaldo está cifrado: define BACKUP_ENCRYPTION_KEY para restaurarlo.");
  const iv = payload.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = payload.subarray(MAGIC.length + IV_BYTES, MAGIC.length + IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload.subarray(MAGIC.length + IV_BYTES + TAG_BYTES)), decipher.final()]);
}
