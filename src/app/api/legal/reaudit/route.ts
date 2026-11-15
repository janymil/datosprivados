import { authorizedByCronSecret } from "@/lib/cron-auth";
import type { AuditFinding } from "@/legal/audit/types";
import { draftRequestsFromReport } from "@/legal/draft/draftable";
import { enqueueDraft } from "@/lib/legal-drafts";
import { enqueueEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/legal/reaudit — resumen de la re-auditoría trimestral (plan 6, diseño §9).
 * Interno: lo llama deploy/datosprivados-reaudit.sh con el bearer de CRON_SECRET. Encola para
 * redactar los hallazgos «error» del informe (plan 7). Avisa por
 * correo a cada operador, una vez por fecha y resultado (un relanzamiento que sale bien tras
 * un fallo también se avisa).
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
    if (enqueueEmail({ to: email, template: "legal_reaudit", payload, dedupeKey: `legal-reaudit:${date}:${ok ? "ok" : "fallo"}:${email.toLowerCase()}` })) sent += 1;
  }
  // Los hallazgos «error» se encolan para redactar la corrección (plan 7).
  const findings = Array.isArray(data.findings) ? (data.findings.slice(0, 2000) as AuditFinding[]) : [];
  let queued = 0;
  for (const r of draftRequestsFromReport({ findings })) if (enqueueDraft(r)) queued += 1;
  return Response.json({ sent, queued });
}
