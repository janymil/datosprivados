import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { legalModuleTexts } from "./modules";

/**
 * Instantánea de todos los textos legales fuera de los 14 documentos: ayuda, guías,
 * FAQ, glosario, multas, incidentes, prompt de IA, cartas ARCO… Cualquier cambio de
 * texto o de cifra hace fallar esta prueba e indica qué fuente cambió.
 * WRITE_MODULES_BASELINE=1 la crea solo si no existe (plan 3, diseño §5).
 */
const FILE = path.join(import.meta.dirname, "__snapshots__", "modules", "modules.json");

describe("textos legales fuera de los documentos", () => {
  it("coinciden con su instantánea", () => {
    const current = Object.fromEntries(legalModuleTexts().map(({ source, text }) => [source, text]));
    if (!fs.existsSync(FILE) && process.env.WRITE_MODULES_BASELINE === "1") {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const sorted = Object.fromEntries(Object.keys(current).sort().map((k) => [k, current[k]]));
      fs.writeFileSync(FILE, `${JSON.stringify(sorted, null, 1)}\n`);
    }
    const stored = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, string>;
    const changed = Object.keys({ ...stored, ...current }).filter((k) => stored[k] !== current[k]);
    expect(changed, `fuentes cambiadas: ${changed.slice(0, 20).join(", ")}`).toEqual([]);
  }, 120_000);

  it("las fuentes tienen ids únicos y cubren todos los módulos", () => {
    const sources = legalModuleTexts().map((t) => t.source);
    expect(new Set(sources).size).toBe(sources.length);
    for (const prefix of ["guides:", "help:", "faq:", "fines:", "incident-criteria:", "incident-notice:", "security-checks:", "glossary:", "compliance:", "platform-legal:", "tips:", "bank-presets:", "ai-policy:", "ai:PERU_LEGAL_RAG", "ai:arco-draft:", "sector-legal:"])
      expect(sources.some((s) => s.startsWith(prefix)), prefix).toBe(true);
  });
});
