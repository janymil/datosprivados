import type { LegalChangeStatus } from "@/lib/db";

/** Estado de un cambio legal, en palabras del fundador. */
export const STATUS_LABEL: Record<LegalChangeStatus, string> = {
  nuevo: "Por decidir",
  aprobado: "Aprobado · en GitHub",
  rechazado: "Rechazado",
  abogado: "Con el abogado",
  fusionado: "Fusionado · por desplegar",
  aplicado: "Aplicado",
  fallo: "Falló",
};
