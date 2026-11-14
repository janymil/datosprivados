import { table } from "@/legal/shared";
import type { DocumentSpec } from "@/legal/types";

/** Política de conservación y eliminación (antes `buildRetentionPolicy`). */

export const retencionSpec: DocumentSpec = {
  kind: "retencion",
  join: "\n\n",
  clauses: [
    {
      id: "retencion.1.regla-general",
      cites: [],
      text: ({ company }) => `## 1. Regla general

${company.name} conserva cada dato personal solo mientras exista una finalidad vigente o un plazo legal que obligue a mantenerlo. Al vencer, el dato se elimina, se suprime o se anonimiza de forma segura, y la operación se registra.`,
    },
    {
      id: "retencion.2.plazos-bancos",
      cites: [],
      text: ({ banks }) => {
        const rows = banks
          .map(
            (bank) =>
              `| «${bank.name}» | ${bank.retention || "[completar]"} | ${bank.channel || "digital"} | Eliminación o anonimización al vencer el plazo | [pendiente de registrar] |`
          )
          .join("\n");
        return `## 2. Plazos por banco de datos

Estos plazos son los declarados en tu inventario y deben coincidir con tu Política de Privacidad y tus fichas del SIPDP.

| Banco de datos | Plazo declarado | Soporte | Acción al vencer | Evidencia |
| --- | --- | --- | --- | --- |
${rows || "| [sin bancos declarados] | — | — | — | — |"}`;
      },
    },
    {
      id: "retencion.3.plazos-rubro",
      cites: [],
      text: ({ profile }) => `## 3. Plazos por tipo de dato para tu rubro (${profile.title})

${table(
  ["Tipo de dato", "Plazo sugerido", "Fundamento"],
  [
    ...profile.retention.map((row) => [row.data, row.term, row.basis]),
    ["Registros de acceso e interacción con datos (Documento de Seguridad)", "Mínimo 2 años", "Art. 46.3 del DS N.° 016-2024-JUS"],
    ["Datos tratados como encargado de otra empresa", "Máximo 2 años desde el último encargo", "Art. 31.2 del DS N.° 016-2024-JUS"],
    ["Copias de respaldo", "Rotativas (por ejemplo 30 días)", "Recuperación ante desastres"],
  ]
)}

*Los plazos son una referencia: si una norma especial fija un plazo distinto, prevalece. No se conservan datos de forma indeterminada (art. 31.2, regla general).*`,
    },
    {
      id: "retencion.4.bloqueo-eliminacion",
      cites: [],
      text: () => `## 4. Bloqueo y eliminación anticipada

Cuando el titular pide la supresión o cancelación, la sola presentación de la solicitud implica el **cese del tratamiento mediante el bloqueo** de los datos mientras se evalúa su eliminación (art. 82.3). Se eliminan sus datos salvo los que deban conservarse por razones históricas, estadísticas o científicas, o por la relación contractual o una obligación legal (art. 84); cuando es posible, se usan medios de disociación o anonimización para seguir tratándolos (art. 85). En ese caso se le informa qué se conserva y por qué, y se documenta ante él la supresión indicando a quién se transfirieron los datos (art. 83).

Al eliminar una cuenta o cerrar la relación, los datos activos se eliminan o bloquean de inmediato y las copias de respaldo se sobrescriben en su ciclo.`,
    },
    {
      id: "retencion.5.registro-purgas",
      cites: [],
      text: () => `## 5. Registro de purgas

Cada purga deja constancia de: fecha, banco o tabla afectada, criterio aplicado, número de registros eliminados y persona que la ejecutó. Este registro es la prueba del principio de minimización ante una fiscalización.`,
    },
    {
      id: "retencion.6.responsable-revision",
      cites: [],
      text: ({ company, date }) => `## 6. Responsable y revisión

- Responsable de ejecutar y registrar las purgas: ${company.dpo_name || "[responsable de privacidad]"} (${company.dpo_email || company.email}).
- Revisión de plazos: al menos una vez al año y cada vez que se cree o modifique un banco de datos.
- Aprobación: ${date}.`,
    },
    {
      id: "retencion.nota.borrador",
      cites: [],
      nonLegal: "Nota de borrador",
      text: () => `---

*Borrador generado con DatosPrivados a partir de los plazos declarados en tus bancos de datos.*`,
    },
  ],
};
