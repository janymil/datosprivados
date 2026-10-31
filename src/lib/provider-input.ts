import { COUNTRIES, toolCategory } from "./provider-catalog";

export type ParsedTool = { category: string; name: string; country: string; custom: boolean };

/**
 * Lee la lista de herramientas que envía el formulario (JSON) y descarta todo lo
 * que no sea válido: categorías inexistentes, nombres vacíos o demasiado largos y
 * países fuera de la lista (se convierten en «No sé»).
 */
export function parseToolsInput(raw: string): ParsedTool[] {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const result: ParsedTool[] = [];
  for (const item of data.slice(0, 120)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const category = String(entry.category ?? "");
    const name = String(entry.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    if (!toolCategory(category) || !name) continue;
    const country = String(entry.country ?? "");
    result.push({
      category,
      name,
      country: (COUNTRIES as readonly string[]).includes(country) ? country : "No sé",
      custom: Boolean(entry.custom),
    });
  }
  return result;
}

/** Solo enlaces http(s); cualquier otra cosa se descarta para no publicar un enlace inseguro en los documentos. */
export function cleanUrl(value: string): string {
  const trimmed = value.trim().slice(0, 300);
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

export function salesBandOrEmpty(value: string): string {
  return ["micro", "pequena", "mediana", "grande"].includes(value) ? value : "";
}
