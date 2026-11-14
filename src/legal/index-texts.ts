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

function walk(prefix: string, value: unknown, out: Array<{ source: string; text: string }>): void {
  if (typeof value === "string") out.push({ source: prefix, text: value });
  else if (Array.isArray(value)) value.forEach((item, i) => walk(`${prefix}[${i}]`, item, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(`${prefix}.${k}`, v, out);
}

function moduleTexts(): Array<{ source: string; text: string }> {
  const out: Array<{ source: string; text: string }> = [];
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
  };
  for (const [name, mod] of Object.entries(modules))
    for (const [key, value] of Object.entries(mod)) if (typeof value !== "function") walk(`${name}:${key}`, value, out);
  walk("sector-legal:FAMILIES", FAMILIES, out);
  walk("sector-legal:SALES_BANDS", SALES_BANDS, out);
  out.push({ source: "ai:PERU_LEGAL_RAG", text: PERU_LEGAL_RAG });
  return out;
}

function pageTexts(root: string): Array<{ source: string; text: string }> {
  const out: Array<{ source: string; text: string }> = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".tsx"))
        out.push({
          source: path.relative(root, full).replace(/\\/g, "/"),
          text: fs.readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
        });
    }
  };
  for (const dir of ["src/app", "src/components"]) visit(path.join(root, dir));
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
    ...parsed("module", moduleTexts()),
    ...parsed("page", pageTexts(root)),
  ];
}

/** Entradas que citan el artículo `art` de `norm` o cualquiera de sus incisos («26» alcanza «26.5»). */
export function affectedBy(norm: string, art: string, index: IndexEntry[] = legalTextIndex()): Array<{ kind: IndexKind; source: string }> {
  return index
    .filter((entry) => entry.cites.some((c) => c.norm === norm && (c.art === art || c.art.startsWith(`${art}.`))))
    .map(({ kind, source }) => ({ kind, source }));
}
