import "server-only";

/**
 * Conexión con el modelo de lenguaje. Se configura por variables de entorno:
 *
 * - ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL opcional) → Claude
 * - OPENAI_API_KEY (+ OPENAI_MODEL opcional) → OpenAI, por defecto gpt-6-luna
 *
 * Sin ninguna, las funciones de IA usan el modo básico (respuestas
 * predefinidas) y la interfaz lo indica.
 */

export type LlmMessage = { role: "user" | "assistant"; content: string };

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
const DEFAULT_OPENAI_MODEL = "gpt-6-luna";
const TIMEOUT_MS = 45_000;

type Provider = { kind: "anthropic" | "openai"; model: string; apiKey: string };

function provider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      kind: "anthropic",
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      apiKey: process.env.ANTHROPIC_API_KEY,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      kind: "openai",
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
    };
  }
  return null;
}

/** Identificador del modelo activo, o "modo-basico" si no hay IA configurada. */
export function activeModelId(): string {
  return provider()?.model ?? "modo-basico";
}

export function isLlmConfigured(): boolean {
  return provider() !== null;
}

/** Permite apuntar a un servidor simulado (pruebas E2E) sin tocar el código. */
function apiBase(envName: string, fallback: string) {
  return (process.env[envName] || fallback).replace(/\/$/, "");
}

/** Devuelve el texto generado, o null si no hay proveedor o la llamada falla. */
export async function callLlm({
  system,
  messages,
  maxTokens = 4000,
}: {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
}): Promise<string | null> {
  const p = provider();
  if (!p) return null;

  try {
    if (p.kind === "anthropic") {
      const response = await fetch(`${apiBase("ANTHROPIC_API_BASE", "https://api.anthropic.com")}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": p.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: p.model, max_tokens: maxTokens, system, messages }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error(`[llm] Anthropic respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
        return null;
      }
      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("")
        .trim();
      return text || null;
    }

    const response = await fetch(`${apiBase("OPENAI_API_BASE", "https://api.openai.com")}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        max_completion_tokens: maxTokens,
        reasoning_effort: "medium",
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[llm] OpenAI respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("[llm] Error al llamar al modelo:", error instanceof Error ? error.message : error);
    return null;
  }
}
