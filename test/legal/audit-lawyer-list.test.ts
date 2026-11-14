import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { updateLawyerList } from "@/legal/audit/lawyer-list";
import { findingId, type AuditFinding } from "@/legal/audit/types";

const SEED = `# Lista para el abogado

Escrito a mano: revisar la Directiva 01-2020.

## De la auditoría de octubre

- [ ] Ley 29733 art. 14: numerales.

## Pendientes de la auditoría
`;

const finding = (source: string, check: AuditFinding["check"] = "significado", severity: AuditFinding["severity"] = "revisar"): AuditFinding => ({
  id: findingId(check, source, "las pasadas no coinciden"),
  check,
  rule: check === "significado" ? "meaning" : "obligation-uncited",
  source,
  detail: "las pasadas no coinciden",
  severity,
});

function file(): string {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "abogado-")), "abogado.md");
  fs.writeFileSync(f, SEED);
  return f;
}

describe("lista para el abogado", () => {
  it("conserva las líneas escritas a mano", () => {
    const f = file();
    updateLawyerList(f, [finding("politica.4.finalidades")]);
    const text = fs.readFileSync(f, "utf8");
    expect(text).toContain("Escrito a mano: revisar la Directiva 01-2020.");
    expect(text).toContain("- [ ] Ley 29733 art. 14: numerales.");
  });

  it("agrega solo las disputas de significado nuevas, bajo «Pendientes de la auditoría»", () => {
    const f = file();
    const added = updateLawyerList(f, [
      finding("politica.4.finalidades"),
      finding("arco.3.plazos", "obligacion-sin-cita"),
      finding("arco.1.intro", "significado", "error"),
      finding("consentimiento.d", "cita", "error"),
    ]);
    expect(added).toBe(1);
    const text = fs.readFileSync(f, "utf8");
    const pending = text.slice(text.indexOf("## Pendientes de la auditoría"));
    expect(pending).toContain(`- [ ] ${finding("politica.4.finalidades").id} · politica.4.finalidades · las pasadas no coinciden`);
    expect(text).not.toContain("arco.3.plazos");
    expect(text).not.toContain("arco.1.intro");
  });

  it("no duplica en una segunda pasada", () => {
    const f = file();
    updateLawyerList(f, [finding("politica.4.finalidades")]);
    expect(updateLawyerList(f, [finding("politica.4.finalidades")])).toBe(0);
    expect(fs.readFileSync(f, "utf8").split(finding("politica.4.finalidades").id)).toHaveLength(2);
  });
});
