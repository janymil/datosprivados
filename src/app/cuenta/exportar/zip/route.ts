import { buildExportZip } from "@/lib/export-files";
import { getSession } from "@/lib/auth";
import { isDemoCompany } from "@/lib/demo";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Expediente completo como ZIP: el JSON de `/cuenta/exportar` más documentos en
 * texto y tablas en CSV. Mismas reglas: sesión obligatoria, sin demo y con
 * límite de descargas (cada ZIP contiene datos personales de clientes).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (isDemoCompany(session.company)) return new Response("No disponible en la demo", { status: 403 });
  if (!takeRateLimit(`export:zip:${session.company.id}`, 5, 60 * 60_000)) {
    return new Response("Demasiadas descargas. Intenta más tarde.", { status: 429 });
  }

  const bundle = buildExportZip(session.company.id);
  if (!bundle) return new Response("Not found", { status: 404 });

  // Copia exacta del búfer: `Response` no acepta una vista de `Uint8Array<ArrayBufferLike>`.
  const body = bundle.body.buffer.slice(bundle.body.byteOffset, bundle.body.byteOffset + bundle.body.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${bundle.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
