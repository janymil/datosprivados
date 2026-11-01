import { readiness } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/ready — como /api/health, y en producción exige correo, MercadoPago y CRON_SECRET configurados. */
export function GET() {
  const body = readiness();
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
