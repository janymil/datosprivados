import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PASS_A_SYSTEM, PASS_B_SYSTEM } from "@/legal/audit/meaning";
import { findingId } from "@/legal/audit/types";
import { VerdictCache } from "@/legal/audit/verdict-cache";
import { PICK_SYSTEM, WRITE_SYSTEM } from "@/legal/draft/compose";
import { locateTarget } from "@/legal/draft/locate";
import { bumpTemplateVersions, changedKinds, runDraft, type ProposeInput, type RunDeps } from "@/legal/draft/run";

const TARGET = "aviso.nota.regla-practica";
const real = locateTarget(TARGET)!;
const GOOD = real.source
  .replace(/\*Regla práctica:[^`]*\*/, "*Informa antes de recoger el dato (art. 18 de la Ley N.° 29733): quién eres, para qué usas el dato y dónde ejercer derechos.*")
  .replace('{ norm: "ds-016-2024-jus", art: "7" }', '{ norm: "ley-29733", art: "18" }');
const QUOTE = "El titular de datos personales tiene derecho a ser informado en forma detallada, sencilla, expresa, inequívoca y de manera previa a su recopilación";
const FINDING = { id: findingId("significado", TARGET, "ANTES"), check: "significado", rule: "meaning", source: TARGET, detail: "x", severity: "error" };

function setup(over: Partial<RunDeps> & { aiDown?: boolean } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "draft-run-"));
  const put = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  put(real.file, fs.readFileSync(path.join(process.cwd(), real.file), "utf8"));
  put("src/lib/document-freshness.ts", fs.readFileSync(path.join(process.cwd(), "src/lib/document-freshness.ts"), "utf8"));
  put("test/legal/baseline-hashes.json", JSON.stringify({ "a__1|aviso": "x", "a__1|politica": "p" }));
  fs.symlinkSync(path.join(process.cwd(), "legal"), path.join(root, "legal"));
  const log = { git: [] as string[][], proposed: [] as ProposeInput[], enqueued: [] as unknown[], ai: 0, downloads: 0, checks: 0 };
  const call = (async ({ system }: { system: string }) => {
    log.ai += 1;
    if (over.aiDown) return null;
    if (system === PICK_SYSTEM) return '{"articles":[{"norm":"ley-29733","art":"18"}]}';
    if (system === WRITE_SYSTEM) return JSON.stringify({ replacement: GOOD, rationale: "El art. 18 exige informar antes." });
    if (system.startsWith(PASS_A_SYSTEM.slice(0, 40)) || system.startsWith(PASS_B_SYSTEM.slice(0, 40)))
      return `{"verdict":"supported","quote":"${QUOTE}","reason":"Lo dice el art. 18."}`;
    throw new Error("prompt inesperado");
  }) as never;
  const deps: RunDeps = {
    root,
    ai: { call, cache: new VerdictCache(path.join(root, "cache.json")), model: "gpt-6-luna" },
    render: async (_span, replacement) => [replacement === real.source ? "ANTES" : "AHORA"],
    git: (args) => {
      log.git.push(args);
      return { code: 0, out: "" };
    },
    regenerate: () => {
      fs.writeFileSync(path.join(root, "test/legal/baseline-hashes.json"), JSON.stringify({ "a__1|aviso": "y", "a__1|politica": "p" }));
      return { ok: true, out: "" };
    },
    checks: () => {
      log.checks += 1;
      return { ok: true, out: "" };
    },
    validate: () => [],
    propose: (p) => {
      log.proposed.push(p);
      return { ok: true, changeId: "lc-20270110-abcdef" };
    },
    download: async () => {
      log.downloads += 1;
      return null;
    },
    enqueue: async (r) => void log.enqueued.push(r),
    today: "2027-01-10",
    ...over,
  };
  return { root, deps, log };
}
const request = (over: Record<string, unknown> = {}) => ({ id: "req-1", origin: "auditoria" as const, ref: FINDING.id, targets: [TARGET], context: { findings: [FINDING] }, attempts: 1, ...over });

describe("el redactor: de la solicitud al cambio registrado", () => {
  it("una corrección de auditoría queda aplicada, con versión subida, y se registra marcada como IA", async () => {
    const { root, deps, log } = setup();
    expect(await runDraft(request(), deps)).toEqual({ status: "propuesto", changeId: "lc-20270110-abcdef" });
    expect(fs.readFileSync(path.join(root, real.file), "utf8")).toContain("Informa antes de recoger el dato");
    const before = /aviso: (\d+),/.exec(fs.readFileSync(path.join(process.cwd(), "src/lib/document-freshness.ts"), "utf8"))![1];
    expect(fs.readFileSync(path.join(root, "src/lib/document-freshness.ts"), "utf8")).toContain(`aviso: ${Number(before) + 1},`);
    expect(log.git[0]).toEqual(["checkout", "-q", "-B", "legal/auto-req1-1", "origin/master"]);
    expect(log.git.some((a) => a[0] === "commit")).toBe(true);
    expect(log.proposed[0]).toMatchObject({ kind: "auditoria", sourceUrl: null, affected: [{ kind: "clause", source: TARGET }] });
    expect(log.proposed[0].summary).toMatch(/Redactado por IA/);
    expect(log.proposed[0].summary).toMatch(/\*\*Antes:\*\* ANTES/);
    expect(log.proposed[0].summary).toMatch(/Para el abogado/);
  });

  it("si las comprobaciones fallan: sin solución, sin registro y la rama se borra", async () => {
    const { deps, log } = setup({ checks: () => ({ ok: false, out: "FAIL test/x.test.ts" }) });
    const out = await runDraft(request(), deps);
    expect(out).toMatchObject({ status: "sin_solucion", reasons: [expect.stringContaining("FAIL test/x.test.ts")] });
    expect(log.proposed).toEqual([]);
    expect(log.git.at(-1)).toEqual(["branch", "-q", "-D", "legal/auto-req1-1"]);
  });

  it("push rechazado (master se movió): se reintenta", async () => {
    const { deps } = setup({ propose: () => ({ ok: false, rejected: true, out: "! [rejected] non-fast-forward" }) });
    expect((await runDraft(request(), deps)).status).toBe("reintentar");
  });

  it("IA caída: «esperar» (vuelve a la cola sin gastar intento), no queda sin solución", async () => {
    const { deps, log } = setup({ aiDown: true });
    expect((await runDraft(request(), deps)).status).toBe("esperar");
    expect(log.proposed).toEqual([]);
  });

  it("un hallazgo que ya no se produce (otro cambio lo corrigió): resuelto, sin llamar a la IA", async () => {
    const { deps, log } = setup();
    const stale = { ...FINDING, id: findingId("significado", TARGET, "OTRO TEXTO") };
    expect((await runDraft(request({ ref: stale.id, context: { findings: [stale] } }), deps)).status).toBe("resuelto");
    expect(log.ai).toBe(0);
  });

  it("revisión I6: cada intento usa su propia rama (un reintento nunca choca con la del intento anterior)", async () => {
    const { deps, log } = setup();
    await runDraft(request({ attempts: 2 }), deps);
    expect(log.git[0]).toEqual(["checkout", "-q", "-B", "legal/auto-req1-2", "origin/master"]);
  });

  it("revisión C2: una solicitud hija de una norma redacta solo sus textos, sin volver a cargar la norma", async () => {
    const { deps, log } = setup();
    const out = await runDraft(
      request({ origin: "norma", ref: "item#2", targets: [TARGET], context: { pdf_url: "https://x/1.pdf", waitFor: "ds-001-2027-jus", norms: ["ds-016-2024-jus"], articles: ["7"] } }),
      deps
    );
    expect(log.downloads).toBe(0);
    expect(out.status).toBe("propuesto");
    expect(log.proposed[0].affected).toEqual([{ kind: "clause", source: TARGET }]);
  });

  it("revisión I4: un texto que ya está en un cambio abierto no se redacta; vuelve a la cola a esperar", async () => {
    const { deps, log } = setup();
    const out = await runDraft(request({ targets: [TARGET], busy: [TARGET] }), deps);
    expect(out.status).toBe("resuelto");
    expect(log.ai).toBe(0);
    expect(log.enqueued).toEqual([{ origin: "auditoria", ref: `${FINDING.id}#ocupado`, targets: [TARGET], context: { findings: [FINDING] } }]);
  });

  it("si la rama no cumple las reglas tras regenerar, no se corren las comprobaciones largas", async () => {
    const { deps, log } = setup({ validate: () => ["legal/known-failures/citations.json agrega 1 falla(s) conocida(s)"] });
    const out = await runDraft(request(), deps);
    expect(out).toMatchObject({ status: "sin_solucion", reasons: [expect.stringContaining("falla(s) conocida(s)")] });
    expect(log.checks).toBe(0);
  });

  it("textos de otro tipo de documento vuelven a la cola como otra solicitud", async () => {
    const { deps, log } = setup();
    await runDraft(request({ targets: [TARGET, "politica.no.existe"] }), deps);
    expect(log.enqueued).toEqual([{ origin: "auditoria", ref: `${FINDING.id}#2`, targets: ["politica.no.existe"], context: { findings: [FINDING] } }]);
  });
});

describe("piezas del redactor", () => {
  it("changedKinds y bumpTemplateVersions", () => {
    expect(changedKinds({ "a|aviso": "1", "a|politica": "2" }, { "a|aviso": "1", "a|politica": "3", "b|cookies": "4" })).toEqual(["cookies", "politica"]);
    expect(bumpTemplateVersions("  aviso: 2,\n  politica: 4,\n", ["politica"])).toBe("  aviso: 2,\n  politica: 5,\n");
    expect(() => bumpTemplateVersions("  aviso: 2,\n", ["otro"])).toThrow(/otro/);
  });
});
