import { authorizedByCronSecret } from "@/lib/cron-auth";
import type { LegalChange } from "@/lib/db";
import { findLegalChange, registerLegalChange, type LegalChangeInput } from "@/lib/legal-changes";
import { enqueueEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2 * 1024 * 1024;

/**
 * POST /api/legal/changes — registra un cambio legal propuesto (rama legal/<id>).
 * Interno: lo llaman la auditoría (plan 5) y el monitor de normas (plan 6) con el
 * bearer de CRON_SECRET. Avisa por correo a cada operador la primera vez.
 *
 * `diff` debe ser EXACTAMENTE la salida de
 *   git diff --no-color --no-ext-diff -M origin/master...<head_sha>
 * El flujo de GitHub recalcula ese diff y no fusiona si su sha256 no coincide con el
 * del diff guardado aquí: lo que el fundador ve es lo que se fusiona.
 */
export async function POST(request: Request) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "cuerpo demasiado grande (máx. 2 MB)" }, { status: 413 });

  let input: LegalChangeInput;
  try {
    input = parseInput(JSON.parse(raw));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "JSON inválido" }, { status: 400 });
  }

  const existing = findLegalChange(input.branch, input.head_sha);
  if (existing) return Response.json({ id: existing.id, status: existing.status }, { status: 200 });

  let change: LegalChange;
  try {
    change = registerLegalChange(input);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "cambio inválido" }, { status: 400 });
  }
  notifyOperators(change);
  return Response.json({ id: change.id, status: change.status }, { status: 201 });
}

function parseInput(data: Record<string, unknown>): LegalChangeInput {
  if (data.kind !== "auditoria" && data.kind !== "norma") throw new Error("kind debe ser «auditoria» o «norma»");
  return {
    kind: data.kind,
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    source_url: data.source_url ? String(data.source_url) : null,
    branch: String(data.branch ?? ""),
    head_sha: String(data.head_sha ?? ""),
    diff: String(data.diff ?? ""),
    affected: Array.isArray(data.affected)
      ? data.affected.map((a: { kind?: unknown; source?: unknown }) => ({ kind: String(a.kind), source: String(a.source) }))
      : [],
  };
}

function notifyOperators(change: LegalChange) {
  const affected = (JSON.parse(change.affected) as unknown[]).length;
  for (const email of (process.env.OPERATOR_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)) {
    enqueueEmail({
      to: email,
      template: "legal_change_new",
      payload: { title: change.title, kind: change.kind, affected, path: `/operador/legal/${change.id}` },
      dedupeKey: `legal-change:${change.id}:${email.toLowerCase()}`,
    });
  }
}
