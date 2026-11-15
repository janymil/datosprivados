import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateChange } from "../validate-change";
import type { RunDeps } from "./run";

/**
 * Los pasos reales del redactor (motor legal, plan 7): git, regenerar instantáneas, las
 * comprobaciones completas, el registro y la descarga del PDF oficial. Corren en la copia del
 * repositorio del script `datosprivados-draft` (nunca en /var/www/datosprivados).
 */

type Out = { code: number; out: string };

/** Lo único que heredan los procesos hijos (revisión I2): ni la clave de la IA ni el resto del .env. */
const INHERITED = ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "TZ", "PNPM_HOME"];

export function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string> = { NODE_ENV: "test" };
  for (const key of INHERITED) if (process.env[key]) env[key] = process.env[key]!;
  return { ...env, ...extra } as NodeJS.ProcessEnv;
}

function run(root: string, cmd: string, args: string[], env: Record<string, string> = {}, timeoutMs = 1_800_000): Out {
  const r = spawnSync(cmd, args, { cwd: root, env: childEnv(env), encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}` };
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function realSteps(root: string, api: { url: string; secret: string }): Pick<RunDeps, "git" | "regenerate" | "checks" | "validate" | "propose" | "download" | "enqueue"> {
  const vitest = (args: string[], env: Record<string, string> = {}) => run(root, "npx", ["vitest", "run", ...args], env);
  const git = (args: string[]) => run(root, "git", args);
  return {
    git,

    regenerate: () => {
      // Huellas y módulos: se borran y se escriben de nuevo (diseño §5).
      for (const f of ["test/legal/baseline-hashes.json", "test/legal/__snapshots__/modules/modules.json"]) fs.rmSync(path.join(root, f), { force: true });
      const base = vitest(["test/legal/baseline.test.ts", "test/legal/modules-baseline.test.ts"], { WRITE_LEGAL_BASELINE: "1", WRITE_MODULES_BASELINE: "1" });
      if (base.code !== 0) return { ok: false, out: base.out };
      vitest(["test/legal", "-u"]);
      // Fallas conocidas: se escriben de nuevo con lo que falla hoy; las que ninguna prueba vuelve a
      // escribir se restauran tal cual. `validate` rechaza después cualquier falla agregada.
      const kfDir = path.join(root, "legal/known-failures");
      const saved = tempDir("kf-");
      try {
        const files = fs.existsSync(kfDir) ? fs.readdirSync(kfDir).filter((f) => f.endsWith(".json")) : [];
        for (const f of files) fs.renameSync(path.join(kfDir, f), path.join(saved, f));
        vitest(["test/legal"], { WRITE_KNOWN_FAILURES: "1" });
        for (const f of files) if (!fs.existsSync(path.join(kfDir, f))) fs.copyFileSync(path.join(saved, f), path.join(kfDir, f));
      } finally {
        fs.rmSync(saved, { recursive: true, force: true });
      }
      const final = vitest(["test/legal"]);
      return { ok: final.code === 0, out: final.out };
    },

    validate: () => {
      const tracked = git(["diff", "--name-only", "origin/master"]).out.split("\n");
      const untracked = git(["ls-files", "--others", "--exclude-standard"]).out.split("\n");
      const changedFiles = [...new Set([...tracked, ...untracked].map((f) => f.trim()).filter(Boolean))];
      const read = (p: string) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : null);
      const readBase = (p: string) => {
        const r = git(["show", `origin/master:${p}`]);
        return r.code === 0 ? r.out : null;
      };
      // El registro del cambio (legal/changes/<id>.md) lo escribe propose-change después.
      return validateChange({ id: "lc-00000000-000000", changedFiles, read, readBase }).filter((p) => !p.startsWith("falta legal/changes/"));
    },

    checks: () => {
      for (const [cmd, args] of [
        ["pnpm", ["typecheck"]],
        ["pnpm", ["lint"]],
        ["npx", ["vitest", "run"]],
      ] as const) {
        const r = run(root, cmd, [...args]);
        if (r.code !== 0) return { ok: false, out: `${cmd} ${args.join(" ")}\n${r.out}` };
      }
      return { ok: true, out: "" };
    },

    propose: (p) => {
      const dir = tempDir("draft-");
      try {
        const summary = path.join(dir, "resumen.md");
        fs.writeFileSync(summary, p.summary);
        const args = [
          "--experimental-strip-types",
          "scripts/legal/propose-change.mjs",
          "--title",
          p.title,
          "--summary-file",
          summary,
          "--kind",
          p.kind,
          "--affected",
          p.affected.map((a) => `${a.kind}:${a.source}`).join(","),
          ...(p.sourceUrl ? ["--source-url", p.sourceUrl] : []),
        ];
        const r = run(root, "node", args, { CRON_SECRET: api.secret, LEGAL_API_URL: api.url });
        const id = /Cambio (lc-\d{8}-[0-9a-f]{6})/.exec(r.out)?.[1];
        if (r.code === 0 && id) return { ok: true, changeId: id };
        return { ok: false, rejected: /rejected|non-fast-forward|fetch first/i.test(r.out), out: r.out };
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },

    download: async (url) => {
      const dir = tempDir("norma-");
      try {
        const pdf = path.join(dir, "norma.pdf");
        const txt = path.join(dir, "norma.txt");
        if (run(dir, "curl", ["-sSfL", "-m", "120", "-A", "Mozilla/5.0", "-o", pdf, url]).code !== 0) return null;
        if (run(dir, "pdftotext", ["-raw", "-enc", "UTF-8", pdf, txt]).code !== 0) return null;
        return { text: fs.readFileSync(txt, "utf8"), sha256: crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex") };
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },

    enqueue: async (r) => {
      const res = await fetch(`${api.url.replace(/\/$/, "")}/api/legal/drafts`, {
        method: "POST",
        headers: { authorization: `Bearer ${api.secret}`, "content-type": "application/json" },
        body: JSON.stringify(r),
      });
      if (!res.ok) throw new Error(`no se pudo volver a encolar (${res.status})`);
    },
  };
}
