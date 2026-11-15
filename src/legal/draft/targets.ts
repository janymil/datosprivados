import "server-only";

import { FACTS } from "../facts";
import { legalDataModuleTexts } from "../index-texts";
import { allClauses } from "../registry";

/**
 * ¿Es un texto legal del producto que el redactor puede corregir? Para el botón «Redactar
 * corrección» del operador: usa el registro, sin el compilador de TypeScript (que el servidor no
 * carga); el redactor lo localiza en el código después, en su propia copia.
 */
let known: Set<string> | undefined;

export function isKnownTarget(target: string): boolean {
  known ??= new Set([...allClauses().map((c) => c.id), ...Object.keys(FACTS), ...legalDataModuleTexts().map((m) => m.source)]);
  return known.has(target);
}
