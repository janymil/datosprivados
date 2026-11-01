import { exportCompanyData } from "@/lib/account";
import { getSession } from "@/lib/auth";
import { isDemoCompany } from "@/lib/demo";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Descarga el expediente completo como archivo. Va por una ruta (no embebido en
 * la página) y no exige suscripción vigente. La demo no exporta.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (isDemoCompany(session.company)) return new Response("No disponible en la demo", { status: 403 });
  if (!takeRateLimit(`export:${session.company.id}`, 10, 60 * 60_000)) {
    return new Response("Demasiadas descargas. Intenta más tarde.", { status: 429 });
  }

  const data = exportCompanyData(session.company.id);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="expediente-${session.company.slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
