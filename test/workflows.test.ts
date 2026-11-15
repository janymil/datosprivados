import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GitHub rechaza el archivo entero (ningún job arranca y no hay log) si una expresión
 * compara con una palabra sin comillas: `github.event_name == schedule` lee `schedule`
 * como un contexto inexistente. Pasó en ci.yml (PR #20) y el CI no corrió desde entonces.
 */
const dir = path.join(process.cwd(), ".github/workflows");
const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));

/** Comparaciones `== palabra` / `!= palabra` sin comillas en las condiciones `if:`. */
function unquotedComparisons(yaml: string): string[] {
  const out: string[] = [];
  for (const line of yaml.split("\n")) {
    const cond = /^\s*(?:-\s*)?if:\s*(.+)$/.exec(line)?.[1];
    if (!cond) continue;
    for (const m of cond.matchAll(/[!=]=\s*([A-Za-z_][\w-]*)\b(?!\s*[.(])/g)) {
      if (!["true", "false", "null"].includes(m[1])) out.push(`${line.trim()} → ${m[1]}`);
    }
  }
  return out;
}

describe("workflows de GitHub", () => {
  it("detecta una palabra sin comillas y acepta textos, booleanos y contextos", () => {
    expect(unquotedComparisons("    if: github.event_name == schedule")).toHaveLength(1);
    expect(unquotedComparisons("    if: github.event_name == 'schedule' && x == true")).toEqual([]);
    expect(unquotedComparisons("    if: github.ref == github.event.repository.default_branch")).toEqual([]);
  });

  it.each(files)("%s no compara con palabras sin comillas", (file) => {
    expect(unquotedComparisons(fs.readFileSync(path.join(dir, file), "utf8"))).toEqual([]);
  });
});
