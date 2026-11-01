import "server-only";

/**
 * Registro estructurado: una línea JSON por evento, para enviarla fuera de la caja
 * (journald/pm2 → agente de logs). Solo acepta campos escalares y descarta los que
 * suenan a dato personal o secreto; nunca registres cuerpos de petición.
 */
type Fields = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE = /pass|token|secret|authorization|cookie|email|correo|dni|phone|telefono|name|nombre|address|direccion|body/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

/** Quita correos de un texto libre (mensajes de error que citan a un usuario). */
export function scrubText(text: string, max = 500): string {
  return text.replace(EMAIL, "[correo]").slice(0, max);
}

export function logEvent(level: "info" | "warn" | "error", event: string, fields: Fields = {}): string {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || SENSITIVE.test(key)) continue;
    safe[key] = typeof value === "string" ? scrubText(value) : value;
  }
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...safe });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
  return line;
}
