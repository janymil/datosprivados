import { isGeneratedFile, parseUnifiedDiff, reviewOrder, type DiffFile } from "@/lib/unified-diff";

/**
 * Diff de un cambio legal. Cada línea lleva signo y color: «+» agregado, «−»
 * quitado (el signo basta sin color, para quien no distingue rojo y verde).
 * Primero lo escrito a mano (texto legal, registro); al final, plegado, lo que las
 * pruebas regeneran (instantáneas, huellas), que puede sumar miles de líneas.
 */
export function DiffView({ diff }: { diff: string }) {
  const files = reviewOrder(parseUnifiedDiff(diff));
  if (!files.length) return <p className="text-sm text-ink-soft">Este cambio no trae diferencias legibles.</p>;
  const written = files.filter((f) => !isGeneratedFile(f.file));
  const generated = files.filter((f) => isGeneratedFile(f.file));
  const lines = generated.reduce((n, f) => n + f.added + f.removed, 0);
  return (
    <div className="space-y-6">
      {written.map((file) => (
        <FileDiff key={file.file} file={file} />
      ))}
      {generated.length > 0 && (
        <details className="rounded border border-line">
          <summary className="cursor-pointer px-3 py-2 text-sm">
            Archivos regenerados por las pruebas: {generated.length} ({lines.toLocaleString("es-PE")} líneas). Reflejan el
            cambio de arriba en cada documento de ejemplo; no hace falta revisarlos uno por uno.
          </summary>
          <div className="space-y-6 p-3">
            {generated.map((file) => (
              <FileDiff key={file.file} file={file} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FileDiff({ file }: { file: DiffFile }) {
  return (
    <section className="overflow-hidden rounded border border-line">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-paper-2 px-3 py-2">
        <p className="font-mono text-xs break-all">{file.file}</p>
        <p className="font-mono text-xs text-ink-soft">
          {file.status} · +{file.added} −{file.removed}
        </p>
      </header>
      {file.hunks.map((hunk, h) => (
        <table key={h} className="w-full border-collapse font-mono text-xs leading-relaxed">
          <caption className="sr-only">{hunk.header}</caption>
          <tbody>
            <tr>
              <td colSpan={4} className="bg-paper-2 px-3 py-1 text-ink-soft">
                {hunk.header}
              </td>
            </tr>
            {hunk.lines.map((line, i) => (
              <tr key={i} className={line.type === "add" ? "bg-sage/[0.12]" : line.type === "del" ? "bg-crimson/[0.08]" : undefined}>
                <td className="w-10 select-none px-2 text-right text-ink-soft">{line.oldNo ?? ""}</td>
                <td className="w-10 select-none px-2 text-right text-ink-soft">{line.newNo ?? ""}</td>
                <td className="w-4 select-none text-center" aria-label={line.type === "add" ? "agregado" : line.type === "del" ? "quitado" : undefined}>
                  {line.type === "add" ? "+" : line.type === "del" ? "−" : ""}
                </td>
                <td className="whitespace-pre-wrap break-words px-2">{line.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}
