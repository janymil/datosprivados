import { authorizedByCronSecret } from "@/lib/cron-auth";
import { listLegalChanges, REFRESHABLE } from "@/lib/legal-changes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/legal/changes/pending — cambios que pueden necesitar rehacerse sobre master. Interno: bearer CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorizedByCronSecret(request)) return new Response("Unauthorized", { status: 401 });
  return Response.json(listLegalChanges({ status: REFRESHABLE }).map((c) => ({ id: c.id, branch: c.branch, head_sha: c.head_sha, status: c.status })));
}
