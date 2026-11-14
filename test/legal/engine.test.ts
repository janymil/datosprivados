import { describe, expect, it } from "vitest";
import { legalContext } from "@/legal/context";
import { renderDocument } from "@/legal/render";
import type { DocumentSpec } from "@/legal/types";
import { sectorLegalProfile } from "@/lib/sector-legal";
import { legalFixtures } from "./fixtures";
import { withFrozenWorld } from "./render-all";

const fixture = legalFixtures()[0];

describe("motor de cláusulas", () => {
  it("legalContext reúne empresa, bancos, proveedores, perfil y fecha", () => {
    const ctx = withFrozenWorld(() => legalContext(fixture.company, fixture.banks, fixture.providers));
    expect(ctx.company).toBe(fixture.company);
    expect(ctx.banks).toBe(fixture.banks);
    expect(ctx.providers).toBe(fixture.providers);
    expect(ctx.profile).toBe(sectorLegalProfile(fixture.company));
    expect(ctx.date).toBe("13 de noviembre de 2026");
  });

  it("renderiza las cláusulas elegidas, en orden, con el separador del documento", () => {
    const ctx = legalContext(fixture.company, fixture.banks, fixture.providers);
    const spec: DocumentSpec = {
      kind: "aviso",
      join: "\n\n",
      clauses: [
        { id: "t.a.uno", text: () => "A", cites: [] },
        { id: "t.b.dos", when: () => false, text: () => "B", cites: [] },
        { id: "t.c.tres", text: () => "C", cites: [] },
      ],
    };
    expect(renderDocument(spec, ctx)).toBe("A\n\nC");
  });

  it("rechaza una cláusula elegida con texto vacío", () => {
    const ctx = legalContext(fixture.company, fixture.banks, fixture.providers);
    const spec: DocumentSpec = { kind: "aviso", join: "\n", clauses: [{ id: "t.e.vacia", text: () => "", cites: [] }] };
    expect(() => renderDocument(spec, ctx)).toThrow("clause t.e.vacia rendered empty text");
  });
});
