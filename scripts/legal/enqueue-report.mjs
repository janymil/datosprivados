#!/usr/bin/env node
/**
 * Encola para redactar los hallazgos «error» de un informe de auditoría ya existente
 * (motor legal, plan 7; docs/RUNBOOK.md, «Redacción automática»). Las re-auditorías nuevas
 * los encolan solas.
 *
 *   CRON_SECRET=… node --experimental-strip-types scripts/legal/enqueue-report.mjs legal/audit/2026-11-14.json
 */
import fs from "node:fs";
import { draftRequestsFromReport } from "../../src/legal/draft/draftable.ts";

const file = process.argv[2];
if (!file) {
  console.error("uso: enqueue-report.mjs legal/audit/<fecha>.json");
  process.exit(1);
}
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("falta CRON_SECRET en el entorno");
  process.exit(1);
}
const url = `${(process.env.LEGAL_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "")}/api/legal/drafts`;
const requests = draftRequestsFromReport(JSON.parse(fs.readFileSync(file, "utf8")));
let queued = 0;
for (const r of requests) {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(r),
  });
  if (!res.ok) {
    console.error(`${r.targets[0]}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  if ((await res.json()).queued) queued += 1;
}
console.log(`${requests.length} solicitudes; ${queued} nuevas en la cola`);
