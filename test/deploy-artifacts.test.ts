import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { JOB_NAMES } from "@/lib/jobs";

/**
 * Piezas de despliegue que viven fuera del repositorio (`deploy/`). Antes, el wrapper
 * de cron y la tabla de `/etc/cron.d` existían **solo en el servidor**: si esa máquina
 * desaparecía había que reescribirlos de memoria.
 *
 * Aquí se fija lo que se rompió de verdad el 2026-11-03: el cron dispara cada hora en
 * punto y el wrapper compara `HH:MM` exacto, así que `--at 06:15` no se cumplía nunca.
 * Cuatro tareas (billing-sync, lapsed-account-notices, holidays-check, demo-reset)
 * llevaban días sin correr y la salud del sistema estaba en rojo.
 */

const repo = process.cwd();
const deployDir = path.join(repo, "deploy");
const cronFile = path.join(deployDir, "cron.d-datosprivados");
const wrapperFile = path.join(deployDir, "datosprivados-cron.sh");
const logrotateFile = path.join(deployDir, "logrotate-datosprivados.conf");

/** Líneas activas (sin comentar) de la tabla de cron. */
const activeLines = () =>
  fs
    .readFileSync(cronFile, "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));

/** [tarea, argumentos] de cada línea que llama al wrapper. */
function scheduled() {
  const entries: Array<{ job: string; at: string | null; dow: string | null }> = [];
  for (const line of activeLines()) {
    const match = line.match(/datosprivados-cron\s+([a-z-]+)(.*)$/);
    if (!match) continue;
    entries.push({
      job: match[1],
      at: match[2].match(/--at\s+(\S+)/)?.[1] ?? null,
      dow: match[2].match(/--dow\s+(\S+)/)?.[1] ?? null,
    });
  }
  return entries;
}

describe("cron: la tabla y el wrapper", () => {
  it("toda hora programada se puede cumplir (el cron dispara en el minuto 0)", () => {
    const unreachable = scheduled().filter((entry) => entry.at && !/^([01][0-9]|2[0-3]):00$/.test(entry.at));
    expect(
      unreachable.map((entry) => `${entry.job} --at ${entry.at}`),
      "estas tareas no se ejecutarían nunca: el cron solo dispara a la hora en punto"
    ).toEqual([]);
  });

  it("no repite la misma tarea dos veces a la misma hora y día", () => {
    const seen = scheduled().map((entry) => `${entry.job}|${entry.at ?? "intervalo"}|${entry.dow ?? "-"}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("cada tarea programada existe en el código", () => {
    const unknown = scheduled()
      .map((entry) => entry.job)
      .filter((job) => !JOB_NAMES.includes(job as (typeof JOB_NAMES)[number]));
    expect(unknown, "renombrar una tarea en jobs.ts obliga a actualizar deploy/cron.d-datosprivados").toEqual([]);
  });

  it("las tareas obligatorias están programadas (una función esencial no se queda sin cron)", () => {
    const programadas = new Set(scheduled().map((entry) => entry.job));
    // Opcionales o pendientes de desplegar: no se exigen.
    const exempt = new Set(["weekly-digest", "ops-alert", "demo-reset"]);
    const faltan = JOB_NAMES.filter((job) => !exempt.has(job) && !programadas.has(job));
    expect(faltan).toEqual([]);
  });

  it("el cron diario no se solapa: cada tarea diaria tiene su propia hora", () => {
    const diarias = scheduled().filter((entry) => entry.at && !entry.dow);
    const horas = diarias.map((entry) => entry.at);
    expect(new Set(horas).size).toBe(horas.length);
  });

  it("el wrapper es bash válido y rechaza un --at inalcanzable en voz alta", () => {
    expect(() => execFileSync("bash", ["-n", wrapperFile], { stdio: "pipe" })).not.toThrow();

    // Se ejecuta de verdad: con --at 06:15 debe salir 4 antes de tocar la red.
    let code = 0;
    let output = "";
    try {
      output = execFileSync("bash", [wrapperFile, "billing-sync", "--at", "06:15"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      code = failure.status ?? 1;
      output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    }
    expect(code).toBe(4);
    expect(output).toContain("no se puede cumplir");
  });

  it("el secreto no está en la tabla de cron (es legible por todos)", () => {
    const text = fs.readFileSync(cronFile, "utf8");
    expect(text).not.toMatch(/CRON_SECRET\s*=/);
    expect(text).not.toMatch(/Bearer\s+\S{16,}/);
  });

  it("si el servidor tiene las copias instaladas, coinciden con las del repositorio", () => {
    // En CI no existen: la comprobación se salta. En el servidor detecta la deriva
    // entre lo versionado y lo que corre de verdad.
    const installed = [
      ["/usr/local/bin/datosprivados-cron", wrapperFile],
      ["/etc/cron.d/datosprivados", cronFile],
      ["/etc/logrotate.d/datosprivados", logrotateFile],
      ["/usr/local/bin/datosprivados-autodeploy", path.join(deployDir, "datosprivados-autodeploy.sh")],
    ];
    for (const [live, repoCopy] of installed) {
      if (!fs.existsSync(live)) continue;
      expect(fs.readFileSync(live, "utf8"), `${live} difiere de ${path.relative(repo, repoCopy)}`).toBe(fs.readFileSync(repoCopy, "utf8"));
    }
  });

  it("el logrotate del repo pasa la prueba en seco sin errores", () => {
    // Se salta donde no hay logrotate (CI puede no tenerlo): la comprobación es para la
    // máquina que rota los logs. Encontró que la segunda sección fallaba cada semana
    // por no llevar `su` («parent directory has insecure permissions»).
    // También se salta sin root: la config lleva `su root root` y, como usuario normal (el
    // runner de GitHub es uid 1001), logrotate falla al cambiar de euid. Eso rompió el CI.
    if (process.getuid?.() !== 0) return;
    try {
      execFileSync("logrotate", ["--version"], { stdio: "pipe" });
    } catch {
      return;
    }

    let output = "";
    try {
      output = execFileSync("logrotate", ["--debug", logrotateFile], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    }
    const errors = output
      .split("\n")
      .filter((line) => /^error:/i.test(line.trim()))
      .map((line) => line.trim());
    expect(errors, "logrotate se quejaría de estas líneas").toEqual([]);
  });
});
