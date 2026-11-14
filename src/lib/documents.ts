import type { Company, DataBank, Provider } from "./db";
import { isAbroad } from "./provider-catalog";
import { formatDate } from "./format";
import {
  isSensitiveBank,
  odpDeadline,
  sectorLegalProfile,
  sectorProtocol,
  type SectorLegalProfile,
} from "./sector-legal";

/**
 * Generadores de documentos legales conforme a la Ley N.° 29733 (Ley de
 * Protección de Datos Personales del Perú) y su Reglamento vigente aprobado
 * por Decreto Supremo N.° 016-2024-JUS.
 *
 * Son borradores operativos que parten de la declaración de la empresa en
 * DatosPrivados.
 */

import {
  legalBasisLabel,
  appUrl,
  sentence,
  isForeign,
  complaintsLink,
  usesAutomation,
  COUNTRY_LABEL,
  foreignProviders,
  categoryLabel,
  DPA_LABEL,
  TRANSFER_LABEL,
  bullets,
  table,
  companyShortId,
  controllerParagraph,
} from "@/legal/shared";
import { legalContext } from "@/legal/context";
import { renderDocument } from "@/legal/render";
import { encargoSpec } from "@/legal/documents/encargo";
import { terminosSpec } from "@/legal/documents/terminos";
import { arcoSpec } from "@/legal/documents/arco";
import { trabajadoresSpec } from "@/legal/documents/trabajadores";
import { clausulasSpec } from "@/legal/documents/clausulas";
import { retencionSpec } from "@/legal/documents/retencion";
import { seguridadSpec } from "@/legal/documents/seguridad";
import { politicaSpec } from "@/legal/documents/politica";
import { consentimientoSpec } from "@/legal/documents/consentimiento";
import { cookiesSpec } from "@/legal/documents/cookies";
import { reclamacionesSpec } from "@/legal/documents/reclamaciones";
import { avisoSpec } from "@/legal/documents/aviso";

export { legalBasisLabel, appUrl, companyShortId, companyIdentityLine, controllerParagraph } from "@/legal/shared";

export function buildPrivacyPolicy(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(politicaSpec, legalContext(company, banks, providers));
}

export function buildConsentTexts(company: Company): string {
  return renderDocument(consentimientoSpec, legalContext(company, [], []));
}

export function buildSecurityDocument(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(seguridadSpec, legalContext(company, banks, providers));
}

export function buildInternalClauses(company: Company): string {
  return renderDocument(clausulasSpec, legalContext(company, [], []));
}

/* -------------------------------------------------------------------------- */
/*  Documentos públicos del canal digital (términos, cookies, avisos)         */
/* -------------------------------------------------------------------------- */

/**
 * Términos y Condiciones del servicio.
 *
 * Dos decisiones que resuelven los problemas típicos de las plantillas
 * extranjeras: (1) el precio y el IGV se informan antes de pagar, y (2) la ley
 * aplicable y la jurisdicción no le quitan al consumidor peruano el INDECOPI ni
 * los tribunales de su domicilio (cláusula abusiva, arts. 49-51 de la Ley 29571).
 */
export function buildTermsOfService(company: Company, banks: DataBank[]): string {
  return renderDocument(terminosSpec, legalContext(company, banks, []));
}

/**
 * Política de cookies: lo que la ANPD y la práctica del mercado esperan ver
 * cuando el sitio carga analítica o publicidad de terceros.
 */
export function buildCookiePolicy(company: Company, providers: Provider[] = []): string {
  return renderDocument(cookiesSpec, legalContext(company, [], providers));
}

/**
 * Avisos cortos: el deber de información del art. 18 de la Ley 29733 se cumple
 * en el punto de recolección, no solo en la política publicada.
 */
export function buildShortNotices(company: Company): string {
  return renderDocument(avisoSpec, legalContext(company, [], []));
}

/**
 * Libro de Reclamaciones: aviso obligatorio + hoja + procedimiento interno.
 * (Ley N.° 29571, arts. 150 a 152, y su Reglamento.)
 */
export function buildComplaintBook(company: Company): string {
  return renderDocument(reclamacionesSpec, legalContext(company, [], []));
}

/* -------------------------------------------------------------------------- */
/*  Documentos internos de gobernanza (encargados, retención, EIPD)           */
/* -------------------------------------------------------------------------- */

/**
 * Encargo de tratamiento + transferencia internacional.
 *
 * La cláusula de cuatro puntos del documento de cláusulas sirve para un
 * contador o un courier. Un SaaS firma con una decena de proveedores cloud: el
 * Reglamento exige contenido mínimo y, cuando el proveedor está fuera del Perú,
 * una base para el flujo transfronterizo.
 */
export function buildProcessingAgreement(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  return renderDocument(encargoSpec, legalContext(company, banks, providers));
}

/**
 * Política de retención: el principio de minimización se demuestra con una
 * tabla y con evidencia de las purgas, no con una frase en la política.
 */
export function buildRetentionPolicy(company: Company, banks: DataBank[]): string {
  return renderDocument(retencionSpec, legalContext(company, banks, []));
}

/**
 * EIPD: el Reglamento la regula como facultativa, pero es la mejor prueba de
 * diligencia cuando se usan proveedores de IA sobre datos financieros.
 */
export function buildImpactAssessment(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const profile = sectorLegalProfile(company);
  const highRisk = banks.filter(
    (bank) =>
      isSensitiveBank(bank) ||
      /\b(ia|ocr)\b|inteligencia artificial|voz|audio|recibo|salud|biometr|video|perfil|menor|alumno|paciente/i.test(
        `${bank.name} ${bank.purpose} ${bank.data_categories}`
      )
  );
  const list = highRisk.length ? highRisk.map((bank) => `«${bank.name}»`).join(", ") : "los tratamientos descritos abajo";
  const riskRows = [
    ...profile.risks.map((r) => [r.risk, r.probability, r.impact, r.level]),
    ["Acceso indebido por credenciales compartidas", "Media", "Alto", "Alto"],
    ["Conservación más allá del plazo declarado", "Alta", "Medio", "Medio"],
    ["Transferencia internacional sin garantías ni comunicación a la ANPD", "Media", "Alto", "Alto"],
    ...foreignProviders(providers).map((provider) => [
      `Datos tratados por ${provider.name} en ${COUNTRY_LABEL(provider.country)}`,
      "Media",
      "Alto",
      "Alto",
    ]),
  ];

  return `## 0. Cuándo corresponde hacerla

La evaluación de impacto (EIPD) es **facultativa** y previa al tratamiento (art. 40.1 del DS N.° 016-2024-JUS), pero la norma la recomienda especialmente cuando se tratan datos sensibles, datos para crear perfiles, datos de personas en situación de vulnerabilidad (niños, niñas y adolescentes, personas con discapacidad, pueblos indígenas en aislamiento) o grandes volúmenes de datos. Puede elaborarse con la guía de la NTP-ISO/IEC 27005 y la NTP-ISO 31000 (art. 40.2). **Tenerla acreditada antes de que se inicie un procedimiento sancionador se considera al graduar la multa** (art. 125.4).

En ${name} (${profile.title}) se recomienda dejarla documentada para: ${list}.${profile.minors ? " Tratas datos de menores de edad." : ""}${profile.sensitive ? " Tu actividad principal trata datos sensibles." : ""}

## 1. Descripción del tratamiento

- **Finalidad:** ______________________________________________
- **Bancos de datos implicados:** ${list}
- **Categorías de datos:** ____________________________________
- **Titulares:** ______________________________________________
- **Sistemas y proveedores:** ${providers.length ? providers.map((provider) => provider.name).join(", ") : "_________________________________"}
- **País de almacenamiento:** ${providers.length ? Array.from(new Set(providers.map((provider) => COUNTRY_LABEL(provider.country)))).join(", ") : "_________________________________"}
- **Base legal:** _____________________________________________

## 2. Necesidad y proporcionalidad

| Pregunta | Respuesta |
| --- | --- |
| ¿Cada dato es necesario para la finalidad? | |
| ¿Se puede lograr lo mismo con menos datos o con datos agregados? | |
| ¿Se informó a los titulares antes de recogerlos? | |
| ¿Existe una base legal distinta del consentimiento? | |
| ¿El plazo de conservación es el mínimo posible? | |

## 3. Riesgos identificados

${table(["Riesgo", "Probabilidad", "Impacto", "Nivel"], riskRows)}

*Estos riesgos son los típicos de tu rubro. Agrega los propios y reevalúa probabilidad e impacto con tu realidad.*

## 4. Medidas de mitigación

1. Consentimiento escrito y separado para datos sensibles y de menores; no condicionar el servicio a finalidades adicionales.
2. Contrato de encargo con cada proveedor, prohibición expresa de entrenamiento con los datos y supresión acreditada al terminar (arts. 29 a 33).
3. Supresión o enmascaramiento de identificadores antes de cualquier envío a un proveedor de IA o analítica externo.
4. Revisión humana posible en toda categorización, evaluación o extracción automática (art. 87).
5. Registro de interacciones con los datos conservado 2 años y revisión semestral de privilegios (art. 46).
6. Plazos de conservación con purga registrada y bloqueo previo a la eliminación.
${profile.security.map((measure, index) => `${index + 7}. ${measure}`).join("\n")}

## 5. Riesgo residual y decisión

Con las medidas anteriores, el riesgo residual se considera: ☐ Bajo ☐ Medio ☐ Alto.

Decisión: ☐ Continuar ☐ Continuar con condiciones ☐ No continuar

Condiciones: ______________________________________________

## 6. Aprobación y revisión

- Responsable: ${company.dpo_name || "[responsable de privacidad]"} (${contact}).
- Fecha: ${date}.
- Revisión: antes de cambiar de proveedor de IA, de modelo o de países de tratamiento.

---

*Borrador generado con DatosPrivados. La EIPD es un documento vivo: se actualiza cuando cambia el tratamiento.*`;
}

/* -------------------------------------------------------------------------- */
/*  Trabajadores y procedimiento ARCO                                         */
/* -------------------------------------------------------------------------- */

/**
 * Aviso y consentimientos para el personal. El banco «Colaboradores y
 * postulantes» se sugiere a todos los rubros, pero hasta ahora no había ningún
 * documento que informara al trabajador (deber de información, art. 18 de la Ley).
 */
export function buildWorkerNotice(company: Company): string {
  return renderDocument(trabajadoresSpec, legalContext(company, [], []));
}

/**
 * Procedimiento interno de derechos ARCO: lo que el reglamento exige que el
 * responsable tenga resuelto antes de que llegue la primera solicitud.
 */
export function buildArcoProcedure(company: Company): string {
  return renderDocument(arcoSpec, legalContext(company, [], []));
}



/**
 * Protocolo operativo propio del rubro: lo que la plantilla general no puede
 * decir. Reúne los procedimientos, normas, plazos de conservación y riesgos de
 * la familia legal del negocio, y las herramientas que declaró.
 */
export function buildSectorProtocol(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  const date = formatDate(new Date().toISOString(), "long");
  const profile = sectorLegalProfile(company);
  const contact = company.dpo_email || company.email;
  const abroad = foreignProviders(providers);

  return `## 1. Para quién es

Este protocolo es el complemento operativo del Documento de Seguridad de **${company.name}** (${company.sector || profile.title}). Resume lo que el equipo debe hacer cada día con los datos de este rubro: **${profile.title}**.

## 2. Qué tiene de especial tu rubro

${bullets([
  profile.sensitive ? "Tu actividad principal trata **datos sensibles**: necesitas autorización por escrito y medidas reforzadas (arts. 8 y 47.3 del DS N.° 016-2024-JUS)." : "Tus datos son mayormente comunes; si recoges datos sensibles en algún caso, pide autorización por escrito.",
  profile.minors ? "Atiendes a **menores de edad**: menores de 14 años consienten sus padres o tutores; de 14 a 17 pueden consentir ellos (art. 22)." : "No es habitual que trates datos de menores; si ocurre, aplica el art. 22.",
  profile.biometric ? "Usas o puedes usar **datos biométricos** (huella, rostro): son sensibles; ofrece una alternativa y borra las plantillas al dar de baja." : "No usas datos biométricos como práctica habitual.",
  profile.imageUse ? "Usas **fotos y videos de personas**: autorización expresa (Código Civil, art. 15)." : "No usas imagen de personas con fines de difusión.",
  profile.splaft ? "Puedes ser **sujeto obligado ante la UIF-Perú**: verifica la relación de la SBS y conserva el registro de operaciones." : "No sueles ser sujeto obligado ante la UIF-Perú; verifícalo si cambia tu actividad.",
  profile.processor ? "Tratas datos **por cuenta de otras empresas**: eres su encargado (arts. 31 a 33); conserva los datos como máximo 2 años desde el último encargo." : "Eres el responsable de tus datos; tus proveedores son los encargados.",
])}

## 3. Procedimientos diarios

${sectorProtocol(profile.family).map((step, index) => `${index + 1}. ${step}`).join("\n")}

## 4. Normas que debes tener presentes

${bullets(profile.norms)}

## 5. Cuánto tiempo guardas cada cosa

${table(["Tipo de dato", "Plazo sugerido", "Fundamento"], profile.retention.map((row) => [row.data, row.term, row.basis]))}

## 6. Riesgos típicos del rubro y cómo evitarlos

${table(["Riesgo", "Probabilidad", "Impacto", "Nivel"], profile.risks.map((r) => [r.risk, r.probability, r.impact, r.level]))}

## 7. Tus herramientas

${
  providers.length
    ? `${table(
        ["Herramienta", "Categoría", "País", "Contrato", "Flujo transfronterizo"],
        providers.map((provider) => [
          provider.name,
          categoryLabel(provider.category),
          COUNTRY_LABEL(provider.country),
          DPA_LABEL[provider.dpa_status],
          isAbroad(provider.country) ? TRANSFER_LABEL[provider.transfer_status] : "No aplica",
        ])
      )}

${abroad.length ? `**${abroad.length} ${abroad.length === 1 ? "herramienta trata" : "herramientas tratan"} datos fuera del Perú (o en un país por verificar).** Para cada una: contrato de encargo con cláusulas que impongan al menos las mismas obligaciones (art. 20), comunicación a la ANPD para su inscripción (art. 21.2), y mención en la Política de Privacidad (art. 6.1.7).` : "Todas tus herramientas declaradas tratan los datos en el Perú."}`
    : "Aún no declaraste tus herramientas. Hazlo en la sección «Herramientas» para completar este apartado y la Política de Privacidad."
}

## 8. Revisión mensual (10 minutos)

- [ ] ¿Alguien nuevo entró o salió del equipo? Actualiza accesos (art. 46.1).
- [ ] ¿Se instaló una herramienta nueva que recibe datos? Decláralo en «Herramientas».
- [ ] ¿Hubo solicitudes de derechos pendientes de respuesta? Revisa los plazos.
- [ ] ¿Se perdió un equipo o se envió algo a la persona equivocada? Reporta a ${contact} dentro de 2 horas.
- [ ] ¿Venció algún plazo de conservación? Purga y deja constancia en «Evidencias».

---

*Aprobado el ${date}. Complementa el «Documento de Seguridad». Los bancos declarados: ${banks.length ? banks.map((b) => `«${b.name}»`).join(", ") : "ninguno todavía"}.*`;
}
