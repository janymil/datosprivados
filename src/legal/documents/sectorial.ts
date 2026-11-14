import { isAbroad } from "@/lib/provider-catalog";
import { sectorProtocol } from "@/lib/sector-legal";
import {
  bullets,
  categoryLabel,
  COUNTRY_LABEL,
  DPA_LABEL,
  foreignProviders,
  table,
  TRANSFER_LABEL,
} from "@/legal/shared";
import type { DocumentSpec } from "@/legal/types";

/** Protocolo operativo del rubro (antes `buildSectorProtocol`). */

export const sectorialSpec: DocumentSpec = {
  kind: "sectorial",
  join: "\n\n",
  clauses: [
    {
      id: "sectorial.1.para-quien",
      cites: [],
      text: ({ company, profile }) => `## 1. Para quién es

Este protocolo es el complemento operativo del Documento de Seguridad de **${company.name}** (${company.sector || profile.title}). Resume lo que el equipo debe hacer cada día con los datos de este rubro: **${profile.title}**.`,
    },
    {
      id: "sectorial.2.especial-rubro",
      cites: [
        { norm: "codigo-civil", art: "15" },
        { norm: "ds-016-2024-jus", art: "8" },
        { norm: "ds-016-2024-jus", art: "22" },
        { norm: "ds-016-2024-jus", art: "31" },
        { norm: "ds-016-2024-jus", art: "32" },
        { norm: "ds-016-2024-jus", art: "33" },
        { norm: "ds-016-2024-jus", art: "47.3" },
      ],
      text: ({ profile }) => `## 2. Qué tiene de especial tu rubro

${bullets([
  profile.sensitive ? "Tu actividad principal trata **datos sensibles**: necesitas autorización por escrito y medidas reforzadas (arts. 8 y 47.3 del DS N.° 016-2024-JUS)." : "Tus datos son mayormente comunes; si recoges datos sensibles en algún caso, pide autorización por escrito.",
  profile.minors ? "Atiendes a **menores de edad**: menores de 14 años consienten sus padres o tutores; de 14 a 17 pueden consentir ellos (art. 22)." : "No es habitual que trates datos de menores; si ocurre, aplica el art. 22.",
  profile.biometric ? "Usas o puedes usar **datos biométricos** (huella, rostro): son sensibles; ofrece una alternativa y borra las plantillas al dar de baja." : "No usas datos biométricos como práctica habitual.",
  profile.imageUse ? "Usas **fotos y videos de personas**: autorización expresa (Código Civil, art. 15)." : "No usas imagen de personas con fines de difusión.",
  profile.splaft ? "Puedes ser **sujeto obligado ante la UIF-Perú**: verifica la relación de la SBS y conserva el registro de operaciones." : "No sueles ser sujeto obligado ante la UIF-Perú; verifícalo si cambia tu actividad.",
  profile.processor ? "Tratas datos **por cuenta de otras empresas**: eres su encargado (arts. 31 a 33); conserva los datos como máximo 2 años desde el último encargo." : "Eres el responsable de tus datos; tus proveedores son los encargados.",
])}`,
    },
    {
      id: "sectorial.3.procedimientos",
      cites: [
        { norm: "ds-016-2024-jus", art: "8" },
      ],
      text: ({ profile }) => `## 3. Procedimientos diarios

${sectorProtocol(profile.family).map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
    },
    {
      id: "sectorial.4.normas",
      cites: [
        { norm: "codigo-civil", art: "15" },
        { norm: "ds-016-2024-jus", art: "2.4" },
        { norm: "ds-016-2024-jus", art: "2.6" },
        { norm: "ds-016-2024-jus", art: "6.1.7" },
        { norm: "ds-016-2024-jus", art: "6.1.8" },
        { norm: "ds-016-2024-jus", art: "7" },
        { norm: "ds-016-2024-jus", art: "8" },
        { norm: "ds-016-2024-jus", art: "18" },
        { norm: "ds-016-2024-jus", art: "19" },
        { norm: "ds-016-2024-jus", art: "20" },
        { norm: "ds-016-2024-jus", art: "21" },
        { norm: "ds-016-2024-jus", art: "22" },
        { norm: "ds-016-2024-jus", art: "23" },
        { norm: "ds-016-2024-jus", art: "25" },
        { norm: "ds-016-2024-jus", art: "26" },
        { norm: "ds-016-2024-jus", art: "26.5" },
        { norm: "ds-016-2024-jus", art: "28" },
        { norm: "ds-016-2024-jus", art: "29" },
        { norm: "ds-016-2024-jus", art: "29.2" },
        { norm: "ds-016-2024-jus", art: "30" },
        { norm: "ds-016-2024-jus", art: "30.4" },
        { norm: "ds-016-2024-jus", art: "31" },
        { norm: "ds-016-2024-jus", art: "32" },
        { norm: "ds-016-2024-jus", art: "33" },
        { norm: "ds-016-2024-jus", art: "37" },
        { norm: "ds-016-2024-jus", art: "40" },
        { norm: "ds-016-2024-jus", art: "46" },
        { norm: "ds-016-2024-jus", art: "87" },
        { norm: "ley-29733", art: "14" },
        { norm: "ley-29733", art: "17" },
      ],
      text: ({ profile }) => `## 4. Normas que debes tener presentes

${bullets(profile.norms)}`,
    },
    {
      id: "sectorial.5.conservacion",
      cites: [
        { norm: "ds-016-2024-jus", art: "10" },
        { norm: "ds-016-2024-jus", art: "26" },
        { norm: "ds-016-2024-jus", art: "30.4" },
        { norm: "ds-016-2024-jus", art: "31.2" },
        { norm: "ds-016-2024-jus", art: "46.3" },
        { norm: "ds-020-2017-jus", art: "24" },
      ],
      text: ({ profile }) => `## 5. Cuánto tiempo guardas cada cosa

${table(["Tipo de dato", "Plazo sugerido", "Fundamento"], profile.retention.map((row) => [row.data, row.term, row.basis]))}`,
    },
    {
      id: "sectorial.6.riesgos",
      cites: [],
      text: ({ profile }) => `## 6. Riesgos típicos del rubro y cómo evitarlos

${table(["Riesgo", "Probabilidad", "Impacto", "Nivel"], profile.risks.map((r) => [r.risk, r.probability, r.impact, r.level]))}`,
    },
    {
      id: "sectorial.7.encabezado",
      cites: [],
      nonLegal: "Encabezado de sección",
      text: () => `## 7. Tus herramientas`,
    },
    {
      id: "sectorial.7-herramientas.ninguna",
      cites: [],
      when: ({ providers }) => providers.length === 0,
      text: () =>
        "Aún no declaraste tus herramientas. Hazlo en la sección «Herramientas» para completar este apartado y la Política de Privacidad.",
    },
    {
      id: "sectorial.7-herramientas.tabla",
      cites: [
        { norm: "ds-016-2024-jus", art: "6.1.7" },
        { norm: "ds-016-2024-jus", art: "20" },
        { norm: "ds-016-2024-jus", art: "21.2" },
      ],
      when: ({ providers }) => providers.length > 0,
      text: ({ providers }) => {
        const abroad = foreignProviders(providers);
        return `${table(
        ["Herramienta", "Categoría", "País", "Contrato", "Flujo transfronterizo"],
        providers.map((provider) => [
          provider.name,
          categoryLabel(provider.category),
          COUNTRY_LABEL(provider.country),
          DPA_LABEL[provider.dpa_status],
          isAbroad(provider.country) ? TRANSFER_LABEL[provider.transfer_status] : "No aplica",
        ])
      )}

${abroad.length ? `**${abroad.length} ${abroad.length === 1 ? "herramienta trata" : "herramientas tratan"} datos fuera del Perú (o en un país por verificar).** Para cada una: contrato de encargo con cláusulas que impongan al menos las mismas obligaciones (art. 20), comunicación a la ANPD para su inscripción (art. 21.2), y mención en la Política de Privacidad (art. 6.1.7).` : "Todas tus herramientas declaradas tratan los datos en el Perú."}`;
      },
    },
    {
      id: "sectorial.8.revision-mensual",
      cites: [
        { norm: "ds-016-2024-jus", art: "46.1" },
      ],
      text: ({ company }) => `## 8. Revisión mensual (10 minutos)

- [ ] ¿Alguien nuevo entró o salió del equipo? Actualiza accesos (art. 46.1).
- [ ] ¿Se instaló una herramienta nueva que recibe datos? Decláralo en «Herramientas».
- [ ] ¿Hubo solicitudes de derechos pendientes de respuesta? Revisa los plazos.
- [ ] ¿Se perdió un equipo o se envió algo a la persona equivocada? Reporta a ${company.dpo_email || company.email} dentro de 2 horas.
- [ ] ¿Venció algún plazo de conservación? Purga y deja constancia en «Evidencias».`,
    },
    {
      id: "sectorial.nota.aprobacion",
      cites: [],
      nonLegal: "Firma y constancia de aprobación",
      text: ({ banks, date }) => `---

*Aprobado el ${date}. Complementa el «Documento de Seguridad». Los bancos declarados: ${banks.length ? banks.map((b) => `«${b.name}»`).join(", ") : "ninguno todavía"}.*`,
    },
  ],
};
