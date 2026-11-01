import crypto from "node:crypto";
import { isJobName, jobsHealth, runJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compara el bearer con CRON_SECRET en tiempo constante. Sin secreto configurado, todo se rechaza. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = crypto.createHash("sha256").update(header.replace(/^Bearer\s+/i, "")).digest();
  const expected = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(given, expected);
}

/** POST /api/cron/<tarea> — ejecuta una tarea. */
export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  if (!isJobName(job)) return new Response("Not found", { status: 404 });
  const outcome = await runJob(job);
  return Response.json(outcome, { status: outcome.status === "error" ? 500 : outcome.status === "locked" ? 409 : 200 });
}

/** GET /api/cron/health — 200 si todo corre a tiempo, 503 si no. Para un monitor externo. */
export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  if (job !== "health") return new Response("Not found", { status: 404 });
  const health = jobsHealth();
  return Response.json(health, { status: health.healthy ? 200 : 503 });
}
