import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { applySpan, type Span } from "@/legal/draft/locate";

/**
 * Cómo ven los clientes un texto con `replacement` (redactor, plan 7). Una cláusula se escribe un
 * momento en su archivo y se genera en un proceso nuevo (`render-one.draft.ts`): la caché de
 * módulos de vitest no ve el archivo cambiado dentro del mismo proceso. El archivo vuelve siempre
 * a como estaba.
 */
export async function renderTarget(span: Span, replacement: string, root: string = process.cwd()): Promise<string[]> {
  if (span.kind !== "clause") {
    const sf = ts.createSourceFile("x.ts", `const v = ${replacement};`, ts.ScriptTarget.Latest, true);
    const init = (sf.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!;
    return [ts.isStringLiteralLike(init) ? init.text : replacement];
  }
  const file = path.join(root, span.file);
  const original = fs.readFileSync(file, "utf8");
  const id = /id:\s*"([^"]+)"/.exec(span.source)?.[1] ?? "";
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "render-")), "out.json");
  try {
    if (replacement !== span.source) fs.writeFileSync(file, applySpan(span, replacement, original));
    const r = spawnSync("npx", ["vitest", "run", "--config", "vitest.draft.config.ts", "test/legal/draft/render-one.draft.ts"], {
      cwd: root,
      env: { ...process.env, RENDER_CLAUSE_ID: id, RENDER_OUT: out, DRAFT_REQUEST_FILE: "" },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300_000,
    });
    if (!fs.existsSync(out)) throw new Error(`no se pudo generar el texto: ${`${r.stdout}${r.stderr}`.trim().split("\n").slice(-5).join(" ")}`);
    const result = JSON.parse(fs.readFileSync(out, "utf8")) as { texts?: string[]; error?: string };
    if (result.error) throw new Error(result.error);
    return result.texts ?? [];
  } finally {
    fs.writeFileSync(file, original);
  }
}
