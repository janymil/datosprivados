import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as nextDraft } from "@/app/api/legal/drafts/next/route";
import { POST as postResult } from "@/app/api/legal/drafts/[id]/result/route";
import { POST as postEnqueue } from "@/app/api/legal/drafts/route";
import { getDb } from "@/lib/db";
import { claimNextDraft, enqueueDraft, finishDraft, getDraft } from "@/lib/legal-drafts";
import { registerLegalChange } from "@/lib/legal-changes";

const SECRET = "d".repeat(32);
const original = { ...process.env };
const HOUR = 3_600_000;
const req = (url: string, init: RequestInit = {}, auth = `Bearer ${SECRET}`) =>
  new Request(`http://localhost${url}`, { ...init, headers: { authorization: auth, "content-type": "application/json", ...(init.headers ?? {}) } });
const draft = (ref: string, targets = [`clause.${ref}`]) => ({ origin: "auditoria" as const, ref, targets, context: { findings: [ref] } });

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "gpt-6-luna";
  delete process.env.AI_MONTHLY_BUDGET_USD;
  delete process.env.AI_DISABLED;
  getDb().exec("DELETE FROM legal_draft_requests; DELETE FROM legal_changes; DELETE FROM ai_usage");
});
afterEach(() => {
  process.env = { ...original };
});

describe("cola de redacción", () => {
  it("encola una vez por origen y referencia", () => {
    expect(enqueueDraft(draft("a1"))).toBe(true);
    expect(enqueueDraft(draft("a1"))).toBe(false);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM legal_draft_requests").get()).toEqual({ n: 1 });
  });

  it("no toma una solicitud cuyo texto ya está en un cambio abierto: toma la siguiente", () => {
    enqueueDraft(draft("a1", ["aviso.nota.regla-practica"]));
    enqueueDraft(draft("a2", ["sectorial.3.procedimientos"]));
    registerLegalChange({
      kind: "auditoria",
      title: "Otro cambio",
      summary: "x",
      source_url: null,
      branch: "legal/otro",
      head_sha: "a".repeat(40),
      diff: "diff",
      affected: [{ kind: "clause", source: "aviso.nota.regla-practica" }],
    });
    const claimed = claimNextDraft(new Date());
    expect(claimed?.targets).toEqual(["sectorial.3.procedimientos"]);
    expect(getDraft(claimed!.id)?.status).toBe("redactando");
    expect(claimed?.attempts).toBe(1);
    expect(claimNextDraft(new Date())).toBeNull();
  });

  it("una solicitud atascada en «redactando» más de 2 horas se puede tomar de nuevo", () => {
    enqueueDraft(draft("a1"));
    const t0 = new Date("2027-01-10T10:00:00Z");
    expect(claimNextDraft(t0)).not.toBeNull();
    expect(claimNextDraft(new Date(t0.getTime() + HOUR))).toBeNull();
    expect(claimNextDraft(new Date(t0.getTime() + 2 * HOUR + 1000))?.attempts).toBe(2);
  });

  it("«reintentar» vuelve a pendiente; al tercer intento queda sin solución", () => {
    enqueueDraft(draft("a1"));
    for (let i = 1; i <= 3; i++) {
      const claimed = claimNextDraft(new Date())!;
      finishDraft(claimed.id, { status: "reintentar", reasons: ["la IA no respondió"] });
    }
    const row = getDb().prepare("SELECT status, reasons FROM legal_draft_requests").get() as { status: string; reasons: string };
    expect(row.status).toBe("sin_solucion");
    expect(JSON.parse(row.reasons)).toEqual(["la IA no respondió"]);
  });

  it("«resuelto» cierra la solicitud: otro cambio ya corrigió el hallazgo", async () => {
    enqueueDraft(draft("a1"));
    const claimed = claimNextDraft(new Date())!;
    const ctx = { params: Promise.resolve({ id: claimed.id }) };
    const res = await postResult(req(`/api/legal/drafts/${claimed.id}/result`, { method: "POST", body: JSON.stringify({ status: "resuelto", reasons: ["ya corregido"] }) }), ctx);
    expect(await res.json()).toEqual({ status: "resuelto" });
    expect(claimNextDraft(new Date())).toBeNull();
  });

  it("revisión C2: una solicitud que espera otro cambio (waitFor) no se toma mientras ese cambio esté abierto", () => {
    enqueueDraft({ origin: "norma", ref: "n1#2", targets: ["politica.x"], context: { waitFor: "ds-001-2027-jus" } });
    const change = registerLegalChange({
      kind: "norma",
      title: "Norma nueva",
      summary: "x",
      source_url: null,
      branch: "legal/auto-n1",
      head_sha: "c".repeat(40),
      diff: "diff",
      affected: [{ kind: "norm", source: "ds-001-2027-jus" }],
    });
    expect(claimNextDraft(new Date())).toBeNull();
    getDb().prepare("UPDATE legal_changes SET status = 'aplicado' WHERE id = ?").run(change.id);
    expect(claimNextDraft(new Date())?.ref).toBe("n1#2");
  });

  it("revisión I5: «esperar» (IA o red caídas) vuelve a la cola sin gastar un intento y no antes de una hora", () => {
    enqueueDraft(draft("a1"));
    const t0 = new Date("2027-01-10T10:00:00Z");
    const claimed = claimNextDraft(t0)!;
    finishDraft(claimed.id, { status: "esperar", reasons: ["IA sin respuesta"] }, t0);
    expect(getDraft(claimed.id)).toMatchObject({ status: "pendiente", attempts: 0 });
    expect(claimNextDraft(new Date(t0.getTime() + 30 * 60_000))).toBeNull();
    expect(claimNextDraft(new Date(t0.getTime() + 61 * 60_000))?.attempts).toBe(1);
  });

  it("un resultado tardío para una solicitud que ya no se está redactando se ignora", () => {
    enqueueDraft(draft("a1"));
    const claimed = claimNextDraft(new Date())!;
    finishDraft(claimed.id, { status: "propuesto", changeId: "lc-20270110-abcdef" });
    finishDraft(claimed.id, { status: "sin_solucion", reasons: ["tarde"] });
    expect(getDraft(claimed.id)).toMatchObject({ status: "propuesto", change_id: "lc-20270110-abcdef" });
  });

  it("una solicitud cuyo proceso muere una y otra vez termina sin solución tras 3 intentos", () => {
    enqueueDraft(draft("a1"));
    let t = new Date("2027-01-10T10:00:00Z").getTime();
    for (let i = 0; i < 3; i++) {
      expect(claimNextDraft(new Date(t))).not.toBeNull();
      t += 3 * HOUR;
    }
    expect(claimNextDraft(new Date(t))).toBeNull();
    expect((getDb().prepare("SELECT status FROM legal_draft_requests").get() as { status: string }).status).toBe("sin_solucion");
  });

  it("el resultado registra el gasto de IA como «legal-draft»", () => {
    enqueueDraft(draft("a1"));
    const claimed = claimNextDraft(new Date())!;
    finishDraft(claimed.id, { status: "propuesto", changeId: "lc-20270110-abcdef", usage: { inputTokens: 1200, outputTokens: 300 } });
    expect(getDraft(claimed.id)).toMatchObject({ status: "propuesto", change_id: "lc-20270110-abcdef" });
    expect(getDb().prepare("SELECT company_id, feature, model, input_tokens, output_tokens FROM ai_usage").all()).toEqual([
      { company_id: null, feature: "legal-draft", model: "gpt-6-luna", input_tokens: 1200, output_tokens: 300 },
    ]);
  });
});

describe("API interna de redacción", () => {
  it("GET next: 401 sin secreto, 204 sin trabajo, 200 con la solicitud", async () => {
    expect((await nextDraft(req("/api/legal/drafts/next", {}, "Bearer otro"))).status).toBe(401);
    expect((await nextDraft(req("/api/legal/drafts/next"))).status).toBe(204);
    enqueueDraft(draft("a1"));
    registerLegalChange({
      kind: "auditoria",
      title: "Abierto",
      summary: "x",
      source_url: null,
      branch: "legal/abierto",
      head_sha: "e".repeat(40),
      diff: "diff",
      affected: [{ kind: "clause", source: "politica.abierta" }],
    });
    const res = await nextDraft(req("/api/legal/drafts/next"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ origin: "auditoria", ref: "a1", targets: ["clause.a1"], context: { findings: ["a1"] }, busy: ["politica.abierta"] });
  });

  it("GET next: 409 con el presupuesto de IA agotado o la IA apagada; la solicitud no se toca", async () => {
    enqueueDraft(draft("a1"));
    getDb()
      .prepare("INSERT INTO ai_usage (id, company_id, feature, model, input_tokens, output_tokens, latency_ms, ok, created_at) VALUES ('u1', NULL, 'x', 'm', 100000000, 0, 0, 1, ?)")
      .run(new Date().toISOString());
    process.env.AI_MONTHLY_BUDGET_USD = "1";
    const res = await nextDraft(req("/api/legal/drafts/next"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ reason: "budget" });
    delete process.env.AI_MONTHLY_BUDGET_USD;
    delete process.env.OPENAI_MODEL;
    expect(await (await nextDraft(req("/api/legal/drafts/next"))).json()).toEqual({ reason: "ai-off" });
    expect((getDb().prepare("SELECT status FROM legal_draft_requests").get() as { status: string }).status).toBe("pendiente");
  });

  it("POST enqueue y POST result exigen el secreto y validan el cuerpo", async () => {
    expect((await postEnqueue(req("/api/legal/drafts", { method: "POST", body: JSON.stringify(draft("a1")) }, "Bearer x"))).status).toBe(401);
    expect((await postEnqueue(req("/api/legal/drafts", { method: "POST", body: JSON.stringify({ origin: "otro", ref: "a" }) }))).status).toBe(400);
    const ok = await postEnqueue(req("/api/legal/drafts", { method: "POST", body: JSON.stringify(draft("a1")) }));
    expect(await ok.json()).toEqual({ queued: true });
    const claimed = claimNextDraft(new Date())!;
    const ctx = { params: Promise.resolve({ id: claimed.id }) };
    expect((await postResult(req(`/api/legal/drafts/${claimed.id}/result`, { method: "POST", body: "{}" }, "Bearer x"), ctx)).status).toBe(401);
    expect((await postResult(req(`/api/legal/drafts/${claimed.id}/result`, { method: "POST", body: JSON.stringify({ status: "raro" }) }), ctx)).status).toBe(400);
    const done = await postResult(req(`/api/legal/drafts/${claimed.id}/result`, { method: "POST", body: JSON.stringify({ status: "sin_solucion", reasons: ["no"] }) }), ctx);
    expect(done.status).toBe(200);
    expect(getDraft(claimed.id)?.status).toBe("sin_solucion");
  });
});
