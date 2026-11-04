/**
 * Planes comerciales de DatosPrivados.
 *
 * Precios en soles, IGV incluido. El modelo es anual: el primer año incluye la
 * implementación (documentos, fichas y 12 meses de acceso) y cada renovación cuesta
 * menos. El cobro usa una suscripción de MercadoPago (preapproval) de 12 meses.
 *
 * `prices.monthly` es solo el precio histórico de las suscripciones mensuales que ya
 * existan: los pagos nuevos son siempre anuales.
 */

export type PlanId = "basico" | "pro";
export type BillingTerm = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  /** `monthly`: precio histórico (sin altas nuevas). `yearly`: primer año, con implementación. */
  prices: Record<BillingTerm, number>;
  /** Renovación anual, desde el segundo año. */
  renewal: number;
  tagline: string;
  audience: string;
  /** Consultas a la IA por mes calendario (hora de Lima). */
  aiMonthlyQuota: number;
};

export const PLANS: Record<PlanId, Plan> = {
  basico: {
    id: "basico",
    name: "Básico",
    prices: { monthly: 19, yearly: 290 },
    renewal: 120,
    tagline: "Para ordenar el expediente",
    audience: "Empresa con una sede que necesita inscribir sus bancos, tener sus documentos y controlar plazos.",
    aiMonthlyQuota: 60,
  },
  pro: {
    id: "pro",
    name: "Pro",
    prices: { monthly: 39, yearly: 390 },
    renewal: 190,
    tagline: "Para empresas con más volumen",
    audience: "Varias sedes, áreas o canales, datos sensibles o muchas solicitudes, con automatización por IA.",
    aiMonthlyQuota: 400,
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: string): value is PlanId {
  return value === "basico" || value === "pro";
}

export function isBillingTerm(value: string): value is BillingTerm {
  return value === "monthly" || value === "yearly";
}

export function planPrice(plan: PlanId, term: BillingTerm = "monthly") {
  return PLANS[plan].prices[term];
}

export function planName(plan: PlanId) {
  return PLANS[plan].name;
}

export function termLabel(term: BillingTerm) {
  return term === "yearly" ? "Anual" : "Mensual";
}

export function termShortLabel(term: BillingTerm) {
  return term === "yearly" ? "año" : "mes";
}

/** Meses de calendario que cubre un cobro (MercadoPago renueva por meses, no por días). */
export function termMonths(term: BillingTerm) {
  return term === "yearly" ? 12 : 1;
}

/** Precio del primer año: incluye la implementación. */
export function firstYearPrice(plan: PlanId) {
  return PLANS[plan].prices.yearly;
}

/** Precio de cada renovación anual. */
export function renewalPrice(plan: PlanId) {
  return PLANS[plan].renewal;
}
