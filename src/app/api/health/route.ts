import { health } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — para el monitor externo. 200 si la base lee y escribe; 503 si no.
 *
 * Es público: no lleva secretos, ni datos, ni siquiera **qué** integraciones están
 * configuradas. Antes publicaba `config: { mail, mercadopago, llm, cron }`, que le dice
 * a cualquiera qué piezas están apagadas (por ejemplo, que el correo no está
 * configurado). El detalle sigue disponible en `/api/cron/health`, que exige el secreto.
 */
export function GET() {
  const { config: _omitido, ...body } = health();
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
