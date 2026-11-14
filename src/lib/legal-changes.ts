import crypto from "node:crypto";
import { getDb, nowIso, type LegalChange, type LegalChangeStatus } from "./db";

/**
 * Cambios legales propuestos (motor legal, plan 4). La auditoría (plan 5) y el
 * monitor de normas (plan 6) los registran; el fundador los decide en
 * /operador/legal. Ningún cambio llega a los clientes sin esa aprobación.
 */

export type LegalChangeInput = Pick<LegalChange, "kind" | "title" | "summary" | "source_url" | "branch" | "head_sha" | "diff"> & {
  affected: Array<{ kind: string; source: string }>;
};

const BRANCH = /^legal\/[a-z0-9-]+$/;
const SHA = /^[0-9a-f]{40}$/;

function changeId(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `lc-${day}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Registra un cambio. Idempotente para la misma rama y el mismo commit. */
export function registerLegalChange(input: LegalChangeInput): LegalChange {
  if (!BRANCH.test(input.branch)) throw new Error(`rama inválida: ${input.branch} (debe ser legal/<id>)`);
  if (!SHA.test(input.head_sha)) throw new Error(`commit inválido: ${input.head_sha}`);
  if (!input.diff.trim()) throw new Error("diff vacío");
  if (!input.title.trim()) throw new Error("título vacío");

  const db = getDb();
  const existing = db.prepare("SELECT * FROM legal_changes WHERE branch = ? AND head_sha = ?").get(input.branch, input.head_sha) as
    | LegalChange
    | undefined;
  if (existing) return existing;

  const now = nowIso();
  const id = changeId();
  db.prepare(
    `INSERT INTO legal_changes (id, kind, title, summary, source_url, branch, head_sha, diff, affected, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?)`
  ).run(id, input.kind, input.title.trim(), input.summary, input.source_url, input.branch, input.head_sha, input.diff, JSON.stringify(input.affected), now, now);
  return getLegalChange(id)!;
}

/** Cambio ya registrado para esa rama y ese commit, si existe. */
export function findLegalChange(branch: string, headSha: string): LegalChange | null {
  return (getDb().prepare("SELECT * FROM legal_changes WHERE branch = ? AND head_sha = ?").get(branch, headSha) as LegalChange | undefined) ?? null;
}

export function getLegalChange(id: string): LegalChange | null {
  return (getDb().prepare("SELECT * FROM legal_changes WHERE id = ?").get(id) as LegalChange | undefined) ?? null;
}

/** Cambios, del más reciente al más antiguo; opcionalmente solo algunos estados. */
export function listLegalChanges(filter: { status?: LegalChangeStatus[] } = {}): LegalChange[] {
  const db = getDb();
  if (filter.status?.length) {
    const marks = filter.status.map(() => "?").join(", ");
    return db
      .prepare(`SELECT * FROM legal_changes WHERE status IN (${marks}) ORDER BY created_at DESC, rowid DESC`)
      .all(...filter.status) as LegalChange[];
  }
  return db.prepare("SELECT * FROM legal_changes ORDER BY created_at DESC, rowid DESC").all() as LegalChange[];
}

export type DecideResult = { ok: true; change: LegalChange } | { ok: false; error: "no-existe" | "ya-decidido" | "motivo-requerido" };

/**
 * Decisión del fundador. Un cambio «nuevo» admite cualquier decisión; uno en
 * «abogado» se aprueba o rechaza cuando llega la respuesta; uno en «fallo» se
 * reaprueba (reintento) o se rechaza. Rechazar o enviar al abogado exige motivo.
 */
const NEXT: Partial<Record<LegalChange["status"], Array<"aprobado" | "rechazado" | "abogado">>> = {
  nuevo: ["aprobado", "rechazado", "abogado"],
  abogado: ["aprobado", "rechazado"],
  fallo: ["aprobado", "rechazado"],
};

export function decideLegalChange(
  id: string,
  decision: "aprobado" | "rechazado" | "abogado",
  by: string,
  reason?: string
): DecideResult {
  const change = getLegalChange(id);
  if (!change) return { ok: false, error: "no-existe" };
  if (!NEXT[change.status]?.includes(decision)) return { ok: false, error: "ya-decidido" };
  if (decision !== "aprobado" && !reason?.trim()) return { ok: false, error: "motivo-requerido" };

  const now = nowIso();
  // Condición en el UPDATE: dos clics simultáneos no deciden dos veces.
  const result = getDb()
    .prepare(
      `UPDATE legal_changes SET status = ?, reason = COALESCE(?, reason), decided_by = ?, decided_at = ?, error = NULL, dispatched_at = NULL, updated_at = ?
       WHERE id = ? AND status = ?`
    )
    .run(decision, reason?.trim() || null, by, now, now, id, change.status);
  if (Number(result.changes) === 0) return { ok: false, error: "ya-decidido" };
  return { ok: true, change: getLegalChange(id)! };
}

/** Avance del cambio tras la decisión: envío, fusión, despliegue o falla. */
export function markLegalChange(
  id: string,
  patch: Partial<Pick<LegalChange, "status" | "dispatched_at" | "merged_sha" | "deployed_at" | "error">>
): void {
  const keys = Object.keys(patch) as Array<keyof typeof patch>;
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  getDb()
    .prepare(`UPDATE legal_changes SET ${sets}, updated_at = ? WHERE id = ?`)
    .run(...keys.map((k) => patch[k] ?? null), nowIso(), id);
}
