import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { enqueueEmail, isSuppressed, processOutbox, PermanentMailError, verifyMailWebhook, type MailTransport, type OutboundMail } from "@/lib/mail";
import { escapeHtml, isEssential, renderMail, type MailPayload, type MailTemplate } from "@/lib/mail-templates";
import { POST as mailWebhook } from "@/app/api/mail/webhook/route";
import { makeCompany } from "./helpers/db";

const SAMPLE: Record<MailTemplate, MailPayload> = {
  verify_email: { name: "Lucía", url: "https://x.pe/verificar?token=abc", company: "Casa Verde" },
  password_reset: { name: "Lucía", url: "https://x.pe/restablecer?token=abc", company: "Casa Verde" },
  welcome: { name: "Lucía", company: "Casa Verde" },
  payment_receipt: { plan: "Pro", amount: "S/ 39.00", paidUntil: "30 de noviembre de 2026", company: "Casa Verde" },
  payment_failed: { plan: "Pro", company: "Casa Verde" },
  renewal_soon: { plan: "Pro", paidUntil: "30 de noviembre de 2026", company: "Casa Verde" },
  subscription_cancelled: { paidUntil: "30 de noviembre de 2026", company: "Casa Verde" },
  subscription_expiring: { paidUntil: "30 de noviembre de 2026", company: "Casa Verde" },
  arco_received_owner: { ticket: "ARCO-2026-001", type: "acceso", requester: "Ana Torres", dueAt: "20 de noviembre", company: "Casa Verde" },
  arco_ack_requester: { ticket: "ARCO-2026-001", type: "cancelacion", dueAt: "20 de noviembre", company: "Casa Verde" },
  arco_due_soon: { ticket: "ARCO-2026-001", dueAt: "20 de noviembre", days: 3, company: "Casa Verde" },
  arco_overdue: { ticket: "ARCO-2026-001", dueAt: "20 de noviembre", company: "Casa Verde" },
  incident_opened: { title: "Fuga de correos", dueAt: "2 nov 2026, 10:00", company: "Casa Verde" },
  incident_deadline: { title: "Fuga de correos", dueAt: "2 nov 2026, 10:00", hours: 12, company: "Casa Verde" },
  document_outdated: { count: 3, company: "Casa Verde" },
  lapsed_notice: { deleteOn: "30 de enero de 2027", stage: 1, company: "Casa Verde" },
  email_changed: { newEmail: "nuevo@casaverde.pe", company: "Casa Verde" },
  account_deleted: { company: "Casa Verde" },
  ops_alert: { subject: "Alerta", message: "Algo pasó" },
};

const outbox = () =>
  getDb().prepare("SELECT * FROM email_outbox ORDER BY created_at, id").all() as unknown as Array<{
    id: string; status: string; attempts: number; error: string | null; to_email: string; template: string; next_attempt_at: string; dedupe_key: string | null;
  }>;

beforeEach(() => {
  getDb().exec("DELETE FROM email_outbox; DELETE FROM email_suppressions");
});

describe("plantillas", () => {
  it("hay un ejemplo por cada plantilla (que no se quede una sin probar)", () => {
    const templates = Object.keys(SAMPLE) as MailTemplate[];
    for (const template of templates) expect(() => renderMail(template, SAMPLE[template])).not.toThrow();
    expect(templates).toHaveLength(19);
  });

  it.each(Object.keys(SAMPLE) as MailTemplate[])("%s: asunto, texto y HTML sin fugas de variables", (template) => {
    const mail = renderMail(template, SAMPLE[template]);
    expect(mail.subject.length).toBeGreaterThan(5);
    for (const part of [mail.subject, mail.text, mail.html]) {
      expect(part).not.toMatch(/undefined|\[object|\{\{|NaN/);
    }
    expect(mail.html).toContain("<!doctype html>");
    expect(mail.text).toContain("hola@datosprivados.pe");
  });

  it("escapa en el HTML lo que viene del usuario", () => {
    const mail = renderMail("arco_received_owner", { ...SAMPLE.arco_received_owner, requester: '<script>alert("x")</script>' });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(escapeHtml(`a&b<"'`)).toBe("a&amp;b&lt;&quot;&#39;");
  });

  it("falla con un campo imprescindible ausente", () => {
    expect(() => renderMail("password_reset", { name: "Ana" })).toThrow(/url/);
  });

  it("el acuse al titular lleva ticket y plazo legal; el aviso de plazo vencido, el responsable", () => {
    const ack = renderMail("arco_ack_requester", SAMPLE.arco_ack_requester);
    expect(ack.text).toContain("ARCO-2026-001");
    expect(ack.text).toContain("20 de noviembre");
    expect(ack.text).toContain("Casa Verde");
  });

  it("solo el aviso de documentos desactualizados es opcional", () => {
    const optional = (Object.keys(SAMPLE) as MailTemplate[]).filter((t) => !isEssential(t));
    expect(optional).toEqual(["document_outdated"]);
  });
});

describe("bandeja de salida", () => {
  const ok: MailTransport & { sent: OutboundMail[] } = Object.assign(
    async (message: OutboundMail) => {
      ok.sent.push(message);
    },
    { sent: [] as OutboundMail[] }
  );
  beforeEach(() => {
    ok.sent.length = 0;
  });

  it("encola y entrega una vez", async () => {
    expect(enqueueEmail({ to: "Ana@Example.com", template: "welcome", payload: SAMPLE.welcome })).toBe(true);
    const first = await processOutbox({ transport: ok });
    expect(first.sent).toBe(1);
    expect(ok.sent[0].to).toBe("ana@example.com");
    expect(ok.sent[0].from).toContain("DatosPrivados");
    const second = await processOutbox({ transport: ok });
    expect(second.sent).toBe(0);
    expect(outbox()[0].status).toBe("sent");
  });

  it("dedupeKey vuelve idempotente el aviso", () => {
    const input = { to: "a@b.pe", template: "arco_overdue" as const, payload: SAMPLE.arco_overdue, dedupeKey: "k1" };
    expect(enqueueEmail(input)).toBe(true);
    expect(enqueueEmail(input)).toBe(false);
    expect(outbox()).toHaveLength(1);
  });

  it("rechaza destinatarios inválidos", () => {
    expect(enqueueEmail({ to: "no-es-correo", template: "welcome", payload: SAMPLE.welcome })).toBe(false);
    expect(enqueueEmail({ to: "  ", template: "welcome", payload: SAMPLE.welcome })).toBe(false);
  });

  it("dos procesos a la vez no envían dos veces el mismo correo", async () => {
    enqueueEmail({ to: "a@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const slow: MailTransport = async (m) => {
      await new Promise((r) => setTimeout(r, 20));
      ok.sent.push(m);
    };
    await Promise.all([processOutbox({ transport: slow }), processOutbox({ transport: slow })]);
    expect(ok.sent).toHaveLength(1);
  });

  it("con un transporte caído reintenta con espera creciente y nada se pierde", async () => {
    enqueueEmail({ to: "a@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const failing: MailTransport = async () => {
      throw new Error("proveedor caído");
    };
    let now = new Date();
    const waits: number[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await processOutbox({ transport: failing, now });
      expect(result.failed).toBe(1);
      const row = outbox()[0];
      expect(row.status).toBe("pending");
      expect(row.attempts).toBe(attempt);
      waits.push(new Date(row.next_attempt_at).getTime() - now.getTime());
      // Antes de la hora de reintento no se vuelve a intentar.
      expect((await processOutbox({ transport: failing, now })).failed).toBe(0);
      now = new Date(new Date(row.next_attempt_at).getTime() + 1000);
    }
    expect(waits[1]).toBeGreaterThan(waits[0]);
    expect(waits[4]).toBeGreaterThan(waits[3]);
    // Cuando el proveedor vuelve, el mismo correo sale.
    const recovered = await processOutbox({ transport: ok, now });
    expect(recovered.sent).toBe(1);
    expect(outbox()[0].status).toBe("sent");
  });

  it("tras 6 intentos fallidos queda «dead» con el error", async () => {
    enqueueEmail({ to: "a@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const failing: MailTransport = async () => {
      throw new Error("sigue caído");
    };
    let now = new Date();
    for (let i = 0; i < 6; i += 1) {
      await processOutbox({ transport: failing, now });
      now = new Date(now.getTime() + 7 * 3_600_000);
    }
    const row = outbox()[0];
    expect(row.status).toBe("dead");
    expect(row.error).toContain("sigue caído");
  });

  it("un error permanente no se reintenta", async () => {
    enqueueEmail({ to: "a@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const result = await processOutbox({
      transport: async () => {
        throw new PermanentMailError("dirección inválida");
      },
    });
    expect(result.dead).toBe(1);
    expect(outbox()[0].status).toBe("dead");
  });

  it("sin proveedor configurado los correos quedan pendientes (no se pierden)", async () => {
    enqueueEmail({ to: "a@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const result = await processOutbox({ transport: null });
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0, dead: 0 });
    expect(outbox()[0].status).toBe("pending");
  });

  it("respeta la baja de avisos no esenciales, pero nunca la de los esenciales", async () => {
    const { companyId } = makeCompany();
    getDb().prepare("UPDATE companies SET mail_optout = 1 WHERE id = ?").run(companyId);
    enqueueEmail({ to: "a@b.pe", template: "document_outdated", payload: SAMPLE.document_outdated, companyId });
    enqueueEmail({ to: "a@b.pe", template: "arco_overdue", payload: SAMPLE.arco_overdue, companyId });
    const result = await processOutbox({ transport: ok });
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(ok.sent[0].subject).toContain("vencida");
  });

  it("no escribe a direcciones con rebote o queja", async () => {
    getDb().prepare("INSERT INTO email_suppressions (email, reason, created_at) VALUES ('rebota@b.pe', 'rebote', ?)").run(new Date().toISOString());
    enqueueEmail({ to: "Rebota@b.pe", template: "welcome", payload: SAMPLE.welcome });
    const result = await processOutbox({ transport: ok });
    expect(result.skipped).toBe(1);
    expect(ok.sent).toHaveLength(0);
    expect(outbox()[0].status).toBe("suppressed");
  });
});

describe("webhook de rebotes y quejas", () => {
  const secret = `whsec_${Buffer.from("clave-de-prueba-0123456789").toString("base64")}`;
  const sign = (body: string, id = "msg_1", ts = String(Math.floor(Date.now() / 1000))) => ({
    "svix-id": id,
    "svix-timestamp": ts,
    "svix-signature": `v1,${crypto.createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`,
  });

  it("verifica la firma, la ventana de tiempo y el secreto", () => {
    const body = '{"type":"email.bounced"}';
    const h = sign(body);
    const base = { body, id: h["svix-id"], timestamp: h["svix-timestamp"], signature: h["svix-signature"], secret };
    expect(verifyMailWebhook(base)).toBe(true);
    expect(verifyMailWebhook({ ...base, body: body + " " })).toBe(false);
    expect(verifyMailWebhook({ ...base, signature: "v1,AAAA" })).toBe(false);
    expect(verifyMailWebhook({ ...base, now: Date.now() + 10 * 60_000 })).toBe(false);
    expect(verifyMailWebhook({ ...base, secret: undefined })).toBe(false);
  });

  it("un rebote firmado suprime la dirección; sin firma se rechaza", async () => {
    process.env.MAIL_WEBHOOK_SECRET = secret;
    const body = JSON.stringify({ type: "email.bounced", data: { to: ["Rebota@b.pe"] } });
    const bad = await mailWebhook(new Request("http://x/api/mail/webhook", { method: "POST", body }));
    expect(bad.status).toBe(401);
    expect(isSuppressed("rebota@b.pe")).toBe(false);

    const good = await mailWebhook(new Request("http://x/api/mail/webhook", { method: "POST", body, headers: sign(body) }));
    expect(good.status).toBe(200);
    expect(isSuppressed("rebota@b.pe")).toBe(true);

    const other = JSON.stringify({ type: "email.delivered", data: { to: ["ok@b.pe"] } });
    const ignored = await mailWebhook(new Request("http://x/api/mail/webhook", { method: "POST", body: other, headers: sign(other, "msg_2") }));
    expect((await ignored.json()).ignored).toBe(true);
    expect(isSuppressed("ok@b.pe")).toBe(false);
    delete process.env.MAIL_WEBHOOK_SECRET;
  });
});
