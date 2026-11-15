import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ingestProposed, markAmended, proposeSource, writeNorm, type ProposedSource } from "@/legal/draft/ingest-norm";

const TEXT = fs.readFileSync(path.join(process.cwd(), "test/fixtures/legal-draft/ds-fixture.txt"), "utf8");
const ITEM = { title: "DECRETO SUPREMO N° 001-2027-JUS", issuer: "JUSTICIA Y DERECHOS HUMANOS", published_on: "2027-01-10", url: "https://busquedas.elperuano.pe/dispositivo/NL/1-1", pdf_url: "https://x/1.pdf" };
const ENTRY: ProposedSource = {
  id: "ds-001-2027-jus",
  start: "^DECRETA:$",
  startOccurrence: 1,
  end: "^Dado en la Casa de Gobierno",
  sections: false,
  norm: { title: "Decreto Supremo N.° 001-2027-JUS, que modifica el Reglamento de la Ley N.° 29733", type: "decreto-supremo", number: "001-2027-JUS", publishedAt: "2027-01-10" },
};
const ai = (reply: unknown) => (async () => (reply === null ? null : JSON.stringify(reply))) as never;

describe("cargar una norma nueva en la biblioteca (paso 3)", () => {
  it("la entrada propuesta por la IA corta la norma en sus 3 artículos", async () => {
    const proposed = await proposeSource(TEXT, ITEM, { call: ai(ENTRY) });
    expect(proposed).toEqual({ entry: ENTRY });
    const out = ingestProposed(ENTRY, TEXT);
    expect("articles" in out && out.articles.map((a) => a.num)).toEqual(["1", "2", "3"]);
  });

  it("un inicio que no aparece, un id raro o un tipo desconocido se rechazan con motivo", async () => {
    expect(ingestProposed({ ...ENTRY, start: "^NO ESTÁ$" }, TEXT)).toEqual({ reasons: [expect.stringContaining("inicio")] });
    expect(await proposeSource(TEXT, ITEM, { call: ai({ ...ENTRY, id: "../etc" }) })).toEqual({ reasons: [expect.stringContaining("id")] });
    expect(await proposeSource(TEXT, ITEM, { call: ai({ ...ENTRY, norm: { ...ENTRY.norm, type: "tratado" } }) })).toEqual({
      reasons: [expect.stringContaining("tipo")],
    });
    expect(await proposeSource(TEXT, ITEM, { call: ai(null) })).toEqual({ reasons: ["IA sin respuesta"], retry: true });
  });

  it("un PDF sin capa de texto (escaneo) no se carga", () => {
    expect(ingestProposed(ENTRY, "  \n  12  \n")).toEqual({ reasons: ["PDF sin texto: la norma está escaneada como imagen"] });
  });

  it("números de artículo desordenados son una señal de corte equivocado", () => {
    const messy = TEXT.replace("Artículo 2.-", "Artículo 7.-");
    expect(ingestProposed(ENTRY, messy)).toEqual({ reasons: [expect.stringContaining("orden")] });
  });

  it("writeNorm escribe la biblioteca y sources.json; markAmended marca la norma modificada", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "lib-"));
    fs.mkdirSync(path.join(root, "scripts/legal"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts/legal/sources.json"), '{\n  "ley-29733": { "url": "u" }\n}\n');
    fs.mkdirSync(path.join(root, "legal/library/ds-016-2024-jus"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "legal/library/ds-016-2024-jus/norm.json"),
      JSON.stringify({ id: "ds-016-2024-jus", status: "vigente", amendedBy: [] }, null, 2)
    );
    const out = ingestProposed(ENTRY, TEXT);
    if (!("articles" in out)) throw new Error("no cortó");
    writeNorm(root, ENTRY, out.articles, { url: ITEM.pdf_url, sha256: "a".repeat(64), retrievedAt: "2027-01-11" });
    const norm = JSON.parse(fs.readFileSync(path.join(root, "legal/library/ds-001-2027-jus/norm.json"), "utf8"));
    expect(norm).toMatchObject({ id: "ds-001-2027-jus", status: "vigente", officialUrl: ITEM.pdf_url, sourceSha256: "a".repeat(64) });
    expect(JSON.parse(fs.readFileSync(path.join(root, "legal/library/ds-001-2027-jus/articles.json"), "utf8"))).toHaveLength(3);
    const sources = JSON.parse(fs.readFileSync(path.join(root, "scripts/legal/sources.json"), "utf8"));
    expect(Object.keys(sources)).toEqual(["ley-29733", "ds-001-2027-jus"]);
    expect(sources["ds-001-2027-jus"]).toMatchObject({ url: ITEM.pdf_url, start: "^DECRETA:$" });
    markAmended(root, "ds-016-2024-jus", "ds-001-2027-jus");
    expect(JSON.parse(fs.readFileSync(path.join(root, "legal/library/ds-016-2024-jus/norm.json"), "utf8"))).toMatchObject({
      status: "modificada",
      amendedBy: ["ds-001-2027-jus"],
    });
  });
});
