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

describe("hechos legales", () => {
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
