import { legalLibrary } from "./library";

/**
 * ¿La frase textual de un hecho dice su valor? La usan la prueba de hechos y las compuertas
 * de la redacción automática (plan 7), así que vive aquí y no en la prueba.
 */
export const squash = (s: string) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

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
  "5500": ["S/ 5 500,00", "Cinco Mil Quinientos"],
};

/** El valor del hecho está dicho en su propia frase (o, para fechas del ODP, se deduce de ella). */
export function valueStatedInQuote(f: { value: number | string; unit: string; quote: string | null; cites: Array<{ norm: string }> }): boolean {
  if (f.quote === null) return true;
  const q = squash(f.quote);
  const says = (n: string) => (NUMBER_WORDS[n] ?? [`(${n})`]).some((form) => q.includes(squash(form)));
  if (f.unit === "fecha") {
    const years = /(\d+)años?después/.exec(q);
    const published = legalLibrary().norms[f.cites[0].norm]?.publishedAt;
    if (!years || !published) return false;
    const date = new Date(`${published}T00:00:00Z`);
    date.setUTCFullYear(date.getUTCFullYear() + Number(years[1]));
    return date.toISOString().slice(0, 10) === f.value;
  }
  if (typeof f.value === "string") return f.value.split("-").every(says);
  return says(String(f.value));
}
