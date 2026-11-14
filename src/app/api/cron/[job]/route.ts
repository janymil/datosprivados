import { authorizedByCronSecret } from "@/lib/cron-auth";
import { isJobName, jobsHealth, runJob } from "@/lib/jobs";
import { dbIntegrity, operationalAlerts, type OpsAlert } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cron/<tarea> — ejecuta una tarea. */
export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  if (!isJobName(job)) return new Response("Not found", { status: 404 });
  const outcome = await runJob(job);
  return Response.json(outcome, { status: outcome.status === "error" ? 500 : outcome.status === "locked" ? 409 : 200 });
}

/**
 * GET /api/cron/health — 200 si todo corre a tiempo, la base está íntegra y no hay
 * alertas operativas; 503 si no. Para un monitor externo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  if (job !== "health") return new Response("Not found", { status: 404 });
  const health = jobsHealth();
  const alerts: OpsAlert[] = [...operationalAlerts()];
  // Integridad y checkpoint del WAL: aquí sí recorremos la base (endpoint autenticado).
  const integrity = dbIntegrity();
  if (!integrity.ok) alerts.push({ code: "db_integrity", message: `La base no pasó la comprobación de integridad: ${integrity.error ?? "error"}` });
  const healthy = health.healthy && integrity.ok && alerts.length === 0;
  return Response.json({ ...health, integrity, healthy, alerts }, { status: healthy ? 200 : 503 });
}
