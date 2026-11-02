import { PanelSkeleton } from "@/components/loading-skeleton";

/**
 * Estado de carga de todas las pantallas del panel (`/app/**`). Next lo muestra
 * mientras la página de servidor lee la base; sin él, la navegación se queda en la
 * pantalla anterior hasta que el servidor responde.
 */
export default function PanelLoading() {
  return <PanelSkeleton rows={4} />;
}
