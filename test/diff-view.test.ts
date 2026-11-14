import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "@/lib/unified-diff";

const DIFF = `diff --git a/src/legal/documents/politica.ts b/src/legal/documents/politica.ts
index 1111111..2222222 100644
--- a/src/legal/documents/politica.ts
+++ b/src/legal/documents/politica.ts
@@ -10,3 +10,3 @@ export const politicaSpec
 contexto antes
-(art. 2.6 del DS N.° 016-2024-JUS)
+(art. III.6 del DS N.° 016-2024-JUS)
 contexto después
diff --git a/legal/changes/lc-1.md b/legal/changes/lc-1.md
new file mode 100644
--- /dev/null
+++ b/legal/changes/lc-1.md
@@ -0,0 +1,2 @@
+# Cambio lc-1
+Motivo.
\\ No newline at end of file
diff --git a/viejo.txt b/viejo.txt
deleted file mode 100644
--- a/viejo.txt
+++ /dev/null
@@ -1 +0,0 @@
-adiós
`;

describe("parseUnifiedDiff", () => {
  const files = parseUnifiedDiff(DIFF);

  it("separa los archivos con su ruta y su tipo", () => {
    expect(files.map((f) => [f.file, f.status])).toEqual([
      ["src/legal/documents/politica.ts", "modificado"],
      ["legal/changes/lc-1.md", "nuevo"],
      ["viejo.txt", "eliminado"],
    ]);
  });

  it("numera las líneas según la cabecera del bloque", () => {
    const [hunk] = files[0].hunks;
    expect(hunk.header).toBe("@@ -10,3 +10,3 @@ export const politicaSpec");
    expect(hunk.lines).toEqual([
      { type: "ctx", text: "contexto antes", oldNo: 10, newNo: 10 },
      { type: "del", text: "(art. 2.6 del DS N.° 016-2024-JUS)", oldNo: 11 },
      { type: "add", text: "(art. III.6 del DS N.° 016-2024-JUS)", newNo: 11 },
      { type: "ctx", text: "contexto después", oldNo: 12, newNo: 12 },
    ]);
  });

  it("ignora la marca «No newline at end of file» y cuenta altas y bajas", () => {
    expect(files[1].hunks[0].lines.map((l) => l.text)).toEqual(["# Cambio lc-1", "Motivo."]);
    expect(files.map((f) => [f.added, f.removed])).toEqual([[1, 1], [2, 0], [0, 1]]);
  });

  it("un diff vacío o sin archivos da una lista vacía", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
  });
});
