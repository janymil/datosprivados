import type { Company, DataBank, DocumentKind, Provider } from "@/lib/db";
import type { SectorLegalProfile } from "@/lib/sector-legal";

/**
 * Biblioteca de cláusulas del motor legal (diseño §4.3).
 *
 * Un documento es una lista ordenada de cláusulas. Cada cláusula dice cuándo
 * aplica, qué texto produce y en qué artículos se apoya. Las citas se completan
 * en el plan 2; en el plan 1 el texto es idéntico al de los generadores antiguos.
 */

/** Artículo en el que se apoya una cláusula. `norm` es el id de la biblioteca de normas. */
export type Citation = { norm: string; art: string; claim?: string };

/** Todo lo que una cláusula necesita para decidir si aplica y redactarse. */
export type LegalContext = {
  company: Company;
  banks: DataBank[];
  providers: Provider[];
  profile: SectorLegalProfile;
  /** Fecha del documento, `formatDate(ahora, "long")`. */
  date: string;
};

export type Clause = {
  /** `<tipo>.<sección>.<nombre>`, único en toda la biblioteca. */
  id: string;
  /** Sin `when`, la cláusula aplica siempre. */
  when?: (ctx: LegalContext) => boolean;
  /** Texto exacto de la cláusula. */
  text: (ctx: LegalContext) => string;
  /** Artículos en que se apoya. `[]` en el plan 1; se completan en el plan 2. */
  cites: Citation[];
  /** Por qué una cláusula no tiene base legal (por ejemplo, un título). */
  nonLegal?: string;
  /**
   * Norma de las menciones sin norma explícita («(art. 87)»). Por defecto, el
   * DS N.° 016-2024-JUS (`CLAUSE_DEFAULT_NORM`).
   */
  defaultNorm?: string;
};

export type DocumentSpec = {
  kind: DocumentKind;
  /** Separador entre cláusulas. */
  join: string;
  clauses: Clause[];
};
