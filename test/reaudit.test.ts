import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/legal/reaudit/route";
import { getDb } from "@/lib/db";

const SECRET = "r".repeat(32);
const script = path.join(process.cwd(), "deploy/datosprivados-reaudit.sh");
const request = (json: unknown, auth = `Bearer ${SECRET}`) =>
  new Request("http://localhost/api/legal/reaudit", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(json) });
const mails = () => getDb().prepare("SELECT to_email, payload FROM email_outbox WHERE template = 'legal_reaudit' ORDER BY to_email").all() as Array<{ to_email: string; payload: string }>;

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.OPERATOR_EMAILS = "fundador@ejemplo.pe, socio@ejemplo.pe";
  getDb().exec("DELETE FROM email_outbox");
});
afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.OPERATOR_EMAILS;
});

describe("POST /api/legal/reaudit", () => {
  it("exige el secreto, avisa una vez por fecha a cada operador y cuenta errores", async () => {
    expect((await POST(request({ ok: true, date: "2027-01-04" }, "Bearer otro"))).status).toBe(401);
    const body = { ok: true, date: "2027-01-04", errors: 12, review: 340, aiFailures: 1 };
    expect((await POST(request(body))).status).toBe(200);
    expect((await POST(request(body))).status).toBe(200);
    expect(mails().map((m) => m.to_email)).toEqual(["fundador@ejemplo.pe", "socio@ejemplo.pe"]);
    expect(JSON.parse(mails()[0].payload)).toMatchObject({ errors: 12, review: 340, date: "2027-01-04" });
  });

  it("un fallo de la auditoría también avisa, con el motivo", async () => {
    expect((await POST(request({ ok: false, date: "2027-04-05", error: "pnpm install falló" }))).status).toBe(200);
    expect(JSON.parse(mails()[0].payload)).toMatchObject({ error: "pnpm install falló" });
  });

  it("un éxito tras un fallo del mismo día también se avisa (relanzado a mano)", async () => {
    await POST(request({ ok: false, date: "2027-04-05", error: "sin IA" }));
    await POST(request({ ok: true, date: "2027-04-05", errors: 0, review: 3, aiFailures: 0 }));
    expect(mails()).toHaveLength(4);
  });

  it("rechaza una fecha mal formada", async () => {
    expect((await POST(request({ ok: true, date: "ayer" }))).status).toBe(400);
  });
});

/** Corre el script con un servidor local que recibe el POST; devuelve los cuerpos recibidos. */
async function runScript(env: Record<string, string>, opts: { secretLine?: string; prepare?: (state: string) => void } = {}) {
  const bodies: string[] = [];
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${SECRET}`) {
        res.statusCode = 401;
        res.end("Unauthorized");
        return;
      }
      bodies.push(data);
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "reaudit-"));
  const envDir = fs.mkdtempSync(path.join(os.tmpdir(), "reaudit-env-"));
  fs.writeFileSync(path.join(envDir, ".env"), opts.secretLine ?? `CRON_SECRET="${SECRET}"\r\n`);
  opts.prepare?.(state);
  const code = await new Promise<number>((resolve) => {
    const child = spawn("bash", [script], {
      env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", REAUDIT_STATE_DIR: state, REAUDIT_ENV_DIR: envDir, REAUDIT_API_URL: `http://127.0.0.1:${port}/api/legal/reaudit`, REAUDIT_RETRIES: "0", DATOSPRIVADOS_ENV: "/nonexistent", ...env },
      stdio: "ignore",
    });
    child.on("exit", (c) => resolve(c ?? 1));
  });
  server.close();
  return { code, bodies, state };
}

describe("deploy/datosprivados-reaudit.sh", () => {
  it("sale sin hacer nada si no es el primer lunes del trimestre", async () => {
    const { code, bodies } = await runScript({ REAUDIT_TODAY: "2027-01-11", REAUDIT_CMD: "true" }); // segundo lunes
    expect(code).toBe(0);
    expect(bodies).toEqual([]);
    expect((await runScript({ REAUDIT_TODAY: "2027-02-01", REAUDIT_CMD: "true" })).bodies).toEqual([]); // febrero
  });

  it("avisa ok:false si la auditoría falla", async () => {
    const { code, bodies } = await runScript({ REAUDIT_TODAY: "2027-01-04", REAUDIT_CMD: "echo rompió >&2; false" });
    expect(code).not.toBe(0);
    expect(JSON.parse(bodies[0])).toMatchObject({ ok: false, date: "2027-01-04" });
  });

  it("un informe viejo que ya estaba en la copia no cuenta como resultado", async () => {
    const { code, bodies } = await runScript(
      { REAUDIT_TODAY: "2027-01-04", REAUDIT_CMD: "true" },
      {
        prepare: (state) => {
          const file = path.join(state, "repo/legal/audit/2027-01-04.json");
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, '{"meta":{},"findings":[]}');
          fs.utimesSync(file, new Date("2020-01-01"), new Date("2020-01-01"));
        },
      }
    );
    expect(code).not.toBe(0);
    expect(JSON.parse(bodies[0])).toMatchObject({ ok: false });
  });

  it("si la aplicación rechaza el aviso, el script falla (no dice «enviada»)", async () => {
    const report = '{"meta":{},"findings":[]}';
    const { code, bodies } = await runScript(
      { REAUDIT_TODAY: "2027-01-04", REAUDIT_CMD: `mkdir -p legal/audit && echo '${report}' > legal/audit/x.json` },
      { secretLine: "CRON_SECRET=otro-secreto-de-mas-de-16\n" }
    );
    expect(bodies).toEqual([]);
    expect(code).not.toBe(0);
  });

  it("REAUDIT_FORCE=1 corre fuera del primer lunes (relanzar a mano)", async () => {
    const { bodies } = await runScript({ REAUDIT_TODAY: "2027-01-13", REAUDIT_FORCE: "1", REAUDIT_CMD: "false" });
    expect(JSON.parse(bodies[0])).toMatchObject({ ok: false, date: "2027-01-13" });
  });

  it("el cron corre a una hora de Berlín que en Lima es el mismo día (servidor en Europe/Berlin)", () => {
    const line = fs.readFileSync(path.join(process.cwd(), "deploy/cron.d-datosprivados"), "utf8").split("\n").find((l) => l.includes("datosprivados-reaudit"))!;
    const hour = Number(line.trim().split(/\s+/)[1]);
    expect(hour).toBeGreaterThanOrEqual(8); // Berlín es Lima + 6 (invierno) o + 7 (verano)
  });

  it("con el informe del día, envía los conteos", async () => {
    const report = { meta: { aiFailures: 2 }, findings: [{ severity: "error" }, { severity: "error" }, { severity: "revisar" }] };
    const cmd = `mkdir -p legal/audit && echo '${JSON.stringify(report)}' > legal/audit/2027-01-04.json`;
    const { code, bodies } = await runScript({ REAUDIT_TODAY: "2027-01-04", REAUDIT_CMD: cmd });
    expect(code).toBe(0);
    expect(JSON.parse(bodies[0])).toEqual({ ok: true, date: "2027-01-04", errors: 2, review: 1, aiFailures: 2 });
  });
});
