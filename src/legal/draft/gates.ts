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
 * tiene que quedar igual, y todo valor fuera del texto debe ser un literal (nunca una expresión
 * que se ejecute). Devuelve los problemas en frases para el fundador; vacío = pasa.
 */

const CLAUSE_PROPS = new Set(["id", "when", "text", "cites", "nonLegal", "defaultNorm"]);
const FACT_PROPS = new Set(["id", "value", "unit", "cites", "quote", "note", "validFrom"]);
const FACT_UNITS = new Set(["días hábiles", "días", "días calendario", "horas", "años", "meses", "veces", "UIT", "soles", "fecha"]);
/** Palabras que la frase de un hecho debe contener según su unidad (revisión I7). */
const UNIT_WORDS: Record<string, string[]> = {
  "días hábiles": ["día"],
  días: ["día"],
  "días calendario": ["día"],
  horas: ["hora"],
  años: ["año"],
  meses: ["mes", "semestral", "anual", "trimestral"],
  veces: ["vez", "veces"],
  UIT: ["uit", "unidad impositiva", "unidades impositivas", "unidades"],
  soles: ["sol", "s/"],
};
/** Frase mínima de un hecho: un número suelto no prueba nada. */
const MIN_QUOTE = 30;
/** Propiedades cuyo código debe quedar idéntico. */
const FROZEN_CLAUSE = ["when", "nonLegal", "defaultNorm"];
const FROZEN_FACT = ["validFrom"];

const squashCode = (s: string) => s.replace(/\s+/g, "");
const isText = (n: ts.Node): n is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
const isTextLike = (n: ts.Node) => isText(n) || ts.isTemplateExpression(n);

/**
 * El único valor de `source`: un objeto o un literal, sin nada alrededor (otra sentencia, otra
 * declaración, una coma). Revisión I3: el texto del valor debe ser exactamente el reemplazo.
 */
function single(source: string): ts.Expression | null {
  const sf = ts.createSourceFile("draft.ts", `const __draft = (\n${source}\n);`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (sf as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? [];
  if (diagnostics.length || sf.statements.length !== 1) return null;
  const st = sf.statements[0];
  if (!ts.isVariableStatement(st) || st.declarationList.declarations.length !== 1) return null;
  const init = st.declarationList.declarations[0].initializer;
  if (!init || !ts.isParenthesizedExpression(init)) return null;
  const inner = init.expression;
  if (ts.isBinaryExpression(inner) && inner.operatorToken.kind === ts.SyntaxKind.CommaToken) return null;
  if (inner.getText(sf).trim() !== source.trim()) return null;
  return inner;
}

type Props = { map: Map<string, ts.Expression>; problems: string[] };

/** Propiedades de un objeto literal; claves repetidas, `...spread` o métodos son problemas. */
function props(obj: ts.ObjectLiteralExpression): Props {
  const map = new Map<string, ts.Expression>();
  const problems: string[] = [];
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
      if (map.has(p.name.text)) problems.push(`propiedad repetida: ${p.name.text}`);
      map.set(p.name.text, p.initializer);
    } else problems.push(`propiedad no permitida: ${p.getText().slice(0, 60)}`);
  }
  return { map, problems };
}

/** ¿El literal es texto que se muestra (y no un valor que usa el código)? Revisión I8. */
function isOutputPosition(node: ts.Node): boolean {
  let cur: ts.Node = node;
  for (;;) {
    const p = cur.parent;
    if (!p) return false;
    if (ts.isParenthesizedExpression(p) || ts.isArrayLiteralExpression(p) || (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      cur = p;
      continue;
    }
    if (ts.isConditionalExpression(p)) {
      if (cur === p.condition) return false;
      cur = p;
      continue;
    }
    if (ts.isArrowFunction(p)) return cur === p.body;
    if (ts.isReturnStatement(p)) return true;
    if (ts.isVariableDeclaration(p)) return cur === p.initializer;
    if (ts.isCallExpression(p) && p.arguments.some((a) => a === cur) && ts.isPropertyAccessExpression(p.expression))
      return ["push", "unshift", "concat"].includes(p.expression.name.text);
    return false;
  }
}

/** El código sin el texto que se muestra: debe ser idéntico antes y después. */
function skeleton(node: ts.Node): string {
  const sf = node.getSourceFile();
  let out = "";
  let pos = node.getStart(sf);
  const visit = (n: ts.Node) => {
    if (isTextLike(n) && isOutputPosition(n)) {
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
      if (ts.isIdentifier(d.name) && d.initializer && isText(d.initializer)) out.set(d.name.text, d.initializer.text);
  }
  return out;
}

/** Un literal de texto, o (si se permite) una constante de texto del archivo. */
function stringValue(node: ts.Expression | undefined, consts: Consts | null): string | null {
  if (!node) return null;
  if (isText(node)) return node.text;
  if (consts && ts.isIdentifier(node)) return consts.get(node.text) ?? null;
  return null;
}

/**
 * Citas `[{ norm, art, claim? }]`: `norm` y `art` literales o constantes del archivo, `claim`
 * literal. Las que el borrador agrega deben existir en la biblioteca; las que ya estaban se
 * conservan aunque su norma aún no tenga texto.
 */
function checkCites(
  node: ts.Expression | undefined,
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
  const seen = new Set<string>();
  for (const el of node.elements) {
    if (!ts.isObjectLiteralExpression(el)) {
      problems.push(`cita no válida: ${el.getText().slice(0, 80)}`);
      continue;
    }
    const p = props(el);
    problems.push(...p.problems);
    const norm = stringValue(p.map.get("norm"), consts);
    const art = stringValue(p.map.get("art"), consts);
    const claim = p.map.get("claim");
    const extra = [...p.map.keys()].filter((k) => !["norm", "art", "claim"].includes(k));
    if (!norm || !art || extra.length || (claim && !isText(claim))) {
      problems.push(`cita no válida (norm y art deben ser texto; claim, un texto literal): ${el.getText().slice(0, 80)}`);
      continue;
    }
    if (seen.has(`${norm}:${art}`)) problems.push(`cita repetida: ${norm}, art. ${art}`);
    seen.add(`${norm}:${art}`);
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

/** Citas del original, sin validar, como «norma:art». */
function citeKeys(node: ts.Expression | undefined, lib: Library, consts: Consts): Set<string> {
  return new Set(checkCites(node, lib, [], consts).map((c) => `${c.norm}:${c.art}`));
}

function sameCode(a: ts.Node | undefined, b: ts.Node | undefined): boolean {
  return (a ? squashCode(a.getText()) : null) === (b ? squashCode(b.getText()) : null);
}

function checkId(b: Props, a: Props, problems: string[], what: string) {
  const idA = a.map.get("id");
  const idB = b.map.get("id");
  if (!idA || !isText(idA) || !idB || !isText(idB) || idA.text !== idB.text) problems.push(`el id ${what} no puede cambiar`);
}

function checkClause(before: ts.ObjectLiteralExpression, after: ts.ObjectLiteralExpression, lib: Library, problems: string[], consts: Consts) {
  const b = props(before);
  const a = props(after);
  problems.push(...a.problems);
  for (const key of a.map.keys()) if (!CLAUSE_PROPS.has(key)) problems.push(`propiedad no permitida en la cláusula: ${key}`);
  checkId(b, a, problems, "de la cláusula");
  for (const key of FROZEN_CLAUSE)
    if (!sameCode(b.map.get(key), a.map.get(key))) problems.push(`«${key}» no puede cambiar: decide cuándo aplica la cláusula, no su redacción`);
  const textB = b.map.get("text");
  const textA = a.map.get("text");
  if (!textA || !textB) problems.push("la cláusula debe tener «text»");
  else {
    const added = newExpressions(textB, textA);
    if (added.length) problems.push(`expresión nueva en el texto (solo se puede reutilizar las que había): ${added.join(", ")}`);
    else if (skeleton(textA) !== skeleton(textB)) problems.push("el código de «text» cambió: solo puede cambiar el texto que se muestra");
  }
  checkCites(a.map.get("cites"), lib, problems, consts, citeKeys(b.map.get("cites"), lib, consts));
}

function checkFact(before: ts.ObjectLiteralExpression, after: ts.ObjectLiteralExpression, lib: Library, problems: string[], consts: Consts) {
  const b = props(before);
  const a = props(after);
  problems.push(...a.problems);
  for (const key of a.map.keys()) if (!FACT_PROPS.has(key)) problems.push(`propiedad no permitida en el hecho: ${key}`);
  checkId(b, a, problems, "del hecho");
  for (const key of FROZEN_FACT) if (!sameCode(b.map.get(key), a.map.get(key))) problems.push(`«${key}» no puede cambiar`);
  const note = a.map.get("note");
  if (note && !isText(note)) problems.push("«note» debe ser un texto literal");
  const unit = a.map.get("unit");
  const value = a.map.get("value");
  const quote = a.map.get("quote");
  if (!unit || !isText(unit) || !FACT_UNITS.has(unit.text)) problems.push("unidad no válida");
  if (!value || !(isText(value) || ts.isNumericLiteral(value))) problems.push("el valor debe ser un número o un texto literal");
  const cites = checkCites(a.map.get("cites"), lib, problems, consts, citeKeys(b.map.get("cites"), lib, consts));
  if (!cites.length) {
    problems.push("el hecho necesita al menos una cita");
    return;
  }
  if (!quote || !isText(quote) || !quote.text.trim()) {
    problems.push("el hecho necesita la frase textual de la norma");
    return;
  }
  // Textual, como la prueba de hechos (no la tolerancia a paráfrasis de los veredictos de la IA).
  const texts = cites.map((c) => lib.findArticle(c.norm, c.art)?.article.text ?? "");
  if (!texts.some((text) => squash(text).includes(squash(quote.text)))) problems.push(`la frase no está, textual, en los artículos citados: «${quote.text}»`);
  if (unit && isText(unit) && unit.text !== "fecha") {
    const q = quote.text.toLowerCase();
    if (quote.text.length < MIN_QUOTE || !(UNIT_WORDS[unit.text] ?? []).some((w) => q.includes(w)))
      problems.push(`la frase es demasiado corta o no dice la unidad (${unit.text}): «${quote.text}»`);
  }
  if (unit && isText(unit) && value && (isText(value) || ts.isNumericLiteral(value))) {
    const v = ts.isNumericLiteral(value) ? Number(value.text) : value.text;
    if (!valueStatedInQuote({ value: v, unit: unit.text, quote: quote.text, cites })) problems.push(`el valor ${v} no está dicho en la frase`);
  }
}

function plainText(n: ts.Expression): string {
  return ts.isTemplateExpression(n) ? n.getText().slice(1, -1) : (n as ts.StringLiteralLike).text;
}

function checkModuleString(before: ts.Expression, after: ts.Expression, lib: Library, problems: string[]) {
  if (!isTextLike(after)) {
    problems.push("el reemplazo de un texto de módulo debe ser un texto literal");
    return;
  }
  const added = newExpressions(before, after);
  if (added.length) problems.push(`expresión nueva en el texto (solo se puede reutilizar las que había): ${added.join(", ")}`);
  const old = new Set(parseCitations(plainText(before), CLAUSE_DEFAULT_NORM, lib).map((c) => `${c.norm}:${c.art}`));
  for (const c of parseCitations(plainText(after), CLAUSE_DEFAULT_NORM, lib)) {
    if (!old.has(`${c.norm}:${c.art}`)) checkCitation(c.norm, c.art, lib, problems);
  }
}

/** Las citas de un texto (original o borrador): `cites` de una cláusula o hecho, o las escritas en un texto de módulo. */
export function citationsOf(span: Span, source: string, lib: Library = legalLibrary()): Array<{ norm: string; art: string }> {
  const node = single(source);
  if (!node) return [];
  if (span.kind === "module-string") {
    if (!isTextLike(node)) return [];
    return parseCitations(plainText(node), CLAUSE_DEFAULT_NORM, lib).map((c) => ({ norm: c.norm, art: c.art }));
  }
  if (!ts.isObjectLiteralExpression(node)) return [];
  return checkCites(props(node).map.get("cites"), lib, [], fileConsts(span.file));
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
