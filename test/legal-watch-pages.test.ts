import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LegalChangesPage from "@/app/operador/legal/page";
import { markWatchItemAction } from "@/app/operador/legal/watch-actions";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listWatchItems, recordSourceError, recordSourceOk, setWatchStatus, upsertWatchItems } from "@/lib/legal-watch/store";
import { makeActiveCompany } from "./helpers/db";
import { jar } from "./helpers/next";

const html = async () => renderToStaticMarkup(await LegalChangesPage({ searchParams: Promise.resolve({}) }));
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

function relevantItem(title: string) {
  const external_id = Math.random().toString(36).slice(2, 10);
  upsertWatchItems([
    {
      source: "elperuano",
      external_id,
      url: `https://busquedas.elperuano.pe/dispositivo/NL/${external_id}`,
      pdf_url: null,
      issuer: "JUSTICIA Y DERECHOS HUMANOS",
      title,
      summary: "Modifican el Reglamento de la Ley N° 29733",
      published_on: "2027-01-10",
    },
  ]);
  const item = listWatchItems({}).find((i) => i.external_id === external_id)!;
  setWatchStatus(item.id, "relevante", {
    relevance: "amends",
    reason: "Cambia los plazos ARCO del art. 69",
    norms: '["ds-016-2024-jus"]',
    affected: JSON.stringify({ sources: [], documentKinds: ["arco", "politica"], customers: 12 }),
  });
  return item.id;
}

let operatorEmail = "";
beforeEach(async () => {
  getDb().exec("DELETE FROM legal_watch_items; DELETE FROM legal_watch_sources");
  jar.store.clear();
  operatorEmail = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
  process.env.OPERATOR_EMAILS = operatorEmail;
  await createSession(makeActiveCompany({ email: operatorEmail }).userId);
});
afterEach(() => {
  delete process.env.OPERATOR_EMAILS;
});

describe("/operador/legal: normas detectadas", () => {
  it("muestra los relevantes con su impacto y oculta los revisados", async () => {
    relevantItem("DECRETO SUPREMO N° 001-2027-JUS");
    const done = relevantItem("DECRETO SUPREMO N° 002-2027-JUS");
    setWatchStatus(done, "revisado");
    const page = await html();
    expect(page).toContain("Normas detectadas");
    expect(page).toContain("DECRETO SUPREMO N° 001-2027-JUS");
    expect(page).toContain("Cambia los plazos ARCO del art. 69");
    expect(page).toContain("arco, politica");
    expect(page).toContain("12 clientes");
    expect(page).not.toContain("DECRETO SUPREMO N° 002-2027-JUS");
  });

  it("marcar una norma la saca de la lista; exige operador", async () => {
    const id = relevantItem("DECRETO SUPREMO N° 003-2027-JUS");
    await expect(markWatchItemAction(form({ id, status: "irrelevante" }))).rejects.toThrow("REDIRECT:/operador/legal");
    expect(listWatchItems({ status: ["irrelevante"] }).map((i) => i.id)).toContain(id);

    const other = relevantItem("DECRETO SUPREMO N° 004-2027-JUS");
    jar.store.clear();
    await createSession(makeActiveCompany().userId); // cliente, no operador
    await expect(markWatchItemAction(form({ id: other, status: "revisado" }))).rejects.toThrow();
    expect(listWatchItems({ status: ["relevante"] }).map((i) => i.id)).toContain(other);
  });

  it("un estado inventado se rechaza", async () => {
    const id = relevantItem("DECRETO SUPREMO N° 005-2027-JUS");
    await expect(markWatchItemAction(form({ id, status: "nuevo" }))).rejects.toThrow("REDIRECT:/operador/legal?error=estado");
  });

  it("la salud de las fuentes se ve y se marca si falla", async () => {
    recordSourceOk("anpd", 29, new Date(), true);
    recordSourceError("elperuano", "HTTP 503", new Date(Date.now() - 4 * 24 * 60 * 60 * 1000));
    recordSourceError("elperuano", "HTTP 503", new Date());
    const page = await html();
    expect(page).toContain("ANPD (gob.pe)");
    expect(page).toMatch(/El Peruano[^<]*<\/strong>[^<]*sin leer hace 4 días/);
  });
});
