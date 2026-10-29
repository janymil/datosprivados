import type { Company, DataBank } from "./db";
import { formatDate } from "./format";

/**
 * Generadores de documentos legales conforme a la Ley N.° 29733 (Ley de
 * Protección de Datos Personales del Perú) y su Reglamento vigente aprobado
 * por Decreto Supremo N.° 016-2024-JUS.
 *
 * Son borradores operativos que parten de la declaración de la empresa en
 * PrivadoPE.
 */

const LEGAL_BASIS: Record<string, string> = {
  consentimiento:
    "Consentimiento libre, previo, expreso, informado e inequívoco del titular (art. 5 y 13.5 de la Ley N.° 29733)",
  ejecucion_contrato:
    "Preparación, celebración y ejecución de una relación contractual en la que el titular es parte (art. 14, num. 5 de la Ley N.° 29733)",
  obligacion_legal:
    "Cumplimiento de obligaciones legales (laborales, tributarias, contables o sectoriales) aplicables al responsable (art. 14 de la Ley N.° 29733)",
  interes_legitimo:
    "Salvaguarda de intereses legítimos del responsable o del titular (art. 14 de la Ley N.° 29733)",
  interes_publico:
    "Ejercicio de funciones o encargos de interés público conforme a ley (art. 14, num. 1 de la Ley N.° 29733)",
};

export function legalBasisLabel(value: string) {
  return LEGAL_BASIS[value] ?? value;
}

export function appUrl() {
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
        `- **Banco de datos «${bank.name}»** (${bank.status === "registrado" && bank.sipdp_code ? `inscrito en el RNPDP con código ${bank.sipdp_code}` : "en proceso de inscripción ante el RNPDP"}): ${sentence(bank.purpose || "finalidad por definir")} *Categorías de datos:* ${sentence(bank.data_categories || "por definir")} *Base legal:* ${legalBasisLabel(bank.legal_basis)}. *Destinatarios / encargados:* ${sentence(bank.recipients || "uso estrictamente interno")} *Plazo de conservación:* ${sentence(bank.retention || "mientras dure la finalidad y los plazos de prescripción legal")}`
    )
    .join("\n");

  const transfers = bankList.filter((b) => b.transfers === "si");

  return `## 1. Identidad y domicilio del responsable del tratamiento

**${company.name}**, identificada con RUC N.° **${company.ruc}**, con domicilio legal en **${company.address || "dirección por completar"}** y correo electrónico de contacto **${company.email}**, es la titular de los bancos de datos personales y responsable del tratamiento de los datos que recopila a través de sus canales físicos y digitales, en cumplimiento de la **Ley N.° 29733**, Ley de Protección de Datos Personales, y su Reglamento aprobado por **Decreto Supremo N.° 016-2024-JUS**.

Para cualquier consulta, solicitud o reclamo vinculado a la protección de datos personales, puedes comunicarte con nuestro canal de privacidad / Oficial de Datos Personales en **${company.dpo_email || company.email}**${company.dpo_name ? ` (a cargo de ${company.dpo_name})` : ""}.

## 2. Bancos de datos personales, finalidades y categorías de datos (Art. 18 de la Ley N.° 29733)

Los datos personales que recopilamos se almacenan en nuestros bancos de datos personales declarados ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH) y son tratados únicamente para las siguientes finalidades determinadas, explícitas y lícitas:

${purposes || "- *Bancos de datos por declarar en el inventario de la empresa.*"}

No utilizamos tus datos personales para finalidades incompatibles o distintas a las informadas en esta política sin recabar previamente un nuevo consentimiento válido.

## 3. Carácter obligatorio o facultativo y consecuencias de no proporcionar los datos

La entrega de los datos personales solicitados para la ejecución de una compra, contrato, prestación de servicio, atención de reclamos o cumplimiento de obligaciones legales (como la emisión de comprobantes de pago ante SUNAT o registro en planilla) es **obligatoria**. La negativa a proporcionarlos o la entrega de datos inexactos impedirá concretar la venta, prestar el servicio contratado o atender la solicitud correspondiente.

Por el contrario, la entrega de datos personales para finalidades de **prospección comercial, publicidad o envío de promociones** es completamente **voluntaria y facultativa**; la negativa a otorgar dicho consentimiento no afectará ni condicionará la contratación o prestación de nuestros servicios principales.

## 4. Base legal del tratamiento (Art. 5 y 14 de la Ley N.° 29733)

Tratamos tus datos personales amparados en:
1. Tu **consentimiento libre, previo, expreso, informado e inequívoco** (art. 5 y 13.5 de la Ley N.° 29733), requerido obligatoriamente para envíos publicitarios y tratamiento de datos sensibles cuando corresponda.
2. La **preparación, celebración y ejecución de la relación contractual** en la que eres parte (art. 14, numeral 5 de la Ley N.° 29733).
3. El **cumplimiento de mandatos y obligaciones legales** tributarias, laborales, contables o de defensa del consumidor.
4. La **salvaguarda de intereses legítimos** (art. 14 de la Ley N.° 29733), tales como la seguridad de nuestras instalaciones mediante videovigilancia o la prevención del fraude, sin vulnerar tus derechos fundamentales.

## 5. Plazo de conservación y eliminación segura

Conservamos tus datos personales únicamente durante el tiempo necesario para cumplir la finalidad para la cual fueron recopilados (detallado en la sección 2) y, posteriormente, durante los plazos legales de prescripción tributaria, laboral, civil o administrativa aplicables en el Perú. Cuando el tratamiento se basa en tu consentimiento para fines publicitarios, los conservamos hasta que revoques dicho consentimiento o solicites su cancelación. Vencidos los plazos, los datos son eliminados, suprimidos o anonimizados de manera segura.

## 6. Destinatarios, encargados del tratamiento y transferencias internacionales

Tienen acceso a los datos nuestro personal autorizado bajo deber de confidencialidad y los proveedores terceros que nos brindan soporte operativo (logística y courier, pasarelas de pago, facturación electrónica, estudio contable, alojamiento tecnológico y mensajería), quienes actúan únicamente como **encargados del tratamiento** siguiendo nuestras instrucciones y bajo garantías contractuales de seguridad. **${company.name} no vende ni comercializa datos personales a terceros.**

${
  transfers.length > 0
    ? `Para la operación tecnológica de los bancos de datos (${transfers.map((t) => `«${t.name}»`).join(", ")}), realizamos **flujo transfronterizo (transferencia internacional) de datos personales** hacia servidores en la nube y plataformas tecnológicas ubicadas fuera del territorio peruano (como Estados Unidos o la Unión Europea). Dichas transferencias se realizan verificando niveles adecuados de protección y cláusulas contractuales de seguridad conforme a la Ley N.° 29733 y el DS N.° 016-2024-JUS, e inscribiéndolas ante el RNPDP.`
    : `Actualmente almacenamos y procesamos los datos en el Perú y no realizamos flujo transfronterizo (transferencias internacionales) de datos personales. Si en el futuro contratáramos servidores en el exterior, actualizaremos esta política y lo declararemos ante el RNPDP.`
}

## 7. Ejercicio de Derechos ARCO, portabilidad y revocación (DS N.° 016-2024-JUS)

Como titular de tus datos personales, tienes derecho a ejercer de forma **totalmente gratuita** tus derechos de:
- **Información** (conocer las condiciones del tratamiento),
- **Acceso** (obtener confirmación y copia de los datos tuyos que almacenamos),
- **Rectificación** (actualizar o corregir datos inexactos o incompletos),
- **Cancelación / Supresión** (solicitar la eliminación de tus datos cuando ya no sean necesarios o hayas revocado tu consentimiento),
- **Oposición** (oponerte por motivo legítimo al tratamiento de tus datos),
- **Portabilidad** y **Revocación del consentimiento** en cualquier momento.

**Canales gratuitos habilitados:**
- **Formulario digital de Derechos ARCO:** ${appUrl()}/solicitud/${company.slug}
- **Correo electrónico de privacidad:** ${company.dpo_email || company.email}
- **Atención presencial / escrita:** en nuestro domicilio legal (${company.address || "indicado en la sección 1"}).

Para tramitar tu solicitud, deberás acreditar tu identidad (indicando nombres completos y DNI/CE, o mediante firma digital válida; si actúas como representante, adjuntando carta poder). Atenderemos tu solicitud dentro de los **plazos máximos legales en días hábiles** computados desde el día siguiente de su presentación (art. 69 del DS N.° 016-2024-JUS):
- **Derecho de información:** hasta **8 días hábiles**.
- **Derechos de rectificación, cancelación y oposición:** hasta **10 días hábiles**.
- **Revocación del consentimiento:** hasta **10 días hábiles** (art. 10 del DS N.° 016-2024-JUS).
- **Derechos de acceso y portabilidad:** hasta **20 días hábiles** (la portabilidad es una manifestación del derecho de acceso, art. 76).

Salvo el plazo del derecho de información, estos plazos pueden ampliarse una sola vez por un periodo igual cuando las circunstancias lo justifiquen; en ese caso te lo comunicaremos dentro del plazo original (art. 71).

Si tu solicitud no es atendida dentro del plazo legal o es denegada total o parcialmente, tienes derecho a presentar una reclamación gratuita (Procedimiento Trilateral de Tutela de Derechos) ante la **Autoridad Nacional de Protección de Datos Personales (ANPD)** del Ministerio de Justicia y Derechos Humanos (www.gob.pe/anpd), o acudir al Poder Judicial mediante acción de Hábeas Data.

## 8. Decisiones automatizadas y elaboración de perfiles

${company.name} no adopta decisiones basadas únicamente en tratamientos automatizados (incluyendo algoritmos o inteligencia artificial) que produzcan efectos jurídicos negativos o te afecten significativamente de modo similar sin intervención humana.

## 9. Medidas de seguridad y notificación de incidentes

Contamos con un **Documento de Seguridad** interno y aplicamos medidas técnicas, organizativas y legales acordes con el DS N.° 016-2024-JUS: control de accesos por perfil, contraseñas robustas, copias de respaldo verificadas, cifrado en tránsito y acuerdos de confidencialidad. Si se produce un incidente de seguridad que exponga grandes volúmenes de datos, pueda afectar a un gran número de personas, involucre datos sensibles o cause un perjuicio evidente a tus derechos, lo notificaremos a la ANPD dentro de las **48 horas** de haber tomado conocimiento y, si te afecta, te lo comunicaremos en el mismo plazo en lenguaje claro junto con las medidas adoptadas (art. 34 del DS N.° 016-2024-JUS).

## 10. Cookies, vigencia y modificaciones

Nuestros canales digitales pueden utilizar cookies técnicas indispensables para su funcionamiento y, únicamente previo consentimiento, cookies analíticas o publicitarias.

Esta Política de Privacidad entra en vigencia el **${date}**. Canales comprendidos: ${registeredChannels.length ? registeredChannels.join(", ") : "Web, WhatsApp y atención presencial"}. Cualquier modificación futura será publicada oportunamente a través de esta misma dirección (${appUrl()}/p/${company.slug}).

---

*Documento elaborado con PrivadoPE conforme a la Ley N.° 29733 y al DS N.° 016-2024-JUS a partir de la información declarada por ${company.name}.*`;
}

export function buildConsentTexts(company: Company): string {
  const name = company.name;
  const ruc = company.ruc;
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;

  return `## A. Formulario web — Separación obligatoria de finalidades (Ley N.° 29733 y DS 016-2024-JUS)

**1. Aviso de lectura obligatoria (para procesar el pedido o consulta):**
> [ ] He leído y comprendo la Política de Privacidad de **${name}** (RUC ${ruc}), disponible en ${policyUrl}, respecto al tratamiento de mis datos personales necesarios para atender mi compra, pedido o consulta.

**2. Checkbox opcional e independiente para publicidad / marketing (NO premarcado):**
> [ ] *(Opcional)* Autorizo de forma libre, previa, expresa e informada a **${name}** a tratar mi nombre, correo electrónico y teléfono/WhatsApp en su banco de datos de «Prospectos y Promociones» para enviarme ofertas, descuentos y novedades comerciales, hasta que decida revocar mi consentimiento. Sé que puedo ejercer mis derechos ARCO o darme de baja gratis en ${arcoUrl} o escribiendo a ${contact}.

*Regla legal crítica (ANPD):* La casilla de publicidad **jamás debe estar marcada por defecto** y el cliente debe poder comprar o enviar su consulta aunque deje en blanco la casilla de publicidad.

## B. WhatsApp / Redes Sociales — Solicitud de permiso (Opt-in)

**Mensaje para pedir permiso de promociones por WhatsApp:**
> Hola, te saluda **${name}** (RUC ${ruc}). Tus datos de contacto serán utilizados únicamente para atender tu consulta o pedido conforme a nuestra Política de Privacidad (${policyUrl}).
>
> Adicionalmente, ¿nos autorizas de forma voluntaria a enviarte promociones y descuentos futuros por este medio? Responde **«SÍ ACEPTO»** si deseas suscribirte. Puedes solicitar gratis la eliminación de tus datos o ejercer tus derechos ARCO en cualquier momento escribiendo «BAJA» o ingresando a ${arcoUrl}.

*Evidencia exigida por el DS 016-2024-JUS:* Guarda captura o registro del mensaje donde el cliente respondió «SÍ ACEPTO» con fecha y hora. Quien no responda afirmativamente no puede ser incluido en listas de difusión publicitaria.

## C. Correo electrónico — Confirmación de suscripción (Doble Opt-in)

> **Asunto:** Confirma tu suscripción a las novedades de ${name}
>
> Hola: recibimos una solicitud para suscribir este correo a las comunicaciones comerciales de **${name}** (RUC ${ruc}).
>
> Para otorgar tu consentimiento libre, previo, expreso, informado e inequívoco, haz clic en el siguiente botón: **[CONFIRMAR MI SUSCRIPCIÓN]**. Si no realizaste esta solicitud, ignora este mensaje y tus datos no serán almacenados.
>
> Tus datos se conservarán en nuestro banco de datos de promociones hasta que revoques tu autorización. Puedes darte de baja en un clic o ejercer tus derechos ARCO gratis en ${arcoUrl} o escribiendo a ${contact}. Política de Privacidad completa: ${policyUrl}.

## D. Cláusula para Datos Sensibles (Salud, clínicas, estética, biometría o planilla)

*Nota legal (Art. 13.6 de la Ley N.° 29733):* El tratamiento de datos sensibles exige consentimiento **por escrito** (físico o mediante firma digital / aceptación electrónica fehaciente).

> **AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS SENSIBLES**
> Yo, ________________________________________, identificado(a) con DNI/CE N.° ______________, declaro haber sido informado(a) de la Política de Privacidad de **${name}** (RUC ${ruc}) y otorgo mi consentimiento libre, previo, expreso, informado, inequívoco y por escrito para el tratamiento de mis datos personales sensibles consistentes en [indicar: datos de salud / historia clínica / evaluación física / datos biométricos], con la única finalidad de [indicar finalidad específica, ej. ejecutar el tratamiento odontológico / médico contratado].
>
> Conozco que puedo revocar esta autorización o ejercer gratuitamente mis derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) en ${arcoUrl}, en ${contact} o en ${company.address || "el domicilio de la empresa"}.
>
> Firma del titular: ________________________   Fecha: ____/____/202___

## E. Aviso corto para boletas, cupones físicos o pie de página

> **Privacidad de Datos (Ley N.° 29733):** **${name}** (RUC ${ruc}) trata tus datos personales para ejecutar la relación contractual y cumplir obligaciones legales ante SUNAT. Puedes consultar nuestra Política de Privacidad completa en ${policyUrl} y ejercer gratuitamente tus derechos ARCO en ${arcoUrl} o en ${contact}.

---

*Textos elaborados con PrivadoPE conforme al Art. 5, 13 y 18 de la Ley N.° 29733 y al DS N.° 016-2024-JUS.*`;
}

export function buildSecurityDocument(company: Company, banks: DataBank[]): string {
  const date = formatDate(new Date().toISOString(), "long");
  const inventory = banks
    .map(
      (bank, index) =>
        `${index + 1}. **${bank.name}** — *Finalidad:* ${bank.purpose || "por definir"}. *Categorías:* ${bank.data_categories || "por definir"}. *Canal/Soporte:* ${bank.channel || "digital"}. *Transferencia internacional:* ${bank.transfers === "si" ? "Sí" : "No"}. *Estado RNPDP/SIPDP:* ${bank.status === "registrado" ? `Inscrito (${bank.sipdp_code ?? "código registrado"})` : "En trámite de inscripción"}.`
    )
    .join("\n");

  return `## 1. Objeto, marco normativo y fecha cierta

El presente **Documento de Seguridad** establece las medidas técnicas, organizativas y legales adoptadas por **${company.name}** (RUC N.° **${company.ruc}**), con domicilio en **${company.address || "por completar"}**, para garantizar la confidencialidad, integridad y disponibilidad de los bancos de datos personales bajo su responsabilidad, en estricto cumplimiento de la **Ley N.° 29733**, el **Decreto Supremo N.° 016-2024-JUS** y la Directiva de Seguridad de la Información de la ANPD.

- **Versión vigente y fecha de aprobación:** ${date}.
- **Aprobado por:** Representación legal / Administración de ${company.name}.

## 2. Inventario de bancos de datos personales comprendidos

${inventory || "Aún no se han declarado bancos de datos personales en el inventario."}

## 3. Gobernanza, responsables y encargados del tratamiento

- **Responsable del tratamiento:** ${company.name} (RUC ${company.ruc}).
- **Responsable de Privacidad / Oficial de Datos Personales (ODP):** ${company.dpo_name || "Administrador designado"} (${company.dpo_email || company.email}), encargado de supervisar el cumplimiento de este documento, gestionar las solicitudes ARCO y coordinar notificaciones ante la ANPD.
- **Personal con acceso a datos:** Todo trabajador o colaborador suscribe un compromiso de confidencialidad y solo accede a los datos estrictamente necesarios para sus funciones (principio de mínimo privilegio).
- **Encargados externos (proveedores):** Los terceros que tratan datos por cuenta de la empresa (contabilidad, courier, pasarela de pagos, hosting o mensajería) operan bajo cláusulas de confidencialidad y prohibición de usar los datos para fines propios.

## 4. Control de accesos y gestión de privilegios (DS N.° 016-2024-JUS)

1. **Cuentas individuales e intransferibles:** Cada usuario autorizado posee credenciales propias; queda prohibido el uso de cuentas genéricas o compartidas para acceder a bancos de datos personales.
2. **Política de contraseñas y autenticación:** Uso obligatorio de contraseñas robustas (mínimo 10 caracteres alfanuméricos) y activación de verificación en dos pasos (2FA) en el correo corporativo, paneles de administración, WhatsApp Business y almacenamiento en la nube.
3. **Procedimiento de altas y bajas:** Cuando un colaborador cesa o cambia de funciones, sus accesos a correos, carpetas, grupos de WhatsApp y sistemas son revocados el mismo día del cese. Los permisos se revisan al menos cada seis (6) meses.
4. **Soportes físicos (si aplica):** Los archivadores con contratos, historias clínicas, boletas o currículums en papel se mantienen bajo llave en áreas restringidas al público.

## 5. Copias de respaldo (Backups), cifrado y baja segura de equipos

1. **Copias de respaldo periódicas:** Se realizan copias de seguridad (backups) de los bancos de datos al menos de forma **semanal**, almacenadas en un soporte o nube segura independiente del equipo principal.
2. **Prueba de restauración:** Al menos cada seis (6) meses se verifica la integridad de las copias de respaldo comprobando que los datos puedan restaurarse correctamente.
3. **Protección en tránsito y traslado de datos:** Toda transmisión de datos personales por internet se realiza mediante conexiones cifradas (HTTPS / TLS). El envío de bases de datos a encargados (como planilla al estudio contable) se realiza mediante canales seguros o archivos protegidos con contraseña.
4. **Borrado seguro y baja de equipos:** Antes de desechar, vender, formatear o enviar a soporte técnico cualquier computadora, disco duro, memoria USB o teléfono celular del negocio, se ejecuta el borrado seguro o sobrescritura completa de las carpetas que contengan datos personales.

## 6. Protocolo de respuesta y notificación de incidentes en 48 horas (DS N.° 016-2024-JUS)

Ante cualquier incidente de seguridad (robo o pérdida de equipos, acceso no autorizado, ransomware, extravío de archivos o envío masivo erróneo de datos):
1. **Detección y contención inmediata (Hora 0):** Aislar el equipo o cuenta comprometida, revocar contraseñas y registrar el incidente en el módulo de *Incidentes* de PrivadoPE indicando la fecha y hora exacta de detección.
2. **Evaluación de impacto:** Determinar la naturaleza del incidente, categorías de datos comprometidos, cantidad estimada de titulares afectados y consecuencias probables.
3. **Notificación a la ANPD en máximo 48 horas (art. 34.1):** Si el incidente expone grandes volúmenes de datos, puede afectar a un gran número de personas, involucra datos sensibles o produce un perjuicio evidente a los derechos de los titulares, se notifica a la **Autoridad Nacional de Protección de Datos Personales (ANPD)** dentro de las **48 horas** de haber tomado conocimiento, aunque el incidente ya se haya resuelto internamente. Si se notifica después, se explican los motivos de la demora. Si el incidente ocurre en el entorno digital, se reporta asimismo al **Centro Nacional de Seguridad Digital (CNSD)** (art. 34.5).
4. **Comunicación a los titulares afectados (art. 34.3):** Si el incidente afecta a los titulares, se les comunica en lenguaje claro y sencillo dentro de las **48 horas**, indicando las medidas adoptadas para mitigar sus efectos. No es necesario si el incidente no produjo afectación y fue superado totalmente (art. 34.4).
5. **Registro y lecciones aprendidas (art. 35):** Todo incidente se documenta (hechos, efectos y medidas adoptadas), **incluso si no correspondía notificarlo**, junto con las acciones correctivas para evitar que se repita.

## 7. Conservación, bloqueo y supresión definitiva

Cumplida la finalidad del tratamiento y vencidos los plazos legales de conservación (tributarios, laborales o contractuales), los datos personales son eliminados de las bases activas o destruidos de forma segura (trituración de papel o borrado digital irreversible), dejando constancia en el registro de actividad.

## 8. Auditoría y revisión anual

Este Documento de Seguridad es de cumplimiento obligatorio para todo el personal de **${company.name}** y se revisa al menos una vez al año o cada vez que se incorporen nuevos bancos de datos, sistemas tecnológicos o cambios normativos.

---

**Constancia de aprobación interna:**
Responsable: ${company.name} (RUC ${company.ruc})
Encargado de Privacidad / ODP: ${company.dpo_name || "___________________________"}
Fecha de aprobación: ${date}
Firma: ___________________________`;
}

export function buildInternalClauses(company: Company): string {
  const date = formatDate(new Date().toISOString(), "long");
  const name = company.name;
  const ruc = company.ruc;
  const address = company.address || "[indicar dirección del local]";
  const contact = company.dpo_email || company.email;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const policyUrl = `${appUrl()}/p/${company.slug}`;

  return `## A. Compromiso de Confidencialidad y Deber de Secreto para Trabajadores (Art. 17 Ley N.° 29733)

*¿Para qué sirve?:* La ANPD exige demostrar que todo empleado, vendedor, asistente o practicante que tiene acceso a datos de clientes o planilla firmó una obligación de confidencialidad. Imprímelo o envíalo para firma a cada miembro de tu equipo.

> **COMPROMISO DE CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS PERSONALES**
>
> Conste por el presente documento el Compromiso de Confidencialidad que suscribe **________________________________________**, identificado(a) con DNI/CE N.° **______________** (en adelante, el «COLABORADOR»), frente a **${name}**, con RUC N.° **${ruc}** y domicilio en ${address} (en adelante, la «EMPRESA»):
>
> **PRIMERO (Objeto):** En virtud de sus funciones laborales o de prestación de servicios, el COLABORADOR tiene acceso a bancos de datos personales de clientes, prospectos, proveedores y/o personal de la EMPRESA.
>
> **SEGUNDO (Deber de confidencialidad — Art. 17 de la Ley N.° 29733):** El COLABORADOR se obliga a guardar absoluta reserva y confidencialidad sobre todos los datos personales que conozca o trate con motivo de sus funciones. Queda terminantemente prohibido copiar, descargar para uso propio, divulgar, vender o ceder a terceros cualquier lista, número de WhatsApp, correo electrónico, documento o archivo de la EMPRESA.
>
> **TERCERO (Medidas de seguridad):** El COLABORADOR se compromete a cumplir el *Documento de Seguridad* de la EMPRESA, no compartir sus contraseñas de acceso, bloquear sus equipos al ausentarse y reportar de inmediato (en menos de 2 horas) a **${contact}** cualquier pérdida de equipo, error de envío o incidente de seguridad para cumplir con el plazo legal de 48 horas ante la ANPD (DS N.° 016-2024-JUS).
>
> **CUARTO (Vigencia poscontractual):** Conforme al artículo 17 de la Ley N.° 29733, esta obligación de confidencialidad subsiste de manera indefinida incluso después de finalizado el vínculo laboral o contractual con la EMPRESA. Su incumplimiento constituye falta grave y genera responsabilidad civil, laboral, administrativa y penal.
>
> Fecha de suscripción: ${date}
>
> Firma del Colaborador: ___________________________   DNI: ______________

---

## B. Cláusula / Adenda de Encargo de Tratamiento para Proveedores Externos (Contador, Agencia, Courier, IT)

*¿Para qué sirve?:* Cuando le entregas datos de tus clientes o trabajadores a un tercero (tu estudio contable externo, agencia de marketing, programador o empresa de reparto), la ley lo llama **Encargado del Tratamiento** y exige tener un acuerdo escrito donde se obligue a no usar esos datos para fines propios.

> **ADENDA / CLÁUSULA DE ENCARGO DE TRATAMIENTO DE DATOS PERSONALES**
>
> Por medio de la presente cláusula, el PROVEEDOR (**________________________________________**, con RUC N.° **______________**), en su calidad de **Encargado del Tratamiento**, se obliga frente a **${name}** (RUC **${ruc}**), en su calidad de **Responsable del Tratamiento**, al cumplimiento estricto de la Ley N.° 29733 y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS:
>
> 1. **Uso limitado a las instrucciones:** El PROVEEDOR tratará los datos personales a los que tenga acceso única y exclusivamente para prestar el servicio contratado por **${name}**, quedando prohibido aplicarlos o utilizarlos con un fin distinto, comercializarlos o comunicarlos a terceros sin autorización escrita.
> 2. **Medidas de seguridad y confidencialidad:** El PROVEEDOR garantiza que cuenta con medidas técnicas y organizativas de seguridad equivalentes a las exigidas por el DS N.° 016-2024-JUS y que su personal ha suscrito compromisos de confidencialidad.
> 3. **Notificación inmediata de incidentes:** En caso de sufrir cualquier vulneración, extravío o acceso no autorizado que afecte los datos de **${name}**, el PROVEEDOR lo notificará a **${contact}** en un plazo máximo de **12 horas** desde su detección, a fin de permitir el reporte a la ANPD dentro del plazo legal de 48 horas.
> 4. **Devolución o supresión al término del servicio:** Finalizada la prestación del servicio, el PROVEEDOR devolverá o eliminará de forma segura todos los datos personales recibidos, salvo aquellos que deba conservar bloqueados por mandato legal expreso.
>
> Por ${name}: ___________________________   Por el Proveedor: ___________________________

---

## C. Cartel Informativo de Videovigilancia para Local Físico (Directiva de Videovigilancia ANPD)

*¿Para qué sirve?:* Si tienes cámaras de seguridad en tu tienda, oficina, consultorio o almacén, la Directiva de la ANPD exige colocar un cartel visible en el ingreso (con ícono de cámara) que informe quién es el dueño del banco de datos y dónde ejercer los derechos ARCO.

> **[COLOCAR ÍCONO DE CÁMARA DE SEGURIDAD — ZONA VIDEOVIGILADA]**
>
> **USTED ESTÁ SIENDO GRABADO POR RAZONES DE SEGURIDAD**
> *(Ley N.° 29733 — Ley de Protección de Datos Personales y DS N.° 016-2024-JUS)*
>
> - **Responsable del Banco de Datos («Videovigilancia»):** **${name}** — RUC N.° **${ruc}**
> - **Domicilio:** ${address}
> - **Finalidad:** Garantizar la seguridad de las personas, bienes e instalaciones de este establecimiento.
> - **Plazo de conservación:** Las imágenes se conservan entre treinta (30) y sesenta (60) días calendario, tras lo cual son eliminadas, salvo requerimiento de autoridad competente.
> - **Ejercicio gratuito de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):** Puede presentar su solicitud en nuestro formulario digital **${arcoUrl}**, escribiendo al correo **${contact}** o de forma presencial en este local.
> - **Política de Privacidad completa:** ${policyUrl}

---

## D. Acta de Designación Interna de Contacto de Privacidad / Oficial de Datos Personales (ODP)

*¿Para qué sirve?:* Deja constancia interna con fecha cierta de quién es la persona responsable de vigilar los plazos ARCO y atender a la ANPD dentro de tu empresa.

> **ACTA DE DESIGNACIÓN INTERNA DE RESPONSABLE DE PRIVACIDAD DE DATOS**
>
> En la ciudad de Lima, con fecha **${date}**, la administración de **${name}** (RUC N.° **${ruc}**) deja constancia de la designación de **${company.dpo_name || "[Nombre del responsable]"}**, con correo electrónico de contacto **${contact}**, como responsable interno de privacidad y atención de Derechos ARCO, encargado de:
> 1. Mantener actualizado el inventario de bancos de datos personales e inscripciones en el portal SIPDP (RNPDP).
> 2. Atender dentro de los plazos legales (10 y 20 días hábiles) las solicitudes ARCO recibidas en ${arcoUrl}.
> 3. Custodiar el *Documento de Seguridad* y ejecutar el protocolo de notificación en 48 horas ante la ANPD en caso de incidentes.
>
> *(Nota legal: La designación formal de un Oficial de Datos Personales solo es obligatoria en los supuestos del art. 37 del DS N.° 016-2024-JUS, por ejemplo cuando se tratan grandes volúmenes de datos o datos sensibles como actividad principal. Para las microempresas con ventas de hasta 150 UIT, esa obligación es exigible desde el 30 de noviembre de 2028. Mientras tanto, esta acta deja constancia del responsable interno y del canal de contacto).*
>
> Firma del Representante Legal: ___________________________`;
}

