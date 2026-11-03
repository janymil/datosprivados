/**
 * Política de contenido del asistente (área 11).
 *
 * Dos reglas que no dependen del modelo y que por eso se comprueban aquí:
 * 1. **No damos asesoría legal** ni representamos a nadie: explicamos la norma y
 *    redactamos documentos, y derivamos los casos concretos a un abogado.
 * 2. **No ayudamos a ocultar datos a la autoridad** ni a falsear registros: sería
 *    una infracción (y, según el caso, un delito).
 *
 * El aviso `AI_DISCLAIMER` acompaña a toda respuesta generada por el modelo.
 */

export const AI_DISCLAIMER =
  "Respuesta generada con IA sobre la Ley N.° 29733. No es asesoría legal y puede tener errores: verifícala con el texto de la norma o con un abogado.";

export type PolicyVerdict =
  | { blocked: false }
  | { blocked: true; reason: "asesoria" | "evasion"; message: string };

/** Señales de que se pide asesoría legal sobre un caso concreto o representación. */
const LEGAL_ADVICE = [
  /\basesor[ií]a legal\b/i,
  /\brepres[eé]nt(?:a|e|es|en|ar|arme|arnos|arte|arlo|arla)\b/i,
  /\b(me|nos) (vas|van) a (defender|representar)\b/i,
  /\b(interpon|present|redact)\w* (una |la )?(demanda|denuncia)\b/i,
  /\b(ganar|perder)\w* (el|un) (juicio|proceso)\b/i,
  /\bqu[eé] (abogado|estudio|notario) (contrato|elijo|me recomiendas)\b/i,
  /\bfirma(me|r)? (tú|usted) (el|la)\b/i,
  /\bme (puedes|puede) (defender|representar)\b/i,
];

/** Señales de que se pide ocultar información o falsear registros. */
const EVASION = [
  /\bocult(?:o|as|a|an|ar|arlo|arla|arle|emos|en)\b[\s\S]{0,80}\b(?:anpd|autoridad|fiscaliz\w*|sunat)\b/i,
  /\b(?:borrar|eliminar|quemar)\b[\s\S]{0,80}\b(?:registros?|evidencias?|pruebas?)\b[\s\S]{0,80}\b(?:anpd|fiscaliz\w*|multa|autoridad)\b/i,
  /\bsin que (se|lo) enter(en|e)\b/i,
  /\b(sobornar|coimear|coima|soborno)\b/i,
  /\b(?:falsificar|falsear|adulterar)\b[\s\S]{0,60}\b(?:datos|registros?|firmas?|documentos?|consentimientos?|evidencias?|autorizaciones?)\b/i,
  /\bevadir (la |una )?(multa|sanci[oó]n|fiscalizaci[oó]n)\b/i,
  /\bmentir(?:le|les)? a (la anpd|la autoridad)\b/i,
];

const ASESORIA_MESSAGE = [
  "No doy asesoría legal ni represento a nadie: soy un asistente que explica la Ley N.° 29733 y redacta documentos a partir de tus datos.",
  "",
  "Para un caso concreto (una demanda, una fiscalización o una denuncia) consulta a un abogado en protección de datos.",
  "Si quieres, puedo explicarte la norma, mostrarte qué documento de la app cubre ese punto o preparar un borrador para que tu abogado lo revise.",
].join("\n");

const EVASION_MESSAGE = [
  "No puedo ayudar a ocultar datos a la autoridad, borrar evidencia ni falsear registros: además de ser una infracción de la Ley N.° 29733, puede constituir delito.",
  "",
  "Sí puedo ayudarte a cumplir: qué hay que notificar a la ANPD, cómo documentar un incidente o cómo responder una solicitud ARCO dentro de plazo.",
].join("\n");

/** Decide si la consulta choca con la política. No depende del modelo ni del estado de la cuenta. */
export function aiPolicy(message: string): PolicyVerdict {
  const text = (message ?? "").slice(0, 4000);
  if (!text.trim()) return { blocked: false };
  if (EVASION.some((rule) => rule.test(text))) return { blocked: true, reason: "evasion", message: EVASION_MESSAGE };
  if (LEGAL_ADVICE.some((rule) => rule.test(text))) return { blocked: true, reason: "asesoria", message: ASESORIA_MESSAGE };
  return { blocked: false };
}
