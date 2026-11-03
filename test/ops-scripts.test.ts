import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * Scripts de operación que no son de la app (`scripts/*.mjs`) y hasta ahora no tenían
 * ninguna prueba. Importan porque se ejecutan justo cuando algo va mal: un borrado de
 * base, una siembra de rendimiento, una prueba de carga.
 *
 * Lo que se fija aquí: que todos compilen (`node --check`), que `reset-db.mjs` no
 * pueda borrar una base sin confirmación ni en producción, y que `perf-seed.mjs`
 * siga negándose a escribir en un archivo con el nombre de la base real.
 */

const repo = process.cwd();
const scripts = path.join(repo, "scripts");
let sandbox = "";

/** Ejecuta un script del repo en un directorio temporal, con el entorno que se le pase. */
function run(script: string, args: string[] = [], env: Record<string, string | undefined> = {}, cwd = sandbox) {
  // `NODE_ENV` es obligatorio en el tipo global del proyecto; se fija en "test" salvo
  // que el caso quiera probar justo lo contrario (el freno de producción).
  const base: NodeJS.ProcessEnv = { NODE_ENV: "test", PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" };
  try {
    const stdout = execFileSync(process.execPath, [path.join(scripts, script), ...args], {
      cwd,
      env: { ...base, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return { code: failure.status ?? 1, output: `${failure.stdout?.toString() ?? ""}${failure.stderr?.toString() ?? ""}` };
  }
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "dp-ops-"));
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

/** Crea `data/datosprivados.db` (+ wal/shm) con contenido, para ver si el script los toca. */
function seedDb(dir = path.join(sandbox, "data", "datosprivados.db")) {
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) fs.writeFileSync(`${dir}${suffix}`, "x");
  return dir;
}

const exists = (file: string) => fs.existsSync(file);

describe("scripts de operación: sintaxis", () => {
  for (const script of ["reset-db.mjs", "perf-seed.mjs", "loadtest.mjs", "weekly-report.mjs", "verify-video-claims.mjs", "backup-db.mjs", "restore-db.mjs", "restore-drill.mjs", "scan-secrets.mjs"]) {
    it(`${script} compila`, () => {
      expect(() => execFileSync(process.execPath, ["--check", path.join(scripts, script)], { stdio: "pipe" })).not.toThrow();
    });
  }
});

describe("reset-db.mjs (borra la base: se prueba el freno, no la prisa)", () => {
  it("sin --yes informa y sale 1 sin borrar nada", () => {
    const db = seedDb();
    const result = run("reset-db.mjs");

    expect(result.code).toBe(1);
    expect(result.output).toContain("Añade --yes");
    expect(result.output).toContain("borraría");
    expect(exists(db)).toBe(true);
    expect(exists(`${db}-wal`)).toBe(true);
  });

  it("--dry-run sale 0 y no borra", () => {
    const db = seedDb();
    const result = run("reset-db.mjs", ["--dry-run"]);

    expect(result.code).toBe(0);
    expect(result.output).toContain("Simulacro");
    expect(exists(db)).toBe(true);
  });

  it("--yes borra la base y sus archivos auxiliares, y nada más", () => {
    const db = seedDb();
    const other = path.join(sandbox, "data", "otra.db");
    fs.writeFileSync(other, "no tocar");

    const result = run("reset-db.mjs", ["--yes"]);

    expect(result.code).toBe(0);
    expect(exists(db)).toBe(false);
    expect(exists(`${db}-wal`)).toBe(false);
    expect(exists(`${db}-shm`)).toBe(false);
    expect(exists(other)).toBe(true);
    expect(result.output).toContain("Base reiniciada");
  });

  it("en producción se niega aunque lleve --yes (un borrado no tiene vuelta atrás)", () => {
    const db = seedDb();
    const result = run("reset-db.mjs", ["--yes"], { NODE_ENV: "production" });

    expect(result.code).toBe(1);
    expect(result.output).toContain("NODE_ENV=production");
    expect(exists(db)).toBe(true);
  });

  it("respeta DATOSPRIVADOS_DB en lugar de borrar ./data por costumbre", () => {
    const inside = seedDb(path.join(sandbox, "otra-ruta.db"));
    const result = run("reset-db.mjs", ["--yes"], { DATOSPRIVADOS_DB: "otra-ruta.db" });

    expect(result.code).toBe(0);
    expect(exists(inside)).toBe(false);
  });

  it("no borra fuera del proyecto sin --force", () => {
    const outside = seedDb(path.join(os.tmpdir(), `dp-fuera-${Date.now()}`, "datosprivados.db"));
    const result = run("reset-db.mjs", ["--yes"], { DATOSPRIVADOS_DB: outside });

    expect(result.code).toBe(1);
    expect(result.output).toContain("está fuera de");
    expect(exists(outside)).toBe(true);

    const forced = run("reset-db.mjs", ["--yes", "--force"], { DATOSPRIVADOS_DB: outside });
    expect(forced.code).toBe(0);
    expect(exists(outside)).toBe(false);
  });

  it("un argumento desconocido es error de uso (2)", () => {
    const result = run("reset-db.mjs", ["--todo"]);
    expect(result.code).toBe(2);
    expect(result.output).toContain("Argumento desconocido");
  });
});

describe("loadtest.mjs (prueba de carga)", () => {
  it("sin URL explica el uso en vez de fallar con un TypeError", () => {
    const result = run("loadtest.mjs");
    expect(result.code).toBe(2);
    expect(result.output).toContain("Uso: node scripts/loadtest.mjs <url>");
  });

  it("con una URL inválida también explica, y no arranca la carga", () => {
    const result = run("loadtest.mjs", ["no-es-una-url"]);
    expect(result.code).toBe(2);
    expect(result.output).toContain("URL inválida");
  });
});

describe("perf-seed.mjs (siembra una base de pruebas)", () => {
  it("se niega a escribir en un archivo con el nombre de la base real", () => {
    const db = seedDb(path.join(sandbox, "datosprivados.db"));
    const result = run("perf-seed.mjs", [], { DATOSPRIVADOS_DB: db });

    expect(result.code).not.toBe(0);
    expect(result.output).toContain("parece la real");
  });

  it("sin DATOSPRIVADOS_DB no hace nada y lo explica", () => {
    const result = run("perf-seed.mjs");
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("Define DATOSPRIVADOS_DB");
  });
});
