import { describe, expect, it } from "vitest";
import { legalContext } from "@/legal/context";
import { buildDocument } from "@/lib/document-catalog";
import type { DocumentKind } from "@/lib/db";
import { type KnownFailure, ratchet } from "./checks";
import { legalFixtures } from "./fixtures";
import { DOCUMENT_KINDS, withFrozenWorld } from "./render-all";
import { RULES } from "./rules";

/**
 * Reglas de cumplimiento sobre todas las combinaciones. Las fallas de hoy están en
 * legal/known-failures/rules.json (clause = id de la fixture) y solo pueden reducirse.
 */
function checkRules(): KnownFailure[] {
  return withFrozenWorld(() => {
    const out: KnownFailure[] = [];
    for (const f of legalFixtures()) {
      const ctx = legalContext(f.company, f.banks, f.providers);
      const docs = Object.fromEntries(
        DOCUMENT_KINDS.map((kind) => [kind, buildDocument(kind, f.company, f.banks, f.providers)])
      ) as Record<DocumentKind, string>;
      for (const rule of RULES) {
        if (!rule.applies(ctx)) continue;
        const detail = rule.check(docs, ctx);
        if (detail) out.push({ rule: rule.id, clause: f.id, detail });
      }
    }
    return out.sort((a, b) => `${a.rule}|${a.clause}`.localeCompare(`${b.rule}|${b.clause}`));
  });
}

describe("reglas de cumplimiento", () => {
  const { added, stale } = ratchet("rules", checkRules());

  it("no hay fallas fuera de la lista de fallas conocidas", () => {
    expect(added.slice(0, 20), `fallas nuevas (${added.length}):\n${added.slice(0, 20).map((f) => `${f.rule} ${f.clause}: ${f.detail}`).join("\n")}`).toEqual([]);
  });

  it("la lista de fallas conocidas no tiene entradas ya corregidas", () => {
    expect(stale.slice(0, 20), `ya no fallan (${stale.length}), quítalas de legal/known-failures/rules.json`).toEqual([]);
  });
}, 180_000);
