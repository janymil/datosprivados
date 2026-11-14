import { vi } from "vitest";
import type { buildDocument } from "@/lib/document-catalog";
import type { DocumentKind } from "@/lib/db";
import { FIXED_APP_URL, FIXED_NOW, legalFixtures } from "./fixtures";

/** Los 14 tipos, en el orden del `switch` de `buildDocument`. */
export const DOCUMENT_KINDS: DocumentKind[] = [
  "politica",
  "terminos",
  "cookies",
  "aviso",
  "reclamaciones",
  "consentimiento",
  "seguridad",
  "retencion",
  "encargo",
  "clausulas",
  "eipd",
  "trabajadores",
  "arco",
  "sectorial",
];

/** Fija la fecha y el host público para que cada render sea reproducible. */
export function withFrozenWorld<T>(fn: () => T): T {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(FIXED_NOW));
  vi.stubEnv("NEXT_PUBLIC_APP_URL", FIXED_APP_URL);
  try {
    return fn();
  } finally {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  }
}

/** Primera línea distinta entre dos textos, o "" si son iguales. */
export function firstDiff(expected: string, actual: string): string {
  if (expected === actual) return "";
  const a = expected.split("\n");
  const b = actual.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `line ${i + 1}\n- ${a[i] ?? "<fin>"}\n+ ${b[i] ?? "<fin>"}`;
  }
  return "line ?\n- (difieren solo en saltos finales)";
}

/** Renderiza cada tipo para cada fixture. Clave: `${fixture.id}|${kind}`. */
export function renderAll(build: typeof buildDocument): Map<string, string> {
  return withFrozenWorld(() => {
    const out = new Map<string, string>();
    for (const f of legalFixtures())
      for (const kind of DOCUMENT_KINDS) out.set(`${f.id}|${kind}`, build(kind, f.company, f.banks, f.providers));
    return out;
  });
}
