import fs from "node:fs";
import path from "node:path";
import type { AiVerdict } from "./types";

/** Caché de veredictos de la IA: misma entrada, mismo modelo e instrucciones ⇒ no se paga otra vez. */
export const DEFAULT_VERDICT_CACHE = path.join(process.cwd(), ".cache", "legal-audit", "verdicts.json");

export class VerdictCache {
  private data: Record<string, AiVerdict>;
  private dirty = false;

  constructor(readonly file: string = DEFAULT_VERDICT_CACHE) {
    this.data = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, AiVerdict>) : {};
  }

  get(key: string): AiVerdict | undefined {
    return this.data[key];
  }

  set(key: string, verdict: AiVerdict): void {
    this.data[key] = verdict;
    this.dirty = true;
  }

  save(): void {
    if (!this.dirty) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, `${JSON.stringify(this.data)}\n`);
    this.dirty = false;
  }
}
