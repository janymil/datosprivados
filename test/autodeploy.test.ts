import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * deploy/datosprivados-autodeploy.sh: lo corre root cada 5 minutos. Si la tarea
 * legal-change-sync dejó `deploy-request`, trae master y despliega con scripts/deploy.sh.
 * Aquí el «servidor» es un clon temporal de un repo de prueba y el despliegue, un comando falso.
 */
const script = path.join(process.cwd(), "deploy", "datosprivados-autodeploy.sh");
let root = "";
let state = "";
let app = "";
let origin = "";

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8", stdio: "pipe" }).trim();

function commit(message: string) {
  fs.writeFileSync(path.join(origin, "f.txt"), message);
  git(origin, "add", ".");
  git(origin, "commit", "-m", message);
  return git(origin, "rev-parse", "HEAD");
}

function autodeploy(deployCmd: string) {
  try {
    execFileSync("bash", [script], {
      env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", AUTODEPLOY_STATE_DIR: state, AUTODEPLOY_APP_DIR: app, AUTODEPLOY_CMD: deployCmd },
      stdio: "pipe",
    });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 1;
  }
}

const read = (name: string) => fs.readFileSync(path.join(state, name), "utf8");
const has = (name: string) => fs.existsSync(path.join(state, name));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "dp-autodeploy-"));
  state = path.join(root, "state");
  origin = path.join(root, "origin");
  app = path.join(root, "app");
  fs.mkdirSync(state);
  fs.mkdirSync(origin);
  git(origin, "init", "-q", "-b", "master");
  commit("uno");
  execFileSync("git", ["clone", "-q", origin, app], { stdio: "pipe" });
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("autodeploy de cambios legales", () => {
  it("sin solicitud no hace nada", () => {
    expect(autodeploy("false")).toBe(0);
    expect(has("deployed-sha") || has("deploy-failed")).toBe(false);
  });

  it("trae master, despliega y deja el commit desplegado", () => {
    const sha = commit("dos");
    fs.writeFileSync(path.join(state, "deploy-request"), `${sha}\n`);
    expect(autodeploy("true")).toBe(0);
    expect(git(app, "rev-parse", "HEAD")).toBe(sha);
    expect(read("deployed-sha").trim()).toBe(sha);
    expect(has("deploy-request")).toBe(false);
  });

  it("si el despliegue falla deja el commit y el final del registro, y quita la solicitud", () => {
    const sha = commit("dos");
    fs.writeFileSync(path.join(state, "deploy-request"), `${sha}\n`);
    expect(autodeploy("echo prueba de humo falló; exit 1")).not.toBe(0);
    const failed = read("deploy-failed").split("\n");
    expect(failed[0]).toBe(sha);
    expect(failed.join("\n")).toContain("prueba de humo falló");
    expect(has("deploy-request")).toBe(false);
    expect(has("deployed-sha")).toBe(false);
  });

  it("no despliega un commit que no está en master", () => {
    fs.writeFileSync(path.join(state, "deploy-request"), `${"b".repeat(40)}\n`);
    expect(autodeploy("true")).not.toBe(0);
    expect(read("deploy-failed").split("\n")[0]).toBe("b".repeat(40));
  });

  it("ignora una solicitud mal formada", () => {
    fs.writeFileSync(path.join(state, "deploy-request"), "; rm -rf /\n");
    expect(autodeploy("true")).not.toBe(0);
    expect(has("deploy-request")).toBe(false);
    expect(has("deployed-sha")).toBe(false);
  });
});
