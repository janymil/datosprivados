import { companyShortId, complaintsLink, isForeign } from "@/legal/shared";
import type { DocumentSpec } from "@/legal/types";

/** Libro de Reclamaciones: aviso, hoja y procedimiento (antes `buildComplaintBook`). */

export const reclamacionesSpec: DocumentSpec = {
  kind: "reclamaciones",
  join: "\n\n",
  clauses: [
    {
      id: "reclamaciones.a.aviso-obligatorio",
      cites: [],
      text: ({ company }) => {
        const contact = company.dpo_email || company.email;
        const complaintsUrl = complaintsLink(company);
        return `## A. Aviso obligatorio (visible en la web y en el local)

Debe estar en el pie de página y en la pantalla de pago, con enlace directo al libro. *DatosPrivados todavía no aloja tu Libro de Reclamaciones virtual: reemplaza el texto entre corchetes por el enlace del libro que uses (por ejemplo, el servicio gratuito del INDECOPI o el de tu plataforma de ventas).* Los datos de las hojas son un banco de datos personales: declara el banco «Libro de Reclamaciones».

> **LIBRO DE RECLAMACIONES**
> Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571) y su Reglamento del Libro de Reclamaciones (DS N.° 011-2011-PCM), este establecimiento cuenta con un **Libro de Reclamaciones** a tu disposición.
> Regístralo aquí: ${complaintsUrl}
> También puedes escribir a ${contact}.
> Si no atendemos tu reclamo, puedes acudir al **INDECOPI**: www.indecopi.gob.pe

Para establecimientos físicos, además: libro en formato físico en el mostrador, con aviso visible en el ingreso.`;
      },
    },
    {
      id: "reclamaciones.b.hoja",
      cites: [],
      text: ({ company }) => {
        const name = company.name;
        const idLine = isForeign(company)
          ? `${name} — ${companyShortId(company)} — Representante en el Perú: ${company.representative_name || "[por designar]"} — ${company.address || "[completar domicilio]"}`
          : `${name} — RUC ${company.ruc} — ${company.address || "[completar domicilio]"}`;
        return `## B. Hoja de reclamación (formato)

> **HOJA DE RECLAMACIÓN N.° ____________**
> Fecha: ____/____/______  Hora: ______
>
> **1. Proveedor**
> ${idLine}
>
> **2. Identificación del consumidor**
> Nombre completo: ______________________________________________
> Documento: DNI / CE / Pasaporte N.° ____________________________
> Domicilio: ____________________________________________________
> Teléfono: ____________________  Correo: ________________________
> ¿Es menor de edad? ☐ No ☐ Sí (en ese caso, datos del padre/madre/apoderado: ____________________)
>
> **3. Identificación del servicio contratado**
> Servicio o producto: __________________________________________
> Monto reclamado (si aplica): S/ ______________
> N.° de pedido, contrato o comprobante: ________________________
>
> **4. Detalle del reclamo o queja**
> ☐ **Reclamo** (disconformidad con el servicio o el cobro)
> ☐ **Queja** (malestar por la atención recibida)
> Descripción de los hechos: _____________________________________
> Pedido del consumidor: ________________________________________
>
> **5. Constancia**
> El consumidor declara que la información es veraz. Recibe una copia de esta hoja.
> Firma del consumidor: ____________________  Firma del proveedor: ____________________
>
> *Plazo de respuesta: máximo 30 días calendario. La respuesta se envía al correo o domicilio indicados.*`;
      },
    },
    {
      id: "reclamaciones.c.procedimiento",
      cites: [],
      text: ({ company }) => {
        const complaintsUrl = complaintsLink(company);
        return `## C. Procedimiento interno de atención (5 pasos)

1. **Registro (día 0):** toda hoja se numera y se ingresa el mismo día, con fecha y hora, en ${complaintsUrl} o en el registro interno. Nunca se rechaza una hoja por el motivo del reclamo.
2. **Acuse (día 1):** se envía copia al consumidor con el número asignado.
3. **Investigación (días 2 a 7):** se reúne el pedido, el comprobante, los correos y la grabación o registro de atención.
4. **Respuesta (máximo 30 días calendario):** se responde por escrito, con decisión, fundamento y medidas adoptadas. Se guarda evidencia del envío.
5. **Cierre y reporte:** se archiva la hoja con su respuesta por un mínimo de **2 años** y se revisan los reclamos repetidos para corregir la causa.`;
      },
    },
    {
      id: "reclamaciones.d.que-no-hacer",
      cites: [],
      text: () => `## D. Qué NO hacer

- No condicionar la atención a que el consumidor retiere el reclamo por otra vía.
- No responder verbalmente sin dejar constancia.
- No usar el libro como canal de marketing ni pedir datos innecesarios.
- No eliminar hojas: son registro obligatorio y prueba ante INDECOPI.`,
    },
    {
      id: "reclamaciones.nota.borrador",
      cites: [],
      nonLegal: "Nota de borrador",
      text: () => `---

*Borrador generado con DatosPrivados. El aviso y el formato deben coincidir con el canal realmente habilitado.*`,
    },
  ],
};
