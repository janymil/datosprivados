import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { refreshChange, type RefreshDeps } from "@/legal/draft/refresh";

const ID = "lc-20270101-abcdef";
const BRANCH = "legal/demo";
const FRESH = (aviso: number, politica: number) =>
  `export const TEMPLATE_VERSIONS: Record<DocumentKind, number> = {\n  aviso: ${aviso},\n  politica: ${politica},\n};\n`;

function git(cwd: string, args: string[]) {
  const r = spawnSync("git", ["-c", "user.name=prueba", "-c", "user.email=prueba@ejemplo.pe", ...args], { cwd, encoding: "utf8" });
  return { code: r.status ?? 1, out: `${r.stdout}${r.stderr}` };
}
const write = (root: string, rel: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const commitAll = (root: string, msg: string) => {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", msg]);
};

/** Un remoto con master y una rama legal sacada de un master viejo; luego master avanza. */
function setup(opts: { conflict?: boolean } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "refresh-"));
  const remote = path.join(tmp, "remote.git");
  git(tmp, ["init", "-q", "--bare", "-b", "master", remote]);
  const work = path.join(tmp, "work");
  git(tmp, ["clone", "-q", remote, work]);
  git(work, ["checkout", "-q", "-b", "master"]);
  write(work, "src/legal/x.ts", "export const x = 'a';\n");
  write(work, "test/legal/baseline-hashes.json", JSON.stringify({ "f|aviso": "1", "f|politica": "1" }));
  write(work, "legal/known-failures/facts.json", JSON.stringify([{ rule: "fact-unverified", clause: "c1", detail: "d" }]));
  write(work, "src/lib/document-freshness.ts", FRESH(1, 1));
  commitAll(work, "base");
  git(work, ["push", "-q", "origin", "master"]);
  // La rama legal: cambia x.ts, sus huellas, su versión y trae su registro.
  git(work, ["checkout", "-q", "-b", BRANCH]);
  write(work, "src/legal/x.ts", "export const x = 'b';\n");
  write(work, "test/legal/baseline-hashes.json", JSON.stringify({ "f|aviso": "2", "f|politica": "1" }));
  write(work, "src/lib/document-freshness.ts", FRESH(2, 1));
  write(work, `legal/changes/${ID}.md`, "# registro\n");
  commitAll(work, "cambio legal");
  git(work, ["push", "-q", "origin", BRANCH]);
  const head = git(work, ["rev-parse", "HEAD"]).out.trim();
  // Master avanza: otro cambio quitó la falla conocida, cambió política y su versión.
  git(work, ["checkout", "-q", "master"]);
  write(work, "legal/known-failures/facts.json", "[]");
  write(work, "src/legal/y.ts", "export const y = 1;\n");
  write(work, "test/legal/baseline-hashes.json", JSON.stringify({ "f|aviso": "1", "f|politica": "9" }));
  write(work, "src/lib/document-freshness.ts", FRESH(1, 2));
  if (opts.conflict) write(work, "src/legal/x.ts", "export const x = 'c';\n");
  commitAll(work, "otro cambio");
  git(work, ["push", "-q", "origin", "master"]);
  // La copia del redactor.
  const root = path.join(tmp, "drafts");
  git(tmp, ["clone", "-q", remote, root]);
  const registered: Array<{ id: string; head: string; diff: string }> = [];
  const log = { regenerate: 0, checks: 0 };
  const deps: RefreshDeps = {
    root,
    git: (args) => git(root, args),
    // Como la regeneración real: las huellas salen del código; aviso cambió por la rama.
    regenerate: () => {
      log.regenerate += 1;
      write(root, "test/legal/baseline-hashes.json", JSON.stringify({ "f|aviso": "2", "f|politica": "9" }));
      return { ok: true, out: "" };
    },
    validate: () => [],
    checks: () => {
      log.checks += 1;
      return { ok: true, out: "" };
    },
    reregister: async (id, head, diff) => {
      registered.push({ id, head, diff });
      return { ok: true, out: "" };
    },
  };
  return { remote, root, head, deps, registered, log };
}

const remoteFile = (remote: string, ref: string, file: string) => git(remote, ["show", `${ref}:${file}`]).out;

describe("rehacer un cambio legal sobre la versión actual del código", () => {
  it("una rama ya al día no se toca", async () => {
    const { deps, root, registered } = setup();
    // Simula una rama ya rehecha: master es ancestro.
    git(root, ["fetch", "-q", "origin"]);
    const masterHead = git(root, ["rev-parse", "origin/master"]).out.trim();
    expect(await refreshChange({ id: ID, branch: "master", head_sha: masterHead }, deps)).toMatchObject({ status: "al-dia" });
    expect(registered).toEqual([]);
  });

  it("rehace la rama: aplica solo sus cambios propios, regenera lo generado y conserva lo que master corrigió", async () => {
    const { deps, remote, head, registered, log } = setup();
    const out = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, deps);
    expect(out).toMatchObject({ status: "rehecho" });
    expect(remoteFile(remote, BRANCH, "src/legal/x.ts")).toBe("export const x = 'b';\n");
    expect(remoteFile(remote, BRANCH, "src/legal/y.ts")).toBe("export const y = 1;\n");
    expect(remoteFile(remote, BRANCH, "legal/known-failures/facts.json")).toBe("[]");
    expect(remoteFile(remote, BRANCH, `legal/changes/${ID}.md`)).toBe("# registro\n");
    // Versiones: las de master, más la subida de aviso (su texto cambió).
    expect(remoteFile(remote, BRANCH, "src/lib/document-freshness.ts")).toBe(FRESH(2, 2));
    expect(git(remote, ["merge-base", "--is-ancestor", "master", BRANCH]).code).toBe(0);
    expect(registered).toHaveLength(1);
    expect(registered[0].head).toBe(git(remote, ["rev-parse", BRANCH]).out.trim());
    expect(registered[0].diff).toContain("src/legal/x.ts");
    expect(registered[0].diff).not.toContain("known-failures");
    expect(log.checks).toBe(1);
  });

  it("si sus propios cambios chocan con master: no se fuerza, la rama queda como estaba y se dice por qué", async () => {
    const { deps, remote, head, registered } = setup({ conflict: true });
    const out = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, deps);
    expect(out).toMatchObject({ status: "conflicto", reasons: [expect.stringContaining("src/legal/x.ts")] });
    expect(out.reasons.join(" ")).not.toMatch(/Falling back|cleanly/);
    expect(git(remote, ["rev-parse", BRANCH]).out.trim()).toBe(head);
    expect(registered).toEqual([]);
  });

  it("si las comprobaciones fallan, no se publica nada", async () => {
    const { deps, remote, head, registered } = setup();
    const out = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, { ...deps, checks: () => ({ ok: false, out: "FAIL test/x.test.ts" }) });
    expect(out).toMatchObject({ status: "fallo", reasons: [expect.stringContaining("FAIL test/x.test.ts")] });
    expect(git(remote, ["rev-parse", BRANCH]).out.trim()).toBe(head);
    expect(registered).toEqual([]);
  });
  it("si la app no aceptó el registro, la rama rehecha queda y la corrida siguiente solo la registra", async () => {
    const { deps, remote, head, registered } = setup();
    let fail = true;
    const flaky: RefreshDeps = {
      ...deps,
      reregister: async (id, h, diff) => {
        if (fail) throw new Error("fetch failed: write EPIPE");
        registered.push({ id, head: h, diff });
        return { ok: true, out: "" };
      },
    };
    const first = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, flaky);
    expect(first.status).toBe("fallo");
    expect(first.reasons.join(" ")).toMatch(/EPIPE/);
    const rebuilt = git(remote, ["rev-parse", BRANCH]).out.trim();
    expect(rebuilt).not.toBe(head);
    fail = false;
    // La app sigue con el commit viejo: la corrida siguiente no rehace de nuevo, solo registra.
    const second = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, flaky);
    expect(second.status).toBe("rehecho");
    expect(registered).toEqual([expect.objectContaining({ id: ID, head: rebuilt })]);
    expect(git(remote, ["rev-parse", BRANCH]).out.trim()).toBe(rebuilt);
  });

  it("una rama movida por otra persona (no por el redactor) no se registra ni se toca", async () => {
    const { deps, remote, head, registered } = setup();
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "otra-"));
    git(other, ["clone", "-q", remote, "c"]);
    const c = path.join(other, "c");
    git(c, ["checkout", "-q", BRANCH]);
    write(c, "src/legal/x.ts", "export const x = 'z';\n");
    commitAll(c, "edición a mano");
    git(c, ["push", "-q", "origin", BRANCH]);
    const out = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, deps);
    expect(out.status).toBe("fallo");
    expect(out.reasons.join(" ")).toMatch(/commit registrado/);
    expect(registered).toEqual([]);
  });
  it("una rama rehecha por el redactor y sin registrar, con master movido otra vez: se rehace de nuevo y se registra (caso real b35b00)", async () => {
    const { deps, remote, head, registered } = setup();
    let fail = true;
    const flaky: RefreshDeps = {
      ...deps,
      reregister: async (id, h, diff) => {
        if (fail) throw new Error("fetch failed: write EPIPE");
        registered.push({ id, head: h, diff });
        return { ok: true, out: "" };
      },
    };
    await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, flaky);
    const rebuilt = git(remote, ["rev-parse", BRANCH]).out.trim();
    // Otro cambio se publica: master avanza de nuevo.
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "otro-"));
    git(other, ["clone", "-q", remote, "c"]);
    const c = path.join(other, "c");
    write(c, "src/legal/z.ts", "export const z = 1;\n");
    commitAll(c, "otro cambio más");
    git(c, ["push", "-q", "origin", "master"]);
    fail = false;
    const out = await refreshChange({ id: ID, branch: BRANCH, head_sha: head }, flaky);
    expect(out.status).toBe("rehecho");
    const now = git(remote, ["rev-parse", BRANCH]).out.trim();
    expect(now).not.toBe(rebuilt);
    expect(git(remote, ["merge-base", "--is-ancestor", "master", BRANCH]).code).toBe(0);
    expect(remoteFile(remote, BRANCH, "src/legal/x.ts")).toBe("export const x = 'b';\n");
    expect(remoteFile(remote, BRANCH, "src/legal/z.ts")).toBe("export const z = 1;\n");
    expect(registered).toEqual([expect.objectContaining({ id: ID, head: now })]);
  });
});
