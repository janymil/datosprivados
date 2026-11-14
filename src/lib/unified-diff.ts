/**
 * Lee un diff unificado de git para mostrarlo en /operador/legal: archivos,
 * bloques y líneas con su número en la versión anterior y en la nueva.
 */

export type DiffLine = { type: "add" | "del" | "ctx"; text: string; oldNo?: number; newNo?: number };
export type DiffHunk = { header: string; lines: DiffLine[] };
export type DiffFile = { file: string; status: "nuevo" | "eliminado" | "modificado"; hunks: DiffHunk[]; added: number; removed: number };

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = / b\/(.+)$/.exec(line);
      file = { file: match?.[1] ?? line.slice(11), status: "modificado", hunks: [], added: 0, removed: 0 };
      files.push(file);
      hunk = null;
      continue;
    }
    if (!file) continue;
    if (line.startsWith("new file mode")) file.status = "nuevo";
    else if (line.startsWith("deleted file mode")) file.status = "eliminado";
    else if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) continue;
    else if (HUNK.test(line)) {
      const [, oldStart, newStart] = HUNK.exec(line)!;
      oldNo = Number(oldStart);
      newNo = Number(newStart);
      hunk = { header: line, lines: [] };
      file.hunks.push(hunk);
    } else if (hunk && line.startsWith("\\")) {
      continue; // «\ No newline at end of file»
    } else if (hunk && line.startsWith("+")) {
      hunk.lines.push({ type: "add", text: line.slice(1), newNo: newNo++ });
      file.added++;
    } else if (hunk && line.startsWith("-")) {
      hunk.lines.push({ type: "del", text: line.slice(1), oldNo: oldNo++ });
      file.removed++;
    } else if (hunk && line.startsWith(" ")) {
      hunk.lines.push({ type: "ctx", text: line.slice(1), oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return files;
}
