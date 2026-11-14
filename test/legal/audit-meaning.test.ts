import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkMeaning, parseVerdict, PASS_A_SYSTEM, PASS_B_SYSTEM, quoteFound, type MeaningInput } from "@/legal/audit/meaning";
import { VerdictCache } from "@/legal/audit/verdict-cache";

const ARTICLE = "El titular de datos personales tiene derecho a obtener la información que sobre sí mismo sea objeto de tratamiento.";
const input: MeaningInput = {
  source: "arco.2.acceso",
  text: "Usted tiene derecho a obtener la información sobre sus datos que tratamos.",
  articles: [{ norm: "ley-29733", art: "19", text: ARTICLE }],
};
const json = (verdict: string, quote = "tiene derecho a obtener la información", reason = "motivo") => JSON.stringify({ verdict, quote, reason });

/** `call` falso: devuelve las respuestas en orden (pasada A, pasada B, …) y cuenta las llamadas. */
function fake(...replies: Array<string | null>) {
  let i = 0;
  const call = async () => replies[i++] ?? null;
  return { call: call as never, calls: () => i };
}
const cache = () => new VerdictCache(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vc-")), "verdicts.json"));
const run = (f: ReturnType<typeof fake>, c = cache()) => checkMeaning(input, { call: f.call, cache: c, model: "gpt-6-luna" });

describe("chequeo de significado (dos pasadas)", () => {
  it("dos supported: sin hallazgo", async () => {
    expect(await run(fake(json("supported"), json("supported")))).toEqual({ finding: null, aiFailed: false });
  });

  it("supported + partial: revisar con los dos veredictos", async () => {
    const { finding } = await run(fake(json("supported"), json("partial")));
    expect(finding).toMatchObject({ check: "significado", rule: "meaning", severity: "revisar", source: "arco.2.acceso" });
    expect(finding?.verdicts?.map((v) => `${v.pass}:${v.verdict}`)).toEqual(["a:supported", "b:partial"]);
  });

  it("dos not_supported: error", async () => {
    const { finding } = await run(fake(json("not_supported"), json("not_supported")));
    expect(finding?.severity).toBe("error");
  });

  it("JSON dentro de ```json y con texto alrededor: se lee", () => {
    const raw = `Claro, aquí va:\n\`\`\`json\n${json("partial")}\n\`\`\`\nSaludos.`;
    expect(parseVerdict(raw, "a")).toMatchObject({ pass: "a", verdict: "partial" });
  });

  it("sin JSON válido: revisar, aiFailed", async () => {
    const result = await run(fake("no sé", json("supported")));
    expect(result.aiFailed).toBe(true);
    expect(result.finding).toMatchObject({ severity: "revisar", detail: "la IA no respondió" });
  });

  it("null de la IA: revisar, aiFailed", async () => {
    const result = await run(fake(null, null));
    expect(result.aiFailed).toBe(true);
    expect(result.finding?.severity).toBe("revisar");
  });

  it("cita inventada: revisar", async () => {
    const { finding } = await run(fake(json("supported", "el titular puede exigir una copia gratis"), json("supported")));
    expect(finding).toMatchObject({ severity: "revisar", detail: "la cita de la IA no está en el artículo" });
  });

  it("una cita con el número del artículo delante, que junta dos incisos o lleva «…», se encuentra", () => {
    const articles = [
      { norm: "ds", art: "66", text: "66.1 Todas las solicitudes presentadas deben ser recibidas dejándose constancia de su recepción." },
      { norm: "ds", art: "68", text: "68.1 El titular del banco de datos personales debe responder la solicitud en el plazo previsto." },
    ];
    expect(quoteFound("66.1 Todas las solicitudes presentadas deben ser recibidas dejándose constancia de su recepción. 68.1 El titular del banco de datos personales debe responder", articles)).toBe(true);
    expect(quoteFound("Art. 66: “Todas las solicitudes presentadas deben ser recibidas … dejándose constancia de su recepción”", articles)).toBe(true);
    expect(quoteFound("Todas las solicitudes deben pagarse con una tasa de diez soles", articles)).toBe(false);
  });

  it("las dos pasadas excluyen los datos propios de la empresa y piden margen de salida", async () => {
    expect(PASS_A_SYSTEM).toContain("datos propios de la empresa");
    expect(PASS_B_SYSTEM).toContain("datos propios de la empresa");
    const seen: number[] = [];
    const call = (async (args: { maxTokens?: number }) => {
      seen.push(args.maxTokens ?? 0);
      return json("supported");
    }) as never;
    await checkMeaning(input, { call, cache: cache(), model: "m" });
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(4000);
  });

  it("segunda vez con la misma entrada: usa la caché (0 llamadas)", async () => {
    const c = cache();
    await run(fake(json("supported"), json("supported")), c);
    c.save();
    const again = fake();
    expect(await run(again, new VerdictCache(c.file))).toEqual({ finding: null, aiFailed: false });
    expect(again.calls()).toBe(0);
  });
});
