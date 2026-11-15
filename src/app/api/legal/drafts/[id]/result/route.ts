import { authorizedByCronSecret } from "@/lib/cron-auth";
import { finishDraft } from "@/lib/legal-drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["propuesto", "sin_solucion", "reintentar", "resuelto"] as const;

/** POST /api/legal/drafts/:id/result — resultado de una redacción (plan 7). Interno: bearer CRON_SECRET. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const status = String(data.status ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) return Response.json({ error: "status inválido" }, { status: 400 });
  const usage = data.usage as { inputTokens?: unknown; outputTokens?: unknown } | undefined;
  const row = finishDraft(id, {
    status: status as (typeof STATUSES)[number],
    changeId: typeof data.changeId === "string" ? data.changeId : undefined,
    reasons: Array.isArray(data.reasons) ? data.reasons.map((r) => String(r).slice(0, 2000)) : undefined,
    usage: usage ? { inputTokens: Number(usage.inputTokens) || 0, outputTokens: Number(usage.outputTokens) || 0 } : undefined,
  });
  if (!row) return Response.json({ error: "solicitud desconocida" }, { status: 404 });
  return Response.json({ status: row.status });
}
