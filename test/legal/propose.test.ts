import { describe, expect, it } from "vitest";
import { CHANGE_ID } from "@/lib/legal-changes";
import { changeLog, newChangeId, proposalPayload } from "@/legal/propose";
import { validateChange } from "@/legal/validate-change";

describe("propose-change", () => {
  it("el id tiene la forma lc-AAAAMMDD-xxxxxx", () => {
    const id = newChangeId(new Date("2026-11-14T15:00:00Z"));
    expect(id).toMatch(CHANGE_ID);
    expect(id.startsWith("lc-20261114-")).toBe(true);
    expect(newChangeId()).not.toBe(newChangeId());
  });

  it("el registro del cambio nombra los hallazgos", () => {
    const md = changeLog({ id: "lc-20261114-abc123", title: "Citar el art. III.6 en vez del 2.6", summary: "Las definiciones están en el Título Preliminar.", findings: ["a1b2c3d4e5f6", "0f9e8d7c6b5a"] });
    expect(md).toContain("# lc-20261114-abc123 · Citar el art. III.6 en vez del 2.6");
    expect(md).toContain("Las definiciones están en el Título Preliminar.");
    expect(md).toContain("a1b2c3d4e5f6");
    expect(md).toContain("0f9e8d7c6b5a");
  });

  it("una rama con su registro pasa validateChange", () => {
    const id = "lc-20261114-abc123";
    const files: Record<string, string> = { [`legal/changes/${id}.md`]: changeLog({ id, title: "t", summary: "s", findings: [] }) };
    const problems = validateChange({ id, changedFiles: Object.keys(files), read: (p) => files[p] ?? null, readBase: () => null });
    expect(problems).toEqual([]);
  });

  it("el cuerpo lleva kind auditoria e id", () => {
    const body = proposalPayload({
      id: "lc-20261114-abc123",
      title: "t",
      summary: "s",
      branch: "legal/citas-iii",
      headSha: "c".repeat(40),
      diff: "diff --git a/x b/x\n",
      findings: [{ id: "a1b2c3d4e5f6", source: "arco.3.plazos" }],
    });
    expect(body).toEqual({
      id: "lc-20261114-abc123",
      kind: "auditoria",
      title: "t",
      summary: "s",
      source_url: null,
      branch: "legal/citas-iii",
      head_sha: "c".repeat(40),
      diff: "diff --git a/x b/x\n",
      affected: [{ kind: "clause", source: "arco.3.plazos" }],
    });
  });
});
