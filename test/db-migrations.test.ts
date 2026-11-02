import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * Migraciones: `getDb()` crea el esquema y aplica los cambios incrementales cada
 * vez que sube `SCHEMA_VERSION`. Estas pruebas comprueban lo que hoy solo se
 * asumía:
 *   1. abrir la misma base dos veces (proceso reiniciado) no cambia nada ni duplica semillas;
 *   2. una base de la versión anterior se actualiza al esquema actual sin perder datos;
 *   3. volver a ejecutar las migraciones sobre una conexión ya abierta es inofensivo.
 *
 * `DB_PATH` se evalúa al importar `lib/db`, así que cada apertura reimporta el
 * módulo después de apuntar `DATOSPRIVADOS_DB` al archivo de la prueba.
 */

type DbGlobals = {
  __datosprivadosDb?: { close(): void };
  __datosprivadosSchemaVersion?: number;
};

const globals = globalThis as unknown as DbGlobals;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "datosprivados-migrations-"));

async function openDb(file: string): Promise<DatabaseSync> {
  globals.__datosprivadosDb?.close();
  globals.__datosprivadosDb = undefined;
  globals.__datosprivadosSchemaVersion = undefined;
  process.env.DATOSPRIVADOS_DB = file;
  vi.resetModules();
  const { getDb } = await import("@/lib/db");
  return getDb();
}

/** Tablas del archivo (sin las internas de SQLite) con sus columnas, ordenadas para comparar. */
function schemaOf(db: DatabaseSync): Record<string, string[]> {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  const schema: Record<string, string[]> = {};
  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string; type: string }[];
    schema[name] = columns.map((column) => `${column.name} ${column.type}`.trim().toUpperCase()).sort();
  }
  return schema;
}

function indexesOf(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

function count(db: DatabaseSync, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

afterAll(() => {
  globals.__datosprivadosDb?.close();
  globals.__datosprivadosDb = undefined;
  fs.rmSync(root, { recursive: true, force: true });
});


/** Esquema de la "versión 1": empresas, usuarios y documentos, sin nada de lo añadido después. */
const LEGACY_SCHEMA = `
  CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ruc TEXT NOT NULL,
    sector TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT 'basico',
    dpo_name TEXT NOT NULL DEFAULT '',
    dpo_email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    published INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
`;

function writeLegacyDb(file: string) {
  const db = new DatabaseSync(file);
  db.exec(LEGACY_SCHEMA);
  db.prepare("INSERT INTO companies (id, name, ruc, sector, slug, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "legacy-1",
    "Antigua S.A.C.",
    "20100000001",
    "Bodega",
    "antigua",
    "hola@antigua.pe",
    "2025-01-02T10:00:00.000Z"
  );
  db.prepare("INSERT INTO users (id, company_id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    "legacy-user",
    "legacy-1",
    "Dueña",
    "duena@antigua.pe",
    "hash",
    "2025-01-02T10:00:00.000Z"
  );
  db.prepare(
    "INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("legacy-doc", "legacy-1", "politica", "Política", "Texto publicado", 3, 1, "2025-02-03T10:00:00.000Z");
  db.close();
}


describe("migraciones de la base", () => {
  it("abrir dos veces la misma base recién creada no la cambia ni duplica las semillas", async () => {
    const file = path.join(root, "clean.db");

    const first = await openDb(file);
    const schema = schemaOf(first);
    const indexes = indexesOf(first);
    const holidays = count(first, "holidays");
    expect(holidays).toBeGreaterThan(0);
    expect(Object.keys(schema)).toEqual(
      expect.arrayContaining(["companies", "users", "documents", "email_outbox", "job_runs", "rate_limits"])
    );

    // Segundo arranque del proceso: `initSchema` y `migrate` vuelven a correr sobre el mismo archivo.
    const second = await openDb(file);
    expect(schemaOf(second)).toEqual(schema);
    expect(indexesOf(second)).toEqual(indexes);
    expect(count(second, "holidays")).toBe(holidays);
    expect(count(second, "companies")).toBe(1); // solo la empresa demo sembrada
  });

  it("una base de la versión anterior llega al esquema actual sin perder datos", async () => {
    const reference = path.join(root, "reference.db");
    const expected = schemaOf(await openDb(reference));

    const file = path.join(root, "legacy.db");
    writeLegacyDb(file);

    const db = await openDb(file);
    expect(schemaOf(db)).toEqual(expected);

    const company = db.prepare("SELECT * FROM companies WHERE id = 'legacy-1'").get() as Record<string, unknown>;
    expect(company.name).toBe("Antigua S.A.C.");
    // Rellenos de las migraciones: el onboarding y el cobro quedan como ya pasados.
    expect(company.onboarded_at).toBe(company.created_at);
    expect(company.billing_status).toBe("active");
    expect(company.billing_term).toBe("monthly");

    const user = db.prepare("SELECT * FROM users WHERE id = 'legacy-user'").get() as Record<string, unknown>;
    expect(user.email).toBe("duena@antigua.pe");
    expect(user.email_verified_at).toBeNull();

    const document = db.prepare("SELECT * FROM documents WHERE id = 'legacy-doc'").get() as Record<string, unknown>;
    expect(document.content).toBe("Texto publicado");
    // Lo que ya estaba publicado se reconoce como la versión publicada vigente.
    expect(document.published_version).toBe(3);
    const versions = db
      .prepare("SELECT * FROM document_versions WHERE document_id = 'legacy-doc'")
      .all() as Array<Record<string, unknown>>;
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(3);
  });

  it("volver a aplicar las migraciones sobre una conexión abierta no rompe nada", async () => {
    const file = path.join(root, "cached.db");
    const db = await openDb(file);
    const schema = schemaOf(db);

    // Simula una recarga en caliente: la conexión sigue en `globalThis` pero la versión no coincide.
    globals.__datosprivadosSchemaVersion = 1;
    const { getDb } = await import("@/lib/db");
    expect(() => getDb()).not.toThrow();
    expect(schemaOf(getDb())).toEqual(schema);
    expect(getDb()).toBe(db);
  });
});
