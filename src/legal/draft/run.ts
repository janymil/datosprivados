import fs from "node:fs";
import path from "node:path";
import type { AiVerdict, AuditFinding } from "../audit/types";
import { findingId } from "../audit/types";
import type { VerdictCache } from "../audit/verdict-cache";
import { FACTS } from "../facts";
import { legalTextIndex } from "../index-texts";
import { loadLibrary, type Library } from "../library";
import type { callLlm } from "@/lib/llm";
import { composeDraft } from "./compose";
import { citationsOf } from "./gates";
import { ingestProposed, markAmended, proposeSource, writeNorm } from "./ingest-norm";
import { applySpan, locateTarget, type Span } from "./locate";

/**
 * Una solicitud de la cola → un cambio legal registrado (motor legal, plan 7, tarea 7). Corre
 * dentro de la copia del repositorio del script `datosprivados-draft`, en una rama
 * `legal/auto-…` sacada de master. Todo lo que toca afuera (git, pruebas, red, registro) llega
 * por `deps`, así se prueba sin red ni repositorio.
 */

export type DraftRequestLike = {
  id: string;
  origin: "auditoria" | "norma" | "operador";
  ref: string;
  targets: string[];
  context: unknown;
  /** Intento actual (la rama lleva el número: un reintento nunca choca con la anterior). */
  attempts?: number;
  /** Textos que ya están en un cambio abierto (lo manda GET /api/legal/drafts/next). */
  busy?: string[];
};
/** «esperar»: IA, red o GitHub caídos; vuelve a la cola sin gastar un intento. */
export type RunResult =
  | { status: "propuesto"; changeId: string }
  | { status: "sin_solucion" | "reintentar" | "resuelto" | "esperar"; reasons: string[] };

export type RunDeps = {
  root: string;
  ai: { call: typeof callLlm; cache: VerdictCache; model: string };
  /** Cómo ven los clientes el texto con `replacement` (variantes sobre las fixtures). */
  render: (span: Span, replacement: string) => Promise<string[]>;
  /** Citas que produce el texto de una cláusula en todas las combinaciones. */
  textCites?: (span: Span, replacement: string) => Promise<Array<{ norm: string; art: string }>>;
  git: (args: string[]) => { code: number; out: string };
  /** Instantáneas, huellas y fallas conocidas regeneradas. */
  regenerate: () => { ok: boolean; out: string };
  /** typecheck + lint + toda la suite. */
  checks: () => { ok: boolean; out: string };
  /** Reglas de la rama legal (las de legal-change.yml) sobre lo regenerado; vacío = cumple. */
  validate: () => string[];
  propose: (p: ProposeInput) => { ok: true; changeId: string } | { ok: false; rejected: boolean; out: string };
  download: (url: string) => Promise<{ text: string; sha256: string } | null>;
  enqueue: (r: { origin: DraftRequestLike["origin"]; ref: string; targets: string[]; context: unknown }) => Promise<void>;
  today: string;
};
export type ProposeInput = {
  title: string;
  summary: string;
  kind: "auditoria" | "norma";
  sourceUrl: string | null;
  affected: Array<{ kind: string; source: string }>;
};

/** Textos por cambio: más de esto se divide en otra solicitud (Decisión 4). */
export const MAX_TARGETS = 10;
const FRESHNESS = "src/lib/document-freshness.ts";
const BASELINE = "test/legal/baseline-hashes.json";

const ANSI = /\u001b\[[0-9;]*m/g;
const tail = (s: string, n = 20) => s.replace(ANSI, "").trim().split("\n").slice(-n).join("\n");

/** Motivo legible de un fallo de pruebas: sin colores, primero qué prueba falló y por qué. */
export function failureSummary(out: string): string {
  const lines = out.replace(ANSI, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const key = lines.filter((l) => /^(FAIL |AssertionError|TypeError|Error:|.*error TS\d+)/.test(l));
  return (key.length ? key.slice(0, 12) : lines.slice(-20)).join("\n");
}

/** Grupo de un texto: el tipo de documento de una cláusula, «hechos» o el módulo. */
export function targetGroup(target: string): string {
  if (target.includes(":")) return target.split(":")[0];
  if (target in FACTS) return "hechos";
  return target.split(".")[0];
}

/** Tipos de documento cuyo texto cambió entre dos huellas («fixture|tipo» → sha). */
export function changedKinds(before: Record<string, string>, after: Record<string, string>): string[] {
  const kinds = new Set<string>();
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) kinds.add(key.split("|").pop()!);
  }
  return [...kinds].sort();
}

/** Sube en 1 la versión de cada tipo en TEMPLATE_VERSIONS. */
export function bumpTemplateVersions(text: string, kinds: string[]): string {
  let out = text;
  for (const kind of kinds) {
    const re = new RegExp(`^(\\s+${kind}: )(\\d+),$`, "m");
    if (!re.test(out)) throw new Error(`TEMPLATE_VERSIONS no tiene «${kind}»`);
    out = out.replace(re, (_, head: string, n: string) => `${head}${Number(n) + 1},`);
  }
  return out;
}

/**
 * ¿Sigue fallando el hallazgo? Un cambio aprobado mientras la solicitud esperaba puede haberlo
 * corregido; entonces no se redacta nada. Ante una regla desconocida, se asume que sí.
 */
export function stillFailing(findings: AuditFinding[], target: string, span: Span, variants: string[], lib: Library): boolean {
  if (!findings.length) return true;
  const cites = new Set(citationsOf(span, span.source, lib).map((c) => `${c.norm}:${c.art}`));
  return findings.some((f) => {
    switch (f.rule) {
      case "meaning":
        return variants.some((text) => findingId("significado", target, text) === f.id);
      case "cite-misnumbered":
      case "cite-item-missing": {
        const from = f.detail.split("→")[0].trim();
        return cites.has(from) || variants.some((v) => v.includes(from.split(":")[1] ?? "\u0000"));
      }
      case "fact-unverified":
        return FACTS[target]?.quote === null;
      default:
        return true;
    }
  });
}

type Done = { target: string; before: string; after: string; rationale: string; verdicts: AiVerdict[] };

function summaryOf(p: { origin: string; context: Record<string, unknown>; done: Done[]; skipped: string[]; norm?: string }): string {
  const lines: string[] = ["**Redactado por IA.** Revísalo antes de aprobar: compara el texto anterior con el nuevo y el artículo citado.", ""];
  if (p.origin === "norma") {
    lines.push(`**Norma nueva:** ${String(p.context.title ?? "")} (${String(p.context.issuer ?? "")}, ${String(p.context.published_on ?? "")}).`);
    lines.push(`Texto oficial: ${String(p.context.url ?? "")}`);
    if (p.norm) lines.push(`Se agrega a la biblioteca como \`${p.norm}\`.`);
    if (p.context.reason) lines.push(`Por qué importa: ${String(p.context.reason)}`);
    lines.push("");
  } else {
    const findings = (p.context.findings as AuditFinding[] | undefined) ?? [];
    lines.push(`**Hallazgos de la auditoría:** ${findings.map((f) => `\`${f.id}\` (${f.rule})`).join(", ") || "pedido por el operador"}.`, "");
  }
  for (const d of p.done) {
    lines.push(`### ${d.target}`, "", `**Antes:** ${d.before.slice(0, 1200)}`, "", `**Ahora:** ${d.after.slice(0, 1200)}`, "", `**Por qué:** ${d.rationale}`);
    for (const v of d.verdicts) lines.push(`- Revisión ${v.pass === "a" ? "1" : "2"} (${v.verdict}): ${v.reason}`);
    lines.push("");
  }
  if (p.skipped.length) lines.push("**No se pudo redactar:**", ...p.skipped.map((s) => `- ${s}`), "");
  lines.push("**Para el abogado:** cambia lo que se dice a los clientes; envíalo a la lista del abogado si hay duda sobre la lectura del artículo.");
  return lines.join("\n");
}

const kindOfSpan = (span: Span) => (span.kind === "module-string" ? "module" : span.kind);

export async function runDraft(request: DraftRequestLike, deps: RunDeps): Promise<RunResult> {
  const branch = branchName(request);
  try {
    return await draft(request, deps);
  } catch (error) {
    // Un error inesperado no deja la rama ni archivos a medio escribir en la copia.
    deps.git(["checkout", "-q", "-f", "origin/master"]);
    deps.git(["branch", "-q", "-D", branch]);
    throw error;
  }
}

const branchName = (request: DraftRequestLike) =>
  `legal/auto-${request.id.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12)}-${request.attempts ?? 1}`;

async function draft(request: DraftRequestLike, deps: RunDeps): Promise<RunResult> {
  const branch = branchName(request);
  const context = (request.context ?? {}) as Record<string, unknown>;
  const freshLib = () => loadLibrary(path.join(deps.root, "legal/library"));
  const cleanup = () => {
    deps.git(["checkout", "-q", "-f", "origin/master"]);
    deps.git(["branch", "-q", "-D", branch]);
  };
  const fail = (status: "sin_solucion" | "reintentar" | "resuelto" | "esperar", reasons: string[]): RunResult => {
    cleanup();
    return { status, reasons };
  };

  const co = deps.git(["checkout", "-q", "-B", branch, "origin/master"]);
  if (co.code !== 0) return { status: "esperar", reasons: [`git: ${tail(co.out, 5)}`] };

  // 1. Norma nueva: cargarla en la biblioteca (paso 3) y buscar los textos que citan lo que modifica.
  let targets = request.targets;
  let normId: string | undefined;
  // Una solicitud hija (con textos) no vuelve a cargar la norma: redacta solo sus textos (revisión C2).
  if (request.origin === "norma" && !request.targets.length) {
    const pdfUrl = String(context.pdf_url ?? "");
    if (!pdfUrl) return fail("sin_solucion", ["la norma no tiene PDF oficial en El Peruano"]);
    const pdf = await deps.download(pdfUrl);
    if (!pdf) return fail("esperar", [`no se pudo descargar ${pdfUrl}`]);
    const item = { title: String(context.title ?? ""), issuer: String(context.issuer ?? ""), published_on: (context.published_on as string) ?? null, url: String(context.url ?? ""), pdf_url: pdfUrl };
    const proposed = await proposeSource(pdf.text, item, deps.ai);
    if ("reasons" in proposed) return fail(proposed.retry ? "esperar" : "sin_solucion", proposed.reasons);
    const lib = freshLib();
    if (lib.norms[proposed.entry.id]) return fail("sin_solucion", [`la norma ${proposed.entry.id} ya está en la biblioteca`]);
    const ingested = ingestProposed(proposed.entry, pdf.text);
    if ("reasons" in ingested) return fail("sin_solucion", ingested.reasons);
    writeNorm(deps.root, proposed.entry, ingested.articles, { url: pdfUrl, sha256: pdf.sha256, retrievedAt: deps.today });
    normId = proposed.entry.id;
    const norms = Array.isArray(context.norms) ? context.norms.map(String) : [];
    const articles = Array.isArray(context.articles) ? context.articles.map(String) : [];
    if (context.relevance === "amends") for (const n of norms) if (lib.norms[n]) markAmended(deps.root, n, normId);
    const index = legalTextIndex(deps.root);
    const found = new Set<string>();
    for (const n of norms)
      for (const entry of index)
        if (entry.kind !== "page" && entry.cites.some((c) => c.norm === n && (!articles.length || articles.some((a) => c.art === a || c.art.startsWith(`${a}.`)))))
          found.add(entry.source);
    targets = [...found];
  }

  // 2. Lo que ya está en un cambio abierto espera en otra solicitud (revisión I4).
  const busy = new Set(request.busy ?? []);
  const waiting = targets.filter((t) => busy.has(t));
  targets = targets.filter((t) => !busy.has(t));
  const childContext = request.origin === "norma" && normId ? { ...context, waitFor: normId } : context;
  if (waiting.length) await deps.enqueue({ origin: request.origin, ref: `${request.ref}#ocupado`, targets: waiting, context: childContext });
  if (!targets.length && !normId) return fail("resuelto", [`ya están en un cambio abierto; volverán a la cola cuando se cierre: ${waiting.join(", ")}`]);

  // 3. Un grupo por cambio, como máximo MAX_TARGETS textos; el resto vuelve a la cola.
  const groups = new Map<string, string[]>();
  for (const t of targets) groups.set(targetGroup(t), [...(groups.get(targetGroup(t)) ?? []), t]);
  const [first, ...others] = [...groups.entries()];
  const mine = first ? first[1].slice(0, MAX_TARGETS) : [];
  const rest = [...(first ? first[1].slice(MAX_TARGETS) : []), ...others.flatMap(([, ts]) => ts)];
  if (rest.length) {
    for (const [i, chunk] of chunks(rest, MAX_TARGETS).entries())
      await deps.enqueue({ origin: request.origin, ref: `${request.ref}#${i + 2}`, targets: chunk, context: childContext });
  }

  // 3. Redactar cada texto (paso 5).
  const done: Done[] = [];
  const skipped: string[] = [];
  const findings = ((context.findings as AuditFinding[] | undefined) ?? []).filter(Boolean);
  let resolved = 0;
  for (const target of mine) {
    const span = locateTarget(target, deps.root);
    if (!span) {
      skipped.push(`${target}: no es un texto que se pueda corregir en un solo lugar del código`);
      continue;
    }
    const lib = freshLib();
    const before = await deps.render(span, span.source);
    if (request.origin === "auditoria" && !stillFailing(findings.filter((f) => f.source === target), target, span, before, lib)) {
      resolved += 1;
      continue;
    }
    const result = await composeDraft({ span, renderedVariants: before, context }, { ...deps.ai, render: deps.render, textCites: deps.textCites, lib });
    if (!result.ok) {
      if (result.retry) return fail("esperar", result.reasons);
      skipped.push(`${target}: ${result.reasons.join("; ")}`);
      continue;
    }
    // Cómo se ve, antes de escribirlo: el render necesita el texto original en su sitio.
    const after = await deps.render(span, result.replacement);
    const file = path.join(deps.root, span.file);
    fs.writeFileSync(file, applySpan(span, result.replacement, fs.readFileSync(file, "utf8")));
    done.push({ target, before: before[0] ?? span.source, after: after[0] ?? result.replacement, rationale: result.rationale, verdicts: result.verdicts });
  }

  if (!done.length && !normId) {
    if (resolved && !skipped.length) return fail("resuelto", ["el hallazgo ya no se produce: otro cambio lo corrigió"]);
    return fail("sin_solucion", skipped.length ? skipped : ["no hubo nada que redactar"]);
  }

  // 4. Instantáneas, versiones de plantilla y comprobaciones completas.
  const baselineBefore = readJson(path.join(deps.root, BASELINE));
  const regen = deps.regenerate();
  if (!regen.ok) return fail("sin_solucion", [`el borrador no pasa las pruebas legales:\n${failureSummary(regen.out)}`]);
  const kinds = changedKinds(baselineBefore, readJson(path.join(deps.root, BASELINE)));
  if (kinds.length) {
    const freshness = path.join(deps.root, FRESHNESS);
    fs.writeFileSync(freshness, bumpTemplateVersions(fs.readFileSync(freshness, "utf8"), kinds));
    const again = deps.regenerate();
    if (!again.ok) return fail("sin_solucion", [`el borrador no pasa las pruebas legales:\n${failureSummary(again.out)}`]);
  }
  const rules = deps.validate();
  if (rules.length) return fail("sin_solucion", [`el borrador no cumple las reglas de un cambio legal: ${rules.join("; ")}`]);
  const checks = deps.checks();
  if (!checks.ok) return fail("sin_solucion", [`las comprobaciones fallaron con el borrador:\n${failureSummary(checks.out)}`]);

  // 5. Commit y registro para la aprobación del fundador.
  const title =
    request.origin === "norma"
      ? `Norma nueva ${normId}: ${done.length ? `${done.length} texto(s) actualizados` : "agregada a la biblioteca"} (IA)`
      : `Corrección de ${done.map((d) => d.target).join(", ")} (IA)`;
  deps.git(["add", "-A", ...["legal", "src", "test/legal", "scripts/legal/sources.json"].filter((p) => fs.existsSync(path.join(deps.root, p)))]);
  const commit = deps.git(["commit", "-q", "-m", `legal(auto): ${title}\n\nSolicitud de redacción ${request.id}.`]);
  if (commit.code !== 0) return fail("sin_solucion", [`git commit: ${tail(commit.out, 5)}`]);
  const summary = summaryOf({ origin: request.origin, context, done, skipped, norm: normId });
  const affected = [
    ...done.map((d) => ({ kind: kindOfSpan(locateTarget(d.target, deps.root) ?? ({ kind: "clause" } as Span)), source: d.target })),
    ...(normId ? [{ kind: "norm", source: normId }] : []),
  ];
  const proposed = deps.propose({ title, summary, kind: request.origin === "norma" ? "norma" : "auditoria", sourceUrl: request.origin === "norma" ? String(context.url ?? "") || null : null, affected });
  if (!proposed.ok) return fail(proposed.rejected ? "reintentar" : "sin_solucion", [`registro: ${tail(proposed.out, 8)}`]);
  return { status: "propuesto", changeId: proposed.changeId };
}

function readJson(file: string): Record<string, string> {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>) : {};
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
