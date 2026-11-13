import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.store.has(name) ? { name, value: jar.store.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.store.set(name, value),
    delete: (name: string) => void jar.store.delete(name),
  }),
  headers: async () => new Headers({ "cf-connecting-ip": "203.0.113.50" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { demoPreview } from "@/lib/demo";
import { runJob } from "@/lib/jobs";
import { generateDocumentAction, togglePublishAction } from "@/app/actions/documents";
import { saveBankAction } from "@/app/actions/company";
import { createArcoRequestAction, respondArcoAction } from "@/app/actions/arco";
import { runBankAiWizardAction } from "@/app/actions/ai";
import { startSubscriptionAction, cancelSubscriptionAction } from "@/app/pago/actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const count = (sql: string, ...params: string[]) => (getDb().prepare(sql).get(...params) as { n: number }).n;

async function loginAsDemo() {
  jar.store.clear();
  const demo = getDb().prepare("SELECT id FROM users WHERE company_id = 'casa-verde'").get() as { id: string };
  await createSession(demo.id);
}

beforeEach(() => jar.store.clear());

describe("la cuenta demo es de solo lectura", () => {
  it("ninguna acción de escritura se ejecuta", async () => {
    await loginAsDemo();
    const banks = count("SELECT COUNT(*) n FROM data_banks WHERE company_id = 'casa-verde'");
    const version = count("SELECT version n FROM documents WHERE company_id = 'casa-verde' AND kind = 'politica'");

    await expect(saveBankAction(form({ name: "Nuevo banco" }))).rejects.toThrow("REDIRECT:/app?demo=lectura");
    await expect(generateDocumentAction(form({ kind: "politica" }))).rejects.toThrow("REDIRECT:/app?demo=lectura");
    await expect(togglePublishAction(form({ publish: "0" }))).rejects.toThrow("REDIRECT:/app?demo=lectura");
    await expect(respondArcoAction(form({ id: "arco-1", response: "x" }))).rejects.toThrow("REDIRECT:/app?demo=lectura");

    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = 'casa-verde'")).toBe(banks);
    expect(count("SELECT version n FROM documents WHERE company_id = 'casa-verde' AND kind = 'politica'")).toBe(version);
    expect(count("SELECT published n FROM documents WHERE company_id = 'casa-verde' AND kind = 'politica'")).toBe(1);
    expect(count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = 'casa-verde' AND response IS NULL AND status = 'nuevo'")).toBe(1);
  });

  it("no puede contratar, ni cancelar, ni usar la IA", async () => {
    await loginAsDemo();
    await expect(startSubscriptionAction(form({ plan: "pro", term: "monthly" }))).rejects.toThrow("REDIRECT:/app?demo=lectura");
    await expect(cancelSubscriptionAction()).rejects.toThrow("REDIRECT:/app?demo=lectura");
    expect(await runBankAiWizardAction("tengo una tienda")).toEqual({ ok: false, error: expect.stringContaining("demostración") });
  });

  it("el formulario público de la demo no guarda solicitudes de desconocidos", async () => {
    const before = count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = 'casa-verde'");
    await expect(
      createArcoRequestAction(form({ slug: "casa-verde", requester_name: "Extraño", description: "Mis datos", email: "x@y.pe", type: "acceso" }))
    ).rejects.toThrow("REDIRECT:/solicitud/casa-verde?error=demo");
    expect(count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = 'casa-verde'")).toBe(before);
  });

describe("la demo no dispara nada fuera de sí misma", () => {
  const demoCount = (table: string) => count(`SELECT COUNT(*) n FROM ${table} WHERE company_id = 'casa-verde'`);

  it("ninguna acción deja correos ni uso de IA a nombre de la demo", async () => {
    await loginAsDemo();
    const before = { outbox: demoCount("email_outbox"), ai: demoCount("ai_usage"), pagos: demoCount("payments") };

    await expect(saveBankAction(form({ name: "Nuevo banco" }))).rejects.toThrow("REDIRECT:");
    await expect(generateDocumentAction(form({ kind: "politica" }))).rejects.toThrow("REDIRECT:");
    await expect(startSubscriptionAction(form({ plan: "pro", term: "monthly" }))).rejects.toThrow("REDIRECT:");
    await expect(runBankAiWizardAction("tengo una tienda")).resolves.toMatchObject({ ok: false });

    expect({ outbox: demoCount("email_outbox"), ai: demoCount("ai_usage"), pagos: demoCount("payments") }).toEqual(before);
  });

  it("la tarea demo-reset reafirma la cuenta y borra cualquier residuo", async () => {
    const db = getDb();
    // Se simula un fallo: alguien dejó la demo «activa», con IA aceptada y con un
    // correo y una llamada de IA encolados a su nombre.
    db.prepare("UPDATE companies SET billing_status = 'active', ai_consent_at = ?, mail_optout = 0 WHERE id = 'casa-verde'").run("2026-11-01T10:00:00.000Z");
    db.prepare(
      "INSERT INTO email_outbox (id, company_id, to_email, template, payload, status, next_attempt_at, created_at) VALUES (?, 'casa-verde', 'x@y.pe', 'welcome', '{}', 'pending', ?, ?)"
    ).run("residuo-1", "2026-11-01T10:00:00.000Z", "2026-11-01T10:00:00.000Z");
    db.prepare(
      "INSERT INTO ai_usage (id, company_id, feature, model, input_tokens, output_tokens, latency_ms, ok, created_at) VALUES ('residuo-2', 'casa-verde', 'chat', 'test', 10, 10, 5, 1, '2026-11-01T10:00:00.000Z')"
    ).run();

    const outcome = await runJob("demo-reset", new Date("2026-11-02T10:00:00Z"));
    expect(outcome.status).toBe("ok");
    expect(outcome.status === "ok" && outcome.detail).toMatchObject({ demo: "reafirmada", outbox_borrados: 1, ia_borrados: 1 });

    const row = db.prepare("SELECT billing_status, subscription_status, ai_consent_at, mail_optout FROM companies WHERE id = 'casa-verde'").get() as {
      billing_status: string;
      subscription_status: string;
      ai_consent_at: string | null;
      mail_optout: number;
    };
    expect(row).toEqual({ billing_status: "demo", subscription_status: "demo", ai_consent_at: null, mail_optout: 1 });
    expect(demoCount("email_outbox")).toBe(0);
    expect(demoCount("ai_usage")).toBe(0);
    // El contenido de ejemplo sigue ahí.
    expect(demoCount("documents")).toBeGreaterThan(3);
  });

  it("demo-reset es idempotente: correrla otra vez no cambia nada", async () => {
    const first = await runJob("demo-reset", new Date("2026-11-02T10:00:00Z"));
    const second = await runJob("demo-reset", new Date("2026-11-02T10:05:00Z"));
    expect(second.status).toBe("ok");
    expect(second.status === "ok" && second.detail).toMatchObject({ outbox_borrados: 0, ia_borrados: 0, demo: "reafirmada" });
    expect(first.status === "ok" && first.detail).toMatchObject({ demo: "reafirmada" });
  });
});

});

describe("demoPreview", () => {
  const sections = Array.from({ length: 8 }, (_, i) => `## Sección ${i + 1}\n${`Texto confidencial de la sección ${i + 1}. `.repeat(12)}\n`).join("\n");
  const content = `Documento de prueba\n\n${sections}`;

  it("corta el texto: las secciones finales no aparecen", () => {
    const preview = demoPreview(content);
    expect(preview.length).toBeLessThan(content.length / 2);
    expect(preview).not.toContain("Texto confidencial de la sección 8");
    expect(preview).not.toContain("Texto confidencial de la sección 4");
  });

  it("conserva el inicio, los títulos y avisa del documento completo", () => {
    const preview = demoPreview(content);
    expect(preview).toContain("Documento de prueba");
    for (let i = 1; i <= 8; i++) expect(preview).toContain(`- Sección ${i}`);
    expect(preview).toMatch(/Vista previa de la demo/);
  });

  it("también recorta documentos sin secciones", () => {
    const flat = "Línea larga de texto. ".repeat(400).split(". ").join(".\n");
    expect(demoPreview(flat).length).toBeLessThan(flat.length / 2);
  });

  it("los documentos reales de la demo no se entregan completos", () => {
    const real = getDb().prepare("SELECT content FROM documents WHERE company_id = 'casa-verde' AND kind = 'politica'").get() as { content: string };
    expect(real.content.length).toBeGreaterThan(3000);
    expect(demoPreview(real.content).length).toBeLessThan(real.content.length / 2);
  });
});

describe("la demo no envejece", () => {
  it("corre las fechas para que la solicitud más reciente tenga 4 días, recalcula plazos y no repite", async () => {
    const { refreshDemoDates, addBusinessDays, arcoLegalBusinessDays } = await import("@/lib/db");
    const db = getDb();
    const now = new Date("2027-03-10T15:00:00Z"); // 10:00 en Lima
    const first = refreshDemoDates(now);
    expect(first).toBeGreaterThan(0);
    const rows = db.prepare("SELECT type, received_at, due_at FROM arco_requests WHERE company_id = 'casa-verde'").all() as {
      type: string;
      received_at: string;
      due_at: string;
    }[];
    expect(rows.map((r) => r.received_at).sort().pop()).toBe("2027-03-06");
    for (const r of rows) expect(r.due_at).toBe(addBusinessDays(r.received_at, arcoLegalBusinessDays(r.type)));
    expect(refreshDemoDates(now)).toBe(0);
    // Nada cambió después de inscribir: sin la alerta falsa de «actualiza la ficha».
    const changedAfter = db
      .prepare("SELECT COUNT(*) AS n FROM data_banks WHERE company_id = 'casa-verde' AND status = 'registrado' AND substr(updated_at,1,10) > substr(registered_at,1,10)")
      .get() as { n: number };
    expect(changedAfter.n).toBe(0);
  });
});
