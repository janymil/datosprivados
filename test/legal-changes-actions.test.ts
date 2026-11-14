import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { approveLegalChangeAction, lawyerLegalChangeAction, rejectLegalChangeAction } from "@/app/operador/legal/actions";
import { createSession } from "@/lib/auth";
import { dispatchLegalChange } from "@/lib/github-dispatch";
import { getLegalChange, registerLegalChange } from "@/lib/legal-changes";
import { makeActiveCompany } from "./helpers/db";
import { jar } from "./helpers/next";

const form = (data: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
};
let n = 0;
const newChange = () =>
  registerLegalChange({
    kind: "auditoria",
    title: "Corregir art. 2.6",
    summary: "Las definiciones están en el art. III.",
    source_url: null,
    branch: `legal/accion-${++n}`,
    head_sha: "c".repeat(40),
    diff: "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
    affected: [],
  });

describe("aprobar, rechazar o enviar al abogado", () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let status = 204;
  let operatorEmail = "";

  beforeEach(async () => {
    jar.store.clear();
    calls.length = 0;
    status = 204;
    operatorEmail = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
    process.env.OPERATOR_EMAILS = operatorEmail;
    process.env.GITHUB_DISPATCH_TOKEN = "github_pat_prueba";
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(status === 204 ? null : "Unprocessable: bad ref", { status });
    });
    const made = makeActiveCompany({ email: operatorEmail });
    await createSession(made.userId);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPERATOR_EMAILS;
    delete process.env.GITHUB_DISPATCH_TOKEN;
  });

  it("aprobar envía el cambio a GitHub una sola vez, con la rama y el commit exactos", async () => {
    const change = newChange();
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow(`REDIRECT:/operador/legal/${change.id}?ok=aprobado`);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.github.com/repos/janymil/datosprivados/dispatches");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      event_type: "legal-change-approved",
      client_payload: { id: change.id, branch: change.branch, head_sha: change.head_sha },
    });
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer github_pat_prueba");
    expect(getLegalChange(change.id)).toMatchObject({ status: "aprobado", decided_by: operatorEmail });
    expect(getLegalChange(change.id)!.dispatched_at).not.toBeNull();

    // Segundo clic: ya está decidido, no se envía de nuevo.
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow(`REDIRECT:/operador/legal/${change.id}?error=ya-decidido`);
    expect(calls).toHaveLength(1);
  });

  it("sin token queda en «fallo» con el motivo, y se puede reintentar", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    const change = newChange();
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow(/error=envio/);
    expect(getLegalChange(change.id)).toMatchObject({ status: "fallo", error: "falta GITHUB_DISPATCH_TOKEN" });
    expect(calls).toHaveLength(0);

    process.env.GITHUB_DISPATCH_TOKEN = "github_pat_prueba";
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow(/ok=aprobado/);
    expect(calls).toHaveLength(1);
    expect(getLegalChange(change.id)).toMatchObject({ status: "aprobado", error: null });
  });

  it("un rechazo de GitHub queda registrado con el detalle", async () => {
    status = 422;
    const change = newChange();
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow(/error=envio/);
    expect(getLegalChange(change.id)!.status).toBe("fallo");
    expect(getLegalChange(change.id)!.error).toMatch(/^GitHub 422: Unprocessable/);
  });

  it("rechazar y enviar al abogado exigen motivo y no envían nada a GitHub", async () => {
    const a = newChange();
    await expect(rejectLegalChangeAction(form({ id: a.id, reason: " " }))).rejects.toThrow(/error=motivo-requerido/);
    await expect(rejectLegalChangeAction(form({ id: a.id, reason: "No corresponde" }))).rejects.toThrow(/ok=rechazado/);
    expect(getLegalChange(a.id)).toMatchObject({ status: "rechazado", reason: "No corresponde" });
    const b = newChange();
    await expect(lawyerLegalChangeAction(form({ id: b.id, reason: "Dudo del art. 37" }))).rejects.toThrow(/ok=abogado/);
    expect(getLegalChange(b.id)!.status).toBe("abogado");
    expect(calls).toHaveLength(0);
  });

  it("quien no es operador recibe 404", async () => {
    jar.store.clear();
    const client = makeActiveCompany({ email: `cliente-${Math.random().toString(36).slice(2, 8)}@example.com` });
    await createSession(client.userId);
    const change = newChange();
    await expect(approveLegalChangeAction(form({ id: change.id }))).rejects.toThrow("NOT_FOUND");
    expect(getLegalChange(change.id)!.status).toBe("nuevo");
  });

  it("dispatchLegalChange informa la falta de token sin llamar a GitHub", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    expect(await dispatchLegalChange(newChange())).toEqual({ ok: false, error: "falta GITHUB_DISPATCH_TOKEN" });
  });
});
