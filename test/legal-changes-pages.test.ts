import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LegalChangePage from "@/app/operador/legal/[id]/page";
import LegalChangesPage from "@/app/operador/legal/page";
import { createSession } from "@/lib/auth";
import { decideLegalChange, registerLegalChange } from "@/lib/legal-changes";
import { makeActiveCompany } from "./helpers/db";
import { jar } from "./helpers/next";

let n = 0;
const newChange = () =>
  registerLegalChange({
    kind: "auditoria",
    title: `Corregir art. 2.6 (${++n})`,
    summary: "Las definiciones están en el **art. III** del DS 016-2024-JUS.",
    source_url: "https://www3.congreso.gob.pe/Docs/DGP/DIDP/files/ds_016-2024-jus.pdf",
    branch: `legal/pagina-${n}`,
    head_sha: "d".repeat(40),
    diff: "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -1 +1 @@\n-(art. 2.6)\n+(art. III.6)\n",
    affected: [
      { kind: "clause", source: "politica.10.normas" },
      { kind: "fact", source: "arco.plazo.acceso" },
    ],
  });

describe("panel /operador/legal", () => {
  beforeEach(async () => {
    jar.store.clear();
    const email = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
    process.env.OPERATOR_EMAILS = email;
    await createSession(makeActiveCompany({ email }).userId);
  });
  afterEach(() => {
    delete process.env.OPERATOR_EMAILS;
  });

  it("la lista muestra los pendientes con su estado y los separa del historial", async () => {
    const pending = newChange();
    const rejected = newChange();
    decideLegalChange(rejected.id, "rechazado", "fundador", "No corresponde");
    const list = renderToStaticMarkup(await LegalChangesPage({ searchParams: Promise.resolve({}) }));
    expect(list).toContain(pending.title);
    expect(list).toContain("Por decidir");
    expect(list).not.toContain(rejected.title);
    const history = renderToStaticMarkup(await LegalChangesPage({ searchParams: Promise.resolve({ tab: "historial" }) }));
    expect(history).toContain(rejected.title);
  });

  it("el detalle muestra motivo, afectados, diff y los botones de decisión", async () => {
    const change = newChange();
    const html = renderToStaticMarkup(
      await LegalChangePage({ params: Promise.resolve({ id: change.id }), searchParams: Promise.resolve({}) })
    );
    expect(html).toContain("art. III");
    expect(html).toContain("politica.10.normas");
    expect(html).toContain("Hechos legales");
    expect(html).toContain("(art. III.6)");
    expect(html).toContain("(art. 2.6)");
    expect(html).toContain("Aprobar y publicar");
    expect(html).toContain("Enviar al abogado");
    expect(html).toContain(change.head_sha.slice(0, 7));
  });

  it("un cambio ya decidido no muestra botones", async () => {
    const change = newChange();
    decideLegalChange(change.id, "rechazado", "fundador", "No corresponde");
    const html = renderToStaticMarkup(
      await LegalChangePage({ params: Promise.resolve({ id: change.id }), searchParams: Promise.resolve({}) })
    );
    expect(html).not.toContain("Aprobar y publicar");
    expect(html).toContain("No corresponde");
  });
});
