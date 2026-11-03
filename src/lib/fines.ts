/**
 * Escala de multas de la ANPD (art. 39 de la Ley 29733), en UIT. Es la misma escala
 * que ya usan el glosario, el asistente y la ayuda; aquí vive como datos para la
 * calculadora pública. Sin dependencias de servidor: la importa un componente cliente.
 */

/** UIT 2026, en soles. */
export const UIT_2026 = 5500;

export type FineTier = "leve" | "grave" | "muy_grave";

export const FINE_TIERS: Record<FineTier, { label: string; minUit: number; maxUit: number }> = {
  leve: { label: "Leve", minUit: 0.5, maxUit: 5 },
  grave: { label: "Grave", minUit: 5, maxUit: 50 },
  muy_grave: { label: "Muy grave", minUit: 50, maxUit: 100 },
};

/** Infracciones leves que el producto ya documenta (asistente y glosario). */
export const LEVE_EXAMPLES = [
  { id: "bancos", label: "No inscribí mis bancos de datos en el SIPDP" },
  { id: "arco", label: "Respondí fuera de plazo (o no respondí) una solicitud ARCO" },
  { id: "incidente", label: "No notifiqué a la ANPD un incidente que lo requería" },
] as const;

export type FineCounts = Record<FineTier, number>;

export const MAX_COUNT = 20;

/** Entero entre 0 y MAX_COUNT; todo lo demás cuenta como 0. */
export function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_COUNT, Math.max(0, Math.floor(value)));
}

/** UIT válida (> 0); si no, la de 2026. */
export function validUit(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : UIT_2026;
}

export type FineRange = {
  minUit: number;
  maxUit: number;
  minSoles: number;
  maxSoles: number;
  total: number;
  byTier: Array<{ tier: FineTier; count: number; minSoles: number; maxSoles: number }>;
};

/**
 * Rango teórico si cada infracción se sancionara dentro de su escala: mínimo con todas
 * al piso de su tramo, máximo con todas al tope. No predice el monto real: lo fija la
 * ANPD en cada procedimiento.
 */
export function fineRange(counts: FineCounts, uit: number = UIT_2026): FineRange {
  const value = validUit(uit);
  const byTier = (Object.keys(FINE_TIERS) as FineTier[]).map((tier) => {
    const count = clampCount(counts[tier]);
    return {
      tier,
      count,
      minSoles: count * FINE_TIERS[tier].minUit * value,
      maxSoles: count * FINE_TIERS[tier].maxUit * value,
    };
  });
  const minSoles = byTier.reduce((sum, row) => sum + row.minSoles, 0);
  const maxSoles = byTier.reduce((sum, row) => sum + row.maxSoles, 0);
  return {
    minUit: minSoles / value,
    maxUit: maxSoles / value,
    minSoles,
    maxSoles,
    total: byTier.reduce((sum, row) => sum + row.count, 0),
    byTier,
  };
}

export function formatSoles(value: number): string {
  return `S/ ${Math.round(value).toLocaleString("en-US")}`;
}

export function formatUit(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} UIT`;
}
