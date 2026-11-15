import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RunDeps } from "./run";

/**
 * Los pasos reales del redactor (motor legal, plan 7): git, regenerar instantáneas, las
 * comprobaciones completas, el registro y la descarga del PDF oficial. Corren en la copia del
 * repositorio del script `datosprivados-draft` (nunca en /var/www/datosprivados).
 */

type Out = { code: number; out: string };

function run(root: string, cmd: string, args: string[], env: Record<string, string> = {}, timeoutMs = 1_800_000): Out {
  const r = spawnSync(cmd, args, { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}` };
}

/** Las variables de la suite no deben heredar las del redactor (base de datos, IA real). */
const TEST_ENV = { NODE_ENV: "test", WRITE_LEGAL_BASELINE: "", WRITE_MODULES_BASELINE: "", WRITE_KNOWN_FAILURES: "" };

export function realSteps(root: string, api: { url: string; secret: string }): Pick<RunDeps, "git" | "regenerate" | "checks" | "propose" | "download" | "enqueue"> {
  const vitest = (args: string[], env: Record<string, string> = {}) => run(root, "npx", ["vitest", "run", ...args], { ...TEST_ENV, ...env });
  return {
    git: (args) => run(root, "git", args),

    regenerate: () => {
      // Huellas y módulos: se borran y se escriben de nuevo (diseño §5).
      for (const f of ["test/legal/baseline-hashes.json", "test/legal/__snapshots__/modules/modules.json"]) fs.rmSync(path.join(root, f), { force: true });
      const base = vitest(["test/legal/baseline.test.ts", "test/legal/modules-baseline.test.ts"], { WRITE_LEGAL_BASELINE: "1", WRITE_MODULES_BASELINE: "1" });
      if (base.code !== 0) return { ok: false, out: base.out };
      vitest(["test/legal", "-u"]);
      // Fallas conocidas: se escriben de nuevo con lo que falla hoy; las que ninguna prueba vuelve a
      // escribir se restauran tal cual (las reglas de la rama impiden que crezcan).
      const kfDir = path.join(root, "legal/known-failures");
      const saved = fs.mkdtempSync(path.join(os.tmpdir(), "kf-"));
      const files = fs.existsSync(kfDir) ? fs.readdirSync(kfDir).filter((f) => f.endsWith(".json")) : [];
      for (const f of files) fs.renameSync(path.join(kfDir, f), path.join(saved, f));
      vitest(["test/legal"], { WRITE_KNOWN_FAILURES: "1" });
      for (const f of files) if (!fs.existsSync(path.join(kfDir, f))) fs.copyFileSync(path.join(saved, f), path.join(kfDir, f));
      const final = vitest(["test/legal"]);
      return { ok: final.code === 0, out: final.out };
    },

    checks: () => {
      for (const [cmd, args] of [
        ["pnpm", ["typecheck"]],
        ["pnpm", ["lint"]],
        ["npx", ["vitest", "run"]],
      ] as const) {
        const r = run(root, cmd, [...args], TEST_ENV);
        if (r.code !== 0) return { ok: false, out: `${cmd} ${args.join(" ")}\n${r.out}` };
      }
      return { ok: true, out: "" };
    },

    propose: (p) => {
      const summary = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "draft-")), "resumen.md");
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
    },

    download: async (url) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "norma-"));
      const pdf = path.join(dir, "norma.pdf");
      const txt = path.join(dir, "norma.txt");
      if (run(dir, "curl", ["-sSfL", "-m", "120", "-A", "Mozilla/5.0", "-o", pdf, url]).code !== 0) return null;
      if (run(dir, "pdftotext", ["-raw", "-enc", "UTF-8", pdf, txt]).code !== 0) return null;
      return { text: fs.readFileSync(txt, "utf8"), sha256: crypto.createHash("sha256").update(fs.readFileSync(pdf)).digest("hex") };
    },

    enqueue: async (r) => {
      await fetch(`${api.url.replace(/\/$/, "")}/api/legal/drafts`, {
        method: "POST",
        headers: { authorization: `Bearer ${api.secret}`, "content-type": "application/json" },
        body: JSON.stringify(r),
      });
    },
  };
}
