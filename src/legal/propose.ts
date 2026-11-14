import crypto from "node:crypto";

/**
 * De una rama de corrección a un cambio legal registrado (motor legal, plan 5). Lo usa
 * scripts/legal/propose-change.mjs con `node --experimental-strip-types`: sin alias `@/`.
 *
 * El id lo elige quien registra porque la rama debe llevar legal/changes/<id>.md
 * (lo exige el flujo de GitHub) antes de existir el registro.
 */

/** `lc-AAAAMMDD-xxxxxx`, igual que CHANGE_ID en src/lib/legal-changes.ts. */
export function newChangeId(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `lc-${day}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Contenido de legal/changes/<id>.md: qué cambia, por qué y qué hallazgos corrige. */
export function changeLog(p: { id: string; title: string; summary: string; findings: string[] }): string {
  const findings = p.findings.length ? p.findings.map((f) => `- \`${f}\``).join("\n") : "- (sin hallazgo de auditoría asociado)";
  return `# ${p.id} · ${p.title}

Fecha: ${new Date().toISOString().slice(0, 10)}

## Por qué

${p.summary.trim()}

## Hallazgos de la auditoría que corrige

${findings}

Detalle de cada hallazgo: el informe más reciente en \`legal/audit/\` (buscar el id).

## Cómo verificar

\`pnpm vitest run test/legal\` en verde; las instantáneas cambiadas son las de este registro y
\`TEMPLATE_VERSIONS\` sube en cada tipo de documento cuyo texto cambió.
`;
}

export type ProposalPayload = {
  id: string;
  kind: "auditoria";
  title: string;
  summary: string;
  source_url: null;
  branch: string;
  head_sha: string;
  diff: string;
  affected: Array<{ kind: string; source: string }>;
};

/** Cuerpo de POST /api/legal/changes. */
export function proposalPayload(p: {
  id: string;
  title: string;
  summary: string;
  branch: string;
  headSha: string;
  diff: string;
  findings: Array<{ id: string; source: string }>;
}): ProposalPayload {
  const sources = [...new Set(p.findings.map((f) => f.source))];
  return {
    id: p.id,
    kind: "auditoria",
    title: p.title,
    summary: p.summary,
    source_url: null,
    branch: p.branch,
    head_sha: p.headSha,
    diff: p.diff,
    affected: sources.map((source) => ({ kind: "clause", source })),
  };
}
