import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { getDb, newId, nowIso, type Company } from "./db";
import { enqueueEmail } from "./mail";
import { PLANS, isPlanId } from "./plans";
import { takeRateLimit } from "./rate-limit";

/**
 * Controles de uso de la IA: interruptor global, presupuesto mensual,
 * consentimiento de la empresa, cuota mensual por plan, límite por minuto y
 * registro de cada llamada (sin texto ni datos personales).
 */

export type AiContext = { companyId: string; feature: string; /** true = no llamar al modelo (la acción ya decidió usar el modo básico). */ blocked?: boolean };
const storage = new AsyncLocalStorage<AiContext>();

/** Ejecuta `fn` asociando las llamadas al modelo a una empresa y a una función del producto. */
export function withAiContext<T>(context: AiContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn);
}
export const currentAiContext = () => storage.getStore();

export type AiBlock = {
  code: "off" | "budget" | "consent" | "quota" | "rate";
  message: string;
};

export const PER_MINUTE_LIMIT = 6;

export function aiKillSwitch(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AI_DISABLED === "1";
}

/** Primer instante del mes en curso, hora de Lima (UTC-5, sin horario de verano). */
export function limaMonthStart(now = new Date()): string {
  const lima = new Date(now.getTime() - 5 * 3_600_000);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1, 5)).toISOString();
}

export function companyMonthlyUsage(companyId: string, now = new Date()): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE company_id = ? AND ok = 1 AND created_at >= ?")
    .get(companyId, limaMonthStart(now)) as { n: number };
  return row.n;
}

export function monthlyQuota(company: Pick<Company, "plan">): number {
  return isPlanId(company.plan) ? PLANS[company.plan].aiMonthlyQuota : PLANS.basico.aiMonthlyQuota;
}

/** Gasto estimado del mes (USD) con los tokens registrados y el precio por millón configurado. */
export function monthlySpendUsd(now = new Date()): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(input_tokens), 0) AS i, COALESCE(SUM(output_tokens), 0) AS o FROM ai_usage WHERE created_at >= ?")
    .get(limaMonthStart(now)) as { i: number; o: number };
  const priceIn = Number(process.env.AI_PRICE_IN_USD_PER_MTOK) || 3;
  const priceOut = Number(process.env.AI_PRICE_OUT_USD_PER_MTOK) || 15;
  return (row.i * priceIn + row.o * priceOut) / 1_000_000;
}

export function budgetExceeded(now = new Date()): boolean {
  const budget = Number(process.env.AI_MONTHLY_BUDGET_USD);
  if (!Number.isFinite(budget) || budget <= 0) return false;
  if (monthlySpendUsd(now) < budget) return false;
  const alertTo = process.env.ALERT_EMAIL?.trim();
  if (alertTo) {
    enqueueEmail({
      to: alertTo,
      template: "ops_alert",
      payload: {
        subject: "La IA se apagó: se alcanzó el presupuesto mensual",
        message: `El gasto estimado del mes llegó a ${monthlySpendUsd(now).toFixed(2)} USD (tope ${budget} USD). Las funciones de IA usan el modo básico hasta el mes siguiente o hasta subir AI_MONTHLY_BUDGET_USD.`,
      },
      dedupeKey: `ai-budget:${limaMonthStart(now)}`,
    });
  }
  return true;
}

/**
 * ¿Puede esta empresa usar la IA ahora? Solo comprueba; no consume el cupo por minuto
 * (usa `consumeAiRate` al llamar). Orden: interruptor, presupuesto, consentimiento, cuota.
 */
export function aiBlockReason(company: Pick<Company, "id" | "plan" | "ai_consent_at">, now = new Date()): AiBlock | null {
  if (aiKillSwitch()) {
    return { code: "off", message: "La IA está desactivada temporalmente. Usamos respuestas predefinidas." };
  }
  if (budgetExceeded(now)) {
    return { code: "budget", message: "La IA no está disponible por ahora. Usamos respuestas predefinidas." };
  }
  if (!company.ai_consent_at) {
    return {
      code: "consent",
      message: "Para usar la IA, actívala en Ajustes y acepta que tus consultas se envíen anonimizadas a nuestro proveedor.",
    };
  }
  const quota = monthlyQuota(company);
  if (companyMonthlyUsage(company.id, now) >= quota) {
    return {
      code: "quota",
      message: `Llegaste al límite de ${quota} consultas de IA de tu plan este mes. Se renueva el día 1; mientras tanto usamos respuestas predefinidas.`,
    };
  }
  return null;
}

/** Cupo por minuto de una empresa. false = demasiado rápido. */
export function consumeAiRate(companyId: string, now = Date.now()): boolean {
  return takeRateLimit(`ai:${companyId}`, PER_MINUTE_LIMIT, 60_000, now);
}

export const RATE_MESSAGE = "Estás haciendo consultas muy seguido. Espera un minuto e inténtalo de nuevo.";

/**
 * Puerta de entrada de cada acción de IA: aplica todos los controles y, si pasan,
 * consume un cupo por minuto. Devuelve el motivo del bloqueo o null si puede usarse.
 */
export function aiGate(company: Pick<Company, "id" | "plan" | "ai_consent_at">, now = new Date()): AiBlock | null {
  const block = aiBlockReason(company, now);
  if (block) return block;
  if (!consumeAiRate(company.id, now.getTime())) return { code: "rate", message: RATE_MESSAGE };
  return null;
}

export function recordAiUsage(entry: {
  companyId: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ok: boolean;
}) {
  getDb()
    .prepare(
      `INSERT INTO ai_usage (id, company_id, feature, model, input_tokens, output_tokens, latency_ms, ok, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(newId(), entry.companyId, entry.feature, entry.model, entry.inputTokens, entry.outputTokens, entry.latencyMs, entry.ok ? 1 : 0, nowIso());
}

/** Registra el consentimiento (o su retiro) con fecha; queda también en la actividad de la empresa. */
export function setAiConsent(companyId: string, accepted: boolean) {
  const db = getDb();
  db.prepare("UPDATE companies SET ai_consent_at = ? WHERE id = ?").run(accepted ? nowIso() : null, companyId);
  db.prepare("INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, 'ia', ?, ?)").run(
    newId(),
    companyId,
    accepted
      ? "Activaste la IA: aceptaste que tus consultas, anonimizadas, se envíen a nuestro proveedor de IA."
      : "Desactivaste la IA: tus consultas ya no se envían al proveedor.",
    nowIso()
  );
}
