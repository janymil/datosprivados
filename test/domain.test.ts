import { beforeEach, describe, expect, it } from "vitest";
import { computeCompliance } from "@/lib/compliance";
import { TEMPLATE_VERSIONS, documentFreshness, fingerprint, serializeBuiltFrom } from "@/lib/document-freshness";
import { generateAndSaveDocument, listBanks, listDocuments, listProviders } from "@/lib/data";
import { DOCUMENT_TABS, buildDocument } from "@/lib/document-catalog";

const DOCUMENT_KINDS = DOCUMENT_TABS.map((tab) => tab.key);
import { getDb, type DocumentRow } from "@/lib/db";
import { freezeTime, jar } from "./helpers/next";
import { createSession } from "@/lib/auth";
import { regenerateOutdatedAction } from "@/app/actions/documents";
import { getCompany, makeActiveCompany, makeArcoRequest, makeBank, makeIncident, makeProvider } from "./helpers/db";

const HOUR = 3_600_000;

function snapshot(companyId: string) {
  const company = getCompany(companyId);
  return {
    company,
    banks: listBanks(companyId),
    requests: getDb().prepare("SELECT * FROM arco_requests WHERE company_id = ?").all(companyId) as never[],
    incidents: getDb().prepare("SELECT * FROM incidents WHERE company_id = ?").all(companyId) as never[],
    documents: listDocuments(companyId),
    providers: listProviders(companyId),
  };
}

describe("computeCompliance", () => {
  it("los pesos de los pasos suman 100", () => {
    const { companyId } = makeActiveCompany();
    const result = computeCompliance(snapshot(companyId));
    expect(result.items.reduce((acc, item) => acc + item.weight, 0)).toBe(100);
  });

  it("una cuenta vacía tiene puntaje bajo y en riesgo", () => {
    const { companyId } = makeActiveCompany();
    const result = computeCompliance(snapshot(companyId));
    expect(result.level).toBe("en_riesgo");
    expect(result.score).toBeLessThan(50);
  });

  it("declarar un banco activa su paso", () => {
    const { companyId } = makeActiveCompany();
    const before = computeCompliance(snapshot(companyId));
    makeBank(companyId);
    const after = computeCompliance(snapshot(companyId));
    expect(after.setupScore - before.setupScore).toBe(15);
  });

  it("marcar los bancos como inscritos suma 20", () => {
    const { companyId } = makeActiveCompany();
    makeBank(companyId);
    const before = computeCompliance(snapshot(companyId));
    getDb().prepare("UPDATE data_banks SET status = 'registrado', registered_at = '2026-10-01' WHERE company_id = ?").run(companyId);
    const after = computeCompliance(snapshot(companyId));
    expect(after.setupScore - before.setupScore).toBe(20);
  });

  it("una solicitud ARCO vencida genera alerta y descuento, con tope en el puntaje ganado", () => {
    const { companyId } = makeActiveCompany();
    makeBank(companyId);
    makeArcoRequest(companyId, { due_at: "2020-01-01" });
    const result = computeCompliance(snapshot(companyId));
    expect(result.alerts.some((a) => a.tone === "danger" && a.href === "/app/arco")).toBe(true);
    expect(result.penalty).toBe(15);
    expect(result.score).toBe(result.setupScore - 15);
    expect(result.level).toBe("en_riesgo");
  });

  it("el descuento nunca deja el puntaje negativo", () => {
    const { companyId } = makeActiveCompany({ name: "", phone: "" });
    makeArcoRequest(companyId, { due_at: "2020-01-01" });
    makeIncident(companyId, { criteria: "gran_volumen", due_at: new Date(Date.now() - HOUR).toISOString() });
    const result = computeCompliance(snapshot(companyId));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.penalty).toBeLessThanOrEqual(result.setupScore);
  });

  it("incidente con criterio y sin notificar tras 48 h → alerta de peligro", () => {
    const { companyId } = makeActiveCompany();
    makeIncident(companyId, { criteria: "datos_sensibles", due_at: new Date(Date.now() - HOUR).toISOString() });
    const result = computeCompliance(snapshot(companyId));
    expect(result.alerts.some((a) => a.tone === "danger" && a.href === "/app/incidentes")).toBe(true);
  });

  it("incidente sin criterios vencido solo se documenta (sin alerta de peligro)", () => {
    const { companyId } = makeActiveCompany();
    makeIncident(companyId, { criteria: "", due_at: new Date(Date.now() - HOUR).toISOString() });
    const result = computeCompliance(snapshot(companyId));
    expect(result.alerts.some((a) => a.tone === "danger")).toBe(false);
  });

  it("incidente ya notificado no genera alerta de peligro", () => {
    const { companyId } = makeActiveCompany();
    makeIncident(companyId, {
      criteria: "gran_volumen",
      status: "notificado",
      notified_at: new Date().toISOString(),
      due_at: new Date(Date.now() - HOUR).toISOString(),
    });
    expect(computeCompliance(snapshot(companyId)).alerts.some((a) => a.tone === "danger")).toBe(false);
  });

  it("política publicada pero desactualizada no cuenta como completa", () => {
    const { companyId } = makeActiveCompany();
    const bank = makeBank(companyId);
    generateAndSaveDocument(getCompany(companyId), listBanks(companyId), "politica");
    getDb().prepare("UPDATE documents SET published = 1 WHERE company_id = ? AND kind = 'politica'").run(companyId);
    const fresh = computeCompliance(snapshot(companyId));
    expect(fresh.items.find((i) => i.label.startsWith("Publica"))?.ok).toBe(true);
    getDb().prepare("UPDATE data_banks SET purpose = 'otro propósito' WHERE id = ?").run(bank);
    const stale = computeCompliance(snapshot(companyId));
    expect(stale.items.find((i) => i.label.startsWith("Publica"))?.ok).toBe(false);
  });

  it("herramientas en el exterior sin contrato generan aviso", () => {
    const { companyId } = makeActiveCompany();
    makeProvider(companyId, { country: "Estados Unidos" });
    const result = computeCompliance(snapshot(companyId));
    expect(result.alerts.some((a) => a.href === "/app/herramientas")).toBe(true);
  });
});

describe("document-freshness", () => {
  it("la huella es estable y no depende del orden de los bancos", () => {
    const { companyId } = makeActiveCompany();
    makeBank(companyId, { name: "A" });
    makeBank(companyId, { name: "B" });
    const company = getCompany(companyId);
    const banks = listBanks(companyId);
    expect(fingerprint("politica", company, banks)).toEqual(fingerprint("politica", company, [...banks].reverse()));
    expect(fingerprint("politica", company, banks)).toEqual(fingerprint("politica", company, banks));
  });

  function savedDoc(kind: "politica" | "cookies" | "reclamaciones", companyId: string): DocumentRow {
    generateAndSaveDocument(getCompany(companyId), listBanks(companyId), kind);
    return listDocuments(companyId).find((d) => d.kind === kind)!;
  }

  it("un documento recién generado está al día", () => {
    const { companyId } = makeActiveCompany();
    makeBank(companyId);
    const doc = savedDoc("politica", companyId);
    expect(documentFreshness(doc, getCompany(companyId), listBanks(companyId), listProviders(companyId))).toEqual({ stale: false, reasons: [] });
  });

  it("detecta cada motivo: plantilla, empresa, rubro, bancos y herramientas", () => {
    const { companyId } = makeActiveCompany();
    const bank = makeBank(companyId);
    const doc = savedDoc("politica", companyId);
    const check = () => documentFreshness(doc, getCompany(companyId), listBanks(companyId), listProviders(companyId)).reasons;

    expect(documentFreshness({ ...doc, template_version: TEMPLATE_VERSIONS.politica - 1 }, getCompany(companyId), listBanks(companyId)).reasons).toContain("plantilla");
    expect(documentFreshness({ ...doc, template_version: null }, getCompany(companyId), listBanks(companyId)).reasons).toContain("plantilla");

    getDb().prepare("UPDATE companies SET address = 'Otra dirección 999' WHERE id = ?").run(companyId);
    expect(check()).toContain("empresa");
    getDb().prepare("UPDATE companies SET sector = 'Clínica o consultorio médico' WHERE id = ?").run(companyId);
    expect(check()).toContain("rubro");
    getDb().prepare("UPDATE data_banks SET retention = '10 años' WHERE id = ?").run(bank);
    expect(check()).toContain("bancos");
    makeProvider(companyId);
    expect(check()).toContain("herramientas");
  });

  it("un documento cuya huella es ilegible solo puede quedar desactualizado por plantilla", () => {
    const { companyId } = makeActiveCompany();
    const doc = savedDoc("politica", companyId);
    const result = documentFreshness({ ...doc, built_from: "{no-json" }, getCompany(companyId), []);
    expect(result.reasons).toEqual([]);
  });

  it("los documentos que no usan bancos no se desactualizan por cambios en bancos", () => {
    const { companyId } = makeActiveCompany();
    const doc = savedDoc("cookies", companyId);
    makeBank(companyId, { name: "Nuevo" });
    expect(documentFreshness(doc, getCompany(companyId), listBanks(companyId)).reasons).not.toContain("bancos");
  });

  it("serializeBuiltFrom guarda la huella como JSON", () => {
    const { companyId } = makeActiveCompany();
    const stamp = fingerprint("politica", getCompany(companyId), []);
    expect(JSON.parse(serializeBuiltFrom(stamp))).toEqual(stamp);
  });

  describe("regenerateOutdatedAction", () => {
    beforeEach(() => jar.store.clear());

    it("actualiza solo lo desactualizado, sin crear documentos nuevos ni cambiar la publicación", async () => {
      const { companyId, userId } = makeActiveCompany();
      makeBank(companyId);
      const policy = savedDoc("politica", companyId);
      generateAndSaveDocument(getCompany(companyId), listBanks(companyId), "cookies");
      getDb().prepare("UPDATE documents SET published = 1 WHERE id = ?").run(policy.id);
      getDb().prepare("UPDATE companies SET address = 'Nueva dirección 456' WHERE id = ?").run(companyId);

      await createSession(userId);
      await expect(regenerateOutdatedAction()).rejects.toThrow(/REDIRECT:\/app\/documentos\?regen=2/);

      const docs = listDocuments(companyId);
      expect(docs.map((d) => d.kind).sort()).toEqual(["cookies", "politica"]);
      const after = docs.find((d) => d.kind === "politica")!;
      expect(after.version).toBe(2);
      expect(after.published).toBe(1);
      expect(after.content).toContain("Nueva dirección 456");
    });
  });
});

const SECTOR_CASES: Array<[string, string]> = [
  ["clínica", "Clínica o consultorio médico"],
  ["e-commerce", "Tienda online / e-commerce"],
  ["SaaS", "Software, app o plataforma digital (SaaS)"],
  ["educación", "Colegio, nido o cuna"],
];

describe("constructores de documentos", () => {
  function scenario(sector: string, variant: "sin-herramientas" | "exterior") {
    const { companyId } = makeActiveCompany({ sector });
    makeBank(companyId, { name: "Pacientes y clientes", transfers: variant === "exterior" ? "si" : "no" });
    if (variant === "exterior") makeProvider(companyId, { category: "nube", name: "Amazon Web Services", country: "Estados Unidos" });
    return { company: getCompany(companyId), banks: listBanks(companyId), providers: listProviders(companyId) };
  }

  for (const [label, sector] of SECTOR_CASES) {
    for (const variant of ["sin-herramientas", "exterior"] as const) {
      it(`${label} / ${variant}: todos los documentos se generan sin residuos de plantilla`, () => {
        const { company, banks, providers } = scenario(sector, variant);
        for (const kind of DOCUMENT_KINDS) {
          const text = buildDocument(kind, company, banks, providers);
          expect(text.length, kind).toBeGreaterThan(300);
          expect(text, kind).not.toMatch(/\bundefined\b|\[object |\{\{|\bNaN\b|\bnull\b/);
          expect(text, kind).toMatch(/^#{1,3}\s+\S/m);
          expect(text, kind).toContain(company.name);
        }
      });
    }
  }

  it("la política menciona la herramienta en el exterior solo cuando se declara", () => {
    const withTool = scenario("Tienda online / e-commerce", "exterior");
    const without = scenario("Tienda online / e-commerce", "sin-herramientas");
    expect(buildDocument("politica", withTool.company, withTool.banks, withTool.providers)).toContain("Amazon Web Services");
    expect(buildDocument("politica", without.company, without.banks, without.providers)).not.toContain("Amazon Web Services");
  });

  it("la generación es determinista para los mismos datos", () => {
    const { company, banks, providers } = scenario("Tienda online / e-commerce", "exterior");
    const frozen = freezeTime("2026-10-31T12:00:00Z");
    try {
      for (const kind of DOCUMENT_KINDS) {
        expect(buildDocument(kind, company, banks, providers)).toBe(buildDocument(kind, company, banks, providers));
      }
    } finally {
      frozen.restore();
    }
  });
});
