import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { syncLegalChanges } from "@/lib/legal-change-sync";
import { decideLegalChange, getLegalChange, markLegalChange, registerLegalChange } from "@/lib/legal-changes";

const HEAD = "e".repeat(40);
const MASTER = "f".repeat(40);
let n = 0;
let dir = "";

function approved() {
  const change = registerLegalChange({
    kind: "auditoria",
    title: "Corregir art. 2.6",
    summary: "x",
    source_url: null,
    branch: `legal/sync-${++n}`,
    head_sha: HEAD,
    diff: "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
    affected: [],
  });
  decideLegalChange(change.id, "aprobado", "fundador");
  markLegalChange(change.id, { dispatched_at: "2026-11-14T10:00:00.000Z" });
  return getLegalChange(change.id)!;
}

/** GitHub falso: runs del flujo, commit de master y comparación de commits. */
function github(opts: { runs?: Array<Record<string, unknown>>; ancestorOf?: Set<string> }) {
  return async (url: string) => {
    if (url.includes("/actions/workflows/legal-change.yml/runs")) return Response.json({ workflow_runs: opts.runs ?? [] });
    if (url.endsWith("/commits/master")) return Response.json({ sha: MASTER });
    const cmp = /\/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)$/.exec(url);
    if (cmp) return Response.json({ status: opts.ancestorOf?.has(`${cmp[1]}>${cmp[2]}`) ? "ahead" : "diverged" });
    return new Response("not found", { status: 404 });
  };
}

const run = (id: string, conclusion: string | null, status = "completed") => ({
  display_title: `legal ${id}`,
  created_at: "2026-11-14T10:00:30.000Z",
  status,
  conclusion,
  html_url: `https://github.com/janymil/datosprivados/actions/runs/${id}`,
});

describe("seguimiento de cambios aprobados", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "dp-legal-sync-"));
    process.env.GITHUB_DISPATCH_TOKEN = "github_pat_prueba";
    process.env.OPERATOR_EMAILS = "fundador@ejemplo.pe";
  });
  afterEach(() => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    delete process.env.OPERATOR_EMAILS;
  });

  it("sin resultado aún, espera", async () => {
    const change = approved();
    await syncLegalChanges({ dir, fetchImpl: github({ runs: [run(change.id, null, "in_progress")] }) });
    expect(getLegalChange(change.id)!.status).toBe("aprobado");
    expect(fs.existsSync(path.join(dir, "deploy-request"))).toBe(false);
  });

  it("flujo exitoso y rama dentro de master: queda fusionado y pide el despliegue", async () => {
    const change = approved();
    const result = await syncLegalChanges({
      dir,
      fetchImpl: github({ runs: [run(change.id, "success")], ancestorOf: new Set([`${HEAD}>${MASTER}`]) }),
    });
    expect(result.merged).toBe(1);
    expect(getLegalChange(change.id)).toMatchObject({ status: "fusionado", merged_sha: MASTER });
    expect(fs.readFileSync(path.join(dir, "deploy-request"), "utf8").trim()).toBe(MASTER);
  });

  it("flujo fallido: queda en «fallo» con el enlace y avisa al operador", async () => {
    const change = approved();
    await syncLegalChanges({ dir, fetchImpl: github({ runs: [run(change.id, "failure")] }) });
    const after = getLegalChange(change.id)!;
    expect(after.status).toBe("fallo");
    expect(after.error).toContain("actions/runs");
    const mails = getDb()
      .prepare("SELECT template FROM email_outbox WHERE dedupe_key = ?")
      .all(`legal-change-failed:${change.id}:fundador@ejemplo.pe:2026-11-14T10:00:00.000Z`);
    expect(mails).toEqual([{ template: "legal_change_failed" }]);
  });

  it("un run anterior a la aprobación (otro intento) no cuenta", async () => {
    const change = approved();
    const old = { ...run(change.id, "failure"), created_at: "2026-11-14T09:00:00.000Z" };
    await syncLegalChanges({ dir, fetchImpl: github({ runs: [old] }) });
    expect(getLegalChange(change.id)!.status).toBe("aprobado");
  });

  it("flujo exitoso pero el commit no llegó a master: «fallo»", async () => {
    const change = approved();
    await syncLegalChanges({ dir, fetchImpl: github({ runs: [run(change.id, "success")], ancestorOf: new Set() }) });
    expect(getLegalChange(change.id)).toMatchObject({ status: "fallo" });
    expect(fs.existsSync(path.join(dir, "deploy-request"))).toBe(false);
  });

  it("un despliegue posterior que incluye el commit también lo aplica", async () => {
    const change = approved();
    const later = "a".repeat(40);
    markLegalChange(change.id, { status: "fusionado", merged_sha: MASTER });
    fs.writeFileSync(path.join(dir, "deployed-sha"), `${later}\n`);
    await syncLegalChanges({ dir, fetchImpl: github({ ancestorOf: new Set([`${MASTER}>${later}`]) }) });
    expect(getLegalChange(change.id)!.status).toBe("aplicado");
  });

  it("fusionado y desplegado: queda aplicado", async () => {
    const change = approved();
    markLegalChange(change.id, { status: "fusionado", merged_sha: MASTER });
    fs.writeFileSync(path.join(dir, "deployed-sha"), `${MASTER}\n`);
    await syncLegalChanges({ dir, fetchImpl: github({ ancestorOf: new Set() }) });
    const after = getLegalChange(change.id)!;
    expect(after.status).toBe("aplicado");
    expect(after.deployed_at).not.toBeNull();
  });

  it("si el despliegue falla queda en «fallo» con el final del registro", async () => {
    const change = approved();
    markLegalChange(change.id, { status: "fusionado", merged_sha: MASTER });
    fs.writeFileSync(path.join(dir, "deploy-failed"), `${MASTER}\n[deploy] prueba de humo falló: / -> 500\nrevertido\n`);
    await syncLegalChanges({ dir, fetchImpl: github({}) });
    const after = getLegalChange(change.id)!;
    expect(after.status).toBe("fallo");
    expect(after.error).toContain("prueba de humo falló");
  });
});
