import "server-only";

import { limaToday } from "../format";
import { callLlm } from "../llm";
import { logEvent } from "../log";
import { enqueueEmail } from "../mail";
import { fetchAnpd } from "./anpd";
import { fetchElPeruanoDay } from "./elperuano";
import {
  listWatchItems,
  recordSourceError,
  recordSourceOk,
  setWatchStatus,
  sourceHealth,
  upsertWatchItems,
  type WatchItem,
} from "./store";
import { impactOf, prefilter, triage } from "./triage";

/**
 * Tarea diaria `legal-watch` (motor legal, plan 6): lee las fuentes oficiales, filtra,
 * triaja con IA lo que pasa el filtro, calcula el impacto y avisa al fundador de cada
 * norma relevante. Una fuente que falla no detiene a la otra; la IA caída deja los
 * ítems pendientes para la próxima corrida.
 */

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type Deps = { now?: Date; fetchImpl?: FetchLike; call?: typeof callLlm; sleep?: (ms: number) => Promise<void> };

const DAY = 24 * 60 * 60 * 1000;
const MAX_BACKFILL_DAYS = 7;
const MAX_AI_CALLS = 30;
/** Pausa entre pedidos a una fuente (cortesía con los servidores del Estado). */
const politeMs = () => Number(process.env.LEGAL_WATCH_POLITE_MS ?? 1000);

export type WatchRunResult = { fetched: number; nuevos: number; candidatos: number; relevantes: number; pendientes: number };

/** Normas de la ANPD más antiguas que esto, al verlas por primera vez, son línea base (sin IA ni aviso). */
const BASELINE_DAYS = 30;

/**
 * Fechas de Lima a leer en El Peruano: desde el día del último éxito, incluido, hasta hoy
 * (máx. 7). Se relee ese día porque las ediciones extraordinarias salen también por la
 * tarde, después de la corrida de las 12:00; la restricción UNIQUE evita duplicados.
 */
export function datesToFetch(lastOkAt: string | null, now: Date): string[] {
  const today = limaToday(now);
  if (!lastOkAt) return [today];
  const out: string[] = [];
  let day = Date.parse(limaToday(new Date(lastOkAt)));
  const end = Date.parse(today);
  while (day <= end) {
    out.push(new Date(day).toISOString().slice(0, 10));
    day += DAY;
  }
  if (out.length > MAX_BACKFILL_DAYS) {
    logEvent("warn", "legal_watch_backfill_truncated", { from: out[0], skipped: out.length - MAX_BACKFILL_DAYS });
  }
  return out.length ? out.slice(-MAX_BACKFILL_DAYS) : [today];
}

export async function runLegalWatch(deps: Deps = {}): Promise<WatchRunResult> {
  const now = deps.now ?? new Date();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const call = deps.call ?? callLlm;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let fetched = 0;
  let nuevos = 0;

  // 1. El Peruano, día por día.
  const lastOk = sourceHealth(now).find((s) => s.source === "elperuano")?.lastOkAt ?? null;
  try {
    let count = 0;
    let structureOk = true;
    for (const [i, day] of datesToFetch(lastOk, now).entries()) {
      if (i > 0) await sleep(politeMs());
      const page = await fetchElPeruanoDay(day, fetchImpl);
      structureOk &&= page.structureOk;
      count += page.items.length;
      nuevos += upsertWatchItems(page.items);
    }
    fetched += count;
    recordSourceOk("elperuano", count, now, structureOk);
  } catch (error) {
    recordSourceError("elperuano", error instanceof Error ? error.message : String(error), now);
  }

  // 2. ANPD (primera página).
  try {
    await sleep(politeMs());
    const page = await fetchAnpd(fetchImpl);
    fetched += page.items.length;
    nuevos += upsertWatchItems(page.items);
    recordSourceOk("anpd", page.items.length, now, page.structureOk);
  } catch (error) {
    recordSourceError("anpd", error instanceof Error ? error.message : String(error), now);
  }

  // 3. Filtro sin IA de lo nuevo.
  //    Lo que ya era viejo al aparecer (primera lectura de la ANPD, lista reordenada) es
  //    línea base: no se triaja ni se avisa.
  const baselineBefore = limaToday(new Date(now.getTime() - BASELINE_DAYS * DAY));
  for (const item of listWatchItems({ status: ["nuevo"] })) {
    if (item.source === "anpd" && item.published_on && item.published_on < baselineBefore) {
      setWatchStatus(item.id, "descartado_filtro", { reason: `Línea base: publicada antes de los últimos ${BASELINE_DAYS} días` });
      continue;
    }
    setWatchStatus(item.id, prefilter(item) ? "pendiente" : "descartado_filtro");
  }

  // 4. Triaje con IA (tope por corrida); lo que no se triaja queda pendiente.
  const pending = listWatchItems({ status: ["pendiente"] });
  let candidatos = 0;
  let relevantes = 0;
  for (const item of pending.slice(0, MAX_AI_CALLS)) {
    candidatos += 1;
    const verdict = await triage(item, { call });
    if (!verdict) continue;
    if (verdict.relevance === "irrelevant") {
      setWatchStatus(item.id, "irrelevante", { relevance: verdict.relevance, reason: verdict.reason });
      continue;
    }
    const impact = impactOf(verdict.norms, verdict.articles);
    setWatchStatus(item.id, "relevante", {
      relevance: verdict.relevance,
      reason: verdict.reason,
      norms: JSON.stringify(verdict.norms),
      affected: JSON.stringify(impact),
    });
    relevantes += 1;
  }

  // 5. Aviso al fundador: una vez por norma relevante.
  for (const item of listWatchItems({ status: ["relevante"] }).filter((i) => !i.notified_at)) {
    // Sin destinatarios no se marca: se avisa cuando OPERATOR_EMAILS esté configurado.
    if (notifyOperators(item) > 0) setWatchStatus(item.id, "relevante", { notified_at: now.toISOString() });
  }

  return { fetched, nuevos, candidatos, relevantes, pendientes: listWatchItems({ status: ["pendiente"] }).length };
}

/** Encola el aviso a cada operador; devuelve a cuántos se dirigió. */
function notifyOperators(item: WatchItem): number {
  let recipients = 0;
  const impact = item.affected ? (JSON.parse(item.affected) as { documentKinds: string[]; customers: number }) : { documentKinds: [], customers: 0 };
  for (const email of (process.env.OPERATOR_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)) {
    recipients += 1;
    enqueueEmail({
      to: email,
      template: "legal_watch_found",
      payload: {
        title: item.title || "(norma sin título)",
        issuer: item.issuer || "(emisor no indicado)",
        reason: item.reason ?? "",
        documents: impact.documentKinds.join(", ") || "ninguno identificado",
        customers: impact.customers,
        url: item.url,
        path: "/operador/legal",
      },
      dedupeKey: `legal-watch:${item.id}:${email.toLowerCase()}`,
    });
  }
  return recipients;
}
