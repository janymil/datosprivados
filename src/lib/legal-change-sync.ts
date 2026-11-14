import fs from "node:fs";
import path from "node:path";
import type { LegalChange } from "./db";
import { listLegalChanges, markLegalChange } from "./legal-changes";
import { enqueueEmail } from "./mail";

/**
 * Sigue un cambio legal aprobado hasta que llega a producción (motor legal, plan 4):
 *
 *   aprobado ──(flujo legal-change.yml ok y el commit ya está en master)──▶ fusionado
 *   fusionado ──(el servidor desplegó ese commit)──▶ aplicado
 *   cualquiera de los dos pasos falla ──▶ fallo (con el motivo y aviso al operador)
 *
 * El despliegue lo hace root con /usr/local/bin/datosprivados-autodeploy, que lee
 * `deploy-request` y deja `deployed-sha` o `deploy-failed` en el mismo directorio.
 * La aplicación nunca despliega por sí misma.
 */

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type SyncResult = { merged: number; applied: number; failed: number; waiting: number };

/** Margen para runs creados un poco antes de lo que registró el servidor (relojes distintos). */
const CLOCK_SKEW_MS = 2 * 60_000;

export const DEFAULT_DEPLOY_DIR = "/var/lib/datosprivados";

function api(fetchImpl: FetchLike) {
  const repo = process.env.GITHUB_REPOSITORY || "janymil/datosprivados";
  const headers = {
    authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  return async <T>(route: string): Promise<T> => {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}${route}`, { headers });
    if (!response.ok) throw new Error(`GitHub ${response.status} en ${route}`);
    return (await response.json()) as T;
  };
}

type Run = { display_title: string; created_at: string; status: string; conclusion: string | null; html_url: string };

/** ¿`ancestor` está contenido en `descendant`? (igual o anterior en su historia). */
async function contains(get: ReturnType<typeof api>, ancestor: string, descendant: string): Promise<boolean> {
  if (ancestor === descendant) return true;
  const { status } = await get<{ status: string }>(`/compare/${ancestor}...${descendant}`);
  return status === "ahead" || status === "identical";
}

function readSha(file: string): { sha: string; rest: string } | null {
  if (!fs.existsSync(file)) return null;
  const [first, ...rest] = fs.readFileSync(file, "utf8").split("\n");
  const sha = first.trim();
  return /^[0-9a-f]{40}$/.test(sha) ? { sha, rest: rest.join("\n").trim() } : null;
}

function fail(change: LegalChange, error: string) {
  markLegalChange(change.id, { status: "fallo", error: error.slice(0, 4000) });
  for (const email of (process.env.OPERATOR_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)) {
    enqueueEmail({
      to: email,
      template: "legal_change_failed",
      payload: { title: change.title, reason: error.slice(0, 500), path: `/operador/legal/${change.id}` },
      // Un aviso por intento: reaprobar renueva dispatched_at, y con él la clave.
      dedupeKey: `legal-change-failed:${change.id}:${email.toLowerCase()}:${change.dispatched_at ?? "-"}`,
    });
  }
}

export async function syncLegalChanges(opts: { dir?: string; fetchImpl?: FetchLike; now?: Date } = {}): Promise<SyncResult> {
  const dir = opts.dir ?? process.env.LEGAL_DEPLOY_DIR ?? DEFAULT_DEPLOY_DIR;
  const get = api(opts.fetchImpl ?? fetch);
  const now = opts.now ?? new Date();
  const result: SyncResult = { merged: 0, applied: 0, failed: 0, waiting: 0 };

  const approved = listLegalChanges({ status: ["aprobado"] }).filter((c) => c.dispatched_at);
  if (approved.length) {
    const { workflow_runs } = await get<{ workflow_runs: Run[] }>(
      "/actions/workflows/legal-change.yml/runs?event=repository_dispatch&per_page=50"
    );
    for (const change of approved) {
      const since = Date.parse(change.dispatched_at!) - CLOCK_SKEW_MS;
      const run = workflow_runs
        .filter((r) => r.display_title === `legal ${change.id}` && Date.parse(r.created_at) >= since)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      if (!run || run.status !== "completed") {
        result.waiting += 1;
        continue;
      }
      if (run.conclusion !== "success") {
        fail(change, `El flujo de GitHub terminó en «${run.conclusion ?? "desconocido"}»: ${run.html_url}`);
        result.failed += 1;
        continue;
      }
      const { sha: master } = await get<{ sha: string }>("/commits/master");
      if (!(await contains(get, change.head_sha, master))) {
        fail(change, `El flujo terminó bien pero el commit ${change.head_sha.slice(0, 7)} no está en master: ${run.html_url}`);
        result.failed += 1;
        continue;
      }
      markLegalChange(change.id, { status: "fusionado", merged_sha: master, error: null });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "deploy-request"), `${master}\n`);
      result.merged += 1;
    }
  }

  const merged = listLegalChanges({ status: ["fusionado"] }).filter((c) => c.merged_sha);
  if (merged.length) {
    const deployed = readSha(path.join(dir, "deployed-sha"));
    const failed = readSha(path.join(dir, "deploy-failed"));
    for (const change of merged) {
      if (deployed && (await contains(get, change.merged_sha!, deployed.sha))) {
        markLegalChange(change.id, { status: "aplicado", deployed_at: now.toISOString(), error: null });
        result.applied += 1;
      } else if (failed && (await contains(get, change.merged_sha!, failed.sha))) {
        fail(change, `El despliegue falló y se revirtió. Final del registro:\n${failed.rest}`);
        result.failed += 1;
      } else {
        result.waiting += 1;
      }
    }
  }
  return result;
}
