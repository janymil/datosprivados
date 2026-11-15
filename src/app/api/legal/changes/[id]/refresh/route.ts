import { authorizedByCronSecret } from "@/lib/cron-auth";
import { getLegalChange, markLegalChange, REFRESHABLE, refreshLegalChange } from "@/lib/legal-changes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 16 * 1024 * 1024;

/**
 * POST /api/legal/changes/:id/refresh — el redactor rehízo el cambio sobre la versión actual del
 * código (otro cambio se fusionó antes). Interno: bearer CRON_SECRET.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "cuerpo demasiado grande (máx. 16 MB)" }, { status: 413 });
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  // No se pudo rehacer (choca con otro cambio, o no pasa las pruebas): el motivo queda en el cambio.
  if (typeof data.error === "string") {
    const change = getLegalChange(id);
    if (!change) return Response.json({ error: "no-existe" }, { status: 404 });
    if (!REFRESHABLE.includes(change.status)) return Response.json({ error: "estado" }, { status: 409 });
    markLegalChange(id, { error: `No se pudo rehacer sobre la versión actual: ${data.error.slice(0, 1500)}` });
    return Response.json({ id, status: change.status });
  }
  const out = refreshLegalChange(id, { head_sha: String(data.head_sha ?? ""), diff: String(data.diff ?? "") });
  if (out.ok) return Response.json({ id, status: "nuevo" });
  const status = out.error === "no-existe" ? 404 : out.error === "datos" ? 400 : 409;
  return Response.json({ error: out.error }, { status });
}
