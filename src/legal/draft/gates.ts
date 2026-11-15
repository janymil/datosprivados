import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { CLAUSE_DEFAULT_NORM, parseCitations } from "../citations";
import { squash, valueStatedInQuote } from "../fact-check";
import { legalLibrary, type Library } from "../library";
import type { Span } from "./locate";

/**
 * Compuertas de un borrador (motor legal, plan 7, Decisión 2): la IA solo puede cambiar texto
 * legal y citas. Todo lo demás —el `id`, el `when`, las expresiones `${…}`, cualquier código—
 * tiene que quedar igual. Devuelve los problemas en frases para el fundador; vacío = pasa.
 */

const CLAUSE_PROPS = new Set(["id", "when", "text", "cites", "nonLegal", "defaultNorm"]);
const FACT_PROPS = new Set(["id", "value", "unit", "cites", "quote", "note", "validFrom"]);
const FACT_UNITS = new Set(["días hábiles", "días", "días calendario", "horas", "años", "meses", "veces", "UIT", "soles", "fecha"]);
/** Propiedades cuyo código debe quedar idéntico. */
const FROZEN = ["when", "nonLegal", "defaultNorm"];

const squashCode = (s: string) => s.replace(/\s+/g, "");

/** El único valor de `(…)`: un objeto o un literal. null si hay algo más (otra sentencia, una coma). */
function single(source: string): ts.Expression | null {
  const sf = ts.createSourceFile("draft.ts", `const __draft = (${source});`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (sf as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? [];
  if (diagnostics.length || sf.statements.length !== 1) return null;
  const st = sf.statements[0];
  if (!ts.isVariableStatement(st)) return null;
  let init = st.declarationList.declarations[0]?.initializer;
  if (!init || !ts.isParenthesizedExpression(init)) return null;
  init = init.expression;
  if (ts.isBinaryExpression(init) && init.operatorToken.kind === ts.SyntaxKind.CommaToken) return null;
  return init;
}

const props = (obj: ts.ObjectLiteralExpression) => {
  const out = new Map<string, ts.Expression | null>();
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) out.set(p.name.text, p.initializer);
    else out.set(`#${p.getText()}`, null);
  }
  return out;
};

/** El código sin el texto de los literales: debe ser idéntico antes y después. */
function skeleton(node: ts.Node): string {
  const sf = node.getSourceFile();
  let out = "";
  let pos = node.getStart(sf);
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) {
      out += sf.text.slice(pos, n.getStart(sf)) + "«LIT»";
      pos = n.getEnd();
      return;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  out += sf.text.slice(pos, node.getEnd());
  return squashCode(out);
}

/** Las expresiones `${…}` de todos los literales de plantilla dentro de `node`. */
function templateExpressions(node: ts.Node): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isTemplateExpression(n)) for (const span of n.templateSpans) out.add(squashCode(span.expression.getText()));
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

function newExpressions(before: ts.Node, after: ts.Node): string[] {
  const allowed = templateExpressions(before);
  return [...templateExpressions(after)].filter((e) => !allowed.has(e));
}

/** Constantes de texto del archivo original (`const DS = "ds-016-2024-jus"`), para leer las citas. */
type Consts = Map<string, string>;
function fileConsts(file: string): Consts {
  const out: Consts = new Map();
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return out;
  const sf = ts.createSourceFile(file, fs.readFileSync(full, "utf8"), ts.ScriptTarget.Latest, true);
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations)
      if (ts.isIdentifier(d.name) && d.initializer && ts.isStringLiteralLike(d.initializer)) out.set(d.name.text, d.initializer.text);
  }
  return out;
}

/** Un literal de texto, o una constante de texto del archivo. */
function stringValue(node: ts.Expression | null | undefined, consts: Consts): string | null {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node)) return consts.get(node.text) ?? null;
  return null;
}

/**
 * Citas `[{ norm, art }]` (literales o constantes del archivo). Las que el borrador agrega deben
 * existir en la biblioteca; las que ya estaban se conservan aunque su norma aún no tenga texto.
 */
function checkCites(
  node: ts.Expression | null | undefined,
  lib: Library,
  problems: string[],
  consts: Consts,
  kept: Set<string> = new Set()
): Array<{ norm: string; art: string }> {
  if (!node) return [];
  if (!ts.isArrayLiteralExpression(node)) {
    problems.push("las citas deben ser una lista de { norm, art }");
    return [];
  }
  const out: Array<{ norm: string; art: string }> = [];
  for (const el of node.elements) {
    if (!ts.isObjectLiteralExpression(el)) {
      problems.push(`cita no válida: ${el.getText()}`);
      continue;
    }
    const p = props(el);
    const norm = stringValue(p.get("norm"), consts);
    const art = stringValue(p.get("art"), consts);
    const extra = [...p.keys()].filter((k) => !["norm", "art", "claim"].includes(k));
    if (!norm || !art || extra.length) {
      problems.push(`cita no válida: ${el.getText()}`);
      continue;
    }
    out.push({ norm, art });
    if (!kept.has(`${norm}:${art}`)) checkCitation(norm, art, lib, problems);
  }
  return out;
}

function checkCitation(norm: string, art: string, lib: Library, problems: string[]) {
  const n = lib.norms[norm];
  if (!n) problems.push(`cita a una norma que no está en la biblioteca: ${norm}`);
  else if (n.status === "no-verificada") problems.push(`cita a una norma sin texto oficial en la biblioteca: ${norm}`);
  else if (!lib.findArticle(norm, art)) problems.push(`cita a un artículo que no existe: ${norm}, art. ${art}`);
}

function checkClause(before: ts.ObjectLiteralExpression, after: ts.ObjectLiteralExpression, lib: Library, problems: string[], consts: Consts) {
  const b = props(before);
  const a = props(after);
  for (const key of a.keys()) if (!CLAUSE_PROPS.has(key)) problems.push(`propiedad no permitida en la cláusula: ${key.replace(/^#/, "")}`);
  const idB = b.get("id");
  const idA = a.get("id");
  if (!idA || !idB || squashCode(idA.getText()) !== squashCode(idB.getText())) problems.push("el id de la cláusula no puede cambiar");
  for (const key of FROZEN) {
    const vb = b.get(key);
    const va = a.get(key);
    if ((vb ? squashCode(vb.getText()) : null) !== (va ? squashCode(va.getText()) : null))
      problems.push(`«${key}» no puede cambiar: decide cuándo aplica la cláusula, no su redacción`);
  }
  const textB = b.get("text");
  const textA = a.get("text");
  if (!textA || !textB) problems.push("la cláusula debe tener «text»");
  else {
    const added = newExpressions(textB, textA);
    if (added.length) problems.push(`expresión nueva en el texto (solo se puede reutilizar las que había): ${added.join(", ")}`);
    else if (skeleton(textA) !== skeleton(textB)) problems.push("el código de «text» cambió: solo puede cambiar el texto de los literales");
  }
  checkCites(a.get("cites"), lib, problems, consts, citeKeys(b.get("cites"), lib, consts));
}

/** Citas del original, sin validar, como «norma:art». */
function citeKeys(node: ts.Expression | null | undefined, lib: Library, consts: Consts): Set<string> {
  return new Set(checkCites(node, lib, [], consts).map((c) => `${c.norm}:${c.art}`));
}

function checkFact(before: ts.ObjectLiteralExpression, after: ts.ObjectLiteralExpression, lib: Library, problems: string[], consts: Consts) {
  const b = props(before);
  const a = props(after);
  for (const key of a.keys()) if (!FACT_PROPS.has(key)) problems.push(`propiedad no permitida en el hecho: ${key.replace(/^#/, "")}`);
  const idB = b.get("id");
  const idA = a.get("id");
  if (!idA || !idB || squashCode(idA.getText()) !== squashCode(idB.getText())) problems.push("el id del hecho no puede cambiar");
  const unit = a.get("unit");
  const value = a.get("value");
  const quote = a.get("quote");
  if (!unit || !ts.isStringLiteralLike(unit) || !FACT_UNITS.has(unit.text)) problems.push("unidad no válida");
  if (!value || !(ts.isStringLiteralLike(value) || ts.isNumericLiteral(value))) problems.push("el valor debe ser un número o un texto literal");
  const cites = checkCites(a.get("cites"), lib, problems, consts, citeKeys(b.get("cites"), lib, consts));
  if (!cites.length) {
    problems.push("el hecho necesita al menos una cita");
    return;
  }
  if (!quote || !ts.isStringLiteralLike(quote) || !quote.text.trim()) {
    problems.push("el hecho necesita la frase textual de la norma");
    return;
  }
  // Textual, como la prueba de hechos (no la tolerancia a paráfrasis de los veredictos de la IA).
  const texts = cites.map((c) => lib.findArticle(c.norm, c.art)?.article.text ?? "");
  if (!texts.some((text) => squash(text).includes(squash(quote.text)))) problems.push(`la frase no está, textual, en los artículos citados: «${quote.text}»`);
  if (unit && ts.isStringLiteralLike(unit) && value && (ts.isStringLiteralLike(value) || ts.isNumericLiteral(value))) {
    const v = ts.isNumericLiteral(value) ? Number(value.text) : value.text;
    if (!valueStatedInQuote({ value: v, unit: unit.text, quote: quote.text, cites })) problems.push(`el valor ${v} no está dicho en la frase`);
  }
}

function checkModuleString(before: ts.Expression, after: ts.Expression, lib: Library, problems: string[]) {
  if (!(ts.isStringLiteral(after) || ts.isNoSubstitutionTemplateLiteral(after) || ts.isTemplateExpression(after))) {
    problems.push("el reemplazo de un texto de módulo debe ser un texto literal");
    return;
  }
  const added = newExpressions(before, after);
  if (added.length) problems.push(`expresión nueva en el texto (solo se puede reutilizar las que había): ${added.join(", ")}`);
  const plain = (n: ts.Expression) => (ts.isTemplateExpression(n) ? n.getText().slice(1, -1) : (n as ts.StringLiteralLike).text);
  const old = new Set(parseCitations(plain(before), CLAUSE_DEFAULT_NORM, lib).map((c) => `${c.norm}:${c.art}`));
  for (const c of parseCitations(plain(after), CLAUSE_DEFAULT_NORM, lib)) {
    if (!old.has(`${c.norm}:${c.art}`)) checkCitation(c.norm, c.art, lib, problems);
  }
}

/** Las citas de un texto (original o borrador): `cites` de una cláusula o hecho, o las escritas en un texto de módulo. */
export function citationsOf(span: Span, source: string, lib: Library = legalLibrary()): Array<{ norm: string; art: string }> {
  const node = single(source);
  if (!node) return [];
  if (span.kind === "module-string") {
    if (!(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node))) return [];
    const plain = ts.isTemplateExpression(node) ? node.getText().slice(1, -1) : node.text;
    return parseCitations(plain, CLAUSE_DEFAULT_NORM, lib).map((c) => ({ norm: c.norm, art: c.art }));
  }
  if (!ts.isObjectLiteralExpression(node)) return [];
  return checkCites(props(node).get("cites"), lib, [], fileConsts(span.file));
}

export function checkReplacement(span: Span, replacement: string, lib: Library = legalLibrary()): string[] {
  const problems: string[] = [];
  const before = single(span.source);
  const after = single(replacement);
  if (!before) return ["no se pudo leer el texto original"];
  if (!after) return ["el reemplazo debe ser un único valor, sin otro código alrededor"];
  if (span.kind === "module-string") {
    checkModuleString(before, after, lib, problems);
    return problems;
  }
  if (!ts.isObjectLiteralExpression(before) || !ts.isObjectLiteralExpression(after)) return ["el reemplazo debe ser un único objeto { … }"];
  const consts = fileConsts(span.file);
  if (span.kind === "clause") checkClause(before, after, lib, problems, consts);
  else checkFact(before, after, lib, problems, consts);
  return problems;
}
