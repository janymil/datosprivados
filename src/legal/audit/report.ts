import fs from "node:fs";
import path from "node:path";
import { sortFindings, type AuditCheck, type AuditFinding, type AuditMeta } from "./types";

/** Informe de la auditoría: legal/audit/AAAA-MM-DD.{md,json} (diseño §7). */

const TITLES: Record<AuditCheck, string> = {
  cita: "1. La norma y el artículo citados existen",
  vigencia: "2. La norma citada está vigente y verificada",
  "cita-textual": "3. La frase de cada hecho está en el artículo",
  numero: "4. Los números del texto salen de los hechos",
  regla: "Reglas por perfil de empresa (§6)",
  "obligacion-sin-cita": "6. Obligaciones sin cita",
  significado: "5. El artículo respalda lo que dice la cláusula (IA, dos pasadas)",
};
const SECTIONS: AuditCheck[] = ["cita", "vigencia", "cita-textual", "numero", "regla", "obligacion-sin-cita", "significado"];

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export function renderReport(findings: AuditFinding[], meta: AuditMeta): string {
  const sorted = sortFindings(findings);
  const errors = sorted.filter((f) => f.severity === "error").length;
  const lines = [
    `# Auditoría legal — ${meta.date}`,
    "",
    `- Modelo: ${meta.aiEnabled ? (meta.model ?? "sin configurar") : "chequeo de significado desactivado (LEGAL_AUDIT_AI=0)"}`,
    `- Cláusulas auditadas: ${meta.clausesAudited}`,
    `- No auditadas: ${meta.notAudited.length}`,
    `- Sin respuesta de la IA: ${meta.aiFailures}`,
    `- Hallazgos: ${sorted.length} (errores confirmados: ${errors}; para revisar: ${sorted.length - errors})`,
    "",
    "Los errores se corrigen como cambios aprobados por el fundador en /operador/legal. Lo que no se",
    "puede decidir automáticamente pasa a legal/audit/abogado.md.",
  ];

  for (const check of SECTIONS) {
    const items = sorted.filter((f) => f.check === check);
    lines.push("", `## ${TITLES[check]} (${items.length})`, "");
    if (!items.length) {
      lines.push("Sin hallazgos.");
      continue;
    }
    if (check !== "significado") {
      lines.push("| Id | Fuente | Regla | Detalle | Gravedad |", "|---|---|---|---|---|");
      for (const f of items) lines.push(`| ${f.id} | ${cell(f.source)} | ${f.rule} | ${cell(f.detail)} | ${f.severity} |`);
      continue;
    }
    for (const f of items) {
      lines.push(`### ${f.id} · ${f.source} (${f.severity})`, "", cell(f.detail), "");
      for (const v of f.verdicts ?? []) {
        lines.push(`- Pasada ${v.pass.toUpperCase()}: **${v.verdict}**. ${cell(v.reason)}`);
        if (v.quote) lines.push(`  > ${cell(v.quote)}`);
      }
      lines.push("");
    }
  }

  if (meta.notAudited.length) {
    lines.push("", `## No auditadas (${meta.notAudited.length})`, "", "| Fuente | Motivo |", "|---|---|");
    for (const n of [...meta.notAudited].sort((a, b) => a.source.localeCompare(b.source))) lines.push(`| ${cell(n.source)} | ${cell(n.reason)} |`);
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

export function writeReport(dir: string, findings: AuditFinding[], meta: AuditMeta): { md: string; json: string } {
  fs.mkdirSync(dir, { recursive: true });
  const md = path.join(dir, `${meta.date}.md`);
  const json = path.join(dir, `${meta.date}.json`);
  const sortedMeta = { ...meta, notAudited: [...meta.notAudited].sort((a, b) => a.source.localeCompare(b.source)) };
  fs.writeFileSync(md, renderReport(findings, meta));
  fs.writeFileSync(json, `${JSON.stringify({ meta: sortedMeta, findings: sortFindings(findings) }, null, 1)}\n`);
  return { md, json };
}
