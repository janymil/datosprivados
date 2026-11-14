import { describe, expect, it } from "vitest";
import { decideLegalChange, getLegalChange, listLegalChanges, markLegalChange, registerLegalChange } from "@/lib/legal-changes";

const SHA = "a".repeat(40);
let n = 0;
const input = (over: Partial<Parameters<typeof registerLegalChange>[0]> = {}) => ({
  kind: "auditoria" as const,
  title: "Corregir «art. 2.6» por «art. III.6»",
  summary: "Las definiciones están en el art. III del DS 016-2024-JUS.",
  source_url: null,
  branch: `legal/prueba-${++n}`,
  head_sha: SHA,
  diff: "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
  affected: [{ kind: "clause", source: "politica.10.normas" }],
  ...over,
});

describe("cambios legales propuestos", () => {
  it("registra y lee un cambio", () => {
    const change = registerLegalChange(input());
    expect(change.id).toMatch(/^lc-\d{8}-[0-9a-f]{6}$/);
    expect(change.status).toBe("nuevo");
    expect(getLegalChange(change.id)).toMatchObject({ title: change.title, branch: change.branch, head_sha: SHA });
    expect(JSON.parse(getLegalChange(change.id)!.affected)).toEqual([{ kind: "clause", source: "politica.10.normas" }]);
  });

  it("registrar la misma rama y el mismo commit devuelve el mismo cambio", () => {
    const data = input();
    expect(registerLegalChange(data).id).toBe(registerLegalChange(data).id);
  });

  it("rechaza rama, commit o diff inválidos", () => {
    expect(() => registerLegalChange(input({ branch: "main" }))).toThrow(/rama/);
    expect(() => registerLegalChange(input({ head_sha: "abc" }))).toThrow(/commit/);
    expect(() => registerLegalChange(input({ diff: " " }))).toThrow(/diff/);
  });

  it("solo un cambio nuevo (o fallido) se decide, y rechazar exige motivo", () => {
    const change = registerLegalChange(input());
    expect(decideLegalChange(change.id, "rechazado", "fundador")).toEqual({ ok: false, error: "motivo-requerido" });
    const approved = decideLegalChange(change.id, "aprobado", "fundador");
    expect(approved.ok && approved.change.status).toBe("aprobado");
    expect(decideLegalChange(change.id, "aprobado", "fundador")).toEqual({ ok: false, error: "ya-decidido" });
    markLegalChange(change.id, { status: "fallo", error: "falta GITHUB_DISPATCH_TOKEN" });
    const retry = decideLegalChange(change.id, "aprobado", "fundador");
    expect(retry.ok && retry.change.status).toBe("aprobado");
    expect(retry.ok && retry.change.error).toBeNull();
    expect(decideLegalChange("lc-no-existe", "aprobado", "fundador")).toEqual({ ok: false, error: "no-existe" });
  });

  it("«abogado» se aprueba o rechaza tras la respuesta, y «fallo» también se puede rechazar", () => {
    const toLawyer = registerLegalChange(input());
    decideLegalChange(toLawyer.id, "abogado", "fundador", "Revisar con el abogado");
    expect(decideLegalChange(toLawyer.id, "abogado", "fundador", "otra vez")).toEqual({ ok: false, error: "ya-decidido" });
    const approved = decideLegalChange(toLawyer.id, "aprobado", "fundador");
    expect(approved.ok && approved.change.status).toBe("aprobado");

    const failed = registerLegalChange(input());
    decideLegalChange(failed.id, "aprobado", "fundador");
    markLegalChange(failed.id, { status: "fallo", error: "la rama cambió" });
    const rejected = decideLegalChange(failed.id, "rechazado", "fundador", "Se reemplaza por otro cambio");
    expect(rejected.ok && rejected.change.status).toBe("rechazado");
    expect(decideLegalChange(failed.id, "aprobado", "fundador")).toEqual({ ok: false, error: "ya-decidido" });
  });

  it("lista los más recientes primero y filtra por estado", () => {
    const a = registerLegalChange(input());
    const b = registerLegalChange(input());
    decideLegalChange(b.id, "abogado", "fundador", "Revisar con el abogado");
    const ids = listLegalChanges().map((c) => c.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    expect(listLegalChanges({ status: ["abogado"] }).map((c) => c.id)).toContain(b.id);
    expect(listLegalChanges({ status: ["abogado"] }).map((c) => c.id)).not.toContain(a.id);
  });
});
