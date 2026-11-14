import { describe, expect, it } from "vitest";
import { fact, FACTS } from "@/legal/facts";
import { legalLibrary } from "@/legal/library";
import { type KnownFailure, ratchet } from "./checks";

/**
 * Cada hecho legal (plazo, monto, fecha) cita su artículo y trae la frase textual que
 * lo dice. Se compara sin espacios ni diferencias de forma (el PDF a veces pega
 * palabras: «plazomáximodediez»). Los hechos sin frase verificable están en
 * legal/known-failures/facts.json, que solo puede reducirse.
 */
const lib = legalLibrary();
const squash = (s: string) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

function checkFacts(): KnownFailure[] {
  const out: KnownFailure[] = [];
  for (const f of Object.values(FACTS)) {
    if (f.quote === null) {
      out.push({ rule: "fact-unverified", clause: f.id, detail: f.note ?? "" });
      continue;
    }
    const texts = f.cites.map((c) => lib.findArticle(c.norm, c.art)?.article.text ?? "");
    if (!texts.some((text) => squash(text).includes(squash(f.quote!)))) {
      out.push({ rule: "fact-quote-not-found", clause: f.id, detail: f.quote });
    }
  }
  return out;
}

/** Formas en que la norma escribe un número: «diez (10)», «(08)», «48 horas», «semestral»… */
const NUMBER_WORDS: Record<string, string[]> = {
  "0.5": ["cero coma cinco"],
  "1": ["una sola vez", "(1)"],
  "2": ["dos (2)"],
  "3": ["tres (3)"],
  "5": ["cinco (5)", "cinco unidades"],
  "6": ["semestral", "seis (6)"],
  "7": ["siete (7)"],
  "8": ["ocho (08)", "ocho (8)"],
  "10": ["diez (10)"],
  "15": ["15 días", "quince (15)"],
  "20": ["veinte (20)"],
  "48": ["48 horas"],
  "50": ["cincuenta unidades"],
  "100": ["cien unidades"],
};

/** El valor del hecho está dicho en su propia frase (o, para fechas del ODP, se deduce de ella). */
export function valueStatedInQuote(f: { value: number | string; unit: string; quote: string | null; cites: Array<{ norm: string }> }): boolean {
  if (f.quote === null) return true;
  const q = squash(f.quote);
  const says = (n: string) => (NUMBER_WORDS[n] ?? [`(${n})`]).some((form) => q.includes(squash(form)));
  if (f.unit === "fecha") {
    const years = /(\d+)años?después/.exec(q);
    const published = lib.norms[f.cites[0].norm]?.publishedAt;
    if (!years || !published) return false;
    const date = new Date(`${published}T00:00:00Z`);
    date.setUTCFullYear(date.getUTCFullYear() + Number(years[1]));
    return date.toISOString().slice(0, 10) === f.value;
  }
  if (typeof f.value === "string") return f.value.split("-").every(says);
  return says(String(f.value));
}

describe("hechos legales", () => {
  it("el valor de cada hecho está dicho en su frase textual", () => {
    const wrong = Object.values(FACTS).filter((f) => !valueStatedInQuote(f)).map((f) => `${f.id} = ${f.value}`);
    expect(wrong).toEqual([]);
    // Un valor cambiado sin cambiar la frase se detecta.
    expect(valueStatedInQuote({ ...FACTS["arco.plazo.otros"], value: 15 })).toBe(false);
    expect(valueStatedInQuote({ ...FACTS["odp.desde.mediana"], value: "2026-12-31" })).toBe(false);
    expect(valueStatedInQuote({ ...FACTS["multa.grave"], value: "5-60" })).toBe(false);
  });

  it("cada id coincide con su clave y fact() rechaza ids desconocidos", () => {
    for (const [key, f] of Object.entries(FACTS)) expect(f.id).toBe(key);
    expect(() => fact("no-existe")).toThrow(/no-existe/);
  });

  it("cada artículo citado existe, salvo en normas sin texto verificado", () => {
    const missing = Object.values(FACTS).flatMap((f) =>
      f.cites
        .filter((c) => lib.norms[c.norm]?.status !== "no-verificada" && !lib.findArticle(c.norm, c.art))
        .map((c) => `${f.id} → ${c.norm}:${c.art}`)
    );
    expect(missing).toEqual([]);
  });

  it("solo los hechos sin frase verificable faltan, y la lista solo puede reducirse", () => {
    const current = checkFacts();
    expect(current.filter((f) => f.rule === "fact-quote-not-found")).toEqual([]);
    const { added, stale } = ratchet("facts", current);
    expect(added, "hechos sin verificar nuevos").toEqual([]);
    expect(stale, "ya verificados: quítalos de legal/known-failures/facts.json").toEqual([]);
  });
});
