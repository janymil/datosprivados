import { authorizedByCronSecret } from "@/lib/cron-auth";
import { enqueueEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/legal/reaudit — resumen de la re-auditoría trimestral (plan 6, diseño §9).
 * Interno: lo llama deploy/datosprivados-reaudit.sh con el bearer de CRON_SECRET. Avisa por
 * correo a cada operador, una vez por fecha.
 */
export async function POST(request: Request) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const date = String(data.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "fecha inválida" }, { status: 400 });

  const ok = data.ok === true;
  const count = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const payload = ok
    ? { date, ok: "sí", errors: count(data.errors), review: count(data.review), aiFailures: count(data.aiFailures), error: "", path: "/operador/legal" }
    : { date, ok: "no", errors: 0, review: 0, aiFailures: 0, error: String(data.error ?? "la auditoría no terminó").slice(0, 400), path: "/operador/legal" };

  let sent = 0;
  for (const email of (process.env.OPERATOR_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)) {
    if (enqueueEmail({ to: email, template: "legal_reaudit", payload, dedupeKey: `legal-reaudit:${date}:${email.toLowerCase()}` })) sent += 1;
  }
  return Response.json({ sent });
}
