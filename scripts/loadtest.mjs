#!/usr/bin/env node
// Carga simple sin dependencias: N conexiones simultáneas durante D segundos contra una URL.
// Uso: node scripts/loadtest.mjs <url> [-c 50] [-d 10] [-m GET] [-H "Nombre: valor"]... [-b cuerpo]
import http from "node:http";
import https from "node:https";

const args = process.argv.slice(2);
if (!args.length || args[0].startsWith("-")) {
  console.error('Uso: node scripts/loadtest.mjs <url> [-c 50] [-d 10] [-m GET] [-H "Nombre: valor"]... [-b cuerpo]');
  process.exit(2);
}
const rawUrl = args.shift();
let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error(`URL inválida: ${rawUrl}\nUso: node scripts/loadtest.mjs <url> [-c 50] [-d 10] ...`);
  process.exit(2);
}
const opt = { c: 50, d: 10, m: "GET", b: undefined, headers: {} };
while (args.length) {
  const flag = args.shift();
  const value = args.shift();
  if (flag === "-c") opt.c = Number(value);
  else if (flag === "-d") opt.d = Number(value);
  else if (flag === "-m") opt.m = value;
  else if (flag === "-b") opt.b = value;
  else if (flag === "-H") {
    const i = value.indexOf(":");
    opt.headers[value.slice(0, i).trim()] = value.slice(i + 1).trim();
  }
}
const lib = url.protocol === "https:" ? https : http;
const agent = new lib.Agent({ keepAlive: true, maxSockets: opt.c });
const latencies = [];
const statuses = {};
let errors = 0;
const stopAt = Date.now() + opt.d * 1000;

function once() {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const req = lib.request(url, { method: opt.m, agent, headers: opt.headers }, (res) => {
      res.resume();
      res.on("end", () => {
        latencies.push(Number(process.hrtime.bigint() - started) / 1e6);
        statuses[res.statusCode] = (statuses[res.statusCode] ?? 0) + 1;
        resolve();
      });
    });
    req.on("error", () => {
      errors += 1;
      resolve();
    });
    req.setTimeout(30_000, () => req.destroy());
    if (opt.b) req.write(opt.b);
    req.end();
  });
}

async function worker() {
  while (Date.now() < stopAt) await once();
}

await Promise.all(Array.from({ length: opt.c }, worker));
latencies.sort((a, b) => a - b);
const pct = (p) => (latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))].toFixed(0) : "n/a");
console.log(
  `reqs=${latencies.length} req/s=${(latencies.length / opt.d).toFixed(0)} p50=${pct(50)}ms p95=${pct(95)}ms p99=${pct(99)}ms errors=${errors} status=${JSON.stringify(statuses)}`
);
