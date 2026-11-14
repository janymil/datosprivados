import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { legalContext } from "@/legal/context";
import { allClauses } from "@/legal/registry";
import type { Citation } from "@/legal/types";
import { legalFixtures } from "./fixtures";
import { clauseCitationsOverFixtures, sortCitations, withFrozenWorld } from "./render-all";

/**
 * Cada cláusula declara en `cites` exactamente los artículos que su texto cita, en
 * todas las combinaciones. `FILL_CITES=1` reescribe los `cites` de
 * src/legal/documents/*.ts con lo que el texto produce (codemod idempotente).
 */
const DOCS = path.join(process.cwd(), "src", "legal", "documents");
const fmt = (cites: Citation[]) =>
  cites.length
    ? `cites: [\n${cites.map((c) => `        { norm: "${c.norm}", art: "${c.art}" },`).join("\n")}\n      ],`
    : "cites: [],";

function fillCites(found: Map<string, Citation[]>) {
  for (const file of fs.readdirSync(DOCS).filter((f) => f.endsWith(".ts"))) {
    const full = path.join(DOCS, file);
    let src = fs.readFileSync(full, "utf8");
    for (const clause of allClauses()) {
      const at = src.indexOf(`id: "${clause.id}",`);
      if (at < 0) continue;
      const re = /cites: \[[^\]]*\],/y;
      const from = src.indexOf("cites: [", at);
      re.lastIndex = from;
      const m = re.exec(src);
      if (!m) throw new Error(`${file}: no se encontró cites de ${clause.id}`);
      // Reescribe con la misma sangría que la propiedad tenía.
      const indent = src.slice(src.lastIndexOf("\n", from) + 1, from);
      const block = fmt(found.get(clause.id) ?? []).replace(/\n {8}/g, `\n${indent}  `).replace(/\n {6}\]/, `\n${indent}]`);
      src = src.slice(0, from) + block + src.slice(from + m[0].length);
    }
    fs.writeFileSync(full, src);
  }
}

describe("citas de las cláusulas", () => {
  const found = clauseCitationsOverFixtures();
  if (process.env.FILL_CITES === "1") fillCites(found);

  it("cada cláusula declara exactamente las citas que su texto produce, en todas las combinaciones", () => {
    const mismatched = allClauses()
      .filter((clause) => JSON.stringify(sortCitations(clause.cites)) !== JSON.stringify(found.get(clause.id) ?? []))
      .map((clause) => clause.id);
    expect(mismatched, "corre FILL_CITES=1 pnpm vitest run test/legal/citations.test.ts").toEqual([]);
  }, 120_000);

  /** Cláusulas cuyo texto nombra una norma en alguna combinación. */
  const NORM_NAME = /\b(Ley|DS|D\. ?Leg|Decreto|Directiva|C[óo]digo|Reglamento|Resoluci[óo]n|NTS|Opini[óo]n Consultiva)\b/;
  const namesNorm = withFrozenWorld(() => {
    const ids = new Set<string>();
    for (const f of legalFixtures()) {
      const ctx = legalContext(f.company, f.banks, f.providers);
      for (const clause of allClauses()) if ((!clause.when || clause.when(ctx)) && NORM_NAME.test(clause.text(ctx))) ids.add(clause.id);
    }
    return ids;
  });

  it("nonLegal solo en cláusulas que no citan artículos ni nombran normas", () => {
    const wrong = allClauses().filter((c) => c.nonLegal && (c.cites.length > 0 || namesNorm.has(c.id))).map((c) => c.id);
    expect(wrong).toEqual([]);
  }, 120_000);

  it("los encabezados, notas, firmas y aprobaciones sin norma llevan nonLegal", () => {
    const structural = (id: string) =>
      id.endsWith(".encabezado") || id.includes(".nota.") || id.includes(".firma.") || /aprobacion|responsable-revision/.test(id);
    const missing = allClauses()
      .filter((c) => structural(c.id) && !namesNorm.has(c.id) && c.cites.length === 0 && !c.nonLegal)
      .map((c) => c.id);
    expect(missing).toEqual([]);
  }, 120_000);
});
