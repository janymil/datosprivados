import { authorizedByCronSecret } from "@/lib/cron-auth";
import crypto from "node:crypto";
import { DRAFT_ORIGINS, enqueueDraft, type DraftOrigin } from "@/lib/legal-drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/legal/drafts — encola una solicitud de redacción (plan 7). Interno: bearer CRON_SECRET. */
export async function POST(request: Request) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const origin = String(data.origin ?? "") as DraftOrigin;
  const rawRef = String(data.ref ?? "");
  // Una referencia larga se resume, nunca se corta: dos distintas no deben chocar.
  const ref = rawRef.length > 400 ? `sha256:${crypto.createHash("sha256").update(rawRef).digest("hex")}` : rawRef;
  const targets = Array.isArray(data.targets) ? data.targets.map(String).slice(0, 50) : null;
  if (!DRAFT_ORIGINS.includes(origin) || !ref || !targets) return Response.json({ error: "origin, ref y targets son obligatorios" }, { status: 400 });
  return Response.json({ queued: enqueueDraft({ origin, ref, targets, context: data.context ?? null }) });
}
