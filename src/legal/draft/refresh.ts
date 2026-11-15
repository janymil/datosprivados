import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bumpTemplateVersions, changedKinds, failureSummary } from "./run";

/**
 * Rehacer un cambio legal pendiente sobre la versión actual del código. Cuando otro cambio se
 * fusiona antes, la rama vieja ya no se puede fusionar (conflictos en lo generado, fallas conocidas
 * que «vuelven»). Se aplican solo sus cambios propios sobre master, se regenera lo generado
 * (instantáneas, huellas, fallas conocidas, versiones de plantilla), se comprueba todo y se
 * reemplaza la rama; la app lo vuelve a «nuevo» para que el fundador apruebe lo que ve.
 */

export type RefreshDeps = {
  root: string;
  git: (args: string[]) => { code: number; out: string };
  regenerate: () => { ok: boolean; out: string };
  validate: () => string[];
  checks: () => { ok: boolean; out: string };
  reregister: (id: string, head: string, diff: string) => Promise<{ ok: boolean; out: string }>;
};
export type RefreshResult = { status: "al-dia" | "rehecho" | "conflicto" | "fallo"; reasons: string[] };

/** Archivos que se regeneran (nunca se copian de la rama vieja). */
const GENERATED = [/^test\/legal\/__snapshots__\//, /^test\/legal\/baseline-hashes\.json$/, /^legal\/known-failures\//, /^src\/lib\/document-freshness\.ts$/];
const FRESHNESS = "src/lib/document-freshness.ts";
const BASELINE = "test/legal/baseline-hashes.json";

/** Lo que un cambio legal puede tocar y existe en la copia (`git add` falla entero con una ruta que no existe). */
export const legalPaths = (root: string) => ["legal", "src", "test/legal", "scripts/legal/sources.json"].filter((p) => fs.existsSync(path.join(root, p)));

const readJson = (file: string): Record<string, string> => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>) : {});

export async function refreshChange(change: { id: string; branch: string; head_sha: string }, deps: RefreshDeps): Promise<RefreshResult> {
  const { git } = deps;
  const remote = `origin/${change.branch}`;
  const fetched = git(["fetch", "-q", "origin", "master", `+refs/heads/${change.branch}:refs/remotes/${remote}`]);
  if (fetched.code !== 0) return { status: "fallo", reasons: [`git fetch: ${fetched.out.trim().slice(0, 300)}`] };
  const current = git(["rev-parse", remote]).out.trim();
  const fresh = git(["merge-base", "--is-ancestor", "origin/master", remote]).code === 0;
  // La rama solo se reemplaza si está donde se registró, o donde la dejó el propio redactor
  // (una corrida anterior la rehízo y la subió pero la app no aceptó el registro).
  let lease = change.head_sha;
  if (current !== change.head_sha) {
    const subject = git(["log", "-1", "--format=%s", remote]).out.trim();
    if (!subject.startsWith(`legal: ${change.id} rehecho sobre master `))
      return { status: "fallo", reasons: [`la rama ${change.branch} no está en el commit registrado (${change.head_sha.slice(0, 7)} ≠ ${current.slice(0, 7)}) y no la movió el redactor`] };
    if (fresh) return register(deps, change.id, current, git(["diff", "--no-color", "--no-ext-diff", "-M", `origin/master...${remote}`]).out);
    lease = current;
  } else if (fresh) return { status: "al-dia", reasons: [] };

  const base = git(["merge-base", "origin/master", remote]).out.trim();
  const own = git(["diff", "--name-only", base, remote])
    .out.split("\n")
    .map((f) => f.trim())
    .filter((f) => f && !GENERATED.some((re) => re.test(f)));
  const cleanup = () => {
    git(["checkout", "-q", "-f", "origin/master"]);
    git(["branch", "-q", "-D", change.branch]);
  };

  // 1. Sus cambios propios, sobre master.
  git(["checkout", "-q", "-f", "-B", change.branch, "origin/master"]);
  if (own.length) {
    const patch = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rehacer-")), "cambio.patch");
    try {
      fs.writeFileSync(patch, git(["diff", "--binary", base, remote, "--", ...own]).out);
      const applied = git(["apply", "--3way", "--index", patch]);
      if (applied.code !== 0) {
        cleanup();
        // Solo lo que dice dónde choca (git avisa además de cada archivo que sí se aplicó).
        const lines = applied.out.split("\n").map((l) => l.trim()).filter(Boolean);
        const key = lines.filter((l) => /with conflicts|^error:|^U |does not apply|patch failed/i.test(l));
        return { status: "conflicto", reasons: [`sus cambios chocan con otro cambio ya publicado; hay que rehacerlo a mano:\n${(key.length ? key : lines.slice(-10)).join("\n").slice(0, 1500)}`] };
      }
    } finally {
      fs.rmSync(path.dirname(patch), { recursive: true, force: true });
    }
  }

  // 2. Lo generado, de nuevo; las versiones de plantilla suben sobre las de master.
  const baselineBefore = readJson(path.join(deps.root, BASELINE));
  const regen = deps.regenerate();
  if (!regen.ok) {
    cleanup();
    return { status: "fallo", reasons: [`no pasa las pruebas legales sobre la versión actual:\n${failureSummary(regen.out)}`] };
  }
  const kinds = changedKinds(baselineBefore, readJson(path.join(deps.root, BASELINE)));
  if (kinds.length) {
    const freshness = path.join(deps.root, FRESHNESS);
    fs.writeFileSync(freshness, bumpTemplateVersions(fs.readFileSync(freshness, "utf8"), kinds));
    const again = deps.regenerate();
    if (!again.ok) {
      cleanup();
      return { status: "fallo", reasons: [`no pasa las pruebas legales sobre la versión actual:\n${failureSummary(again.out)}`] };
    }
  }
  const rules = deps.validate();
  if (rules.length) {
    cleanup();
    return { status: "fallo", reasons: [`no cumple las reglas de un cambio legal: ${rules.join("; ")}`] };
  }
  const checks = deps.checks();
  if (!checks.ok) {
    cleanup();
    return { status: "fallo", reasons: [`las comprobaciones fallaron:\n${failureSummary(checks.out)}`] };
  }

  // 3. Commit, reemplazo de la rama (solo si nadie la movió) y nuevo registro.
  git(["add", "-A", ...legalPaths(deps.root)]);
  const masterSha = git(["rev-parse", "--short", "origin/master"]).out.trim();
  const commit = git(["commit", "-q", "-m", `legal: ${change.id} rehecho sobre master ${masterSha}`]);
  if (commit.code !== 0) {
    cleanup();
    return { status: "fallo", reasons: [`git commit: ${commit.out.trim().slice(0, 300)}`] };
  }
  const pushed = git(["push", "-q", `--force-with-lease=refs/heads/${change.branch}:${lease}`, "origin", `HEAD:refs/heads/${change.branch}`]);
  if (pushed.code !== 0) {
    cleanup();
    return { status: "fallo", reasons: [`git push: ${pushed.out.trim().slice(0, 300)}`] };
  }
  const head = git(["rev-parse", "HEAD"]).out.trim();
  const diff = git(["diff", "--no-color", "--no-ext-diff", "-M", "origin/master...HEAD"]).out;
  cleanup();
  return register(deps, change.id, head, diff);
}

/** Registro en la app; si falla (red, app ocupada), la rama rehecha queda y la corrida siguiente lo reintenta. */
async function register(deps: RefreshDeps, id: string, head: string, diff: string): Promise<RefreshResult> {
  try {
    const registered = await deps.reregister(id, head, diff);
    if (registered.ok) return { status: "rehecho", reasons: [] };
    return { status: "fallo", reasons: [`la rama se rehízo pero la app no aceptó el registro (se reintenta en la próxima corrida): ${registered.out.slice(0, 300)}`] };
  } catch (error) {
    return { status: "fallo", reasons: [`la rama se rehízo pero el registro falló (se reintenta en la próxima corrida): ${error instanceof Error ? error.message : String(error)}`] };
  }
}
