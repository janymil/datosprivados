import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * `scripts/deploy.sh` (área 18). El script nunca se ha ejecutado en un servidor real,
 * así que lo que sí se puede probar aquí es lo que evita el desastre a media noche:
 * que sea sintácticamente válido y que `--check` compruebe los requisitos **sin
 * cambiar nada** (sin instalar, sin respaldar, sin compilar, sin reiniciar).
 *
 * Se ejecuta contra una copia en un directorio temporal con un `pm2` falso en el
 * PATH: así se prueba la lógica real del script sin tocar este servidor.
 */

const repo = process.cwd();
const script = path.join(repo, "scripts/deploy.sh");
let sandbox = "";
let binDir = "";

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "dp-deploy-"));
  binDir = path.join(sandbox, "bin");
  fs.mkdirSync(path.join(sandbox, "scripts"), { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.copyFileSync(script, path.join(sandbox, "scripts/deploy.sh"));
  fs.chmodSync(path.join(sandbox, "scripts/deploy.sh"), 0o755);
  // pm2 falso: `pm2 describe <app>` sale con 0 (la app existe).
  fs.writeFileSync(path.join(binDir, "pm2"), "#!/bin/sh\nexit 0\n");
  fs.chmodSync(path.join(binDir, "pm2"), 0o755);
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

function run(args: string[] = [], cwd = sandbox) {
  try {
    const stdout = execFileSync("bash", [path.join(cwd, "scripts/deploy.sh"), ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, BACKUP_DIR: path.join(sandbox, "backups") },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

describe("scripts/deploy.sh", () => {
  it("es sintácticamente válido (bash -n)", () => {
    expect(() => execFileSync("bash", ["-n", script], { stdio: "pipe" })).not.toThrow();
  });

  it("--check con todo en su sitio: sale 0 y NO cambia nada", () => {
    fs.writeFileSync(path.join(sandbox, "package.json"), '{"name":"x","private":true}');
    const result = run(["--check"]);

    expect(result.code).toBe(0);
    expect(result.output).toContain("todo listo para desplegar");
    expect(result.output).toContain("ok     la app datosprivados existe en pm2");

    // Nada de lo caro se ejecutó: ni pruebas, ni build, ni intercambio de .next.
    expect(result.output).not.toContain("pruebas y tipos");
    expect(result.output).not.toContain("compilando en copia");
    expect(result.output).not.toContain("intercambiando");
    expect(fs.existsSync(path.join(sandbox, ".deploy"))).toBe(false);
    expect(fs.existsSync(path.join(sandbox, ".next"))).toBe(false);
  });

  it("--check sin package.json (directorio equivocado): sale 1 y lo dice", () => {
    const result = run(["--check"]);
    expect(result.code).toBe(1);
    expect(result.output).toContain("FALTA  package.json");
    expect(result.output).toContain("faltan requisitos: NO se despliega");
  });

  it("--check avisa si la app no está registrada en pm2", () => {
    fs.writeFileSync(path.join(sandbox, "package.json"), '{"name":"x","private":true}');
    // pm2 falso que falla, como cuando PM2_APP está mal escrito.
    fs.writeFileSync(path.join(binDir, "pm2"), "#!/bin/sh\nexit 1\n");
    const result = run(["--check"]);
    expect(result.code).toBe(1);
    expect(result.output).toContain("FALTA  la app datosprivados en pm2");
  });

  it("no arranca un despliegue real si faltan requisitos (y no toca el proyecto)", () => {
    // Sin package.json: el preflight falla antes de instalar, respaldar o compilar.
    const result = run([]);
    expect(result.code).toBe(1);
    expect(result.output).not.toContain("pruebas y tipos");
    expect(fs.existsSync(path.join(sandbox, ".deploy"))).toBe(false);
  });

  it("un argumento desconocido es error de uso (2), no un despliegue a ciegas", () => {
    const result = run(["--reinicia-todo"]);
    expect(result.code).toBe(2);
    expect(result.output).toContain("Argumento desconocido");
  });
});
