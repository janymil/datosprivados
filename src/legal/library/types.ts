/**
 * Biblioteca de normas (diseño §4.1): texto oficial de cada norma, por artículo,
 * con su procedencia. Los datos viven en `legal/library/<id>/`.
 */

export type NormStatus = "vigente" | "modificada" | "derogada" | "no-verificada";

export type NormType =
  | "ley"
  | "decreto-supremo"
  | "decreto-legislativo"
  | "directiva"
  | "resolucion"
  | "norma-tecnica"
  | "codigo"
  | "opinion-consultiva";

export type Norm = {
  /** Igual al nombre de su carpeta: "ds-016-2024-jus", "ley-29733". */
  id: string;
  title: string;
  type: NormType;
  /** "016-2024-JUS", "29733". */
  number: string;
  /** AAAA-MM-DD. */
  publishedAt: string | null;
  officialUrl: string | null;
  /** sha256 del archivo oficial descargado (el PDF no se versiona). */
  sourceSha256: string | null;
  retrievedAt: string | null;
  status: NormStatus;
  /** false: texto original; las modificaciones posteriores no están incorporadas. */
  consolidated: boolean;
  /** Ids de las normas que la modifican. */
  amendedBy: string[];
  /** Formas exactas en que nuestros textos la nombran: "DS N.° 016-2024-JUS", "Reglamento". */
  aliases: string[];
};

/** Un artículo: `num` es "34", "26" o "III" (Título Preliminar). */
export type Article = { num: string; title: string; text: string; sha256: string };

export type Library = {
  norms: Record<string, Norm>;
  articlesOf(normId: string): Article[];
  /** `ref` = "26.5", "III.6", "46.1.c": el primer segmento es el artículo; el resto, el inciso. */
  findArticle(normId: string, ref: string): { article: Article; item?: string } | null;
  normByAlias(alias: string): Norm | undefined;
};
