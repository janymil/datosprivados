/**
 * Vigencia del contenido de la ayuda.
 *
 * La ayuda explica obligaciones legales: si envejece sin que nadie lo note, el
 * cliente cumple con una norma que cambió. Cada artículo lleva la fecha de su
 * última revisión editorial; pasados 12 meses, la página lo advierte.
 *
 * Reglas:
 * - Al **cambiar** el contenido de un artículo, se actualiza su fecha aquí (y solo esa).
 * - Al añadir un artículo nuevo, hay que darle fecha: `test/help.test.ts` falla si falta.
 * - La revisión **legal** (P0-LEGAL) es otra cosa: mientras `HELP_LEGAL_REVIEW.at`
 *   sea null, cada artículo lo dice al pie.
 */

/** Fecha de la última revisión editorial de cada artículo (ISO, AAAA-MM-DD). */
export const HELP_REVIEWED: Record<string, string> = {
  "que-es-datosprivados": "2026-11-02",
  "la-ley-en-simple": "2026-11-02",
  "ruta-completa": "2026-11-02",
  "registro-y-activacion": "2026-11-02",
  "configuracion-inicial": "2026-11-02",
  panel: "2026-11-02",
  empresa: "2026-11-02",
  bancos: "2026-11-02",
  "inscripcion-sipdp": "2026-11-02",
  herramientas: "2026-11-02",
  documentos: "2026-11-02",
  "catalogo-documentos": "2026-11-02",
  arco: "2026-11-02",
  incidentes: "2026-11-02",
  evidencias: "2026-11-02",
  "casos-especiales": "2026-11-02",
  mantenimiento: "2026-11-02",
  "asistente-ia": "2026-11-02",
  "plan-y-pagos": "2026-11-02",
  "cuenta-seguridad": "2026-11-02",
};

/** Pasado este plazo, el artículo se marca para revisión. */
export const REVIEW_MAX_AGE_DAYS = 365;

/** Revisión legal del contenido (P0-LEGAL). `null` hasta que el abogado firme. */
export const HELP_LEGAL_REVIEW: { at: string | null; by: string } = {
  at: null,
  by: "abogado en protección de datos",
};

export type ReviewState = { reviewed: string; days: number; stale: boolean };

/** Estado de vigencia de un artículo; `null` si no tiene fecha registrada. */
export function reviewState(slug: string, now = new Date()): ReviewState | null {
  const reviewed = HELP_REVIEWED[slug];
  if (!reviewed) return null;
  const days = Math.floor((now.getTime() - new Date(`${reviewed}T12:00:00Z`).getTime()) / 86_400_000);
  return { reviewed, days, stale: days > REVIEW_MAX_AGE_DAYS };
}

/** Artículos que ya pasaron su plazo de revisión (para el reporte semanal). */
export function staleArticles(now = new Date()): string[] {
  return Object.keys(HELP_REVIEWED).filter((slug) => reviewState(slug, now)?.stale);
}
