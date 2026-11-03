import type { Company, Incident } from "./db";
import { criteriaLabels } from "./incident-criteria";
import { formatDateTime } from "./format";

/**
 * Borrador de la notificación de incidente a la ANPD (art. 34 del DS N.° 016-2024-JUS),
 * armado con los datos del incidente. No se envía solo: el cliente lo revisa,
 * completa lo que está entre corchetes y lo presenta.
 *
 * El texto no es asesoría legal (la revisión del abogado sigue pendiente, P0-LEGAL);
 * está redactado a partir del articulado y deja explícito lo que solo el responsable
 * puede saber (consecuencias, medidas, motivo de la demora).
 */

const SEVERITY_LABEL: Record<string, string> = {
  leve: "LEVE",
  moderado: "MODERADO",
  grave: "GRAVE",
};

export function buildAuthorityNotice(input: {
  company: Pick<Company, "name" | "ruc" | "address" | "dpo_name" | "dpo_email" | "email" | "phone" | "entity_type" | "country" | "representative_name">;
  incident: Pick<
    Incident,
    "title" | "description" | "severity" | "detected_at" | "due_at" | "data_categories" | "affected_people" | "affected_sample" | "criteria" | "measures"
  >;
  now?: Date;
}): string {
  const { company, incident } = input;
  const now = input.now ?? new Date();
  const criteriaText = criteriaLabels(incident.criteria).join(", ") || "Ninguno";
  const identity =
    company.entity_type === "extranjera"
      ? `Sociedad constituida en: ${company.country || "[por completar]"}\nRepresentante en el Perú: ${company.representative_name || "[por designar]"}`
      : `RUC N.°: ${company.ruc}`;

  return `REPORTE DE INCIDENTE DE SEGURIDAD DE DATOS PERSONALES (PLAZO 48 HORAS)
Dirigido a: Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH)
Base legal: Ley N.° 29733 y Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS (art. 34)
(Si el incidente ocurrió en el entorno digital, notificar también al Centro Nacional de Seguridad Digital - CNSD, art. 34.5)

1. IDENTIFICACIÓN DEL RESPONSABLE DEL TRATAMIENTO
Razón Social / Nombre: ${company.name}
${identity}
Domicilio legal: ${company.address || "[por completar]"}
Oficial de Datos Personales / Contacto de Privacidad: ${company.dpo_name || "[por completar]"}
Correo electrónico y teléfono de contacto: ${company.dpo_email || company.email} / ${company.phone || "[por completar]"}

2. CRONOLOGÍA DEL INCIDENTE
- Fecha y hora de detección: ${formatDateTime(incident.detected_at)} (Hora de Lima, UTC-5)
- Fecha y hora límite (48 h): ${formatDateTime(incident.due_at)}
- Fecha de emisión de este reporte: ${now.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
- Motivo de la demora (solo si se notifica después de 48 h): [Explicar las razones o indicar "No aplica"]

3. NATURALEZA Y DESCRIPCIÓN DEL INCIDENTE
Título del evento: ${incident.title}
Nivel de gravedad estimado: ${SEVERITY_LABEL[incident.severity] ?? String(incident.severity).toUpperCase()}
Descripción de los hechos y sistemas involucrados:
${incident.description || "[Por completar]"}

4. CATEGORÍAS DE DATOS PERSONALES Y TITULARES AFECTADOS
- Categorías de datos involucrados: ${incident.data_categories || "[Por completar]"}
- Número estimado de personas afectadas: ${incident.affected_people || "[Por determinar]"}
- Titulares / identificadores afectados: ${incident.affected_sample || "[Por precisar]"}
- Criterios del art. 34.1 que se cumplen: ${criteriaText}

5. POSIBLES CONSECUENCIAS PARA LOS TITULARES
[Describir los posibles perjuicios para los titulares]

6. MEDIDAS DE CONTENCIÓN Y CORRECCIÓN ADOPTADAS
${incident.measures || "[Por completar]"}

7. COMUNICACIÓN A LOS TITULARES AFECTADOS (ART. 34.3 Y 34.4, DS N.° 016-2024-JUS)
- [SÍ: se informó / informará en lenguaje claro dentro de las 48 h / NO: no hubo afectación y el incidente fue superado por completo]
`;
}
