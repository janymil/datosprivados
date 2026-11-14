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
  /**
   * Compilación anotada (copias de ONP, gob.pe…): tras el texto original viene
   * «(*) Artículo modificado por … cuyo texto es el siguiente:» y la versión nueva
   * entre comillas. La versión posterior reemplaza a la anterior y se quitan las notas.
   */
  amended?: boolean;
  /**
   * Códigos (Código Civil): la sumilla va en la línea anterior al encabezado y el texto
   * empieza en la misma línea de «Artículo 15.-». La sumilla es el título.
   */
  sumilla?: boolean;
};

/** Una sumilla: línea corta sin punto final que precede a un encabezado de artículo. */
const isSumilla = (line: string) => line.length > 0 && line.length <= 90 && !/[.;:,]$/.test(line);

/** Nota de modificación o de concordancia de una compilación: desde «(*)» hasta el final del cuerpo. */
const AMENDMENT_NOTE = /\s*\(\*+\)[\s\S]*$/;

/** «Artículo 34.», «Artículo 2.-», «Artículo III.», «“Artículo 2.» (modificado, citado) y «Artículo54.» (sin espacios). */
const HEADING = /^[“"]?Art[ií]culo\s*(\d+|[IVXLC]+)\s*\.\s*-?\s*(.*)$/;
/** Encabezados de estructura (Título, Capítulo…) y líneas en mayúsculas: no son texto del artículo. */
const STRUCTURE = /^(T[ÍI]TULO|CAP[ÍI]TULO|SUBCAP[ÍI]TULO|SECCI[ÓO]N|DISPOSICI[ÓO]N(ES)?)\b/;
const isUpperLine = (line: string) => line.length > 3 && /[A-ZÁÉÍÓÚÑ]/.test(line) && !/[a-záéíóúñ]/.test(line);

/** Cabeceras y pies de página de El Peruano, sellos de fecha y códigos de publicación. */
const PAGE_NOISE = [
  /^\d*\s*NORMAS LEGALES\b/,
  /^\d*\s*(Lunes|Martes|Mi[ée]rcoles|Jueves|Viernes|S[áa]bado|Domingo) \d{1,2} de \p{L}+ de \d{4}/u,
  /^El\s?Peruano\s*\/?$/,
  /^\/$/,
  /^Fecha: \d{2}\/\d{2}\/\d{4}/,
  /^\d{6,}-\d+$/,
  /^\d{1,3}$/,
];
const isPageNoise = (line: string) => PAGE_NOISE.some((re) => re.test(line));

/** Disposiciones complementarias: «Primera. Vigencia» → «1DCF» (finales), «1DCT» (transitorias)… */
const PROVISIONS_HEADING = /^DISPOSICI[ÓO]N(?:ES)? COMPLEMENTARIAS?\s*(FINAL(?:ES)?|TRANSITORIAS?|MODIFICATORIAS?|DEROGATORIAS?)?$/i;
const PROVISION_KIND: Record<string, string> = { FINAL: "F", TRANSITORIA: "T", MODIFICATORIA: "M", DEROGATORIA: "D" };
const ORDINALS = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA"];
const PROVISION = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|S[ÉE]TIMA|OCTAVA|NOVENA|D[ÉE]CIMA)\s*\.\s*-?\s*(.*)$/i;
const ordinal = (word: string) =>
  ORDINALS.indexOf(word.toUpperCase().replace(/^S[ÉE]TIMA$/, "SÉPTIMA").replace("SEPTIMA", "SÉPTIMA").replace("DECIMA", "DÉCIMA")) + 1;
/** Fórmula de promulgación y firmas: ya no es texto normativo. */
const SIGNATURE = /^(POR TANTO|Comun[íi]quese|Dado en la Casa de Gobierno|Reg[íi]strese|Mando se publique)/;

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

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !isPageNoise(line));
  const out: Article[] = [];
  let current: { num: string; title: string; body: string[] } | null = null;
  let provisionKind: string | null = null;
  const flush = () => {
    if (!current) return;
    const body = current.body.join(" ").replace(/\s+/g, " ").trim();
    out.push({ num: current.num, title: current.title, text: body, sha256: sha(`${current.title}\n${body}`) });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SIGNATURE.test(line)) break;

    const provisionsHeading = PROVISIONS_HEADING.exec(line);
    if (provisionsHeading) {
      flush();
      // El tipo puede venir en la misma línea o en la siguiente («DISPOSICIONES COMPLEMENTARIAS» / «FINALES»).
      let kindWord = provisionsHeading[1];
      if (!kindWord && /^(FINAL(?:ES)?|TRANSITORIAS?|MODIFICATORIAS?|DEROGATORIAS?)$/i.test(lines[i + 1] ?? "")) kindWord = lines[++i];
      provisionKind = PROVISION_KIND[(kindWord ?? "FINAL").toUpperCase().replace(/(ES|S)$/, "")] ?? "F";
      continue;
    }
    const provision = provisionKind ? PROVISION.exec(line) : null;
    if (provision) {
      flush();
      current = { num: `${ordinal(provision[1])}DC${provisionKind}`, title: provision[2].replace(/\.$/, "").trim(), body: [] };
      continue;
    }

    const rawHeading = HEADING.exec(line);
    // «…conforme a lo señalado en el / Artículo 59.»: referencia partida a mitad de frase, no un encabezado.
    const last: string | undefined = (current as { body: string[] } | null)?.body.at(-1);
    const midSentence: boolean = last !== undefined && !/[.:;]$/.test(last);
    const heading: RegExpExecArray | null =
      rawHeading && !(rawHeading[2].trim() === "" && !/-/.test(line) && midSentence) ? rawHeading : null;
    if (rawHeading && !heading) {
      (current as { body: string[] } | null)?.body.push(line);
      continue;
    }
    if (heading && opts.sumilla) {
      // La línea anterior, si es una sumilla, quedó en el cuerpo del artículo previo: va de título.
      const open: { body: string[] } | null = current;
      const prev: string = open?.body.at(-1) ?? (i > 0 ? lines[i - 1] : "");
      const title: string = isSumilla(prev) ? prev : "";
      if (title && open && open.body.at(-1) === prev) open.body.pop();
      flush();
      current = { num: heading[1], title, body: heading[2].trim() ? [heading[2].trim()] : [] };
      continue;
    }
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

  if (opts.amended) return keepLatestVersions(out);

  const seen = new Set<string>();
  for (const article of out) {
    if (seen.has(article.num)) throw new Error(`artículo ${article.num} repetido: ¿hay otra norma dentro del rango?`);
    seen.add(article.num);
  }
  return out;
}

/** Compilación anotada: la última versión de cada artículo, en su lugar, sin notas ni comillas. */
function keepLatestVersions(articles: Article[]): Article[] {
  const latest = new Map<string, Article>();
  for (const article of articles) latest.set(article.num, article);
  const order: string[] = [];
  for (const article of articles) if (!order.includes(article.num)) order.push(article.num);
  return order.map((num) => {
    const a = latest.get(num)!;
    const title = a.title.replace(/^[“"]|[”"]$/g, "").trim();
    const text = a.text.replace(AMENDMENT_NOTE, "").replace(/[“”]/g, "").replace(/\s+/g, " ").trim();
    return { num, title, text, sha256: sha(`${title}\n${text}`) };
  });
}
