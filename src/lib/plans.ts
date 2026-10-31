/**
 * Planes comerciales de DatosPrivados.
 *
 * Precios en soles. El cobro es una suscripción recurrente de MercadoPago
 * (preapproval): mensual (1 mes) o anual (12 meses, con 2 meses de ahorro).
 */

export type PlanId = "basico" | "pro";
export type BillingTerm = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  prices: Record<BillingTerm, number>;
  tagline: string;
  audience: string;
};

export const PLANS: Record<PlanId, Plan> = {
  basico: {
    id: "basico",
    name: "Básico",
    prices: { monthly: 19, yearly: 190 },
    tagline: "Para ordenar lo esencial",
    audience: "Bodega, consultorio, tienda o estudio que recién empieza.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    prices: { monthly: 39, yearly: 390 },
    tagline: "Para consultorios y equipos",
    audience: "Varios profesionales, sedes o canales que quieren automatizar con IA.",
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

export function termMonths(term: BillingTerm) {
  return term === "yearly" ? 12 : 1;
}

export function termDays(term: BillingTerm) {
  return term === "yearly" ? 365 : 30;
}

/** Ahorro del plan anual frente a 12 pagos mensuales. */
export function yearlySaving(plan: PlanId) {
  return PLANS[plan].prices.monthly * 12 - PLANS[plan].prices.yearly;
}
