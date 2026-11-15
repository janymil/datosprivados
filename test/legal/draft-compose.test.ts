import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PASS_A_SYSTEM, PASS_B_SYSTEM } from "@/legal/audit/meaning";
import { VerdictCache } from "@/legal/audit/verdict-cache";
import { composeDraft, PICK_SYSTEM, WRITE_SYSTEM } from "@/legal/draft/compose";
import type { Span } from "@/legal/draft/locate";

const ORIGINAL = `{
      id: "demo.aviso",
      cites: [{ norm: "ds-016-2024-jus", art: "7" }],
      text: () => \`Regla práctica: el aviso corto ubica la política.\`,
    }`;
const span: Span = { file: "src/legal/documents/x.ts", start: 0, end: ORIGINAL.length, source: ORIGINAL, kind: "clause" };
const GOOD = ORIGINAL.replace("Regla práctica: el aviso corto ubica la política.", "Informa antes de recoger el dato (art. 18 de la Ley N.° 29733).").replace(
  '[{ norm: "ds-016-2024-jus", art: "7" }]',
  '[{ norm: "ley-29733", art: "18" }]'
);
const WITH_CODE = GOOD.replace("Informa antes", "${process.env.X} Informa antes");
const QUOTE = "El titular de datos personales tiene derecho a ser informado en forma detallada, sencilla, expresa, inequívoca y de manera previa a su recopilación";

type Reply = { pick?: string; write?: string[]; verdict?: "supported" | "not_supported" | null };
/** IA falsa: responde según el prompt de sistema; registra cada llamada. */
function fakeAi(reply: Reply) {
  const calls: string[] = [];
  let writes = 0;
  const call = (async ({ system }: { system: string }) => {
    if (system === PICK_SYSTEM) {
      calls.push("pick");
      return reply.pick ?? '{"articles":[{"norm":"ley-29733","art":"18"}]}';
    }
    if (system === WRITE_SYSTEM) {
      calls.push("write");
      const r = reply.write?.[Math.min(writes++, (reply.write?.length ?? 1) - 1)] ?? GOOD;
      return JSON.stringify({ replacement: r, rationale: "El art. 18 exige informar antes de recoger el dato." });
    }
    if (system.startsWith(PASS_A_SYSTEM.slice(0, 40)) || system.startsWith(PASS_B_SYSTEM.slice(0, 40))) {
      calls.push("meaning");
      if (reply.verdict === null) return null;
      return reply.verdict === "not_supported"
        ? '{"verdict":"not_supported","quote":"","reason":"El artículo no dice eso."}'
        : `{"verdict":"supported","quote":"${QUOTE}","reason":"Lo dice el art. 18."}`;
    }
    throw new Error(`prompt inesperado: ${system.slice(0, 40)}`);
  }) as never;
  return { call, calls };
}
const deps = (call: never, textCites?: (span: Span, replacement: string) => Promise<Array<{ norm: string; art: string }>>) => ({
  ...(textCites ? { textCites } : {}),
  call,
  cache: new VerdictCache(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vc-")), "cache.json")),
  model: "gpt-6-luna",
  render: async () => ["Informa antes de recoger el dato (art. 18 de la Ley N.° 29733)."],
});
const input = { span, renderedVariants: ["Regla práctica: el aviso corto ubica la política."], context: { findings: [{ rule: "meaning", reason: "no respalda" }] } };

describe("redacción con IA", () => {
  it("un borrador que pasa las compuertas y las dos pasadas queda listo", async () => {
    const ai = fakeAi({});
    const out = await composeDraft(input, deps(ai.call));
    expect(out).toMatchObject({ ok: true, replacement: GOOD });
    expect(ai.calls).toEqual(["pick", "write", "meaning", "meaning"]);
  });

  it("si el primer intento no pasa una compuerta, el segundo recibe el motivo", async () => {
    const ai = fakeAi({ write: [WITH_CODE, GOOD] });
    const out = await composeDraft(input, deps(ai.call));
    expect(out.ok).toBe(true);
    expect(ai.calls).toEqual(["pick", "write", "pick", "write", "meaning", "meaning"]);
  });

  it("dos intentos sin respaldo: no hay borrador y se dan los motivos de la IA", async () => {
    const ai = fakeAi({ verdict: "not_supported" });
    const out = await composeDraft(input, deps(ai.call));
    expect(out).toEqual({ ok: false, retry: false, reasons: expect.arrayContaining([expect.stringContaining("El artículo no dice eso.")]) });
  });

  it("sin respuesta de la IA: no hay borrador, se reintenta más tarde y no lanza", async () => {
    const out = await composeDraft(input, deps((async () => null) as never));
    expect(out).toEqual({ ok: false, retry: true, reasons: ["IA sin respuesta"] });
  });

  it("las citas declaradas deben ser exactamente las que el texto menciona; el segundo intento recibe la diferencia", async () => {
    const WRONG = GOOD.replace('[{ norm: "ley-29733", art: "18" }]', '[{ norm: "ley-29733", art: "18" }, { norm: "ds-016-2024-jus", art: "7" }]');
    const ai = fakeAi({ write: [WRONG, GOOD] });
    const seen: string[] = [];
    const spy = (async (args: { system: string; messages: Array<{ content: string }> }) => {
      if (args.system === WRITE_SYSTEM) seen.push(args.messages[0].content);
      return (ai.call as unknown as (a: unknown) => Promise<string | null>)(args);
    }) as never;
    const out = await composeDraft(input, deps(spy, async () => [{ norm: "ley-29733", art: "18" }]));
    expect(out).toMatchObject({ ok: true, replacement: GOOD });
    expect(seen[1]).toMatch(/ds-016-2024-jus:7/);
  });

  it("una cita elegida que no existe no llega a la IA que redacta", async () => {
    const ai = fakeAi({ pick: '{"articles":[{"norm":"ley-29733","art":"999"},{"norm":"ley-29733","art":"18"}]}' });
    const seen: string[] = [];
    const spy = (async (args: { system: string; messages: Array<{ content: string }> }) => {
      if (args.system === WRITE_SYSTEM) seen.push(args.messages[0].content);
      return (ai.call as unknown as (a: unknown) => Promise<string | null>)(args);
    }) as never;
    await composeDraft(input, deps(spy));
    expect(seen[0]).toContain("ley-29733, art. 18");
    expect(seen[0]).not.toContain("art. 999");
  });
});
