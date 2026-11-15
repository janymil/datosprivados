import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { runLegalWatch } from "@/lib/legal-watch/run";
import { listWatchItems, recordSourceOk, sourceHealth } from "@/lib/legal-watch/store";
import { operationalAlerts } from "@/lib/ops";
import { runJob } from "@/lib/jobs";

const DAY = 24 * 60 * 60 * 1000;
const original = { ...process.env };

/** Página de El Peruano con normas inventadas para el día pedido. */
function elPeruanoPage(day: string, rows: Array<{ id: string; issuer: string; title: string; summary: string }>) {
  const [y, m, d] = day.split("-");
  const article = (r: (typeof rows)[number]) => `<article class="edicionesoficiales_articulos"><div class="ediciones_texto">
    <h4>${r.issuer}</h4><h5><a href="https://busquedas.elperuano.pe/dispositivo/NL/${r.id}" target="_blank">${r.title}</a></h5>
    <p><b>Fecha: ${d}/${m}/${y}</b></p><p>${r.summary}</p></div></article>`;
  return `<div id="NormasEPPortal">${rows.map(article).join("\n")}</div>`;
}
const DAY_ROWS = (day: string) => [
  { id: `${day}-1`, issuer: "JUSTICIA Y DERECHOS HUMANOS", title: "DECRETO SUPREMO N° 001-2027-JUS", summary: "Modifican el Reglamento de la Ley N° 29733" },
  { id: `${day}-2`, issuer: "SALUD", title: "RESOLUCIÓN MINISTERIAL N° 10-2027-MINSA", summary: "Directiva sobre datos personales de pacientes en campañas" },
  { id: `${day}-3`, issuer: "DESARROLLO E INCLUSIÓN SOCIAL", title: "RESOLUCIÓN N° 1-2027-MIDIS", summary: "Designan Jefa de la Unidad" },
  { id: `${day}-4`, issuer: "ECONOMÍA Y FINANZAS", title: "RESOLUCIÓN MINISTERIAL N° 2-2027-EF", summary: "Aprueban transferencia de partidas" },
  { id: `${day}-5`, issuer: "CULTURA", title: "RESOLUCIÓN VICEMINISTERIAL N° 3-2027-VMPCIC", summary: "Declaran patrimonio cultural" },
];

/** fetch falso: El Peruano responde según la fecha pedida; la ANPD, con una lista vacía válida. */
function fakeFetch(opts: { elperuano?: "ok" | "down" | "changed"; requested?: string[] } = {}) {
  return async (url: string, init?: RequestInit) => {
    if (url.includes("elperuano")) {
      if (opts.elperuano === "down") return new Response("down", { status: 503 });
      if (opts.elperuano === "changed") return new Response("<html>Nueva página</html>", { status: 200 });
      const body = new URLSearchParams(String(init?.body));
      const [d, m, y] = String(body.get("cddesde")).split("/");
      const day = `${y}-${m}-${d}`;
      opts.requested?.push(day);
      return new Response(elPeruanoPage(day, DAY_ROWS(day)), { status: 200 });
    }
    return new Response('<a href="/institucion/anpd/normas-legales/111-x">Resolución Directoral N.° 5-2027-JUS/DGTAIPD</a> 2 de enero de 2027', { status: 200 });
  };
}
/** IA falsa: JUS modifica el Reglamento; el resto no aplica. */
const fakeCall = (async ({ messages }: { messages: Array<{ content: string }> }) =>
  /001-2027-JUS|DGTAIPD/.test(messages[0].content.split("NORMA NUEVA:")[1] ?? "")
    ? '{"relevance":"amends","norms":["ds-016-2024-jus"],"articles":["69"],"reason":"Modifica el Reglamento"}'
    : '{"relevance":"irrelevant","norms":[],"articles":[],"reason":"Otro tema"}') as never;
const run = (now: Date, extra: Record<string, unknown> = {}) =>
  runLegalWatch({ now, fetchImpl: fakeFetch(extra as never) as never, call: fakeCall, sleep: async () => undefined, ...extra });
const mails = () => getDb().prepare("SELECT to_email FROM email_outbox WHERE template = 'legal_watch_found'").all() as Array<{ to_email: string }>;

beforeEach(() => {
  process.env.OPERATOR_EMAILS = "fundador@ejemplo.pe, socio@ejemplo.pe";
  getDb().exec("DELETE FROM legal_watch_items; DELETE FROM legal_watch_sources; DELETE FROM email_outbox");
});
afterEach(() => {
  process.env = { ...original };
});

describe("tarea legal-watch", () => {
  it("de punta a punta: 2 relevantes (El Peruano y ANPD), 1 irrelevante, 3 descartados; un correo por operador y norma", async () => {
    const result = await run(new Date("2027-01-10T17:00:00Z"));
    expect(result).toMatchObject({ nuevos: 6, candidatos: 3, relevantes: 2, pendientes: 0 });
    expect(listWatchItems({ status: ["descartado_filtro"] })).toHaveLength(3);
    expect(listWatchItems({ status: ["irrelevante"] })).toHaveLength(1);
    const relevant = listWatchItems({ status: ["relevante"] });
    expect(relevant.map((r) => r.source).sort()).toEqual(["anpd", "elperuano"]);
    expect(JSON.parse(relevant[0].affected!).documentKinds).toContain("arco");
    expect(mails()).toHaveLength(4);
  });

  it("dos corridas no duplican ítems ni correos", async () => {
    await run(new Date("2027-01-10T17:00:00Z"));
    const second = await run(new Date("2027-01-10T18:00:00Z"));
    expect(second.nuevos).toBe(0);
    expect(listWatchItems({})).toHaveLength(6);
    expect(mails()).toHaveLength(4);
  });

  it("días sin correr: la siguiente pide cada fecha desde el último éxito (máx. 7)", async () => {
    recordSourceOk("elperuano", 10, new Date("2027-01-01T17:00:00Z"), true);
    const requested: string[] = [];
    await run(new Date("2027-01-05T17:00:00Z"), { requested });
    expect(requested).toEqual(["2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05"]);
    recordSourceOk("elperuano", 10, new Date("2026-12-01T17:00:00Z"), true);
    const many: string[] = [];
    await run(new Date("2027-01-05T17:00:00Z"), { requested: many });
    expect(many).toHaveLength(7);
    expect(many.at(-1)).toBe("2027-01-05");
  });

  it("IA caída: quedan pendientes y la tarea termina bien", async () => {
    const result = await runLegalWatch({
      now: new Date("2027-01-10T17:00:00Z"),
      fetchImpl: fakeFetch() as never,
      call: (async () => null) as never,
      sleep: async () => undefined,
    });
    expect(result.pendientes).toBe(3);
    expect(listWatchItems({ status: ["pendiente"] })).toHaveLength(3);
  });

  it("El Peruano caído 3 días: alerta legal_watch_failing; página distinta: legal_watch_structure", async () => {
    const t0 = new Date("2027-01-10T17:00:00Z");
    await run(t0, { elperuano: "down" });
    await run(new Date(t0.getTime() + 3 * DAY), { elperuano: "down" });
    expect(sourceHealth(new Date(t0.getTime() + 3 * DAY)).find((s) => s.source === "elperuano")!.failingDays).toBe(3);
    expect(operationalAlerts(new Date(t0.getTime() + 3 * DAY)).map((a) => a.code)).toContain("legal_watch_failing");
    // La ANPD siguió leyéndose aunque El Peruano fallara.
    expect(listWatchItems({}).some((i) => i.source === "anpd")).toBe(true);

    await run(new Date(t0.getTime() + 4 * DAY), { elperuano: "changed" });
    expect(operationalAlerts(new Date(t0.getTime() + 4 * DAY)).map((a) => a.code)).toContain("legal_watch_structure");
  });

  it("la tarea legal-watch está registrada y una caída de las fuentes no la hace fallar", async () => {
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 })); // las pruebas nunca salen a internet
    try {
      const outcome = await runJob("legal-watch", new Date("2027-01-10T17:00:00Z"));
      expect(outcome.status).toBe("ok");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
