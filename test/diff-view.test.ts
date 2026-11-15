import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiffView } from "@/components/diff-view";
import { isGeneratedFile, parseUnifiedDiff, reviewOrder } from "@/lib/unified-diff";

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

describe("orden para revisar un cambio legal", () => {
  it("reconoce los archivos generados (instantáneas, huellas, fallas conocidas)", () => {
    expect(isGeneratedFile("test/legal/__snapshots__/salud/politica.md")).toBe(true);
    expect(isGeneratedFile("test/legal/__snapshots__/modules/modules.json")).toBe(true);
    expect(isGeneratedFile("test/legal/baseline-hashes.json")).toBe(true);
    expect(isGeneratedFile("legal/known-failures/citations.json")).toBe(true);
    expect(isGeneratedFile("src/legal/documents/politica.ts")).toBe(false);
    expect(isGeneratedFile("legal/changes/lc-20261114-abc123.md")).toBe(false);
  });

  it("primero el texto legal y el registro, al final lo generado", () => {
    const files = parseUnifiedDiff(DIFF.replace(/viejo\.txt/g, "test/legal/baseline-hashes.json"));
    expect(reviewOrder(files).map((f) => f.file)).toEqual(["src/legal/documents/politica.ts", "legal/changes/lc-1.md", "test/legal/baseline-hashes.json"]);
  });
});

describe("DiffView con cambios grandes", () => {
  const big = (file: string, n: number) =>
    `diff --git a/${file} b/${file}\nnew file mode 100644\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${n} @@\n` +
    Array.from({ length: n }, (_, i) => `+línea ${i + 1} de ${file}`).join("\n") +
    "\n";
  const diff = `${DIFF}${big("legal/library/codigo-civil/articles.json", 3000)}${big("src/legal/documents/enorme.ts", 900)}`;
  const html = renderToStaticMarkup(createElement(DiffView, { diff, fileUrl: (f: string) => `https://github.com/x/y/blob/abc/${f}` }));

  it("un archivo de más de 300 líneas no se imprime: dice su tamaño y enlaza a GitHub", () => {
    expect(html).not.toContain("línea 1500 de legal/library/codigo-civil/articles.json");
    expect(html).not.toContain("línea 500 de src/legal/documents/enorme.ts");
    expect(html).toContain("Archivo grande");
    expect(html).toContain("https://github.com/x/y/blob/abc/src/legal/documents/enorme.ts");
  });

  it("los textos oficiales de la biblioteca van plegados en su propio grupo; lo escrito a mano se ve entero", () => {
    expect(html).toContain("Textos oficiales agregados a la biblioteca");
    expect(html).toContain("(art. III.6 del DS N.° 016-2024-JUS)");
  });

  it("la página pesa poco aunque el cambio sea enorme", () => {
    expect(html.length).toBeLessThan(60_000);
  });
  it("lo regenerado y la biblioteca se listan (nombre, tamaño, enlace) sin imprimir sus líneas", () => {
    const snap = `diff --git a/test/legal/__snapshots__/x.md b/test/legal/__snapshots__/x.md
--- a/test/legal/__snapshots__/x.md
+++ b/test/legal/__snapshots__/x.md
@@ -1 +1 @@
-texto viejo de instantánea
+texto nuevo de instantánea
`;
    const out = renderToStaticMarkup(createElement(DiffView, { diff: `${DIFF}${snap}`, fileUrl: (f: string) => `https://g/${f}` }));
    expect(out).toContain("test/legal/__snapshots__/x.md");
    expect(out).not.toContain("texto nuevo de instantánea");
  });
});

