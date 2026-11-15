import fs from "node:fs";
import { it } from "vitest";
import { legalContext } from "@/legal/context";
import { allClauses } from "@/legal/registry";
import { legalFixtures } from "../fixtures";
import { clauseCitationsOverFixtures, withFrozenWorld } from "../render-all";

/**
 * Genera una cláusula sobre las fixtures de la auditoría (las 2 variantes más largas) y escribe
 * el resultado en RENDER_OUT. Lo lanza `render.ts` en un proceso nuevo (redactor, plan 7).
 */
const MAX_VARIANTS = 2;

it.skipIf(!process.env.RENDER_CLAUSE_ID)("generar una cláusula", () => {
  const id = process.env.RENDER_CLAUSE_ID!;
  const out = process.env.RENDER_OUT!;
  const clause = allClauses().find((c) => c.id === id);
  if (!clause) {
    fs.writeFileSync(out, JSON.stringify({ error: `la cláusula ${id} ya no existe con ese id` }));
    return;
  }
  const texts = withFrozenWorld(() => {
    const set = new Set<string>();
    for (const f of legalFixtures()) {
      const ctx = legalContext(f.company, f.banks, f.providers);
      if (clause.when && !clause.when(ctx)) continue;
      const text = clause.text(ctx).trim();
      if (text) set.add(text);
    }
    return set;
  });
  const cites = (clauseCitationsOverFixtures().get(id) ?? []).map((c) => ({ norm: c.norm, art: c.art }));
  fs.writeFileSync(out, JSON.stringify({ texts: [...texts].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, MAX_VARIANTS), cites }));
});
