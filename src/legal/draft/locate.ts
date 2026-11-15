import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Dónde está, en el código, el texto que hay que corregir (motor legal, plan 7). Usa el árbol
 * sintáctico de TypeScript, nunca expresiones regulares sobre el código:
 * - una cláusula (`aviso.nota.regla-practica`): el objeto literal con ese `id` en src/legal/documents;
 * - un hecho (`cctv.conservacion`): su objeto en src/legal/facts.ts;
 * - un texto de módulo (`sector-legal:FAMILIES.condominio.cctvDays`): el literal de texto con la
 *   misma ruta que le da `walkTexts` en src/legal/index-texts.ts, siguiendo constantes, `...spread`
 *   y funciones del mismo archivo que devuelven un objeto literal (`profile(...)` → `{ ...BASE, ... }`).
 */

export type Span = { file: string; start: number; end: number; source: string; kind: "clause" | "fact" | "module-string" };

/** Módulo de `legalDataModuleTexts` → archivo. */
const MODULE_FILES: Record<string, string> = {
  guides: "src/lib/guides.ts",
  help: "src/lib/help-content.ts",
  fines: "src/lib/fines.ts",
  "incident-criteria": "src/lib/incident-criteria.ts",
  "security-checks": "src/lib/security-checks.ts",
  glossary: "src/lib/glossary.ts",
  "platform-legal": "src/lib/platform-legal.ts",
  tips: "src/lib/help-tips.ts",
  "bank-presets": "src/lib/bank-presets.ts",
  "ai-policy": "src/lib/ai-policy.ts",
  sectors: "src/lib/sectors.ts",
  "document-catalog": "src/lib/document-catalog.ts",
  "sector-legal": "src/lib/sector-legal.ts",
  ai: "src/lib/ai.ts",
};

/** Árboles ya leídos, por archivo; se invalida si cambia el contenido. */
const cache = new Map<string, { text: string; sf: ts.SourceFile }>();

const parse = (file: string, root: string) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, "utf8");
  const hit = cache.get(full);
  if (hit && hit.text === text) return hit;
  const parsed = { text, sf: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) };
  cache.set(full, parsed);
  return parsed;
};

const propName = (p: ts.PropertyName): string | null =>
  ts.isIdentifier(p) || ts.isStringLiteral(p) || ts.isNumericLiteral(p) ? p.text : null;

const toSpan = (file: string, text: string, sf: ts.SourceFile, node: ts.Node, kind: Span["kind"]): Span => {
  const start = node.getStart(sf);
  const end = node.getEnd();
  return { file, start, end, source: text.slice(start, end), kind };
};

/** El objeto literal cuyo `id` es `id`, en cualquier parte del archivo. */
function objectWithId(sf: ts.SourceFile, id: string): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isObjectLiteralExpression(node)) {
      const idProp = node.properties.find((p) => ts.isPropertyAssignment(p) && propName(p.name) === "id");
      if (idProp && ts.isPropertyAssignment(idProp) && ts.isStringLiteralLike(idProp.initializer) && idProp.initializer.text === id) {
        found = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

// --- textos de módulos -----------------------------------------------------------------

type Env = Map<string, ts.Expression>;
type Segment = { prop: string } | { label: string };

/** «FAMILIES.condominio.norms[0]» → raíz FAMILIES y segmentos. */
function parsePath(p: string): { root: string; segments: Segment[] } | null {
  const head = /^[A-Za-z_$][\w$]*/.exec(p);
  if (!head) return null;
  const segments: Segment[] = [];
  let rest = p.slice(head[0].length);
  while (rest) {
    const prop = /^\.([A-Za-z_$][\w$-]*)/.exec(rest);
    const label = /^\[([^\]]+)\]/.exec(rest);
    if (prop) {
      segments.push({ prop: prop[1] });
      rest = rest.slice(prop[0].length);
    } else if (label) {
      segments.push({ label: label[1] });
      rest = rest.slice(label[0].length);
    } else return null;
  }
  return { root: head[0], segments };
}

function topLevelConst(sf: ts.SourceFile, name: string): ts.Expression | null {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) return d.initializer;
  }
  return null;
}

function topLevelFunction(sf: ts.SourceFile, name: string): ts.FunctionDeclaration | null {
  for (const st of sf.statements) if (ts.isFunctionDeclaration(st) && st.name?.text === name) return st;
  return null;
}

/** Quita `as`, `satisfies`, paréntesis; sigue identificadores y llamadas a funciones del archivo. */
function resolve(sf: ts.SourceFile, node: ts.Expression, env: Env, depth = 0): { node: ts.Expression; env: Env } | null {
  if (depth > 20) return null;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node))
    return resolve(sf, node.expression, env, depth + 1);
  if (ts.isIdentifier(node)) {
    const bound = env.get(node.text);
    if (bound) return resolve(sf, bound, new Map(), depth + 1);
    const init = topLevelConst(sf, node.text);
    return init ? resolve(sf, init, new Map(), depth + 1) : null;
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const fn = topLevelFunction(sf, node.expression.text);
    const ret = fn?.body?.statements.find(ts.isReturnStatement)?.expression;
    if (!fn || !ret || fn.body!.statements.filter(ts.isReturnStatement).length !== 1) return null;
    const bindings: Env = new Map();
    fn.parameters.forEach((p, i) => {
      if (ts.isIdentifier(p.name) && node.arguments[i]) bindings.set(p.name.text, node.arguments[i]);
    });
    return resolve(sf, ret, bindings, depth + 1);
  }
  return { node, env };
}

/** Valor de la propiedad `name` de un objeto; la última definición gana, como en JavaScript. */
function property(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression, env: Env, name: string, depth = 0): { node: ts.Expression; env: Env } | null {
  if (depth > 20) return null;
  for (const p of [...obj.properties].reverse()) {
    if (ts.isPropertyAssignment(p) && propName(p.name) === name) return { node: p.initializer, env };
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === name) return { node: p.name, env };
    if (ts.isSpreadAssignment(p)) {
      const spread = resolve(sf, p.expression, env, depth + 1);
      if (spread && ts.isObjectLiteralExpression(spread.node)) {
        const hit = property(sf, spread.node, spread.env, name, depth + 1);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/** Elementos de una lista, con `...OTRA_LISTA` expandido. */
function elements(sf: ts.SourceFile, arr: ts.ArrayLiteralExpression, env: Env, depth = 0): Array<{ node: ts.Expression; env: Env }> {
  const out: Array<{ node: ts.Expression; env: Env }> = [];
  for (const el of arr.elements) {
    if (ts.isSpreadElement(el)) {
      const inner = resolve(sf, el.expression, env, depth + 1);
      if (inner && ts.isArrayLiteralExpression(inner.node) && depth < 20) out.push(...elements(sf, inner.node, inner.env, depth + 1));
      else return [];
    } else out.push({ node: el, env });
  }
  return out;
}

/** La etiqueta que `walkTexts` da a un elemento: su slug, id o key si lo tiene; si no, su posición. */
function labelOf(sf: ts.SourceFile, el: { node: ts.Expression; env: Env }, index: number): string {
  const r = resolve(sf, el.node, el.env);
  if (r && ts.isObjectLiteralExpression(r.node)) {
    for (const k of ["slug", "id", "key"]) {
      const v = property(sf, r.node, r.env, k);
      const lit = v && resolve(sf, v.node, v.env);
      if (lit && ts.isStringLiteralLike(lit.node) && lit.node.text) return lit.node.text;
    }
  }
  return String(index);
}

function locateModule(target: string, root: string): Span | null {
  const m = /^([\w-]+):(.+)$/.exec(target);
  const file = m && MODULE_FILES[m[1]];
  const parsedPath = m && parsePath(m[2]);
  if (!file || !parsedPath) return null;
  const parsed = parse(file, root);
  if (!parsed) return null;
  const { sf, text } = parsed;
  const init = topLevelConst(sf, parsedPath.root);
  if (!init) return null;
  let cur: { node: ts.Expression; env: Env } | null = { node: init, env: new Map() };
  for (const seg of parsedPath.segments) {
    const r: { node: ts.Expression; env: Env } | null = resolve(sf, cur!.node, cur!.env);
    if (!r) return null;
    if ("prop" in seg) {
      cur = ts.isObjectLiteralExpression(r.node) ? property(sf, r.node, r.env, seg.prop) : null;
    } else {
      if (!ts.isArrayLiteralExpression(r.node)) return null;
      const items = elements(sf, r.node, r.env);
      cur = items.find((el, i) => labelOf(sf, el, i) === seg.label) ?? null;
    }
    if (!cur) return null;
  }
  // El literal mismo (no lo que resuelve un identificador: ese texto vive en otra constante).
  let leaf: ts.Expression = cur.node;
  while (ts.isAsExpression(leaf) || ts.isSatisfiesExpression(leaf) || ts.isParenthesizedExpression(leaf)) leaf = leaf.expression;
  if (ts.isIdentifier(leaf)) {
    const r = resolve(sf, leaf, cur.env);
    if (!r) return null;
    leaf = r.node;
  }
  if (!(ts.isStringLiteral(leaf) || ts.isNoSubstitutionTemplateLiteral(leaf) || ts.isTemplateExpression(leaf))) return null;
  if (leaf.getSourceFile() !== sf) return null;
  return toSpan(file, text, sf, leaf, "module-string");
}

/** Localiza el texto de una cláusula, un hecho o un módulo. null si no es un texto localizable. */
export function locateTarget(target: string, root: string = process.cwd()): Span | null {
  if (target.includes(":")) return locateModule(target, root);
  if (target.includes("/")) return null;
  const docsDir = path.join(root, "src/legal/documents");
  for (const name of fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter((f) => f.endsWith(".ts")).sort() : []) {
    const file = `src/legal/documents/${name}`;
    const parsed = parse(file, root)!;
    const obj = objectWithId(parsed.sf, target);
    if (obj) return toSpan(file, parsed.text, parsed.sf, obj, "clause");
  }
  const facts = parse("src/legal/facts.ts", root);
  const fact = facts && objectWithId(facts.sf, target);
  return fact ? toSpan("src/legal/facts.ts", facts.text, facts.sf, fact, "fact") : null;
}

/** Texto del archivo con el tramo reemplazado. Falla si el archivo ya no tiene el tramo en su sitio. */
export function applySpan(span: Span, replacement: string, text?: string): string {
  const current = text ?? fs.readFileSync(path.join(process.cwd(), span.file), "utf8");
  if (current.slice(span.start, span.end) !== span.source) throw new Error(`el tramo de ${span.file} ya no coincide: vuelve a localizarlo`);
  return current.slice(0, span.start) + replacement + current.slice(span.end);
}
