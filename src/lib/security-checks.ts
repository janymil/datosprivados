/**
 * Medidas mínimas que el Reglamento (DS N.° 016-2024-JUS, arts. 46, 47 y 51) exige
 * dentro del Documento de Seguridad.
 *
 * El documento generado las redacta; esta lista sirve para marcar en el panel
 * cuáles ya están implementadas en el negocio (la ANPD no pide el texto: pide
 * evidencias de que las medidas existen).
 */

export type SecurityCheckId =
  | "acceso"
  | "permisos"
  | "inventario"
  | "bajas"
  | "registros"
  | "capacitacion"
  | "respaldos";

export type SecurityCheckItem = {
  id: SecurityCheckId;
  label: string;
  detail: string;
};

export const SECURITY_CHECKS: SecurityCheckItem[] = [
  {
    id: "acceso",
    label: "Quién accede a qué",
    detail:
      "Matriz de accesos: qué persona de tu equipo entra a cada lista, sistema o archivo (art. 46).",
  },
  {
    id: "permisos",
    label: "Revisión de permisos (semestral)",
    detail:
      "Cada seis meses se revisa quién sigue necesitando acceso y se deja constancia con fecha.",
  },
  {
    id: "inventario",
    label: "Inventario y datos sensibles",
    detail:
      "Inventario de bancos de datos con sus categorías y una marca aparte para los datos sensibles.",
  },
  {
    id: "bajas",
    label: "Baja cuando alguien se va",
    detail:
      "Procedimiento para retirar accesos y devolver equipos el mismo día del cese; la gestión de accesos va desde el alta hasta la baja del usuario (art. 46.1.a).",
  },
  {
    id: "registros",
    label: "Registro de accesos (2 años)",
    detail:
      "Los sistemas guardan quién entró, cuándo y qué hizo con los datos (ver, editar, borrar, importar, exportar), y se conservan mínimo 2 años (art. 46.3).",
  },
  {
    id: "capacitacion",
    label: "Capacitación del personal",
    detail:
      "Tu equipo recibió una charla sobre confidencialidad, claves e incidentes en 48 horas; queda constancia con fecha (art. 46.2).",
  },
  {
    id: "respaldos",
    label: "Respaldo semanal verificado",
    detail:
      "Copia de seguridad como mínimo semanal y prueba de recuperación completa al menos cada seis meses (art. 51).",
  },
];

export function isSecurityCheckId(value: string): value is SecurityCheckId {
  return SECURITY_CHECKS.some((item) => item.id === value);
}
