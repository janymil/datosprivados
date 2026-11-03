import { readiness } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ready — como /api/health, y en producción exige correo, MercadoPago y
 * CRON_SECRET configurados. Devuelve `checks.config` como un solo booleano (sirve para
 * saber si falta algo) pero **no** el desglose de qué integración falta: es público.
 */
export function GET() {
  const { config: _omitido, ...body } = readiness();
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
