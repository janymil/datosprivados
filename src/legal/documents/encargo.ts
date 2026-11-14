import { isAbroad } from "@/lib/provider-catalog";
import {
  categoryLabel,
  companyShortId,
  COUNTRY_LABEL,
  DPA_LABEL,
  foreignProviders,
  table,
} from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Encargo del tratamiento y transferencias internacionales (antes `buildProcessingAgreement`). */

const digital = ({ profile }: LegalContext) => profile.terms === "plataforma";

/** Proveedores que necesitan contrato de encargo o tratan datos fuera del Perú. */
const contractProviders = ({ providers }: LegalContext) =>
  providers.filter((provider) => provider.dpa_status !== "no_aplica" || isAbroad(provider.country));

/** Tabla del Anexo I: proveedores declarados o, si no hay, la plantilla de plataforma o de negocio local. */
function annexRows(ctx: LegalContext): string {
  const { banks } = ctx;
  const bankList = banks.length ? banks.map((bank) => `«${bank.name}»`).join(", ") : "los bancos declarados en el inventario";
  const head = ["Proveedor", "Servicio", "Datos a los que accede", "País", "Base del flujo transfronterizo", "Subencargados"];
  const declared = contractProviders(ctx);
  if (declared.length)
    return table(
      [...head, "Contrato de encargo"],
      declared.map((provider) => [
        provider.name,
        provider.purpose || categoryLabel(provider.category),
        provider.data || "[datos a los que accede]",
        COUNTRY_LABEL(provider.country),
        isAbroad(provider.country)
          ? "Cláusulas contractuales (art. 20) + comunicación a la ANPD (art. 21.2)"
          : "No aplica (en el Perú)",
        "[verificar]",
        DPA_LABEL[provider.dpa_status],
      ])
    );
  if (digital(ctx))
    return table(head, [
      ["Proveedor de base de datos", "Almacenamiento", bankList, "[país]", "Cláusulas contractuales", "[verificar]"],
      ["Proveedor de autenticación", "Login, sesiones", "Correo, nombre, identificador", "[país]", "Cláusulas contractuales", "[verificar]"],
      ["Pasarela de pagos", "Cobros y suscripciones", "Nombre, correo, importes", "[país]", "Cláusulas contractuales", "[verificar]"],
      ["Proveedor de IA / OCR / voz", "Extracción de texto o transcripción", "Contenido redactado o audio", "[país]", "Cláusulas contractuales + supresión previa + prohibición de entrenamiento", "[verificar]"],
      ["Correo transaccional", "Notificaciones", "Correo, nombre", "[país]", "Cláusulas contractuales", "[verificar]"],
      ["Almacenamiento de archivos", "Documentos y exportaciones", "Imágenes, documentos", "[país]", "Cláusulas contractuales", "[verificar]"],
    ]);
  return table(head, [
    ["Estudio contable externo", "Contabilidad y planilla", "Datos de trabajadores y de comprobantes", "Perú", "No aplica (en el Perú)", "[verificar]"],
    ["Software de gestión / facturación electrónica", "Comprobantes y clientes", bankList, "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
    ["Pasarela de pagos / POS", "Cobros", "Nombre, importes, últimos 4 dígitos", "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
    ["Courier o delivery", "Entrega", "Nombre, dirección, teléfono del destinatario", "Perú", "No aplica (en el Perú)", "[verificar]"],
    ["WhatsApp Business, correo masivo o redes", "Comunicaciones", "Teléfono, correo, nombre", "[país]", "Cláusulas contractuales (suele ser del exterior)", "[verificar]"],
    ["Nube o respaldo", "Copias de seguridad", bankList, "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
    ["Empresa de seguridad / monitoreo de cámaras", "Videovigilancia", "Imágenes", "Perú", "No aplica (en el Perú)", "[verificar]"],
  ]);
}

export const encargoSpec: DocumentSpec = {
  kind: "encargo",
  join: "\n\n",
  clauses: [
    {
      id: "encargo.a.clausula-modelo",
      cites: [],
      text: (ctx) => {
        const { company } = ctx;
        const name = company.name;
        return `## A. Cláusula modelo de encargo del tratamiento (DS N.° 016-2024-JUS, arts. 28 a 33 y 36)

Se firma con cada proveedor que trate datos personales por cuenta de ${name}: ${digital(ctx) ? "hosting, base de datos, autenticación, correo, pagos, OCR, IA, soporte, analítica y backup" : "contador, courier, software de gestión, nube, agencia de marketing, empresa de seguridad y cualquier proveedor que reciba datos de tus clientes o trabajadores"}.

> **CLÁUSULA DE ENCARGO DEL TRATAMIENTO DE DATOS PERSONALES**
>
> Entre **${name}** (${companyShortId(company)}), en adelante el **RESPONSABLE**, y **________________________** (RUC/documento **____________**), en adelante el **ENCARGADO**, se acuerda:
>
> **1. Objeto y duración.** El ENCARGADO tratará datos personales por cuenta del RESPONSABLE únicamente para prestar el servicio de ____________________, mientras dure la relación contractual y el plazo necesario para la devolución o supresión.
>
> **2. Instrucciones.** Tratará los datos solo siguiendo instrucciones documentadas del RESPONSABLE. Si una instrucción contraviene la Ley N.° 29733 o su Reglamento, lo informará de inmediato y podrá suspenderla.
>
> **3. Finalidad limitada.** No usará los datos para fines propios, no los comercializará, no los cederá a terceros y no los empleará para entrenar modelos, elaborar perfiles ni mejorar sus propios productos sin autorización escrita.
>
> **4. Confidencialidad.** Todo su personal con acceso a los datos suscribe un compromiso de confidencialidad que sobrevive al término de la relación.
>
> **5. Seguridad.** Aplicará medidas técnicas y organizativas apropiadas: control de accesos, cifrado en tránsito y en reposo cuando corresponda, registro de accesos, gestión de vulnerabilidades y borrado seguro. Acreditarlas ante solicitud del RESPONSABLE.
>
> **6. Subencargados.** Solo podrá subcontratar con autorización previa del RESPONSABLE (art. 32), que se entiende dada si consta en este contrato, e impondrá al subencargado obligaciones equivalentes. El subencargado que use los datos para otro fin, o los transfiera contra las instrucciones, asume las obligaciones del titular del banco de datos (art. 33). Mantendrá una lista actualizada de subencargados.
>
> **7. Derechos de los titulares.** Atenderá las solicitudes de acceso, rectificación, cancelación, oposición y portabilidad que le traslade el RESPONSABLE, dentro del plazo que este indique para cumplir los plazos legales (8, 10 y 20 días hábiles).
>
> **8. Incidentes.** Informará **de forma inmediata** al RESPONSABLE de cualquier incidente de seguridad (art. 36 del DS N.° 016-2024-JUS) y, como máximo, dentro de **12 horas** desde que tome conocimiento, con la información necesaria para evaluar el incidente y notificar a la ANPD dentro de las 48 horas (art. 34).
>
> **9. Auditoría.** Permitirá al RESPONSABLE verificar el cumplimiento mediante cuestionarios, certificaciones vigentes (ISO 27001, SOC 2) o auditorías, con aviso razonable.
>
> **10. Devolución o supresión.** Al terminar el servicio devolverá los datos en formato estructurado o los suprimirá de forma segura, y lo acreditará por escrito (art. 30.4). No los conservará por más de **dos (2) años** desde la finalización del último encargo, salvo mandato legal expreso; en ese caso los devolverá al RESPONSABLE para su conservación mientras la obligación persista (art. 31.2). Queda prohibida la conservación indeterminada.
>
> **11. Titularidad.** El ENCARGADO no adquiere la titularidad de los bancos de datos ni de los datos derivados de ellos, y el contrato no contiene condiciones que le permitan asumirla (art. 29.2).`;
      },
    },
    {
      id: "encargo.b.encabezado",
      cites: [],
      text: () => `## B. Anexo I — Relación de encargados

Una fila por proveedor. Si un proveedor cambia de país o de subencargados, se actualiza la fila y se avisa a los titulares si afecta la información publicada.`,
    },
    {
      id: "encargo.b-anexo.proveedores",
      cites: [],
      when: (ctx) => contractProviders(ctx).length > 0,
      text: (ctx) => annexRows(ctx),
    },
    {
      id: "encargo.b-anexo.plataforma",
      cites: [],
      when: (ctx) => contractProviders(ctx).length === 0 && digital(ctx),
      text: (ctx) => annexRows(ctx),
    },
    {
      id: "encargo.b-anexo.local",
      cites: [],
      when: (ctx) => contractProviders(ctx).length === 0 && !digital(ctx),
      text: (ctx) => annexRows(ctx),
    },
    {
      id: "encargo.c.transferencia-internacional",
      cites: [],
      text: ({ company, banks, providers }) => {
        const name = company.name;
        const transfers = banks.filter((bank) => bank.transfers === "si");
        return `## C. Anexo II — Cláusula de transferencia internacional (flujo transfronterizo)

Aplica a ${foreignProviders(providers).length ? foreignProviders(providers).map((provider) => `${provider.name} (${COUNTRY_LABEL(provider.country)})`).join(", ") : transfers.length ? transfers.map((bank) => `«${bank.name}»`).join(", ") : "los bancos marcados con transferencia internacional"}. Los proveedores cloud con servidores fuera del Perú realizan transferencia internacional de datos personales.

**Régimen (arts. 18 a 21 del DS N.° 016-2024-JUS):** el flujo transfronterizo es libre hacia países con nivel adecuado declarado por la Autoridad (resolución de la Dirección General de Transparencia, Acceso a la Información Pública y Protección de Datos Personales, art. 19). En los demás casos el exportador debe dar **garantías adecuadas**, como cláusulas contractuales modelo u otros instrumentos que impongan al importador, como mínimo, las mismas obligaciones y las condiciones en que el titular consintió (art. 20.1). **En todo caso** el flujo debe comunicarse a la Autoridad para su inscripción en el Registro Nacional (art. 21.2); puedes pedirle una opinión previa, que emite en 30 días (art. 21.1). La carga de la prueba es tuya como exportador (art. 14). Si la Autoridad publica cláusulas modelo, úsalas en lugar de la cláusula de abajo (art. 20.2).

> **CLÁUSULA DE TRANSFERENCIA INTERNACIONAL DE DATOS PERSONALES**
>
> **Exportador:** ${name} (${companyShortId(company)}), domicilio ${company.address || "[completar]"}.
> **Importador:** ____________________, domicilio ____________________, país ____________________.
>
> **1. Datos y finalidad.** El importador recibirá las categorías de datos y los titulares descritos en el Anexo I, exclusivamente para el servicio indicado.
> **2. Garantías.** El importador se obliga a mantener un nivel de protección equiparable al de la Ley N.° 29733: finalidad limitada, confidencialidad, seguridad, atención de derechos, notificación de incidentes y responsabilidad.
> **3. Subencargados y transferencias ulteriores.** Cualquier transferencia posterior requiere autorización del exportador y obligaciones equivalentes.
> **4. Titulares.** El exportador informará a los titulares, en su Política de Privacidad, el país de destino, la finalidad y el mecanismo de garantía.
> **5. Terminación.** Al terminar, el importador devuelve o suprime los datos y lo acredita.
> **6. Responsabilidad.** El importador responde por el incumplimiento de estas obligaciones frente al exportador y, cuando corresponda, frente a la autoridad.`;
      },
    },
    {
      id: "encargo.d.checklist-firmas",
      cites: [],
      text: (ctx) => `## D. Checklist de firmas

${
  digital(ctx)
    ? `- [ ] Proveedor de base de datos y hosting.
- [ ] Autenticación.
- [ ] Pasarela(s) de pago.
- [ ] Proveedores de IA, OCR y voz (los que reciben contenido del usuario).
- [ ] Correo transaccional y soporte.
- [ ] Almacenamiento de archivos.
- [ ] Analítica, solo si se activa con consentimiento.`
    : `- [ ] Estudio contable y planilla.
- [ ] Software de gestión, facturación o reservas.
- [ ] Pasarela de pago o POS.
- [ ] Courier o delivery.
- [ ] WhatsApp Business, correo masivo y agencias de marketing.
- [ ] Nube o respaldo.
- [ ] Empresa de seguridad o monitoreo de cámaras.`
}
- [ ] Cada subencargado relevante, con obligaciones equivalentes (arts. 32 y 33).
- [ ] Anota en tu Política de Privacidad los destinatarios y los países de destino (art. 6.1.3 y 6.1.7).`,
    },
    {
      id: "encargo.nota.borrador",
      cites: [],
      nonLegal: "Nota de borrador",
      text: () => `---

*Borrador generado con DatosPrivados. Las cláusulas contractuales tipo de la ANPD y los contratos marco del proveedor (DPA) prevalecen si son más estrictos.*`,
    },
  ],
};
