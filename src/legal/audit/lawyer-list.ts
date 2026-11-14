import fs from "node:fs";
import path from "node:path";
import type { AuditFinding } from "./types";

/**
 * legal/audit/abogado.md: lo que la auditoría no puede decidir sola, para un abogado
 * (diseño §7). Las líneas escritas a mano no se tocan; la auditoría solo agrega bajo
 * «## Pendientes de la auditoría» los hallazgos nuevos para revisar.
 */
export const LAWYER_LIST = path.join(process.cwd(), "legal", "audit", "abogado.md");
const PENDING = "## Pendientes de la auditoría";

/** Solo disputas de significado: una obligación sin cita se resuelve buscando su artículo (desarrollo), no con un abogado. */
const TO_LAWYER = (f: AuditFinding) => f.severity === "revisar" && f.check === "significado";
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function updateLawyerList(file: string, findings: AuditFinding[]): number {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "# Lista para el abogado\n";
  const fresh = findings.filter((f) => TO_LAWYER(f) && !text.includes(f.id));
  if (!fresh.length) return 0;
  if (!text.includes(PENDING)) text = `${text.trimEnd()}\n\n${PENDING}\n`;
  const lines = fresh.map((f) => `- [ ] ${f.id} · ${oneLine(f.source)} · ${oneLine(f.detail)}`);
  // Al final de la sección «Pendientes», antes del siguiente «## » si lo hay.
  const start = text.indexOf(PENDING) + PENDING.length;
  const next = text.indexOf("\n## ", start);
  const end = next === -1 ? text.length : next;
  const section = text.slice(0, end).trimEnd();
  text = `${section}\n${lines.join("\n")}\n${next === -1 ? "" : `\n${text.slice(next + 1)}`}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return fresh.length;
}
