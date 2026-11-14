import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/legal/changes/route";
import { getDb } from "@/lib/db";
import { renderMail } from "@/lib/mail-templates";

const SECRET = "s".repeat(32);
const body = (over: Record<string, unknown> = {}) => ({
  kind: "auditoria",
  title: "Corregir art. 2.6",
  summary: "Las definiciones están en el art. III.",
  source_url: null,
  branch: "legal/api-prueba",
  head_sha: "b".repeat(40),
  diff: "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
  affected: [{ kind: "clause", source: "politica.10.normas" }],
  ...over,
});
const request = (json: unknown, auth = `Bearer ${SECRET}`) =>
  new Request("http://localhost/api/legal/changes", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(json) });

describe("POST /api/legal/changes", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    process.env.OPERATOR_EMAILS = "fundador@ejemplo.pe, socio@ejemplo.pe";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.OPERATOR_EMAILS;
  });

  it("acepta el id que elige quien registra (201) y rechaza uno inválido (400)", async () => {
    const ok = await POST(request(body({ id: "lc-20261114-aaa111", branch: "legal/api-con-id" })));
    expect(ok.status).toBe(201);
    expect((await ok.json()).id).toBe("lc-20261114-aaa111");
    const bad = await POST(request(body({ id: "x", branch: "legal/api-id-malo" })));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/id inválido/);
  });

  it("sin el secreto responde 401", async () => {
    expect((await POST(request(body(), "Bearer otro-secreto-de-prueba"))).status).toBe(401);
  });

  it("rechaza una rama inválida con 400", async () => {
    const res = await POST(request(body({ branch: "main" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rama/);
  });

  it("crea el cambio (201), lo repite sin duplicar (200) y avisa a cada operador una vez", async () => {
    const first = await POST(request(body()));
    expect(first.status).toBe(201);
    const { id, status } = await first.json();
    expect(status).toBe("nuevo");
    const again = await POST(request(body()));
    expect(again.status).toBe(200);
    expect((await again.json()).id).toBe(id);
    const mails = getDb()
      .prepare("SELECT to_email, template, payload FROM email_outbox WHERE dedupe_key LIKE ?")
      .all(`legal-change:${id}:%`) as Array<{ to_email: string; template: string; payload: string }>;
    expect(mails.map((m) => m.to_email).sort()).toEqual(["fundador@ejemplo.pe", "socio@ejemplo.pe"]);
    expect(mails.every((m) => m.template === "legal_change_new")).toBe(true);
    const rendered = renderMail("legal_change_new", JSON.parse(mails[0].payload));
    expect(rendered.subject).toContain("Corregir art. 2.6");
    expect(rendered.text).toContain(`/operador/legal/${id}`);
  });
});
