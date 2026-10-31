/**
 * Criterios del art. 34.1 del Reglamento (DS N.° 016-2024-JUS).
 *
 * Si el incidente cumple al menos uno de estos supuestos, la notificación a la
 * ANPD es obligatoria dentro de las 48 horas. Si no cumple ninguno, igual hay
 * que documentarlo (art. 35).
 */

export type IncidentCriterionId =
  | "muchas_personas"
  | "datos_sensibles"
  | "gran_volumen"
  | "dano_evidente";

export type IncidentCriterion = {
  id: IncidentCriterionId;
  label: string;
  hint: string;
};

export const INCIDENT_CRITERIA: IncidentCriterion[] = [
  {
    id: "muchas_personas",
    label: "Afecta a muchas personas",
    hint: "La exposición alcanza a un número significativo de titulares.",
  },
  {
    id: "datos_sensibles",
    label: "Datos sensibles",
    hint: "Salud física o mental, datos genéticos o biométricos, afiliación sindical, vida afectiva o familiar, hábitos de la esfera íntima (art. 2.6).",
  },
  {
    id: "gran_volumen",
    label: "Gran volumen de datos",
    hint: "Se expusieron muchas categorías o registros, no solo un dato de contacto.",
  },
  {
    id: "dano_evidente",
    label: "Daño evidente",
    hint: "Riesgo claro de fraude, suplantación, discriminación o afectación económica.",
  },
];

const IDS = INCIDENT_CRITERIA.map((criterion) => criterion.id);

/** Convierte la columna `criteria` («gran_volumen,datos_sensibles») en ids. */
export function parseCriteria(value: string | null | undefined): IncidentCriterionId[] {
  if (!value) return [];
  const parts = value.split(",").map((part) => part.trim());
  return parts.filter((part): part is IncidentCriterionId => IDS.includes(part as IncidentCriterionId));
}

/** Normaliza lo que llega del formulario (checkbox múltiple o texto suelto). */
export function normalizeCriteria(values: readonly string[]): IncidentCriterionId[] {
  const unique = new Set<IncidentCriterionId>();
  for (const value of values) {
    for (const id of parseCriteria(String(value))) unique.add(id);
  }
  return INCIDENT_CRITERIA.filter((criterion) => unique.has(criterion.id)).map(
    (criterion) => criterion.id
  );
}

export function serializeCriteria(values: readonly string[]): string {
  return normalizeCriteria(values).join(",");
}

export function criteriaLabels(value: string | null | undefined): string[] {
  const ids = parseCriteria(value);
  return ids.map((id) => INCIDENT_CRITERIA.find((criterion) => criterion.id === id)?.label ?? id);
}

/** ¿Hay que avisar a la ANPD en 48 horas? */
export function requiresAnpdNotification(value: string | null | undefined): boolean {
  return parseCriteria(value).length > 0;
}
