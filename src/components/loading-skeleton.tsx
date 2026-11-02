/**
 * Estados de carga del panel (área 20).
 *
 * Las páginas del panel son dinámicas: leen la base en cada visita. `loading.tsx`
 * hace que Next muestre esto al instante mientras llega el HTML, en vez de dejar
 * la pantalla anterior congelada. Es un esqueleto con la forma real de la página
 * (encabezado, tarjeta y filas) y anuncia el estado a los lectores de pantalla.
 */
export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-line" />
        <div className="h-9 w-2/3 max-w-[24rem] rounded bg-line" />
      </div>
      <div className="rounded border border-line bg-paper p-6 md:p-7">
        <div className="h-4 w-1/3 rounded bg-line" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-line" style={{ width: `${88 - index * 12}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
