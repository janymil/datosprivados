import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SECRET = "s".repeat(32);
const script = path.join(process.cwd(), "deploy/datosprivados-draft.sh");

/** Corre el script contra una app falsa: `next` responde lo indicado; se guardan los resultados recibidos. */
async function runScript(next: Array<{ status: number; body?: unknown }>, env: Record<string, string>) {
  const results: Array<{ url: string; body: string }> = [];
  let asked = 0;
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${SECRET}`) {
        res.statusCode = 401;
        res.end();
        return;
      }
      if (req.url === "/api/legal/drafts/next") {
        const r = next[Math.min(asked++, next.length - 1)];
        res.statusCode = r.status;
        res.end(r.body === undefined ? "" : JSON.stringify(r.body));
        return;
      }
      results.push({ url: req.url ?? "", body: data });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "draft-sh-"));
  const envDir = fs.mkdtempSync(path.join(os.tmpdir(), "draft-env-"));
  fs.writeFileSync(path.join(envDir, ".env"), `CRON_SECRET="${SECRET}"\r\n`);
  const code = await new Promise<number>((resolve) => {
    const child = spawn("bash", [script], {
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH ?? "",
        DRAFT_STATE_DIR: state,
        DRAFT_ENV_DIR: envDir,
        DATOSPRIVADOS_ENV: "/nonexistent",
        DRAFT_API_URL: `http://127.0.0.1:${port}`,
        DRAFT_RETRIES: "0",
        ...env,
      },
      stdio: "ignore",
    });
    child.on("exit", (c) => resolve(c ?? 1));
  });
  server.close();
  return { code, results, state, asked };
}

describe("deploy/datosprivados-draft.sh", () => {
  it("sin trabajo (204) o con la IA apagada (409): sale sin redactar", async () => {
    for (const status of [204, 409]) {
      const { code, results, state } = await runScript([{ status }], { DRAFT_CMD: "touch ran" });
      expect(code).toBe(0);
      expect(results).toEqual([]);
      expect(fs.existsSync(path.join(state, "repo/ran"))).toBe(false);
    }
  });

  it("con una solicitud: corre el redactor y devuelve su resultado; como máximo DRAFT_MAX por corrida", async () => {
    const cmd = `echo '{"status":"propuesto","changeId":"lc-20270110-abcdef","usage":{"inputTokens":10,"outputTokens":5}}' > "$DRAFT_RESULT_FILE"`;
    const { code, results, asked } = await runScript([{ status: 200, body: { id: "r1", origin: "auditoria", ref: "a", targets: [], context: null } }], {
      DRAFT_CMD: cmd,
      DRAFT_MAX: "2",
    });
    expect(code).toBe(0);
    expect(asked).toBe(2);
    expect(results).toHaveLength(2);
    expect(results[0].url).toBe("/api/legal/drafts/r1/result");
    expect(JSON.parse(results[0].body)).toEqual({ status: "propuesto", changeId: "lc-20270110-abcdef", usage: { inputTokens: 10, outputTokens: 5 } });
  });

  it("si el redactor no deja resultado, la solicitud vuelve a la cola («reintentar»)", async () => {
    const { results } = await runScript([{ status: 200, body: { id: "r2" } }, { status: 204 }], { DRAFT_CMD: "false" });
    expect(JSON.parse(results[0].body)).toMatchObject({ status: "reintentar" });
  });
});
