import type { Company } from "./db";

/** La cuenta de demostración (Casa Verde) es de solo lectura y no entrega documentos completos. */
export function isDemoCompany(company: Pick<Company, "billing_status">): boolean {
  return company.billing_status === "demo";
}

export const DEMO_READONLY_MESSAGE =
  "La demo es de solo lectura. Crea tu cuenta y activa tu plan para generar, publicar y descargar tus documentos.";

/** Cuánto texto de un documento se muestra en la demo. */
const PREVIEW_CHARS = 900;

/**
 * Vista previa de un documento para la demo. El recorte ocurre en el servidor:
 * el resto del texto nunca llega al navegador, así que no se puede copiar,
 * imprimir ni leer desde el código de la página. Conserva el inicio, los
 * títulos de las secciones y el tamaño del documento completo.
 */
export function demoPreview(content: string): string {
  const lines = content.split("\n");
  const titles = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim());
  const words = content.split(/\s+/).filter(Boolean).length;

  const kept: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (kept.length > 0 && size + line.length > PREVIEW_CHARS) break;
    kept.push(line);
    size += line.length + 1;
  }

  const out = [...kept, "", "---", `> Vista previa de la demo. El documento completo (${words} palabras) se genera con los datos de tu empresa al activar tu plan.`];
  if (titles.length) {
    out.push("", "### Secciones del documento completo", ...titles.map((title) => `- ${title}`));
  }
  return out.join("\n");
}
