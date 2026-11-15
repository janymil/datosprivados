import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as refreshRoute } from "@/app/api/legal/changes/[id]/refresh/route";
import { GET as pendingRoute } from "@/app/api/legal/changes/pending/route";
import { getDb } from "@/lib/db";
import { decideLegalChange, getLegalChange, markLegalChange, refreshLegalChange, registerLegalChange } from "@/lib/legal-changes";

const SECRET = "r".repeat(32);
let n = 0;
const register = () =>
  registerLegalChange({
    kind: "auditoria",
    title: "Citar el art. III",
    summary: "x",
    source_url: null,
    branch: `legal/rehacer-${++n}`,
    head_sha: "a".repeat(40),
    diff: "diff viejo",
    affected: [{ kind: "clause", source: "politica.10.normas" }],
  });
const req = (url: string, init: RequestInit = {}, auth = `Bearer ${SECRET}`) =>
  new Request(`http://localhost${url}`, { ...init, headers: { authorization: auth, "content-type": "application/json" } });

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  getDb().exec("DELETE FROM legal_changes");
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("rehacer un cambio sobre la versión actual del código", () => {
  it("un cambio en «fallo» queda «nuevo» con el diff nuevo; hay que aprobarlo otra vez", () => {
    const change = register();
    decideLegalChange(change.id, "aprobado", "fundador@ejemplo.pe");
    markLegalChange(change.id, { status: "fallo", error: "El flujo de GitHub terminó en «failure»" });
    const out = refreshLegalChange(change.id, { head_sha: "b".repeat(40), diff: "diff nuevo" });
    expect(out.ok).toBe(true);
    expect(getLegalChange(change.id)).toMatchObject({
      status: "nuevo",
      head_sha: "b".repeat(40),
      diff: "diff nuevo",
      error: null,
      decided_at: null,
      dispatched_at: null,
    });
    expect(getLegalChange(change.id)?.refreshed_at).toBeTruthy();
  });

  it("solo se rehace lo que aún espera decisión o falló: no lo aprobado en curso, publicado ni rechazado", () => {
    for (const status of ["aprobado", "fusionado", "aplicado", "rechazado"] as const) {
      const change = register();
      markLegalChange(change.id, { status });
      expect(refreshLegalChange(change.id, { head_sha: "c".repeat(40), diff: "d" })).toEqual({ ok: false, error: "estado" });
    }
    expect(refreshLegalChange("lc-20990101-000000", { head_sha: "c".repeat(40), diff: "d" })).toEqual({ ok: false, error: "no-existe" });
  });
});

describe("API interna para rehacer cambios", () => {
  it("GET pending: 401 sin secreto; lista los que esperan decisión o fallaron, con rama y commit", async () => {
    const a = register();
    const b = register();
    markLegalChange(b.id, { status: "fallo" });
    const c = register();
    markLegalChange(c.id, { status: "aplicado" });
    expect((await pendingRoute(req("/api/legal/changes/pending", {}, "Bearer x"))).status).toBe(401);
    const list = (await (await pendingRoute(req("/api/legal/changes/pending"))).json()) as Array<{ id: string }>;
    expect(list.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect(list[0]).toHaveProperty("branch");
    expect(list[0]).toHaveProperty("head_sha");
  });

  it("POST refresh: 401 sin secreto, 400 con commit inválido, 409 si el estado no lo permite", async () => {
    const change = register();
    const ctx = { params: Promise.resolve({ id: change.id }) };
    const body = (head: string) => JSON.stringify({ head_sha: head, diff: "diff nuevo" });
    expect((await refreshRoute(req(`/api/legal/changes/${change.id}/refresh`, { method: "POST", body: body("b".repeat(40)) }, "Bearer x"), ctx)).status).toBe(401);
    expect((await refreshRoute(req(`/api/legal/changes/${change.id}/refresh`, { method: "POST", body: body("xyz") }), ctx)).status).toBe(400);
    expect((await refreshRoute(req(`/api/legal/changes/${change.id}/refresh`, { method: "POST", body: body("b".repeat(40)) }), ctx)).status).toBe(200);
    markLegalChange(change.id, { status: "aplicado" });
    expect((await refreshRoute(req(`/api/legal/changes/${change.id}/refresh`, { method: "POST", body: body("c".repeat(40)) }), ctx)).status).toBe(409);
  });
  it("POST refresh con «error»: el motivo queda en el cambio y su estado no cambia", async () => {
    const change = register();
    markLegalChange(change.id, { status: "fallo" });
    const ctx = { params: Promise.resolve({ id: change.id }) };
    const res = await refreshRoute(req(`/api/legal/changes/${change.id}/refresh`, { method: "POST", body: JSON.stringify({ error: "sus cambios chocan con otro cambio ya publicado" }) }), ctx);
    expect(res.status).toBe(200);
    expect(getLegalChange(change.id)).toMatchObject({ status: "fallo", error: "No se pudo rehacer sobre la versión actual: sus cambios chocan con otro cambio ya publicado" });
  });
});
