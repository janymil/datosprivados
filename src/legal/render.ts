import type { DocumentSpec, LegalContext } from "./types";

/** Arma un documento: cláusulas que aplican, en orden, unidas con el separador del documento. */
export function renderDocument(spec: DocumentSpec, ctx: LegalContext): string {
  return spec.clauses
    .filter((clause) => !clause.when || clause.when(ctx))
    .map((clause) => {
      const text = clause.text(ctx);
      if (text === "") throw new Error(`clause ${clause.id} rendered empty text`);
      return text;
    })
    .join(spec.join);
}
