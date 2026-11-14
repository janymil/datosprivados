/**
 * Reglas que una rama legal/<id> aprobada debe cumplir antes de fusionarse
 * (.github/workflows/legal-change.yml). Sin dependencias de alias: lo carga
 * scripts/legal/validate-change.mjs con `node --experimental-strip-types`.
 */

export type ChangeInput = {
  id: string;
  changedFiles: string[];
  /** Contenido del archivo en la rama, o null si no existe. */
  read: (path: string) => string | null;
  /** Contenido del archivo en master, o null si no existe. */
  readBase: (path: string) => string | null;
};

const ALLOWED = [/^src\/legal\//, /^src\/lib\//, /^legal\//, /^test\/legal\//, /^src\/app\//, /^src\/components\//, /^docs\//];
const DOCUMENT_TEXT = [/^test\/legal\/__snapshots__\/(?!modules\/)/, /^test\/legal\/baseline-hashes\.json$/];
const FRESHNESS = "src/lib/document-freshness.ts";

type Failure = { rule?: string; clause?: string; detail?: string };
const failureKey = (f: Failure) => `${f.rule} ${f.clause} ${f.detail}`;

function parseFailures(text: string | null): Failure[] {
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Versiones de plantilla declaradas en TEMPLATE_VERSIONS («politica: 3,»). */
function templateVersions(text: string | null): Record<string, number> {
  const block = text?.match(/TEMPLATE_VERSIONS[^=]*=\s*\{([\s\S]*?)\};/)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
}

export function validateChange({ id, changedFiles, read, readBase }: ChangeInput): string[] {
  const problems: string[] = [];
  const log = `legal/changes/${id}.md`;
  if (!changedFiles.includes(log) && read(log) === null) problems.push(`falta ${log}`);

  for (const file of changedFiles.filter((f) => /^legal\/known-failures\/[^/]+\.json$/.test(f))) {
    const before = new Set(parseFailures(readBase(file)).map(failureKey));
    const added = parseFailures(read(file)).filter((f) => !before.has(failureKey(f)));
    if (added.length) problems.push(`${file} agrega ${added.length} falla(s) conocida(s): ${added.slice(0, 3).map(failureKey).join("; ")}`);
  }

  if (changedFiles.some((f) => DOCUMENT_TEXT.some((re) => re.test(f)))) {
    const before = templateVersions(readBase(FRESHNESS));
    const after = templateVersions(read(FRESHNESS) ?? readBase(FRESHNESS));
    const raised = Object.keys(after).some((kind) => after[kind] > (before[kind] ?? 0));
    if (!raised) problems.push(`cambió el texto de los documentos pero no subió ninguna versión en TEMPLATE_VERSIONS (${FRESHNESS})`);
  }

  for (const file of changedFiles) {
    if (!ALLOWED.some((re) => re.test(file))) problems.push(`archivo fuera del área permitida: ${file}`);
  }
  return problems;
}
