import type { Citation } from "./types";

/**
 * Hechos legales (diseño §4.2): cada plazo, monto o fecha que el producto usa, en un
 * solo lugar, con el artículo que lo establece y la frase textual de la norma oficial
 * (`legal/library`). Código, documentos, ayuda y prompt de IA leen de aquí.
 *
 * `quote: null` solo cuando la norma aún no tiene texto oficial en la biblioteca o el
 * valor está en duda; esos hechos figuran en legal/known-failures/facts.json.
 */
export type LegalFact = {
  id: string;
  value: number | string;
  unit: "días hábiles" | "días" | "días calendario" | "horas" | "años" | "meses" | "veces" | "UIT" | "soles" | "fecha";
  cites: Citation[];
  quote: string | null;
  /** Por qué no hay frase verificada, o qué revisar. */
  note?: string;
  /** Hechos que cambian por año (UIT). */
  validFrom?: string;
};

const DS = "ds-016-2024-jus";
const LEY = "ley-29733";

const list: LegalFact[] = [
  // Derechos ARCO (DS 016-2024-JUS, arts. 66, 69, 70 y 71). Días hábiles: art. III.8.
  {
    id: "arco.plazo.informacion",
    value: 8,
    unit: "días hábiles",
    cites: [{ norm: DS, art: "69.1" }],
    quote: "es de ocho (08) días contados desde el día siguiente de la presentación de la solicitud",
  },
  {
    id: "arco.plazo.acceso",
    value: 20,
    unit: "días hábiles",
    cites: [{ norm: DS, art: "69.2" }],
    quote: "es de veinte (20) días contados desde el día siguiente de la presentación de la solicitud",
  },
  {
    id: "arco.plazo.otros",
    value: 10,
    unit: "días hábiles",
    cites: [{ norm: DS, art: "69.3" }],
    quote: "es de diez (10) días contados desde el día siguiente de la presentación de la solicitud",
  },
  {
    id: "arco.ampliacion",
    value: 1,
    unit: "veces",
    cites: [{ norm: DS, art: "71.1" }],
    quote: "pueden ser ampliados una sola vez, y por un plazo igual, como máximo",
  },
  {
    id: "arco.subsanacion.pedido",
    value: 5,
    unit: "días",
    cites: [{ norm: DS, art: "66.2" }],
    quote: "en un plazo de cinco (5) días, contado desde el día siguiente de la recepción de la solicitud, formula las observaciones",
  },
  {
    id: "arco.subsanacion.titular",
    value: 5,
    unit: "días",
    cites: [{ norm: DS, art: "66.2" }],
    quote: "invitando al titular a subsanarlas dentro de un plazo máximo de cinco (5) días",
  },
  {
    id: "arco.info-adicional.pedido",
    value: 7,
    unit: "días",
    cites: [{ norm: DS, art: "70.1" }],
    quote: "dentro de los siete (7) días siguientes de recibida la solicitud",
  },
  {
    id: "arco.info-adicional.titular",
    value: 10,
    unit: "días",
    cites: [{ norm: DS, art: "70.2" }],
    quote: "En un plazo de diez (10) días de recibido el requerimiento",
  },
  {
    id: "arco.encargado.traslado",
    value: 3,
    unit: "días",
    cites: [{ norm: DS, art: "66.4" }],
    quote: "debe trasladarlo en un plazo máximo de tres (3) días",
  },
  // Incidentes, revocación y publicidad.
  {
    id: "incidente.notificacion",
    value: 48,
    unit: "horas",
    cites: [{ norm: DS, art: "34.1" }],
    quote: "dentro de las 48 horas posteriores a haber tomado conocimiento",
  },
  {
    id: "revocacion.plazo",
    value: 10,
    unit: "días",
    cites: [
      { norm: DS, art: "10.2" },
      { norm: DS, art: "26.5" },
    ],
    quote: "que no puede ser mayor a diez (10) días",
  },
  // Seguridad y encargados.
  {
    id: "seguridad.registros",
    value: 2,
    unit: "años",
    cites: [{ norm: DS, art: "46.3" }],
    quote: "conservarse por un periodo mínimo de dos (2) años",
  },
  {
    id: "seguridad.revision-privilegios",
    value: 6,
    unit: "meses",
    cites: [{ norm: DS, art: "46.1.c" }],
    quote: "en un intervalo mínimo de tiempo semestral",
  },
  {
    id: "encargado.conservacion",
    value: 2,
    unit: "años",
    cites: [{ norm: DS, art: "31.2" }],
    quote: "es como máximo de dos (2) años contados desde la finalización del último encargo realizado",
  },
  // Oficial de Datos Personales: comunicación y calendario (1.a DCF, publicado el 30/11/2024).
  {
    id: "odp.comunicacion",
    value: 15,
    unit: "días",
    cites: [{ norm: DS, art: "37.5" }],
    quote: "dentro de los 15 días siguientes a la designación o actualización respectiva",
  },
  {
    id: "odp.desde.grande",
    value: "2025-11-30",
    unit: "fecha",
    cites: [{ norm: DS, art: "1DCF" }],
    quote: "Para empresas con ventas anuales superiores a 2300 UIT 1 año después de la fecha de publicación del presente Reglamento",
  },
  {
    id: "odp.desde.mediana",
    value: "2026-11-30",
    unit: "fecha",
    cites: [{ norm: DS, art: "1DCF" }],
    quote: "hasta el monto máximo de 2300 UIT 2 años después de la fecha de publicación del presente Reglamento",
  },
  {
    id: "odp.desde.pequena",
    value: "2027-11-30",
    unit: "fecha",
    cites: [{ norm: DS, art: "1DCF" }],
    quote: "hasta el monto máximo de 1700 UIT 3 años después de la fecha de publicación del presente Reglamento",
  },
  {
    id: "odp.desde.micro",
    value: "2028-11-30",
    unit: "fecha",
    cites: [{ norm: DS, art: "1DCF" }],
    quote: "hasta el monto máximo de 150 UIT y otros equivalentes 4 años después de la fecha de publicación del presente Reglamento",
  },
  // Multas (Ley 29733, art. 39).
  {
    id: "multa.leve",
    value: "0.5-5",
    unit: "UIT",
    cites: [{ norm: LEY, art: "39.1" }],
    quote: "multa mínima desde cero coma cinco de una unidad impositiva tributaria (UIT) hasta cinco unidades impositivas tributarias (UIT)",
  },
  {
    id: "multa.grave",
    value: "5-50",
    unit: "UIT",
    cites: [{ norm: LEY, art: "39.2" }],
    quote: "desde más de cinco unidades impositivas tributarias (UIT) hasta cincuenta unidades impositivas tributarias (UIT)",
  },
  {
    id: "multa.muy-grave",
    value: "50-100",
    unit: "UIT",
    cites: [{ norm: LEY, art: "39.3" }],
    quote: "desde más de cincuenta unidades impositivas tributarias (UIT) hasta cien unidades impositivas tributarias (UIT)",
  },
  // Sin texto oficial en la biblioteca todavía.
  {
    id: "uit.2026",
    value: 5500,
    unit: "soles",
    cites: [{ norm: "ds-uit-2026", art: "1" }],
    quote: null,
    note: "Falta el decreto supremo que fija la UIT 2026 en la biblioteca.",
    validFrom: "2026-01-01",
  },
  {
    id: "cctv.conservacion",
    value: "30-60",
    unit: "días calendario",
    cites: [{ norm: "directiva-01-2020-jus-dgtaipd", art: "7" }],
    quote: null,
    note: "Falta la Directiva 01-2020-JUS/DGTAIPD; el número de artículo es provisional.",
  },
  {
    id: "cctv.conservacion.educacion",
    value: 30,
    unit: "días calendario",
    cites: [{ norm: "directiva-01-2020-jus-dgtaipd", art: "7" }],
    quote: null,
    note: "Falta la Directiva 01-2020-JUS/DGTAIPD; el número de artículo es provisional.",
  },
  {
    id: "reclamo.respuesta",
    value: 30,
    unit: "días calendario",
    cites: [{ norm: "ds-011-2011-pcm", art: "6" }],
    quote: null,
    note: "Falta el DS 011-2011-PCM y sus modificaciones. Verificar: las páginas legales de DatosPrivados dicen 15 días hábiles y los documentos de clientes, 30 días calendario.",
  },
];

export const FACTS: Record<string, LegalFact> = Object.fromEntries(list.map((f) => [f.id, f]));

export function fact(id: string): LegalFact {
  const found = FACTS[id];
  if (!found) throw new Error(`hecho legal desconocido: ${id}`);
  return found;
}

/** Valor numérico de un hecho (lanza si el hecho no es numérico). */
export function factNumber(id: string): number {
  const value = fact(id).value;
  if (typeof value !== "number") throw new Error(`el hecho ${id} no es numérico`);
  return value;
}
