#!/usr/bin/env node
// Crea en una base de STAGING/local una empresa activa con datos y una sesión, para medir rendimiento.
// Uso: DATOSPRIVADOS_DB=/ruta/staging.db node scripts/perf-seed.mjs   → imprime el slug y la cookie de sesión.
// La base debe existir ya (arranca la app una vez para que migre). Nunca apuntar a producción.
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

const file = process.env.DATOSPRIVADOS_DB;
if (!file) throw new Error("Define DATOSPRIVADOS_DB (base de staging).");
if (/datosprivados\.db$/.test(file) && !process.env.PERF_ALLOW_REAL_NAME) {
  // Salvaguarda: la base real del preview se llama así. Staging debe usar otra ruta.
  throw new Error("Este nombre de base parece la real; usa una ruta de staging o define PERF_ALLOW_REAL_NAME=1.");
}
const db = new DatabaseSync(file);
const id = () => crypto.randomUUID();
const now = new Date().toISOString();
const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const companyId = id();
const userId = id();
const slug = `perf-${companyId.slice(0, 6)}`;

db.prepare(
  `INSERT INTO companies (id, name, ruc, sector, slug, email, phone, address, plan, billing_term, billing_status, paid_until, dpo_name, dpo_email, onboarded_at, created_at)
   VALUES (?, 'Empresa Carga S.A.C.', '20604567891', 'Tienda online / e-commerce', ?, ?, '', 'Av. Principal 100, Lima', 'pro', 'monthly', 'active', ?, 'Responsable', ?, ?, ?)`
).run(companyId, slug, `perf-${slug}@example.com`, future, `perf-${slug}@example.com`, now, now);
db.prepare("INSERT INTO users (id, company_id, name, email, password_hash, role, created_at) VALUES (?, ?, 'Responsable', ?, 'x', 'admin', ?)").run(userId, companyId, `perf-${slug}@example.com`, now);
const sessionId = crypto.randomUUID();
db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, userId, future);
console.log(JSON.stringify({ slug, session: sessionId }));
