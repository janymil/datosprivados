import { describe, expect, it } from "vitest";
import { addBusinessDays, businessDaysBetween, getDb, removeHoliday, setHoliday, calculatedHolidays } from "@/lib/db";
import {
  generateAndSaveDocument,
  getDocument,
  getPolicyBySlug,
  listBanks,
  listDocumentVersions,
  publishDocument,
  unpublishDocument,
} from "@/lib/data";
import { findPlaceholders, publishBlockers } from "@/lib/document-publish";
import { createSession } from "@/lib/auth";
import { generateDocumentAction, togglePublishAction } from "@/app/actions/documents";
import { SECTORS } from "@/lib/sectors";
import { getCompany, makeActiveCompany, makeBank } from "./helpers/db";
import { jar } from "./helpers/next";

function readyCompany(overrides = {}) {
  const made = makeActiveCompany({ address: "Av. Principal 100, Lima", ...overrides });
  makeBank(made.companyId);
  return made;
}

const generate = (companyId: string) => generateAndSaveDocument(getCompany(companyId), listBanks(companyId), "politica");

describe("historial de versiones", () => {
  it("cada generación guarda una versión inmutable", () => {
    const { companyId } = readyCompany();
    expect(generate(companyId)).toBe(1);
    expect(generate(companyId)).toBe(2);
    expect(generate(companyId)).toBe(3);
    const versions = listDocumentVersions(companyId, "politica");
    expect(versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(versions.every((v) => v.content.length > 500)).toBe(true);
  });

  it("el historial es de cada empresa", () => {
    const a = readyCompany();
    const b = readyCompany();
    generate(a.companyId);
    generate(b.companyId);
    generate(b.companyId);
    expect(listDocumentVersions(a.companyId, "politica")).toHaveLength(1);
    expect(listDocumentVersions(b.companyId, "politica")).toHaveLength(2);
  });
});

describe("publicación", () => {
  it("la página pública muestra la versión PUBLICADA, no el borrador regenerado", () => {
    const { companyId } = readyCompany();
    generate(companyId);
    expect(publishDocument(companyId, "politica")).toEqual({ ok: true, version: 1 });
    const slug = getCompany(companyId).slug;
    const publishedText = getPolicyBySlug(slug)!.doc.content;

    // El cliente cambia su dirección y regenera: el borrador cambia, el público no.
    getDb().prepare("UPDATE companies SET address = 'Calle Nueva 999, Miraflores' WHERE id = ?").run(companyId);
    generate(companyId);
    const draft = getDocument(companyId, "politica")!;
    expect(draft.version).toBe(2);
    expect(draft.content).toContain("Calle Nueva 999");
    const served = getPolicyBySlug(slug)!;
    expect(served.doc.version).toBe(1);
    expect(served.doc.content).toBe(publishedText);
    expect(served.doc.content).not.toContain("Calle Nueva 999");

    // Al publicar la nueva versión, el público la ve.
    expect(publishDocument(companyId, "politica")).toEqual({ ok: true, version: 2 });
    expect(getPolicyBySlug(slug)!.doc.content).toContain("Calle Nueva 999");
  });

  it("guarda las fechas de publicación y retiro de cada versión", () => {
    const { companyId } = readyCompany();
    generate(companyId);
    publishDocument(companyId, "politica", new Date("2026-11-01T10:00:00Z"));
    generate(companyId);
    publishDocument(companyId, "politica", new Date("2026-11-05T10:00:00Z"));
    const [v2, v1] = listDocumentVersions(companyId, "politica");
    expect(v1.published_at).toBe("2026-11-01T10:00:00.000Z");
    expect(v1.unpublished_at).toBe("2026-11-05T10:00:00.000Z");
    expect(v2.published_at).toBe("2026-11-05T10:00:00.000Z");
    expect(v2.unpublished_at).toBeNull();

    unpublishDocument(companyId, "politica", new Date("2026-11-09T10:00:00Z"));
    expect(listDocumentVersions(companyId, "politica")[0].unpublished_at).toBe("2026-11-09T10:00:00.000Z");
    expect(getPolicyBySlug(getCompany(companyId).slug)).toBeUndefined();
    expect(getDocument(companyId, "politica")!.published).toBe(0);
  });

  it("volver a publicar la misma versión no cambia su primera fecha de publicación", () => {
    const { companyId } = readyCompany();
    generate(companyId);
    publishDocument(companyId, "politica", new Date("2026-11-01T10:00:00Z"));
    unpublishDocument(companyId, "politica", new Date("2026-11-02T10:00:00Z"));
    publishDocument(companyId, "politica", new Date("2026-11-03T10:00:00Z"));
    const [v1] = listDocumentVersions(companyId, "politica");
    expect(v1.published_at).toBe("2026-11-01T10:00:00.000Z");
    expect(v1.unpublished_at).toBeNull();
  });

  it("no se puede publicar con campos sin completar", () => {
    const { companyId } = makeActiveCompany({ address: "" });
    generate(companyId);
    const result = publishDocument(companyId, "politica");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("pendientes");
    expect(result.ok === false && result.placeholders?.join(" ")).toContain("completar domicilio");
    expect(getPolicyBySlug(getCompany(companyId).slug)).toBeUndefined();
  });

  it("sin documento no hay nada que publicar", () => {
    const { companyId } = readyCompany();
    expect(publishDocument(companyId, "politica")).toEqual({ ok: false, reason: "sin_documento" });
  });

  it("la política de otra empresa no se toca", () => {
    const a = readyCompany();
    const b = readyCompany();
    generate(a.companyId);
    generate(b.companyId);
    publishDocument(a.companyId, "politica");
    expect(getDocument(b.companyId, "politica")!.published).toBe(0);
  });
});

describe("acciones", () => {
  it("publicar desde la acción respeta los campos pendientes y registra la versión", async () => {
    const { companyId, userId } = makeActiveCompany({ address: "" });
    jar.store.clear();
    await createSession(userId);
    const form = (values: Record<string, string>) => {
      const data = new FormData();
      for (const [k, v] of Object.entries(values)) data.set(k, v);
      return data;
    };
    await expect(generateDocumentAction(form({ kind: "politica" }))).rejects.toThrow("REDIRECT:");
    await expect(togglePublishAction(form({ publish: "1" }))).rejects.toThrow("REDIRECT:/app/documentos?tab=politica&error=pendientes");
    expect(getDocument(companyId, "politica")!.published).toBe(0);

    getDb().prepare("UPDATE companies SET address = 'Av. Real 1' WHERE id = ?").run(companyId);
    await expect(generateDocumentAction(form({ kind: "politica" }))).rejects.toThrow("REDIRECT:");
    await expect(togglePublishAction(form({ publish: "1" }))).rejects.toThrow("REDIRECT:/app/documentos?tab=politica");
    expect(getDocument(companyId, "politica")!.published).toBe(1);
    const log = getDb().prepare("SELECT message FROM activity WHERE company_id = ? AND kind = 'documento'").all(companyId) as { message: string }[];
    expect(log.some((l) => l.message.includes("Publicaste la versión"))).toBe(true);
  });
});

describe("campos sin completar", () => {
  it("detecta marcadores [..] y no confunde enlaces ni casillas", () => {
    expect(findPlaceholders("Domicilio: [completar domicilio] y [enlace de tu Libro]")).toEqual(["[completar domicilio]", "[enlace de tu Libro]"]);
    expect(findPlaceholders("Ver [la política](https://x.pe) y ☐ [ ] [x] listo")).toEqual([]);
    expect(findPlaceholders("sin nada")).toEqual([]);
  });

  it.each(SECTORS.map((sector) => [sector.id, sector.label]))("la política del rubro %s sale completa si la empresa tiene sus datos", (id, label) => {
    const { companyId } = makeActiveCompany({ sector: label as string, address: "Av. Real 123, Lima" });
    makeBank(companyId);
    generate(companyId);
    expect(publishBlockers(getDocument(companyId, "politica")!.content), `sector ${id}`).toEqual([]);
  });
});

describe("feriados editables", () => {
  it("la tabla está sembrada y coincide con la regla calculada", () => {
    const rows = getDb().prepare("SELECT date FROM holidays WHERE date LIKE '2026-%' ORDER BY date").all() as { date: string }[];
    expect(rows.map((r) => r.date)).toEqual(calculatedHolidays(2026).map((h) => h.date));
    expect(rows.map((r) => r.date)).toContain("2026-04-02"); // Jueves Santo
    expect(rows.map((r) => r.date)).toContain("2026-04-03"); // Viernes Santo
  });

  it("un feriado nuevo por decreto mueve el plazo de una solicitud", () => {
    // Lunes 2026-11-16 + 10 días hábiles = lunes 2026-11-30 sin feriado extra.
    const before = addBusinessDays("2026-11-16", 10);
    expect(before).toBe("2026-11-30");
    setHoliday("2026-11-23", "Feriado por decreto", "decreto");
    expect(addBusinessDays("2026-11-16", 10)).toBe("2026-12-01");
    expect(businessDaysBetween("2026-11-16", "2026-11-30")).toBe(9);
    removeHoliday("2026-11-23");
    expect(addBusinessDays("2026-11-16", 10)).toBe(before);
  });

  it("un año sin filas usa la regla calculada", () => {
    getDb().exec("DELETE FROM holidays WHERE date LIKE '2031-%'");
    // Viernes Santo 2031 = 2031-04-11; el 2031-04-14 es lunes.
    expect(addBusinessDays("2031-04-10", 1)).toBe("2031-04-14");
  });
});
