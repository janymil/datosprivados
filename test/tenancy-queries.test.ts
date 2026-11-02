import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";

/**
 * Guardia de tenencia en el código, no solo en las pruebas de acciones.
 *
 * Recorre las cadenas con SQL de `src/app/**` (páginas, Server Actions y
 * manejadores de ruta: todo lo que un usuario puede alcanzar) y falla si una
 * consulta toca una tabla con `company_id` sin filtrar por `company_id`.
 * Las excepciones van abajo, una por una y con su motivo: si alguien añade una
 * consulta nueva sin empresa, esta prueba lo detecta.
 *
 * Quedan fuera los módulos de sistema (`src/lib/jobs.ts`, `mail.ts`, `billing.ts`…),
 * que recorren todas las empresas a propósito desde una tarea programada.
 */

const ROOT = path.join(process.cwd(), "src", "app");

/** Excepciones: consulta por la fila del propio usuario autenticado. */
const ALLOWED: Array<{ file: string; sql: string; reason: string }> = [
  {
    file: "src/app/actions/account.ts",
    sql: "SELECT password_hash FROM users WHERE id = ?",
    reason: "re-autenticación: el id sale de la sesión, no de la petición",
  },
  {
    file: "src/app/app/ajustes/page.tsx",
    sql: "SELECT email_verified_at FROM users WHERE id = ?",
    reason: "estado del propio usuario de la sesión",
  },
  {
    file: "src/app/actions/auth.ts",
    sql: "SELECT id FROM users WHERE lower(email) = lower(?)",
    reason: "registro: aún no hay sesión ni empresa; se busca por correo único",
  },
];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Tablas que pertenecen a una empresa, según el esquema real de la base. */
function tenantTables(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  return rows
    .filter(({ name }) => (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).some((column) => column.name === "company_id"))
    .map(({ name }) => name);
}

const LITERAL = /`[^`]*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;
const TABLE = /\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/gi;
const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

function sqlLiterals(source: string): string[] {
  return [...source.matchAll(LITERAL)]
    .map((match) => match[0].slice(1, -1)) // sin las comillas que lo delimitan
    .filter((literal) => /\b(FROM|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(literal))
    .map(normalize);
}

describe("toda consulta de una pantalla filtra por empresa", () => {
  it("ninguna consulta de src/app toca una tabla con company_id sin company_id", () => {
    const tenant = tenantTables();
    expect(tenant).toEqual(expect.arrayContaining(["documents", "arco_requests", "incidents", "data_banks"]));

    const allowed = new Set(ALLOWED.map((entry) => `${entry.file}::${normalize(entry.sql)}`));
    const found: string[] = [];
    const offenders: string[] = [];
    let inspected = 0;

    for (const file of files(ROOT)) {
      const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
      for (const sql of sqlLiterals(fs.readFileSync(file, "utf8"))) {
        const tables = new Set([...sql.matchAll(TABLE)].map((match) => match[1].toLowerCase()).filter((name) => tenant.includes(name)));
        if (!tables.size) continue;
        inspected += 1;
        if (/\bcompany_id\b/.test(sql)) continue;
        if (allowed.has(`${relative}::${sql}`)) {
          found.push(relative);
          continue;
        }
        offenders.push(`${relative}: ${sql}`);
      }
    }

    expect(offenders).toEqual([]);
    // Si el rastreo deja de encontrar consultas, la prueba estaría pasando en vacío.
    expect(inspected).toBeGreaterThan(20);
    // Y cada excepción sigue existiendo: si se corrige, hay que borrarla de la lista.
    expect(new Set(found)).toEqual(new Set(ALLOWED.map((entry) => entry.file)));
  });
});
