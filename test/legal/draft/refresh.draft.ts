import { it } from "vitest";
import { refreshChange } from "@/legal/draft/refresh";
import { realSteps } from "@/legal/draft/steps";

/**
 * Rehace los cambios legales pendientes que se hicieron sobre un master viejo (otro cambio se
 * fusionó antes). Lo lanza deploy/datosprivados-draft.sh antes de redactar, con DRAFT_REFRESH=1.
 */
const MAX_PER_RUN = 3;
const root = process.cwd();

it.skipIf(!process.env.DRAFT_REFRESH)("rehacer cambios pendientes sobre master", async () => {
  const api = (process.env.LEGAL_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`, "content-type": "application/json" };
  const res = await fetch(`${api}/api/legal/changes/pending`, { headers });
  if (!res.ok) throw new Error(`GET /api/legal/changes/pending -> ${res.status}`);
  const pending = (await res.json()) as Array<{ id: string; branch: string; head_sha: string }>;
  const steps = realSteps(root, { url: api, secret: process.env.CRON_SECRET ?? "" });
  const post = async (id: string, body: unknown) => {
    const r = await fetch(`${api}/api/legal/changes/${id}/refresh`, { method: "POST", headers, body: JSON.stringify(body) });
    return { ok: r.ok, out: await r.text() };
  };
  let done = 0;
  for (const change of pending) {
    if (done >= MAX_PER_RUN) break;
    const result = await refreshChange(change, {
      root,
      git: steps.git,
      regenerate: steps.regenerate,
      validate: steps.validate,
      checks: steps.checks,
      reregister: (id, head, diff) => post(id, { head_sha: head, diff }),
    });
    console.log(`[rehacer] ${change.id}: ${result.status}${result.reasons.length ? ` — ${result.reasons.join(" ").slice(0, 500)}` : ""}`);
    if (result.status === "al-dia") continue;
    done += 1;
    if (result.status === "conflicto" || result.status === "fallo") await post(change.id, { error: result.reasons.join(" ") });
  }
}, 3_600_000);
