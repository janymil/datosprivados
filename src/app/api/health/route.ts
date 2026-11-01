import { health } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — para el monitor externo. 200 si la base lee y escribe; 503 si no. Sin secretos ni datos. */
export function GET() {
  const body = health();
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
