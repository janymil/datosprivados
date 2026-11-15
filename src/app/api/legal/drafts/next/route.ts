import { authorizedByCronSecret } from "@/lib/cron-auth";
import { aiKillSwitch, budgetExceeded } from "@/lib/ai-guard";
import { claimNextDraft, sourcesInOpenChanges } from "@/lib/legal-drafts";
import { isLlmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/legal/drafts/next — el script de redacción toma la siguiente solicitud (plan 7).
 * 204 sin trabajo; 409 si la IA está apagada, sin modelo o con el presupuesto del mes agotado
 * (la solicitud sigue pendiente). Interno: bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  if (budgetExceeded(now)) return Response.json({ reason: "budget" }, { status: 409 });
  if (aiKillSwitch() || !isLlmConfigured()) return Response.json({ reason: "ai-off" }, { status: 409 });
  const next = claimNextDraft(now);
  if (!next) return new Response(null, { status: 204 });
  // Lo que ya tocan cambios abiertos: el redactor no lo vuelve a redactar (revisión I4).
  return Response.json({ ...next, busy: [...sourcesInOpenChanges()].sort() });
}
