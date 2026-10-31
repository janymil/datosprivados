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
