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
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const complaintsUrl = complaintsLink(company);
  const country = company.country || "el Perú";
  const paidBanks = banks.filter((bank) => /pago|factur|suscrip|cobro/i.test(`${bank.name} ${bank.purpose}`));
  const profile = sectorLegalProfile(company);

  if (profile.terms === "venta") return buildSalesTerms(company, profile);
  const isFintech = profile.family === "fintech";

  const priceClause = isForeign(company)
    ? `Los precios se muestran en dólares estadounidenses (USD) salvo que la página de pago indique soles peruanos (PEN). Cuando la venta se realice a un consumidor final en el Perú, el precio incluye el Impuesto General a las Ventas (IGV, 18%): actuamos como proveedor de servicios digitales no domiciliado e inscribimos nuestro RUC para recaudar el impuesto en cada cobro (Decreto Legislativo N.° 1623). El comprobante que recibes es la constancia de pago de la pasarela; no emitimos comprobantes de pago electrónicos peruanos.`
    : `Los precios se muestran en soles peruanos (PEN) e incluyen el Impuesto General a las Ventas (IGV, 18%). Emitimos comprobante de pago electrónico por cada cobro y lo enviamos al correo de la cuenta.`;

  return `## 1. Quién presta el servicio

${controllerParagraph(company)}.

El servicio se comercializa bajo la marca que ${name} use en su web y aplicaciones móviles.

## 2. Objeto y aceptación

Estos Términos regulan el acceso y uso del servicio descrito en la sección 3. Al crear una cuenta, marcar la casilla de aceptación o pagar un plan, declaras que:

1. Tienes al menos **18 años** y capacidad legal para contratar.
2. Has leído y aceptas estos Términos y la **Política de Privacidad** (${policyUrl}).
3. La información que registras es veraz y te corresponde.

La versión aplicable es la publicada al momento de la contratación. Guardamos registro de la versión aceptada, la fecha y la hora.

## 3. Descripción del servicio y planes

El servicio es una plataforma digital (${profile.title.toLowerCase()}). Funciones disponibles, límites de uso y precio dependen del plan contratado y de las condiciones publicadas en la página de precios. [Describe aquí, en dos líneas, qué hace tu servicio.]
${
  isFintech
    ? `
**El servicio no es un servicio financiero.** No somos banco, entidad de crédito, corredor, asesor de inversiones ni estudio contable. Los resúmenes, categorías y proyecciones son informativos: las decisiones sobre tu dinero son tuyas.
`
    : ""
}

## 4. Tu cuenta

1. Eres responsable de la confidencialidad de tus credenciales y de la actividad de tu cuenta.
2. No puedes compartir el acceso con terceros ni revender el servicio sin autorización escrita.
3. Debes informarnos de inmediato cualquier acceso no autorizado a ${contact}.

## 5. Precios, impuestos y suscripciones

${priceClause}

**Renovación automática.** Los planes de pago se renuevan automáticamente al final de cada ciclo (mensual o anual) por el mismo medio de pago, salvo que canceles antes de la fecha de renovación. El precio de la renovación es el vigente a esa fecha y te lo mostramos antes de cobrarlo.

**Pagos rechazados.** Si un cobro es rechazado, intentamos el cobro nuevamente durante un periodo de gracia y te avisamos por correo. Si el pago no se regulariza, la cuenta pasa al plan gratuito y sus funciones de pago se desactivan.

## 6. Cancelación, reembolsos y derecho de retracto

1. Puedes cancelar la renovación en cualquier momento desde tu perfil, sin llamadas ni formularios.
2. Mantienes las funciones de pago hasta el último día del periodo ya pagado.
3. No reembolsamos periodos ya iniciados, salvo: cobro duplicado, cobro posterior a una cancelación oportuna, cobro no autorizado o falla nuestra que te impidió usar el servicio.
4. La política de reembolsos completa se publica en la misma web y forma parte de estos Términos.
5. En el Perú no existe un derecho de retracto general para servicios digitales ya iniciados; los derechos que la **Ley N.° 29571** te reconoce como consumidor se mantienen íntegros.

## 7. Uso aceptable

No puedes: usar el servicio para actividades ilícitas o fraudulentas; subir datos de terceros sin su consentimiento; intentar acceder a cuentas ajenas o vulnerar la seguridad; extraer datos de forma masiva; ni usar el servicio para elaborar perfiles de personas sin base legal.

## 8. Tus datos y privacidad

Los datos que registras son tuyos. El tratamiento se describe en la **Política de Privacidad** (${policyUrl}), que forma parte de estos Términos. Puedes exportar tus datos y eliminar tu cuenta desde tu perfil, y ejercer tus derechos ARCO en ${arcoUrl} o escribiendo a ${contact}.

## 9. Contenido del usuario y propiedad intelectual

Conservas la titularidad de los datos y archivos que subes y nos otorgas solo la licencia necesaria para prestar el servicio. El software, las marcas, los textos y las plantillas de ${name} son de su titularidad y no pueden copiarse sin autorización.

## 10. Disponibilidad y cambios en el servicio

Prestamos el servicio con esfuerzos comercialmente razonables, sin garantizar disponibilidad ininterrumpida. Podemos suspenderlo por mantenimiento, actualizaciones o causas de fuerza mayor. Si cambiamos funciones esenciales o el precio, lo avisamos con **30 días** de anticipación y puedes cancelar antes de que el cambio te afecte.

## 11. Limitación de responsabilidad

En la máxima medida permitida por ley, ${name} no responde por daños indirectos, lucro cesante ni pérdida de datos derivada de un uso distinto al previsto. Nuestra responsabilidad total se limita al monto que hayas pagado en los **doce (12) meses** anteriores al hecho.

Esta limitación **no se aplica** a dolo, culpa inexcusable, daño a la persona, ni a los derechos que la ley reconoce al consumidor con carácter indisponible.

## 12. Terminación

Puedes dejar de usar el servicio y eliminar tu cuenta cuando quieras. Podemos suspender o cerrar una cuenta por incumplimiento grave de estos Términos, previo aviso salvo riesgo inminente de seguridad o exigencia legal. Al terminar, conservamos únicamente los datos que la ley nos obliga a mantener por plazos tributarios o de defensa de reclamaciones.

## 13. Libro de Reclamaciones y atención al consumidor

Contamos con **Libro de Reclamaciones virtual** gratuito, conforme a la Ley N.° 29571: ${complaintsUrl}. Puedes registrar un reclamo (disconformidad con el servicio o un cobro) o una queja (malestar por la atención). Respondemos en un plazo máximo de **30 días calendario**. Registrar un reclamo no impide acudir al **INDECOPI** ni a otras vías legales.

## 14. Ley aplicable y jurisdicción

Si eres **consumidor y resides en el Perú**, estos Términos se rigen por las leyes del **Perú** y puedes acudir al INDECOPI o a los tribunales de tu domicilio. Nada en esta cláusula reduce la protección que la Ley N.° 29571 te reconoce.

Para los demás usuarios, estos Términos se rigen por las leyes de **${country}**${isForeign(company) ? "" : " y las controversias se someten a los tribunales de Lima"}.

## 15. Contacto y vigencia

Consultas, reclamos o ejercicio de derechos: **${contact}**. Domicilio: ${company.address || "[completar domicilio]"}${isForeign(company) ? ` · Representante en el Perú: ${company.representative_name || "[por designar]"}${company.representative_address ? `, ${company.representative_address}` : ""}` : ""}.

Vigencia: desde el **${date}**.${paidBanks.length ? `\n\n*Bancos de datos involucrados en la facturación:* ${paidBanks.map((bank) => `«${bank.name}»`).join(", ")}.` : ""}

---

*Borrador generado con DatosPrivados a partir de la información declarada por ${name}. Revísalo con un abogado antes de publicar.*`;
}

/**
 * Términos de venta para negocios que ofrecen bienes o servicios (no una
 * plataforma digital): compra, entrega, cambios y garantía, atención al consumidor.
 * Las reglas de consumo vienen de la Ley N.° 29571; no se inventan derechos de
 * devolución que la ley no reconoce.
 */
function buildSalesTerms(company: Company, profile: SectorLegalProfile): string {
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const complaintsUrl = complaintsLink(company);

  return `## 1. Quién vende o presta el servicio

${controllerParagraph(company)}.

## 2. Aceptación

Al comprar, reservar o contratar por nuestros canales (web, redes, WhatsApp o local), declaras que tienes al menos **18 años** (o actúas con autorización de tus padres o tutores), que la información que nos das es veraz y que conoces estos Términos y la **Política de Privacidad** (${policyUrl}).

## 3. Productos y servicios (${profile.title})

La descripción, las características y el precio de cada producto o servicio se muestran antes de que confirmes tu compra. [Indica aquí condiciones propias de tu rubro: horarios, citas, reservas, plazos de entrega, requisitos de edad o de salud.]

## 4. Precios, impuestos y medios de pago

Los precios están en soles peruanos (PEN), **incluyen el Impuesto General a las Ventas (IGV, 18%)** y los demás tributos, y se muestran antes de pagar (Ley N.° 29571). Emitimos comprobante de pago electrónico por cada venta. Los cobros con tarjeta se procesan en una pasarela de pagos; ${name} no guarda el número completo de tu tarjeta.

## 5. Entrega, cambios, devoluciones y garantía

1. Las **entregas** se hacen en la dirección y plazo informados. Si no estás, coordinamos una segunda entrega.
2. Los productos tienen la **garantía** legal y comercial que corresponde conforme a la Ley N.° 29571 (idoneidad del producto o servicio). Si el producto no es el que ofrecimos o tiene defectos, puedes pedir su reparación, reposición o la devolución del dinero.
3. Para **cambios y devoluciones** por otras razones, aplican las condiciones que informamos en la compra. [Detalla plazo, estado del producto y exclusiones.]
4. Las promociones y la publicidad nos obligan en lo que informan (Ley N.° 29571).

## 6. Tus datos personales

El tratamiento de tus datos se describe en la **Política de Privacidad** (${policyUrl}). Usamos tus datos para atender tu compra o servicio, emitir comprobantes y cumplir obligaciones legales. **Solo te enviaremos publicidad si lo autorizas por separado** y puedes darte de baja gratis. Ejerce tus derechos ARCO en ${arcoUrl} o escribiendo a ${contact}.

## 7. Uso aceptable de nuestros canales

No uses nuestros canales para actividades ilícitas, ni envíes datos de terceros sin su consentimiento, ni intentes vulnerar la seguridad de nuestra web o cuentas.

## 8. Libro de Reclamaciones y atención al consumidor

Contamos con **Libro de Reclamaciones** conforme a la Ley N.° 29571 y su Reglamento (DS N.° 011-2011-PCM): físico en el local y virtual en ${complaintsUrl}. Respondemos en un plazo máximo de **30 días calendario**. Registrar un reclamo no impide acudir al **INDECOPI** ni a otras vías legales.

## 9. Responsabilidad

Respondemos por la idoneidad de lo que vendemos y por los daños que causemos con dolo o culpa. Esta cláusula no limita los derechos que la Ley N.° 29571 te reconoce como consumidor con carácter indisponible.

## 10. Ley aplicable y jurisdicción

Estos Términos se rigen por las leyes del **Perú**. Si eres consumidor, puedes acudir al INDECOPI o a los tribunales de tu domicilio.

## 11. Contacto y vigencia

Consultas, reclamos o ejercicio de derechos: **${contact}**. Domicilio: ${company.address || "[completar domicilio]"}${isForeign(company) ? ` · Representante en el Perú: ${company.representative_name || "[por designar]"}` : ""}.

Vigencia: desde el **${date}**.

---

*Borrador generado con DatosPrivados para un negocio de ${profile.title.toLowerCase()}. Completa los textos entre corchetes y revísalo con un abogado antes de publicar.*`;
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
  const name = company.name;
  const transfers = banks.filter((bank) => bank.transfers === "si");
  const bankList = banks.length
    ? banks.map((bank) => `«${bank.name}»`).join(", ")
    : "los bancos declarados en el inventario";
  const profile = sectorLegalProfile(company);
  const digital = profile.terms === "plataforma";
  const head = ["Proveedor", "Servicio", "Datos a los que accede", "País", "Base del flujo transfronterizo", "Subencargados"];
  const contractProviders = providers.filter((provider) => provider.dpa_status !== "no_aplica" || isAbroad(provider.country));
  const providerHead = [...head, "Contrato de encargo"];
  const annexRows = contractProviders.length
    ? table(
        providerHead,
        contractProviders.map((provider) => [
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
      )
    : digital
    ? table(head, [
        ["Proveedor de base de datos", "Almacenamiento", bankList, "[país]", "Cláusulas contractuales", "[verificar]"],
        ["Proveedor de autenticación", "Login, sesiones", "Correo, nombre, identificador", "[país]", "Cláusulas contractuales", "[verificar]"],
        ["Pasarela de pagos", "Cobros y suscripciones", "Nombre, correo, importes", "[país]", "Cláusulas contractuales", "[verificar]"],
        ["Proveedor de IA / OCR / voz", "Extracción de texto o transcripción", "Contenido redactado o audio", "[país]", "Cláusulas contractuales + supresión previa + prohibición de entrenamiento", "[verificar]"],
        ["Correo transaccional", "Notificaciones", "Correo, nombre", "[país]", "Cláusulas contractuales", "[verificar]"],
        ["Almacenamiento de archivos", "Documentos y exportaciones", "Imágenes, documentos", "[país]", "Cláusulas contractuales", "[verificar]"],
      ])
    : table(head, [
        ["Estudio contable externo", "Contabilidad y planilla", "Datos de trabajadores y de comprobantes", "Perú", "No aplica (en el Perú)", "[verificar]"],
        ["Software de gestión / facturación electrónica", "Comprobantes y clientes", bankList, "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
        ["Pasarela de pagos / POS", "Cobros", "Nombre, importes, últimos 4 dígitos", "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
        ["Courier o delivery", "Entrega", "Nombre, dirección, teléfono del destinatario", "Perú", "No aplica (en el Perú)", "[verificar]"],
        ["WhatsApp Business, correo masivo o redes", "Comunicaciones", "Teléfono, correo, nombre", "[país]", "Cláusulas contractuales (suele ser del exterior)", "[verificar]"],
        ["Nube o respaldo", "Copias de seguridad", bankList, "[país]", "Cláusulas contractuales si es del exterior", "[verificar]"],
        ["Empresa de seguridad / monitoreo de cámaras", "Videovigilancia", "Imágenes", "Perú", "No aplica (en el Perú)", "[verificar]"],
      ]);

  return `## A. Cláusula modelo de encargo del tratamiento (DS N.° 016-2024-JUS, arts. 28 a 33 y 36)

Se firma con cada proveedor que trate datos personales por cuenta de ${name}: ${digital ? "hosting, base de datos, autenticación, correo, pagos, OCR, IA, soporte, analítica y backup" : "contador, courier, software de gestión, nube, agencia de marketing, empresa de seguridad y cualquier proveedor que reciba datos de tus clientes o trabajadores"}.

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
> **11. Titularidad.** El ENCARGADO no adquiere la titularidad de los bancos de datos ni de los datos derivados de ellos, y el contrato no contiene condiciones que le permitan asumirla (art. 29.2).

## B. Anexo I — Relación de encargados

Una fila por proveedor. Si un proveedor cambia de país o de subencargados, se actualiza la fila y se avisa a los titulares si afecta la información publicada.

${annexRows}

## C. Anexo II — Cláusula de transferencia internacional (flujo transfronterizo)

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
> **6. Responsabilidad.** El importador responde por el incumplimiento de estas obligaciones frente al exportador y, cuando corresponda, frente a la autoridad.

## D. Checklist de firmas

${
  digital
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
- [ ] Anota en tu Política de Privacidad los destinatarios y los países de destino (art. 6.1.3 y 6.1.7).

---

*Borrador generado con DatosPrivados. Las cláusulas contractuales tipo de la ANPD y los contratos marco del proveedor (DPA) prevalecen si son más estrictos.*`;
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
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const shortId = companyShortId(company);
  const contact = company.dpo_email || company.email;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const address = company.address || "[domicilio]";
  const profile = sectorLegalProfile(company);

  return `## A. Aviso de privacidad para trabajadores, practicantes y colaboradores

*Se entrega al firmar el contrato (o al ingresar) y se guarda el cargo firmado en el legajo. Cumple el deber de informar del art. 18 de la Ley N.° 29733 y del art. 6 del DS N.° 016-2024-JUS.*

> **AVISO DE PRIVACIDAD PARA EL PERSONAL**
>
> **${name}** (${shortId}), con domicilio en ${address}, es titular del banco de datos «Colaboradores y postulantes» y responsable del tratamiento de tus datos personales.
>
> - **Finalidades:** gestionar tu contratación y relación laboral, pagar remuneraciones y beneficios, declarar en la planilla electrónica (PLAME) y ante SUNAT, EsSalud, AFP/ONP y SUNAFIL, gestionar seguridad y salud en el trabajo, controlar la asistencia y atender tus solicitudes.
> - **Datos:** identificación, domicilio, contacto, estado civil y carga familiar, estudios y experiencia, cuenta bancaria, datos de planilla y, cuando la ley lo exige, datos sensibles de salud (descansos médicos, exámenes médicos ocupacionales, accidentes de trabajo).
> - **Base legal:** ejecución del contrato de trabajo (art. 14, numeral 5, de la Ley) y cumplimiento de obligaciones laborales, tributarias y de seguridad social. Para finalidades adicionales (por ejemplo, fotos para redes o la bolsa de talento) te pediremos tu autorización aparte.
> - **Destinatarios:** estudio contable externo, entidades bancarias, SUNAT, EsSalud, AFP/ONP, SUNAFIL, aseguradoras (SCTR/EPS) y, cuando corresponda, la autoridad que lo requiera por mandato legal.
> - **Obligatoriedad:** los datos solicitados son necesarios para la relación laboral; si no los proporcionas no podremos contratarte ni cumplir las obligaciones legales. Los datos opcionales se señalan como tales.
> - **Conservación:** durante el vínculo laboral y 5 años desde el cese por obligaciones laborales y tributarias, y luego se eliminan o bloquean.
> - **Derechos:** puedes ejercer gratis tus derechos de acceso, rectificación, cancelación, oposición y portabilidad escribiendo a ${contact}, en ${arcoUrl} o en recursos humanos. Si no te respondemos o rechazamos tu pedido, puedes recurrir a la Autoridad Nacional de Protección de Datos Personales.
>
> Recibí este aviso: Nombre ________________________  DNI ______________  Firma ______________  Fecha ____/____/20___

## B. Autorización para datos sensibles del personal (salud y biometría)

*Art. 8 del DS N.° 016-2024-JUS: por escrito. Úsala para el examen médico ocupacional, el control biométrico de asistencia y cualquier otro dato sensible que **no** sea indispensable para cumplir una obligación legal. Lo que la ley te obliga a registrar (por ejemplo, una baja médica para la planilla) se informa en el Aviso; no se condiciona el contrato a un consentimiento que no es necesario.*

> **AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS SENSIBLES — PERSONAL**
> Yo, ________________________________________, DNI/CE N.° ______________, autorizo a **${name}** a tratar mis datos de ☐ salud (exámenes médicos ocupacionales, descansos médicos, atenciones de emergencia) ☐ biométricos (huella / rostro para el control de asistencia) con la finalidad de cumplir las normas de seguridad y salud en el trabajo y controlar mi asistencia. Entiendo que:
> 1. el empleador recibe, por regla general, la conclusión de aptitud y las restricciones necesarias para el puesto, no el diagnóstico clínico;
> 2. los datos se guardan con acceso restringido al área autorizada;
> 3. puedo revocar esta autorización o pedir un mecanismo alternativo de asistencia sin consecuencias para mi empleo.
>
> Firma: ________________________  Fecha: ____/____/20___

## C. Aviso para postulantes (CV y entrevistas)

> **AVISO PARA POSTULANTES**
> **${name}** tratará los datos de tu CV, entrevistas y evaluaciones para evaluar tu candidatura y, si resultas seleccionado, para contratarte. No te pediremos datos sensibles ni de tu familia salvo que el puesto lo exija. Si no resultas seleccionado, eliminaremos tus datos **en 6 meses**, salvo que nos autorices a conservarlos para futuras convocatorias (☐ Sí autorizo ☐ No autorizo). Derechos y contacto: ${contact} · ${arcoUrl}.
${profile.family === "rrhh" ? ">\n> Usamos herramientas automáticas para ordenar candidatos; ninguna decisión de descarte se toma sin revisión de una persona (art. 87 del DS N.° 016-2024-JUS)." : ""}

## D. Aviso de monitoreo en el trabajo (cámaras, correo, GPS)

*La vigilancia laboral es lícita si es proporcional, está informada y persigue seguridad o control de la actividad laboral; no puede invadir la intimidad (baños, vestuarios, descanso). Las cámaras instaladas por seguridad no deben usarse como control de desempeño salvo que lo informes y sea proporcional (Opinión Consultiva N.° 045-2021-JUS/DGTAIPD).*

> **AVISO DE MONITOREO**
> En ${name} se usan: ☐ cámaras de seguridad en [zonas] ☐ correo y herramientas corporativas ☐ GPS en vehículos de trabajo ☐ control biométrico de asistencia. Su finalidad es [seguridad de personas y bienes / control de la jornada / localización de la flota]. No se monitorea ninguna zona privada ni se usa el GPS fuera del horario laboral. Las imágenes se conservan según el cartel de videovigilancia. Más información: ${contact}.

## E. Uso de correo, mensajería y equipos (art. 46.4)

> 1. Los datos personales de clientes y trabajadores se tratan solo en las cuentas y aplicaciones aprobadas por **${name}**.
> 2. No se envían bases de datos, fotos de documentos ni listas por cuentas personales de correo o redes, ni se crean grupos de WhatsApp con datos de clientes sin autorización de la administración.
> 3. Los equipos se bloquean al ausentarse; no se retiran equipos ni archivos del local sin autorización.
> 4. Toda pérdida de equipo o error de envío se reporta de inmediato a ${contact} (máximo 2 horas) para cumplir el plazo de 48 horas ante la ANPD.

## F. Constancia de capacitación (art. 46.2)

> Capacitación en protección de datos personales: fecha ____/____/20___ · Duración ____ · Temas: deber de confidencialidad, uso de claves, incidentes en 48 horas, derechos ARCO, uso de WhatsApp y correo.
> Asistentes: Nombre ________________  Firma ____________

---

*Aprobado el ${date}. Complementa el «Compromiso de Confidencialidad» y el «Documento de Seguridad». Revísalo con un abogado laboral si usas control biométrico o monitoreo.*`;
}

/**
 * Procedimiento interno de derechos ARCO: lo que el reglamento exige que el
 * responsable tenga resuelto antes de que llegue la primera solicitud.
 */
export function buildArcoProcedure(company: Company): string {
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const owner = company.dpo_name || "[responsable de privacidad]";

  return `## 1. Objeto y responsable

Este procedimiento explica cómo ${name} recibe, responde y documenta las solicitudes de derechos de las personas titulares de datos personales (información, acceso, rectificación, cancelación, oposición, tratamiento objetivo, portabilidad y revocación del consentimiento), conforme a la Ley N.° 29733 y a los arts. 61 a 88 del DS N.° 016-2024-JUS. Responsable de ejecutarlo: **${owner}** (${contact}).

## 2. Canales (gratuitos, art. 67)

- Formulario digital: ${arcoUrl}
- Correo: ${contact}
- Presencial o por escrito: ${company.address || "[domicilio]"}
- El libro de reclamaciones y los canales de atención al público pueden recibir solicitudes si cumplen estos plazos (art. 65.1).

El ejercicio de los derechos es **gratuito** y el procedimiento debe ser sencillo (art. 67.1 y 67.3). No se cobra ni se condiciona a otro trámite. El ejercicio de un derecho no es requisito para ejercer otro (art. 62).

## 3. Plazos máximos (en días hábiles, art. 2.8 y 69)

${table(
  ["Derecho", "Plazo desde el día siguiente a la recepción", "Artículo"],
  [
    ["Información", "8 días (no ampliable)", "69.1 y 71.1"],
    ["Acceso (incluye portabilidad)", "20 días, ampliable una vez por un plazo igual", "69.2, 71 y 76"],
    ["Rectificación, cancelación u oposición", "10 días, ampliable una vez por un plazo igual", "69.3 y 71"],
    ["Revocación del consentimiento / oposición a publicidad", "Diligente, como máximo 10 días", "10.2 y 26.5"],
    ["Tratamiento objetivo", "10 días (el art. 69.3 fija ese plazo para «los otros derechos»; criterio prudente)", "87 y 69.3"],
  ]
)}

## 4. Flujo paso a paso

1. **Recepción (día 0).** Toda solicitud se registra con fecha y hora y se entrega constancia de recepción (art. 66.1). En DatosPrivados: módulo *Solicitudes ARCO*; el ticket calcula el vencimiento.
2. **Revisión de requisitos (hasta 5 días).** La solicitud debe indicar nombre y apellidos y acreditación de identidad (DNI o firma digital), la petición concreta, un domicilio o correo para notificar, fecha y firma, y los documentos que la sustenten (art. 64). Si falta algo que no puede salvarse de oficio, se pide subsanar **dentro de los 5 días** siguientes a la recepción; el titular tiene **5 días** para subsanar, vencidos los cuales se tiene por no presentada (art. 66.2).
3. **Información adicional (hasta 7 días).** Si la información es insuficiente o errónea, se puede pedir información o documentación dentro de los 7 días siguientes; el titular tiene 10 días para entregarla y el plazo de respuesta queda suspendido hasta entonces (art. 70).
4. **Identidad y representación.** Se acredita con DNI o documento equivalente (la firma digital lo sustituye). Un representante presenta copia de su DNI y el título de representación (art. 63).
5. **Búsqueda.** Se revisan todos los bancos de datos y los encargados (proveedores) que puedan tener datos del titular.
6. **Decisión y respuesta.** Se responde por escrito, de forma clara, legible y comprensible (art. 68.2), **aun si no se tienen datos del titular** (art. 68.1). Si hay claves o códigos, se explican (art. 68.3).
7. **Ampliación.** Si las circunstancias lo justifican (volumen, complejidad), se amplía una sola vez por un plazo igual **comunicándolo dentro del plazo original** (art. 71).
8. **Cierre y prueba.** Se archiva la solicitud, la respuesta y el medio de envío; la prueba de haber respondido es tuya (art. 68.4).

Si el titular no recibe respuesta en el plazo, puede considerar denegada su solicitud y acudir a la ANPD (art. 88.2 y 88.3).

## 5. Contenido de cada respuesta

- **Información:** todo lo del art. 18 de la Ley (art. 74).
- **Acceso:** sus datos, cómo se recopilaron, razones de la recopilación, a solicitud de quién y las transferencias hechas o previstas (art. 75.1). Se entrega por el medio que elija el titular (escrito, electrónico, etc., art. 77). No se revelan datos de terceros (art. 78).
- **Portabilidad:** datos que el titular facilitó, en formato estructurado, de uso común y lectura mecánica, y su transmisión a otro responsable cuando sea técnicamente posible; aplica si el tratamiento se basa en consentimiento o contrato, o es automatizado (art. 76).
- **Rectificación:** se corrige y se comunica a quienes se transfirieron los datos.
- **Cancelación:** el pedido implica **bloqueo inmediato** mientras se evalúa la eliminación (art. 82.3). Se eliminan los datos, salvo los que deban conservarse por obligación legal, relación contractual o razones históricas, estadísticas o científicas (art. 84); se documenta ante el titular el cumplimiento y a quién se transfirieron los datos (art. 83); cuando es posible, se anonimiza para seguir tratando (art. 85).
- **Oposición:** cesa el tratamiento si hay motivos fundados y legítimos, o siempre que sea publicidad y prospección comercial salvo relación contractual que lo sustente (art. 86). En internet puede incluir desindexación (art. 86.5).
- **Tratamiento objetivo:** se informa si hay decisiones automatizadas y se ofrece intervención humana (art. 87).

## 6. Respuesta negativa (total o parcial)

Debe estar justificada e indicar que el titular puede acudir a la Dirección de Protección de Datos Personales en vía de reclamación o al Poder Judicial mediante hábeas data (art. 73). Texto modelo:

> No es posible atender [total/parcialmente] su solicitud porque [motivo legal concreto, por ejemplo: los comprobantes de pago deben conservarse por obligación tributaria]. Esta decisión no limita su derecho a presentar una reclamación ante la Dirección de Protección de Datos Personales de la ANPD (plataforma «Yo cuido mis datos personales») o a acudir al Poder Judicial mediante acción de hábeas data (art. 24 de la Ley N.° 29733).

## 7. Solicitudes que llegan a un proveedor (encargado)

- Si el contrato obliga al encargado a atender solicitudes, las responde dentro de estos plazos.
- Si no, el encargado las traslada al responsable **en un máximo de 3 días**; si es quien cumple el encargo con la base, las traslada de inmediato y avisa al titular (art. 66.4 y 66.5). Las solicitudes de publicidad presentadas a un encargado se remiten al responsable (art. 26.6).

## 8. Registro de evidencia (para una fiscalización)

Por cada solicitud se conserva: número, fecha y hora de recepción, canal, derecho ejercido, identidad acreditada, fecha límite calculada, requerimientos y suspensiones, decisión, fecha de respuesta y prueba de envío. DatosPrivados guarda recepción (\`received_at\`), vencimiento (\`due_at\`) y respuesta (\`responded_at\`).

## 9. Aprobación

Aprobado por la administración de ${name} el ${date}. Revisión: anual y cuando cambien los canales o la normativa.

---

*Borrador generado con DatosPrivados conforme al DS N.° 016-2024-JUS. Las plantillas de respuesta están en el detalle de cada solicitud.*`;
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
