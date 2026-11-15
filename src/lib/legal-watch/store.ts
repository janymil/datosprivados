import "server-only";

import { getDb, newId, nowIso } from "../db";

/**
 * Monitor de normas (motor legal, plan 6): normas publicadas que se leen de las
 * fuentes oficiales y la salud de cada fuente. Una norma se guarda una vez por
 * fuente e id externo, así que leer dos veces el mismo día no duplica nada.
 */

export type WatchSource = "elperuano" | "anpd";
export type WatchStatus = "nuevo" | "descartado_filtro" | "pendiente" | "irrelevante" | "relevante" | "revisado";

export type NewWatchItem = {
  source: WatchSource;
  external_id: string;
  url: string;
  pdf_url: string | null;
  issuer: string;
  title: string;
  summary: string;
  /** AAAA-MM-DD. */
  published_on: string | null;
};

export type WatchItem = NewWatchItem & {
  id: string;
  status: WatchStatus;
  relevance: string | null;
  reason: string | null;
  /** JSON: ids de normas de la biblioteca afectadas. */
  norms: string | null;
  /** JSON: impacto (fuentes, tipos de documento, clientes). */
  affected: string | null;
  notified_at: string | null;
  created_at: string;
};

const DAY = 24 * 60 * 60 * 1000;

export function upsertWatchItems(items: NewWatchItem[]): number {
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO legal_watch_items (id, source, external_id, url, pdf_url, issuer, title, summary, published_on, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?)`
  );
  let inserted = 0;
  for (const i of items) {
    const result = insert.run(newId(), i.source, i.external_id, i.url, i.pdf_url, i.issuer, i.title, i.summary, i.published_on, nowIso());
    inserted += Number(result.changes);
  }
  return inserted;
}

export function listWatchItems(filter: { status?: WatchStatus[] } = {}): WatchItem[] {
  const where = filter.status?.length ? `WHERE status IN (${filter.status.map(() => "?").join(",")})` : "";
  return getDb()
    .prepare(`SELECT * FROM legal_watch_items ${where} ORDER BY COALESCE(published_on, created_at) DESC, created_at DESC`)
    .all(...(filter.status ?? [])) as unknown as WatchItem[];
}

export function getWatchItem(id: string): WatchItem | undefined {
  return getDb().prepare("SELECT * FROM legal_watch_items WHERE id = ?").get(id) as unknown as WatchItem | undefined;
}

export function setWatchStatus(
  id: string,
  status: WatchStatus,
  extra: Partial<Pick<WatchItem, "relevance" | "reason" | "norms" | "affected" | "notified_at">> = {}
) {
  const fields = Object.keys(extra) as Array<keyof typeof extra>;
  const sets = ["status = ?", ...fields.map((f) => `${f} = ?`)].join(", ");
  getDb()
    .prepare(`UPDATE legal_watch_items SET ${sets} WHERE id = ?`)
    .run(status, ...fields.map((f) => extra[f] ?? null), id);
}

export function recordSourceOk(source: WatchSource, count: number, now: Date, structureOk: boolean) {
  getDb()
    .prepare(
      `INSERT INTO legal_watch_sources (source, last_ok_at, last_count, structure_changed, failing_since, last_error, last_error_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL)
       ON CONFLICT(source) DO UPDATE SET last_ok_at = excluded.last_ok_at, last_count = excluded.last_count,
         structure_changed = excluded.structure_changed, failing_since = NULL`
    )
    .run(source, now.toISOString(), count, structureOk ? 0 : 1);
}

export function recordSourceError(source: WatchSource, error: string, now: Date) {
  getDb()
    .prepare(
      `INSERT INTO legal_watch_sources (source, last_error, last_error_at, failing_since) VALUES (?, ?, ?, ?)
       ON CONFLICT(source) DO UPDATE SET last_error = excluded.last_error, last_error_at = excluded.last_error_at,
         failing_since = COALESCE(legal_watch_sources.failing_since, excluded.failing_since)`
    )
    .run(source, error.slice(0, 500), now.toISOString(), now.toISOString());
}

export type SourceHealth = {
  source: WatchSource;
  lastOkAt: string | null;
  lastCount: number | null;
  lastError: string | null;
  failingDays: number;
  structureChanged: boolean;
};

export function sourceHealth(now: Date = new Date()): SourceHealth[] {
  const rows = getDb().prepare("SELECT * FROM legal_watch_sources ORDER BY source").all() as Array<{
    source: WatchSource;
    last_ok_at: string | null;
    last_count: number | null;
    last_error: string | null;
    failing_since: string | null;
    structure_changed: number;
  }>;
  return rows.map((r) => ({
    source: r.source,
    lastOkAt: r.last_ok_at,
    lastCount: r.last_count,
    lastError: r.failing_since ? r.last_error : null,
    failingDays: r.failing_since ? Math.floor((now.getTime() - Date.parse(r.failing_since)) / DAY) : 0,
    structureChanged: r.structure_changed === 1,
  }));
}
