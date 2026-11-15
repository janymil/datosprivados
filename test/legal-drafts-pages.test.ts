import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LegalChangePage from "@/app/operador/legal/[id]/page";
import { redraftAction, requestDraftAction } from "@/app/operador/legal/draft-actions";
import LegalChangesPage from "@/app/operador/legal/page";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { registerLegalChange } from "@/lib/legal-changes";
import { claimNextDraft, enqueueDraft, finishDraft, listDrafts } from "@/lib/legal-drafts";
import { makeActiveCompany } from "./helpers/db";
import { jar } from "./helpers/next";

const html = async () => renderToStaticMarkup(await LegalChangesPage({ searchParams: Promise.resolve({}) }));
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};
const redirectOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    return String((error as { digest?: string }).digest ?? error);
  }
  return "";
};
const failed = (ref: string) => {
  enqueueDraft({ origin: "auditoria", ref, targets: ["aviso.nota.regla-practica"], context: null });
  const claimed = claimNextDraft(new Date())!;
  finishDraft(claimed.id, { status: "sin_solucion", reasons: ["las dos revisiones dicen que el art. 7 no respalda el texto"] });
  return claimed.id;
};

let operatorEmail = "";
let operatorUserId = "";
beforeEach(async () => {
  getDb().exec("DELETE FROM legal_draft_requests; DELETE FROM legal_changes; DELETE FROM email_outbox");
  jar.store.clear();
  operatorEmail = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
  process.env.OPERATOR_EMAILS = operatorEmail;
  operatorUserId = makeActiveCompany({ email: operatorEmail }).userId;
  await createSession(operatorUserId);
});
afterEach(() => {
  delete process.env.OPERATOR_EMAILS;
});

describe("/operador/legal: correcciones en redacción", () => {
  it("muestra las que no se pudieron redactar, con el motivo, y cuántas esperan", async () => {
    failed("a1");
    enqueueDraft({ origin: "auditoria", ref: "a2", targets: ["sectorial.3.procedimientos"], context: null });
    const page = await html();
    expect(page).toContain("Correcciones en redacción");
    expect(page).toContain("aviso.nota.regla-practica");
    expect(page).toContain("las dos revisiones dicen que el art. 7 no respalda el texto");
    expect(page).toContain("1 en cola");
    expect(page).toContain("Redactar de nuevo");
  });

  it("un borrador que no se pudo hacer avisa una vez a cada operador", () => {
    const id = failed("a1");
    finishDraft(id, { status: "sin_solucion", reasons: ["otra vez"] });
    const mails = getDb().prepare("SELECT to_email FROM email_outbox WHERE template = 'legal_draft_failed'").all();
    expect(mails).toEqual([{ to_email: operatorEmail }]);
  });

  it("«Redactar de nuevo» exige operador y devuelve la solicitud a la cola con los intentos en cero", async () => {
    const id = failed("a1");
    jar.store.clear();
    expect(await redirectOf(() => redraftAction(form({ id })))).toMatch(/ingresar|login|operador/);
    await createSession(operatorUserId);
    expect(await redirectOf(() => redraftAction(form({ id })))).toContain("/operador/legal");
    expect(listDrafts()[0]).toMatchObject({ status: "pendiente", attempts: 0 });
  });

  it("«Redactar corrección» encola un texto que se puede localizar y rechaza uno que no", async () => {
    expect(await redirectOf(() => requestDraftAction(form({ target: "sectorial.3.procedimientos" })))).toContain("/operador/legal?ok=redaccion");
    expect(listDrafts()[0]).toMatchObject({ origin: "operador", targets: '["sectorial.3.procedimientos"]' });
    expect(await redirectOf(() => requestDraftAction(form({ target: "no.existe" })))).toContain("error=texto");
  });

  it("un cambio redactado por la IA lo dice en su página", async () => {
    const change = registerLegalChange({
      kind: "auditoria",
      title: "Corrección de aviso.nota.regla-practica (IA)",
      summary: "**Redactado por IA.** Revísalo antes de aprobar.\n\n- Revisión 1 (supported): Lo dice el art. 18.",
      source_url: null,
      branch: "legal/auto-req1",
      head_sha: "b".repeat(40),
      diff: "diff --git a/x b/x\n",
      affected: [{ kind: "clause", source: "aviso.nota.regla-practica" }],
    });
    const page = renderToStaticMarkup(await LegalChangePage({ params: Promise.resolve({ id: change.id }), searchParams: Promise.resolve({}) }));
    expect(page).toContain("Redactado por IA");
    expect(page).toContain("Lo dice el art. 18.");
  });
});
