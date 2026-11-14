import crypto from "node:crypto";
import type { Article } from "./types";

/**
 * Separa por artículo el texto que `pdftotext -enc UTF-8` (sin `-layout`) saca de
 * una norma oficial. Sin dependencias de alias (`@/…`): lo usa también
 * `scripts/legal/ingest.mjs` con `node --experimental-strip-types`.
 */

export type SplitOptions = {
  /** Primera línea de la norma (lo anterior es otra cosa: el decreto aprobatorio, un índice). */
  start: RegExp;
  /** Primera línea que ya no es de la norma (otra norma publicada en el mismo PDF). */
  end?: RegExp;
};

/** «Artículo 34.», «Artículo 2.-», «Artículo III.», «“Artículo 2.» (modificado, citado) y «Artículo54.» (sin espacios). */
const HEADING = /^[“"]?Art[ií]culo\s*(\d+|[IVXLC]+)\s*\.\s*-?\s*(.*)$/;
/** Encabezados de estructura (Título, Capítulo…) y líneas en mayúsculas: no son texto del artículo. */
const STRUCTURE = /^(T[ÍI]TULO|CAP[ÍI]TULO|SUBCAP[ÍI]TULO|SECCI[ÓO]N|DISPOSICI[ÓO]N(ES)?)\b/;
const isUpperLine = (line: string) => line.length > 3 && /[A-ZÁÉÍÓÚÑ]/.test(line) && !/[a-záéíóúñ]/.test(line);

const sha = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

export function splitArticles(raw: string, opts: SplitOptions): Article[] {
  let text = raw.normalize("NFKC").replace(/\r\n?/g, "\n");
  // Palabra cortada al final de línea: «informa-\nción» → «información».
  text = text.replace(/([a-záéíóúñü])-\n([a-záéíóúñü])/g, "$1$2");

  const startMatch = opts.start.exec(text);
  if (!startMatch) throw new Error(`no se encontró el inicio de la norma (${opts.start})`);
  text = text.slice(startMatch.index);
  if (opts.end) {
    const endMatch = opts.end.exec(text.slice(1));
    if (endMatch) text = text.slice(0, endMatch.index + 1);
  }

  const lines = text.split("\n").map((line) => line.trim());
  const out: Article[] = [];
  let current: { num: string; title: string; body: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const body = current.body.join(" ").replace(/\s+/g, " ").trim();
    out.push({ num: current.num, title: current.title, text: body, sha256: sha(`${current.title}\n${body}`) });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      let title = heading[2].trim();
      const body: string[] = [];
      // Título partido: la línea siguiente empieza en minúscula y el título no terminó.
      // Con -raw esa línea puede traer además el inicio del cuerpo («…personales El titular…»):
      // lo que empieza con mayúscula tras el final del título pasa al cuerpo.
      while (!/[.:]$/.test(title) && i + 1 < lines.length && /^[a-záéíóúñ]/.test(lines[i + 1])) {
        const next = lines[++i];
        const cut = /^(.*?[a-záéíóúñ)])\s+([A-ZÁÉÍÓÚÑ¿“].*)$/.exec(next);
        if (cut) {
          title = `${title} ${cut[1]}`;
          body.push(cut[2]);
          break;
        }
        title = `${title} ${next}`;
      }
      current = { num: heading[1], title: title.replace(/\.$/, "").trim(), body };
      continue;
    }
    if (!current || line === "" || STRUCTURE.test(line) || isUpperLine(line)) continue;
    current.body.push(line);
  }
  flush();

  const seen = new Set<string>();
  for (const article of out) {
    if (seen.has(article.num)) throw new Error(`artículo ${article.num} repetido: ¿hay otra norma dentro del rango?`);
    seen.add(article.num);
  }
  return out;
}
