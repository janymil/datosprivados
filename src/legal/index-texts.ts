import "server-only";

import fs from "node:fs";
import path from "node:path";
import { PERU_LEGAL_RAG } from "@/lib/ai";
import * as aiPolicy from "@/lib/ai-policy";
import * as bankPresets from "@/lib/bank-presets";
import * as fines from "@/lib/fines";
import * as glossary from "@/lib/glossary";
import * as guides from "@/lib/guides";
import * as help from "@/lib/help-content";
import * as tips from "@/lib/help-tips";
import * as incidentCriteria from "@/lib/incident-criteria";
import * as platformLegal from "@/lib/platform-legal";
import { FAMILIES, SALES_BANDS } from "@/lib/sector-legal";
import * as securityChecks from "@/lib/security-checks";
import { DOCUMENT_TABS } from "@/lib/document-catalog";
import { SECTORS } from "@/lib/sectors";
import { CLAUSE_DEFAULT_NORM, parseCitations } from "./citations";
import { FACTS } from "./facts";
import { allClauses } from "./registry";
import type { Citation } from "./types";

/**
 * Índice de todos los textos legales del producto y de los artículos que citan.
 * Responde «si cambia el art. N de tal norma, ¿qué cláusulas, hechos, textos de
 * ayuda y páginas hay que revisar?» (monitor de normas, diseño §8).
 *
 * - cláusulas y hechos: citas declaradas (verificadas por las pruebas);
 * - módulos y páginas: citas leídas del texto.
 */
export type IndexKind = "clause" | "fact" | "module" | "page";
export type IndexEntry = { kind: IndexKind; source: string; cites: Citation[] };

export type SourceText = { source: string; text: string };

/** Etiqueta estable de un elemento de lista: su slug, id o key si lo tiene; si no, su posición. */
function label(item: unknown, index: number): string {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    for (const k of ["slug", "id", "key"]) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  }
  return String(index);
}

/** Recorre un valor y guarda cada hoja de texto (y, si se pide, cada número o booleano) con su ruta. */
export function walkTexts(prefix: string, value: unknown, out: SourceText[], withScalars = false): void {
  if (typeof value === "string") out.push({ source: prefix, text: value });
  else if (withScalars && (typeof value === "number" || typeof value === "boolean")) out.push({ source: prefix, text: String(value) });
  else if (Array.isArray(value)) value.forEach((item, i) => walkTexts(`${prefix}[${label(item, i)}]`, item, out, withScalars));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) walkTexts(`${prefix}.${k}`, v, out, withScalars);
}

/**
 * Lista única de módulos con textos legales como datos (la usan el índice, la
 * instantánea y el lint). Agregar un módulo aquí lo cubre en los tres.
 */
export function legalDataModuleTexts(withScalars = false): SourceText[] {
  const out: SourceText[] = [];
  const modules: Record<string, Record<string, unknown>> = {
    guides,
    help,
    fines,
    "incident-criteria": incidentCriteria,
    "security-checks": securityChecks,
    glossary,
    "platform-legal": platformLegal,
    tips,
    "bank-presets": bankPresets,
    "ai-policy": aiPolicy,
    sectors: { SECTORS },
    "document-catalog": { DOCUMENT_TABS },
  };
  for (const [name, mod] of Object.entries(modules))
    for (const [key, value] of Object.entries(mod)) if (typeof value !== "function") walkTexts(`${name}:${key}`, value, out, withScalars);
  walkTexts("sector-legal:FAMILIES", FAMILIES, out, withScalars);
  walkTexts("sector-legal:SALES_BANDS", SALES_BANDS, out, withScalars);
  out.push({ source: "ai:PERU_LEGAL_RAG", text: PERU_LEGAL_RAG });
  return out;
}

/**
 * Código fuente de páginas, componentes, acciones y librerías (.ts y .tsx), sin
 * comentarios: cubre los textos que se arman dentro de funciones (correos, avisos,
 * respuestas sin IA). No incluye src/legal, que tiene sus propias pruebas.
 */
export function sourceFileTexts(root: string = process.cwd()): SourceText[] {
  const out: SourceText[] = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.tsx?$/.test(entry.name))
        out.push({
          source: path.relative(root, full).replace(/\\/g, "/"),
          text: fs.readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
        });
    }
  };
  for (const dir of ["src/app", "src/components", "src/lib"]) visit(path.join(root, dir));
  return out;
}

export function legalTextIndex(root: string = process.cwd()): IndexEntry[] {
  const parsed = (kind: IndexKind, items: Array<{ source: string; text: string }>): IndexEntry[] =>
    items
      .map(({ source, text }) => ({ kind, source, cites: parseCitations(text, CLAUSE_DEFAULT_NORM) }))
      .filter((entry) => entry.cites.length > 0);
  return [
    ...allClauses().map((clause) => ({ kind: "clause" as const, source: clause.id, cites: clause.cites })),
    ...Object.values(FACTS).map((f) => ({ kind: "fact" as const, source: f.id, cites: f.cites })),
    ...parsed("module", legalDataModuleTexts()),
    ...parsed("page", sourceFileTexts(root)),
  ];
}

let cachedIndex: IndexEntry[] | undefined;

/** Entradas que citan el artículo `art` de `norm` o cualquiera de sus incisos («26» alcanza «26.5»). */
export function affectedBy(norm: string, art: string, index: IndexEntry[] = (cachedIndex ??= legalTextIndex())): Array<{ kind: IndexKind; source: string }> {
  return index
    .filter((entry) => entry.cites.some((c) => c.norm === norm && (c.art === art || c.art.startsWith(`${art}.`))))
    .map(({ kind, source }) => ({ kind, source }));
}
