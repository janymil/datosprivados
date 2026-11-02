import { clientIp } from "@/lib/client-ip";
import { logEvent, scrubText } from "@/lib/log";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 8 * 1024;

/** Ruta a la que apunta el `report-uri` de la CSP de observación (`next.config.ts`). */
const PATH = "/api/csp-report";

type Report = {
  "document-uri"?: string;
  "blocked-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  disposition?: string;
};

/** De una URI solo interesa la ruta: sin dominio, sin consulta y sin fragmento. */
function pathOf(uri: string): string {
  try {
    return new URL(uri).pathname.slice(0, 120) || "/";
  } catch {
    return uri.startsWith("/") ? uri.split("?")[0].slice(0, 120) : "desconocido";
  }
}

/** Del informe solo se guarda lo que sirve para decidir: directiva, origen del bloqueo y ruta. */
function summarize(raw: unknown): { directive: string; blocked: string; document: string; disposition: string } | null {
  const report = (raw as { "csp-report"?: Report })?.["csp-report"] ?? (raw as Report | undefined);
  if (!report || typeof report !== "object") return null;
  const directive = String(report["effective-directive"] ?? report["violated-directive"] ?? "").split(" ")[0].slice(0, 40);
  if (!directive) return null;
  return {
    directive,
    // El URI bloqueado puede traer consultas con datos: se corta y se limpia.
    blocked: scrubText(String(report["blocked-uri"] ?? ""), 120),
    document: pathOf(String(report["document-uri"] ?? "")),
    disposition: String(report.disposition ?? "report").slice(0, 20),
  };
}

/**
 * POST /api/csp-report — recibe los avisos de la CSP en modo observación.
 *
 * Es un endpoint público (lo llama el navegador de cualquiera), así que:
 * corta cuerpos grandes, limita los avisos por IP y **solo registra** un resumen;
 * nunca guarda el cuerpo ni la URL completa, y siempre responde 204 para no dar
 * señales a quien lo use como sonda.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return new Response(null, { status: 413 });

  const ip = await clientIp();
  if (!takeRateLimit(`csp:${ip}:${PATH}`, 30, 60_000)) return new Response(null, { status: 429 });

  let report: ReturnType<typeof summarize> = null;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response(null, { status: 413 });
    report = summarize(JSON.parse(text));
  } catch {
    report = null;
  }

  if (report) logEvent("warn", "csp_violation", report);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
