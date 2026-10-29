import type { Company, DataBank } from "./db";
import { formatDate } from "./format";

/**
 * Generadores de documentos. Son borradores base: el texto parte de la
 * información que la empresa cargó en PrivadoPE y debe ser revisado por un
 * abogado antes de publicarse. No sustituyen asesoría legal.
 */

const LEGAL_BASIS: Record<string, string> = {
  consentimiento: "Consentimiento del titular (art. 5 y 6 de la Ley 29733)",
  ejecucion_contrato: "Ejecución de una relación contractual (art. 14.2 del Reglamento)",
  obligacion_legal: "Cumplimiento de una obligación legal (art. 14.1 del Reglamento)",
  interes_legitimo: "Interés legítimo del responsable (art. 14.5 del Reglamento)",
  interes_publico: "Interés público (art. 14.4 del Reglamento)",
};

export function legalBasisLabel(value: string) {
  return LEGAL_BASIS[value] ?? value;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://privadope.pe";
}

function sentence(value: string) {
  return `${value.trim().replace(/[.\s]+$/, "")}.`;
}

export function buildPrivacyPolicy(company: Company, banks: DataBank[]): string {
  const date = formatDate(new Date().toISOString(), "long");
  const bankList = banks.length ? banks : [];
  const registeredChannels = Array.from(
    new Set(bankList.map((b) => b.channel).filter(Boolean))
  );

  const purposes = bankList
    .map(
      (bank) =>
        `- **${bank.name}.** ${sentence(bank.purpose || "finalidad por definir")} Datos tratados: ${sentence(bank.data_categories || "por definir")} Base legal: ${legalBasisLabel(bank.legal_basis)}. Conservación: ${sentence(bank.retention || "por definir")}`
    )
    .join("\n");

  const transfers = bankList.filter((b) => b.transfers === "si");

  return `## 1. Quién es el responsable del tratamiento

${company.name}, con RUC ${company.ruc}, domicilio en ${company.address || "por completar"} y correo electrónico ${company.email}, es responsable del tratamiento de los datos personales que recopila a través de sus canales físicos y digitales.

Para consultas sobre privacidad puedes escribir a ${company.dpo_email || company.email}${company.dpo_name ? `, a cargo de ${company.dpo_name}` : ""}.

## 2. Qué datos tratamos y para qué

Tratamos únicamente los datos necesarios para las siguientes finalidades:

${purposes || "- Por definir."}

No utilizamos tus datos para finalidades distintas a las informadas sin pedirte un nuevo consentimiento.

## 3. Base legal

Tratamos datos personales sobre la base de: (i) tu consentimiento libre, previo, expreso e informado; (ii) la ejecución de la relación contractual que mantenemos contigo; (iii) el cumplimiento de obligaciones legales; y (iv) el interés legítimo, cuando corresponda. En cada banco de datos indicamos la base aplicable.

## 4. Cuánto tiempo conservamos los datos

Conservamos los datos durante los plazos indicados para cada finalidad y, luego, durante los plazos de prescripción legal o contractual que resulten aplicables. Cumplido el plazo, los eliminamos o anonimizamos de forma segura.

## 5. Quién puede acceder a tus datos

Acceden a los datos nuestro personal autorizado y los proveedores que nos prestan servicios de soporte, logística, pagos, comunicaciones o contabilidad, en calidad de encargados del tratamiento y bajo obligaciones de confidencialidad. ${company.name} no vende datos personales.

${transfers.length > 0 ? `Algunos proveedores pueden estar ubicados fuera del Perú. En esos casos verificamos que exista un nivel adecuado de protección o aplicamos garantías contractuales apropiadas, conforme al Reglamento de la Ley 29733.` : `Actualmente no realizamos transferencias internacionales de datos personales. Si las realizáramos, lo informaríamos y aplicaríamos las garantías exigidas por la normativa.`}

## 6. Tus derechos ARCO

Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como revocar tu consentimiento, de forma gratuita:

- A través de nuestro formulario en línea: ${appUrl()}/solicitud/${company.slug}
- Escribiendo a ${company.dpo_email || company.email}

Responderemos en un plazo máximo de 20 días hábiles contados desde la recepción de la solicitud. Si necesitamos más tiempo, te lo comunicaremos dentro de ese plazo. También puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales (ANPD) si consideras que no hemos atendido tu solicitud correctamente.

## 7. Cómo protegemos tus datos

Aplicamos medidas técnicas y organizativas razonables: control de acceso por roles, contraseñas robustas, registro de actividad, copias de seguridad, cifrado en tránsito y capacitación del personal. Si ocurre un incidente que afecte tus datos, lo evaluamos y notificamos conforme a la normativa.

## 8. Cookies y tecnologías similares

Nuestro sitio utiliza cookies necesarias para su funcionamiento y, cuando corresponde, cookies analíticas o publicitarias. Puedes configurar tu navegador para rechazarlas; algunas funciones podrían dejar de estar disponibles.

## 9. Cambios a esta política

Podemos actualizar esta política para reflejar cambios en nuestros procesos o en la normativa. Publicaremos la versión vigente en esta misma dirección e indicaremos la fecha de actualización.

## 10. Vigencia

Esta política rige desde el ${date}. Canales de atención declarados: ${registeredChannels.length ? registeredChannels.join(", ") : "web"}.

---

*Documento generado con PrivadoPE a partir de la información declarada por la empresa. Es un borrador de trabajo y debe ser validado por un abogado antes de su publicación.*`;
}

export function buildConsentTexts(company: Company): string {
  const name = company.name;
  const contact = company.dpo_email || company.email;

  return `## A. Formulario web (checkbox obligatorio)

> Autorizo a ${name} a tratar mis datos personales (nombre, correo electrónico y teléfono) con la finalidad de gestionar mi solicitud, pedido o consulta, y a contactarme por correo o WhatsApp sobre el estado de la misma. He leído la Política de Privacidad y entiendo que puedo ejercer mis derechos ARCO escribiendo a ${contact}. El consentimiento es libre, previo, expreso e informado, y puedo revocarlo en cualquier momento.

El checkbox **no** debe estar premarcado y el envío del formulario no puede condicionarse a la aceptación de comunicaciones comerciales.

## B. WhatsApp (opt-in)

> Hola, soy ${name}. Para atenderte por este canal necesitamos tu autorización: ¿aceptas que tratemos tu número y los datos que nos compartas para responder tu consulta y enviarte información sobre tu pedido? Puedes decir «BAJA» en cualquier momento para dejar de recibir mensajes. Más información: ${appUrl()}/p/${company.slug}

Buenas prácticas: guarda el mensaje de aceptación (captura o registro del sistema) con fecha y número. No incluyas al titular en listas de marketing sin un opt-in separado.

## C. Correo electrónico (doble opt-in)

> Asunto: Confirma tu suscripción a ${name}
>
> Hola: recibimos tu solicitud para suscribirte a nuestras novedades. Confirma tu consentimiento haciendo clic aquí: [enlace de confirmación]. Si no fuiste tú, ignora este mensaje y no volveremos a escribirte.
>
> Al confirmar, autorizas a ${name} a tratar tu correo electrónico para enviarte novedades y promociones. Puedes darte de baja en cada envío o escribir a ${contact}. Política de Privacidad: ${appUrl()}/p/${company.slug}

## D. Formulario físico / presencial

> Declaro haber leído y comprendido el aviso de privacidad de ${name} y autorizo el tratamiento de mis datos personales para la finalidad indicada en este formulario. Firma: ______________________  Fecha: ____/____/______

## E. Aviso de privacidad corto (para letra pequeña)

> ${name} trata tus datos para gestionar tu compra o solicitud. Puedes ejercer tus derechos ARCO en ${appUrl()}/solicitud/${company.slug} o escribiendo a ${contact}. Consulta la política completa en ${appUrl()}/p/${company.slug}.

---

*Textos base generados con PrivadoPE. Adáptalos a cada canal y valídalos con tu abogado.*`;
}

export function buildSecurityDocument(company: Company, banks: DataBank[]): string {
  const date = formatDate(new Date().toISOString(), "long");
  const inventory = banks
    .map(
      (bank, index) =>
        `${index + 1}. **${bank.name}** — ${bank.purpose || "finalidad por definir"}. Categorías: ${bank.data_categories || "por definir"}. Soporte: ${bank.channel || "digital"}. Estado del registro: ${bank.status === "registrado" ? `registrado en SIPDP (${bank.sipdp_code ?? "código pendiente"})` : "borrador"}.`
    )
    .join("\n");

  return `## 1. Objeto y alcance

Este documento describe las medidas de seguridad aplicadas por ${company.name} (RUC ${company.ruc}) para proteger los datos personales contenidos en sus bancos de datos, conforme a la Ley 29733 y su Reglamento.

## 2. Inventario de bancos de datos

${inventory || "Aún no se han declarado bancos de datos."}

## 3. Responsables y funciones

- **Responsable del tratamiento:** ${company.name}.
- **Responsable de privacidad / Oficial de Datos Personales:** ${company.dpo_name || "por designar"} (${company.dpo_email || company.email}).
- **Encargados externos:** proveedores de hosting, pagos, logística, comunicaciones y contabilidad, sujetos a contrato y deber de confidencialidad.

## 4. Medidas de seguridad

**Organizativas**

- Acceso a los bancos de datos limitado por rol y necesidad de conocer.
- Altas y bajas de usuarios registradas y revisadas semestralmente.
- Capacitación anual al personal sobre protección de datos y phishing.
- Cláusulas de confidencialidad en contratos con encargados.

**Técnicas**

- Autenticación con contraseñas robustas y segundo factor en servicios críticos.
- Cifrado en tránsito (TLS) y en reposo cuando el proveedor lo permite.
- Copias de seguridad periódicas con prueba de restauración.
- Registro de accesos y cambios en sistemas críticos.
- Seudonimización o minimización en entornos de prueba.

## 5. Gestión de incidentes de seguridad

1. Detección y registro del incidente (fecha, hora, sistemas afectados).
2. Contención y evaluación del riesgo para los titulares.
3. Notificación a la ANPD dentro de las 48 horas cuando el incidente afecte datos personales, según corresponda.
4. Comunicación a los titulares afectados cuando exista riesgo.
5. Documentación de medidas correctivas y lecciones aprendidas.

## 6. Conservación y eliminación

Los datos se conservan por los plazos declarados en cada banco de datos. Al vencer el plazo se eliminan o anonimizan de forma segura, dejando constancia del procedimiento.

## 7. Revisión

Este documento se revisa al menos una vez al año o cuando cambien los procesos, los sistemas o la normativa aplicable. Última actualización: ${date}.

---

*Documento base generado con PrivadoPE. Complétalo con el detalle técnico de tus sistemas y valídalo con un abogado.*`;
}
