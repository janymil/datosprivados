import { isSensitiveBank } from "@/lib/sector-legal";
import { COUNTRY_LABEL, foreignProviders, table } from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Evaluación de impacto en protección de datos (antes `buildImpactAssessment`). */

const HIGH_RISK = /\b(ia|ocr)\b|inteligencia artificial|voz|audio|recibo|salud|biometr|video|perfil|menor|alumno|paciente/i;

function highRiskList({ banks }: LegalContext): string {
  const highRisk = banks.filter(
    (bank) => isSensitiveBank(bank) || HIGH_RISK.test(`${bank.name} ${bank.purpose} ${bank.data_categories}`)
  );
  return highRisk.length ? highRisk.map((bank) => `«${bank.name}»`).join(", ") : "los tratamientos descritos abajo";
}

export const eipdSpec: DocumentSpec = {
  kind: "eipd",
  join: "\n\n",
  clauses: [
    {
      id: "eipd.0.cuando-corresponde",
      cites: [
        { norm: "ds-016-2024-jus", art: "40.1" },
        { norm: "ds-016-2024-jus", art: "40.2" },
        { norm: "ds-016-2024-jus", art: "125.4" },
      ],
      text: (ctx) => {
        const { company, profile } = ctx;
        return `## 0. Cuándo corresponde hacerla

La evaluación de impacto (EIPD) es **facultativa** y previa al tratamiento (art. 40.1 del DS N.° 016-2024-JUS), pero la norma la recomienda especialmente cuando se tratan datos sensibles, datos para crear perfiles, datos de personas en situación de vulnerabilidad (niños, niñas y adolescentes, personas con discapacidad, pueblos indígenas en aislamiento) o grandes volúmenes de datos. Puede elaborarse con la guía de la NTP-ISO/IEC 27005 y la NTP-ISO 31000 (art. 40.2). **Tenerla acreditada antes de que se inicie un procedimiento sancionador se considera al graduar la multa** (art. 125.4).

En ${company.name} (${profile.title}) se recomienda dejarla documentada para: ${highRiskList(ctx)}.${profile.minors ? " Tratas datos de menores de edad." : ""}${profile.sensitive ? " Tu actividad principal trata datos sensibles." : ""}`;
      },
    },
    {
      id: "eipd.1.descripcion",
      cites: [],
      text: (ctx) => {
        const { providers } = ctx;
        return `## 1. Descripción del tratamiento

- **Finalidad:** ______________________________________________
- **Bancos de datos implicados:** ${highRiskList(ctx)}
- **Categorías de datos:** ____________________________________
- **Titulares:** ______________________________________________
- **Sistemas y proveedores:** ${providers.length ? providers.map((provider) => provider.name).join(", ") : "_________________________________"}
- **País de almacenamiento:** ${providers.length ? Array.from(new Set(providers.map((provider) => COUNTRY_LABEL(provider.country)))).join(", ") : "_________________________________"}
- **Base legal:** _____________________________________________`;
      },
    },
    {
      id: "eipd.2.necesidad-proporcionalidad",
      cites: [],
      text: () => `## 2. Necesidad y proporcionalidad

| Pregunta | Respuesta |
| --- | --- |
| ¿Cada dato es necesario para la finalidad? | |
| ¿Se puede lograr lo mismo con menos datos o con datos agregados? | |
| ¿Se informó a los titulares antes de recogerlos? | |
| ¿Existe una base legal distinta del consentimiento? | |
| ¿El plazo de conservación es el mínimo posible? | |`,
    },
    {
      id: "eipd.3.riesgos",
      cites: [],
      text: ({ profile, providers }) => {
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
        return `## 3. Riesgos identificados

${table(["Riesgo", "Probabilidad", "Impacto", "Nivel"], riskRows)}

*Estos riesgos son los típicos de tu rubro. Agrega los propios y reevalúa probabilidad e impacto con tu realidad.*`;
      },
    },
    {
      id: "eipd.4.mitigacion",
      cites: [
        { norm: "ds-016-2024-jus", art: "29" },
        { norm: "ds-016-2024-jus", art: "30" },
        { norm: "ds-016-2024-jus", art: "31" },
        { norm: "ds-016-2024-jus", art: "32" },
        { norm: "ds-016-2024-jus", art: "33" },
        { norm: "ds-016-2024-jus", art: "46" },
        { norm: "ds-016-2024-jus", art: "46.1.c" },
        { norm: "ds-016-2024-jus", art: "46.2" },
        { norm: "ds-016-2024-jus", art: "46.3" },
        { norm: "ds-016-2024-jus", art: "50.1.5" },
        { norm: "ds-016-2024-jus", art: "87" },
      ],
      text: ({ profile }) => `## 4. Medidas de mitigación

1. Consentimiento escrito y separado para datos sensibles y de menores; no condicionar el servicio a finalidades adicionales.
2. Contrato de encargo con cada proveedor, prohibición expresa de entrenamiento con los datos y supresión acreditada al terminar (arts. 29 a 33).
3. Supresión o enmascaramiento de identificadores antes de cualquier envío a un proveedor de IA o analítica externo.
4. Revisión humana posible en toda categorización, evaluación o extracción automática (art. 87).
5. Registro de interacciones con los datos conservado 2 años y revisión semestral de privilegios (art. 46).
6. Plazos de conservación con purga registrada y bloqueo previo a la eliminación.
${profile.security.map((measure, index) => `${index + 7}. ${measure}`).join("\n")}`,
    },
    {
      id: "eipd.5.riesgo-residual",
      cites: [],
      text: () => `## 5. Riesgo residual y decisión

Con las medidas anteriores, el riesgo residual se considera: ☐ Bajo ☐ Medio ☐ Alto.

Decisión: ☐ Continuar ☐ Continuar con condiciones ☐ No continuar

Condiciones: ______________________________________________`,
    },
    {
      id: "eipd.6.aprobacion",
      cites: [],
      nonLegal: "Firma y constancia de aprobación",
      text: ({ company, date }) => `## 6. Aprobación y revisión

- Responsable: ${company.dpo_name || "[responsable de privacidad]"} (${company.dpo_email || company.email}).
- Fecha: ${date}.
- Revisión: antes de cambiar de proveedor de IA, de modelo o de países de tratamiento.`,
    },
    {
      id: "eipd.nota.borrador",
      cites: [],
      nonLegal: "Nota de borrador",
      text: () => `---

*Borrador generado con DatosPrivados. La EIPD es un documento vivo: se actualiza cuando cambia el tratamiento.*`,
    },
  ],
};
