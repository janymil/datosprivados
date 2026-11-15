import { isGeneratedFile, parseUnifiedDiff, reviewOrder, type DiffFile } from "@/lib/unified-diff";

/**
 * Diff de un cambio legal. Cada línea lleva signo y color: «+» agregado, «−»
 * quitado (el signo basta sin color, para quien no distingue rojo y verde).
 * Primero lo escrito a mano (texto legal, registro); después, plegados, los textos oficiales
 * que entran a la biblioteca y lo que las pruebas regeneran (instantáneas, huellas).
 * Un archivo de más de LARGE líneas cambiadas no se imprime (un Código Civil son miles):
 * se dice su tamaño y se enlaza a GitHub, así la página carga siempre.
 */
const LARGE = 300;
const isLibrary = (file: string) => file.startsWith("legal/library/");

export function DiffView({ diff, fileUrl }: { diff: string; fileUrl?: (file: string) => string }) {
  const files = reviewOrder(parseUnifiedDiff(diff));
  if (!files.length) return <p className="text-sm text-ink-soft">Este cambio no trae diferencias legibles.</p>;
  const written = files.filter((f) => !isGeneratedFile(f.file) && !isLibrary(f.file));
  const library = files.filter((f) => isLibrary(f.file));
  const generated = files.filter((f) => isGeneratedFile(f.file));
  const count = (list: DiffFile[]) => list.reduce((n, f) => n + f.added + f.removed, 0).toLocaleString("es-PE");
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        {files.length} archivos: {written.length} escritos a mano
        {library.length > 0 && `, ${library.length} de la biblioteca de normas`}
        {generated.length > 0 && `, ${generated.length} regenerados por las pruebas`}.
      </p>
      {written.map((file) => (
        <FileDiff key={file.file} file={file} fileUrl={fileUrl} />
      ))}
      {library.length > 0 && (
        <details className="rounded border border-line">
          <summary className="cursor-pointer px-3 py-2 text-sm">
            Textos oficiales agregados a la biblioteca: {library.length} archivos ({count(library)} líneas). Son copia del texto
            oficial de cada norma; el enlace de cada archivo abre el texto completo.
          </summary>
          <div className="space-y-6 p-3">
            {library.map((file) => (
              <FileDiff key={file.file} file={file} fileUrl={fileUrl} listOnly />
            ))}
          </div>
        </details>
      )}
      {generated.length > 0 && (
        <details className="rounded border border-line">
          <summary className="cursor-pointer px-3 py-2 text-sm">
            Archivos regenerados por las pruebas: {generated.length} ({count(generated)} líneas). Reflejan el cambio de arriba en
            cada documento de ejemplo; no hace falta revisarlos uno por uno.
          </summary>
          <div className="space-y-6 p-3">
            {generated.map((file) => (
              <FileDiff key={file.file} file={file} fileUrl={fileUrl} listOnly />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** `listOnly`: lo regenerado y la biblioteca se listan (nombre, tamaño, enlace) sin imprimir sus líneas. */
function FileDiff({ file, fileUrl, listOnly = false }: { file: DiffFile; fileUrl?: (file: string) => string; listOnly?: boolean }) {
  const size = file.added + file.removed;
  const link =
    fileUrl && file.status !== "eliminado" ? (
      <a href={fileUrl(file.file)} className="underline" rel="noreferrer" target="_blank">
        Ver en GitHub
      </a>
    ) : null;
  return (
    <section className="overflow-hidden rounded border border-line">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-paper-2 px-3 py-2">
        <p className="font-mono text-xs break-all">{file.file}</p>
        <p className="font-mono text-xs text-ink-soft">
          {file.status} · +{file.added} −{file.removed}
        </p>
      </header>
      {listOnly ? (
        link && <p className="px-3 py-2 text-sm text-ink-soft">{link}</p>
      ) : size > LARGE ? (
        <p className="px-3 py-2 text-sm text-ink-soft">
          Archivo grande ({size.toLocaleString("es-PE")} líneas cambiadas): no se muestra aquí para que la página cargue. {link}
        </p>
      ) : (
        file.hunks.map((hunk, h) => (
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
        ))
      )}
    </section>
  );
}
