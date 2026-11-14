/**
 * COPIA CONGELADA de src/lib/documents.ts en 4cc719f (origin/master), usada solo como
 * oráculo de paridad durante la migración a la biblioteca de cláusulas.
 * No editar. Se borra en la tarea 7 del plan 1 del motor legal.
 */
import type { Company, DataBank, Provider } from "@/lib/db";
import { isAbroad, toolCategory } from "@/lib/provider-catalog";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import {
  isSensitiveBank,
  odpDeadline,
  sectorLegalProfile,
  sectorProtocol,
  type SectorLegalProfile,
} from "@/lib/sector-legal";

/**
 * Generadores de documentos legales conforme a la Ley N.° 29733 (Ley de
 * Protección de Datos Personales del Perú) y su Reglamento vigente aprobado
 * por Decreto Supremo N.° 016-2024-JUS.
 *
 * Son borradores operativos que parten de la declaración de la empresa en
 * DatosPrivados.
 */

const LEGAL_BASIS: Record<string, string> = {
  consentimiento:
    "Consentimiento libre, previo, expreso, informado e inequívoco del titular (art. 5 y 13.5 de la Ley N.° 29733)",
  ejecucion_contrato:
    "Preparación, celebración y ejecución de una relación contractual en la que el titular es parte (art. 14, num. 5 de la Ley N.° 29733)",
  obligacion_legal:
    "Cumplimiento de obligaciones legales (laborales, tributarias, contables o sectoriales) aplicables al responsable (art. 14 de la Ley N.° 29733)",
  // La Ley N.° 29733 no reconoce un «interés legítimo del responsable» autónomo (como el art. 6.1.f del
  // RGPD): su art. 14 exime del consentimiento la salvaguarda de intereses legítimos *del titular*. Para
  // la seguridad del local se usa el aviso previo (cartel) y el consentimiento inequívoco por actos
  // concluyentes (art. 5.2 del DS N.° 016-2024-JUS), según la Directiva 01-2020-JUS/DGTAIPD.
  interes_legitimo:
    "Seguridad de personas y bienes con aviso previo: consentimiento inequívoco por actos concluyentes al ingresar a la zona informada (art. 5.2 del DS N.° 016-2024-JUS y Directiva 01-2020-JUS/DGTAIPD) y salvaguarda de intereses legítimos del titular (art. 14 de la Ley N.° 29733)",
  interes_publico:
    "Ejercicio de funciones o encargos de interés público conforme a ley (art. 14, num. 1 de la Ley N.° 29733)",
};

export function legalBasisLabel(value: string) {
  return LEGAL_BASIS[value] ?? value;
}

/**
 * Host público del producto. Única fuente: `siteUrl()` (`lib/site.ts`), que lee
 * `NEXT_PUBLIC_APP_URL`; si queda vacío se usa el dominio comercial.
 */
export function appUrl() {
  return siteUrl();
}

function sentence(value: string) {
  return `${value.trim().replace(/[.\s]+$/, "")}.`;
}

function isForeign(company: Company) {
  return company.entity_type === "extranjera";
}

/**
 * Enlace al Libro de Reclamaciones virtual. DatosPrivados todavía no aloja ese
 * libro: hasta que exista la ruta, el texto pide a la empresa completar su propio
 * enlace en lugar de apuntar a una página que devuelve 404.
 */
function complaintsLink(company: Pick<Company, "complaints_url">): string {
  return company.complaints_url?.trim() || "[enlace de tu Libro de Reclamaciones virtual]";
}

const AUTOMATED_BANK = /\b(ia|ocr)\b|inteligencia artificial|voz|audio|perfil|scoring|automatiz/i;

function usesAutomation(profile: SectorLegalProfile, banks: DataBank[]) {
  return (
    profile.automated ||
    banks.some((bank) => AUTOMATED_BANK.test(`${bank.name} ${bank.purpose} ${bank.data_categories}`))
  );
}

const COUNTRY_LABEL = (country: string) => (country === "No sé" ? "país por verificar" : country);

function foreignProviders(providers: Provider[]) {
  return providers.filter((provider) => isAbroad(provider.country));
}

function categoryLabel(id: string) {
  return toolCategory(id)?.label ?? id;
}

const DPA_LABEL: Record<string, string> = { pendiente: "Pendiente", firmado: "Firmado", no_aplica: "No aplica" };
const TRANSFER_LABEL: Record<string, string> = {
  no_aplica: "No aplica",
  pendiente: "Pendiente",
  comunicado: "Comunicado a la ANPD",
};

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function table(head: string[], rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

/**
 * Identificación corta, para encabezados y firmas.
 * Una sociedad extranjera no tiene RUC peruano: lo que la identifica ante la
 * ANPD es su país de constitución y su representante en el Perú.
 */
export function companyShortId(company: Company): string {
  if (isForeign(company)) {
    return `sociedad constituida en ${company.country || "el extranjero"}`;
  }
  return `RUC ${company.ruc || "por completar"}`;
}

/** Línea de identificación para el encabezado de una página pública. */
export function companyIdentityLine(company: Company): string {
  if (isForeign(company)) {
    const rep = company.representative_name
      ? ` · representante en el Perú: ${company.representative_name}`
      : " · representante en el Perú: por designar";
    return `${company.name} · ${companyShortId(company)}${rep}`;
  }
  return `${company.name} · ${companyShortId(company)}`;
}

/** Párrafo de identidad del responsable que abre un documento legal. */
export function controllerParagraph(company: Company): string {
  const address = company.address || "[completar domicilio]";
  const email = company.dpo_email || company.email;
  if (isForeign(company)) {
    const rep = company.representative_name || "[completar nombre del representante]";
    const repAddress = company.representative_address || "[completar domicilio del representante]";
    return `**${company.name}**, sociedad constituida en **${company.country || "el extranjero"}**, con domicilio en **${address}** y correo de contacto **${email}**, que no cuenta con establecimiento permanente en el Perú y que actúa como responsable del tratamiento. Para efectos de la Ley N.° 29733 y su Reglamento, ha designado como representante en el Perú a **${rep}**, con domicilio en **${repAddress}**`;
  }
  return `**${company.name}**, identificada con RUC N.° **${company.ruc || "[completar RUC]"}**, con domicilio legal en **${address}** y correo electrónico de contacto **${email}**`;
}


export function buildPrivacyPolicy(company: Company, banks: DataBank[], providers: Provider[] = []): string {
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
  const abroad = foreignProviders(providers);
  const countries = Array.from(new Set(abroad.map((provider) => COUNTRY_LABEL(provider.country))));
  const transferTarget = transfers.length
    ? `de los bancos de datos (${transfers.map((t) => `«${t.name}»`).join(", ")})`
    : "de nuestras herramientas";
  const providerTable = providers.length
    ? `

**Herramientas y proveedores que reciben o alojan datos, y país de destino:**

${table(
  ["Proveedor", "Para qué", "País donde se tratan los datos"],
  providers.map((provider) => [provider.name, provider.purpose || categoryLabel(provider.category), COUNTRY_LABEL(provider.country)])
)}`
    : "";
  const profile = sectorLegalProfile(company);
  const automated = usesAutomation(profile, bankList);
  const sensitiveBanks = bankList.filter(isSensitiveBank);

  const sectorSection = `## 10. Datos sensibles, menores y normas de nuestra actividad

${
  sensitiveBanks.length || profile.sensitive
    ? `**Datos sensibles.** En el marco de nuestra actividad (${profile.title.toLowerCase()}) tratamos datos sensibles${sensitiveBanks.length ? ` en los bancos ${sensitiveBanks.map((b) => `«${b.name}»`).join(", ")}` : ""}. Solo los tratamos con tu consentimiento otorgado **por escrito** (firma manuscrita, digital, electrónica u otra modalidad que garantice tu voluntad, art. 8 del DS N.° 016-2024-JUS), para la finalidad específica que te informamos, con acceso restringido al personal que lo necesita y con medidas de seguridad reforzadas.`
    : `**Datos sensibles.** No necesitamos datos sensibles (salud, datos biométricos, afiliación sindical u otros del art. 2.6 del DS N.° 016-2024-JUS) para prestarte nuestro servicio principal. Si en algún caso fuera necesario, te pediremos tu autorización por escrito antes de recogerlos.`
}

${
  profile.minors
    ? `**Menores de edad.** Si eres menor de 14 años, el tratamiento de tus datos requiere el consentimiento de tus padres o tutores; si tienes entre 14 y 17 años, puedes consentir según tu capacidad, y te informaremos en lenguaje comprensible (art. 22 del DS N.° 016-2024-JUS). No recogemos datos de tu grupo familiar más allá de la identidad y dirección de tus padres o tutores cuando se necesita su consentimiento (art. 23).`
    : `**Menores de edad.** Nuestros servicios no están dirigidos a menores de 14 años. Si tomamos conocimiento de que hemos recogido datos de un menor sin la autorización de sus padres o tutores, los eliminaremos.`
}

**Normas que además aplican a nuestra actividad:**
${bullets(profile.norms)}`;

  return `## 1. Identidad y domicilio del responsable del tratamiento

${controllerParagraph(company)}. Es la titular de los bancos de datos personales y responsable del tratamiento de los datos que recopila a través de sus canales físicos y digitales, en cumplimiento de la **Ley N.° 29733**, Ley de Protección de Datos Personales, y su Reglamento aprobado por **Decreto Supremo N.° 016-2024-JUS**.

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
4. La **seguridad de nuestras instalaciones** mediante videovigilancia, informada con un cartel visible antes de que ingreses a la zona vigilada (consentimiento inequívoco por actos concluyentes, art. 5.2 del DS N.° 016-2024-JUS, y Directiva 01-2020-JUS/DGTAIPD), y la salvaguarda de los intereses legítimos del titular en los supuestos que contempla el art. 14 de la Ley N.° 29733.

La publicación de esta política cumple nuestro deber de informar (art. 7 del DS N.° 016-2024-JUS) pero **no reemplaza** tu consentimiento cuando la ley lo exige.

## 5. Plazo de conservación y eliminación segura

Conservamos tus datos personales únicamente durante el tiempo necesario para cumplir la finalidad para la cual fueron recopilados (detallado en la sección 2) y, posteriormente, durante los plazos legales de prescripción tributaria, laboral, civil o administrativa aplicables en el Perú. Cuando el tratamiento se basa en tu consentimiento para fines publicitarios, los conservamos hasta que revoques dicho consentimiento o solicites su cancelación. Vencidos los plazos, los datos son eliminados, suprimidos o anonimizados de manera segura.

## 6. Destinatarios, encargados del tratamiento y transferencias internacionales

Tienen acceso a los datos nuestro personal autorizado bajo deber de confidencialidad y los proveedores terceros que nos brindan soporte operativo (logística y courier, pasarelas de pago, facturación electrónica, estudio contable, alojamiento tecnológico y mensajería), quienes actúan únicamente como **encargados del tratamiento** siguiendo nuestras instrucciones y bajo garantías contractuales de seguridad. **${company.name} no vende ni comercializa datos personales a terceros.**

${
  transfers.length > 0 || abroad.length > 0
    ? `Para la operación tecnológica ${transferTarget}, realizamos **flujo transfronterizo (transferencia internacional) de datos personales** hacia servidores en la nube y plataformas tecnológicas ubicadas fuera del territorio peruano. Solo los enviamos a países con nivel adecuado de protección reconocido por la Autoridad o, en los demás casos, con garantías adecuadas: cláusulas contractuales que imponen al receptor, como mínimo, las mismas obligaciones que a nosotros (art. 18 y 20 del DS N.° 016-2024-JUS). Comunicamos cada flujo transfronterizo a la Autoridad Nacional de Protección de Datos Personales para su inscripción en el RNPDP (art. 21.2). ${countries.length ? `Los países de destino son: ${countries.join(", ")}. ` : ""}Puedes pedir más detalle escribiendo a ${company.dpo_email || company.email}.`
    : `Actualmente almacenamos y procesamos los datos en el Perú y no realizamos flujo transfronterizo (transferencias internacionales) de datos personales. Si en el futuro contratáramos servidores en el exterior, actualizaremos esta política y lo declararemos ante el RNPDP.`
}${providerTable}

## 7. Ejercicio de Derechos ARCO, portabilidad y revocación (DS N.° 016-2024-JUS)

Como titular de tus datos personales, tienes derecho a ejercer de forma **totalmente gratuita** tus derechos de:
- **Información** (conocer las condiciones del tratamiento),
- **Acceso** (obtener confirmación y copia de los datos tuyos que almacenamos),
- **Rectificación** (actualizar o corregir datos inexactos o incompletos),
- **Cancelación / Supresión** (solicitar la eliminación de tus datos cuando ya no sean necesarios o hayas revocado tu consentimiento),
- **Oposición** (oponerte por motivo fundado y legítimo, o en cualquier momento cuando se trate de publicidad y prospección comercial; si tus datos están en internet, puede incluir la desindexación, art. 86),
- **Tratamiento objetivo** (no ser objeto de decisiones basadas únicamente en tratamiento automatizado que te produzcan efectos jurídicos, art. 87),
- **Portabilidad** (recibir los datos que nos diste en formato estructurado y de uso común, o que los transmitamos a otro responsable, cuando el tratamiento se base en tu consentimiento o en un contrato, o sea automatizado, art. 76) y **Revocación del consentimiento** en cualquier momento.

**Canales gratuitos habilitados:**
- **Formulario digital de Derechos ARCO:** ${appUrl()}/solicitud/${company.slug}
- **Correo electrónico de privacidad:** ${company.dpo_email || company.email}
- **Atención presencial / escrita:** en nuestro domicilio legal (${company.address || "indicado en la sección 1"}).

Para tramitar tu solicitud, deberás acreditar tu identidad (indicando nombres completos y DNI/CE, o mediante firma digital válida; si actúas como representante, adjuntando el documento que acredite la representación). Si tu solicitud es insuficiente o errónea, podremos pedirte información adicional dentro de los **7 días** siguientes; tendrás **10 días** para responder y, mientras tanto, el plazo de respuesta se suspende (art. 70). Atenderemos tu solicitud dentro de los **plazos máximos legales en días hábiles** (art. 2.8 del DS N.° 016-2024-JUS) computados desde el día siguiente de su presentación (art. 69):
- **Derecho de información:** hasta **8 días hábiles**.
- **Derechos de rectificación, cancelación y oposición:** hasta **10 días hábiles**.
- **Revocación del consentimiento y oposición a la publicidad:** adecuaremos el tratamiento en un plazo diligente que no excede de **10 días** (arts. 10.2 y 26.5).
- **Derechos de acceso y portabilidad:** hasta **20 días hábiles** (la portabilidad es una manifestación del derecho de acceso, art. 76).

Salvo el plazo del derecho de información, estos plazos pueden ampliarse una sola vez por un periodo igual cuando las circunstancias lo justifiquen; en ese caso te lo comunicaremos dentro del plazo original (art. 71). Ejercer tus derechos es **gratuito** (art. 67.3).

Si tu solicitud no es atendida, se atiende parcialmente o es denegada, la respuesta debe estar justificada e indicarte que puedes presentar una reclamación ante la **Dirección de Protección de Datos Personales de la Autoridad Nacional de Protección de Datos Personales (ANPD)** del Ministerio de Justicia y Derechos Humanos, a través de la plataforma «Yo cuido mis datos personales» (www.gob.pe/anpd), o acudir al Poder Judicial mediante acción de hábeas data (art. 73).

## 8. Decisiones automatizadas y elaboración de perfiles

${
  automated
    ? `${company.name} utiliza tratamientos automatizados (por ejemplo, categorización, extracción de texto, reconocimiento de voz, evaluación de perfiles o inteligencia artificial) como apoyo a su servicio. Te informamos que existen y las consecuencias que pueden tener para ti (art. 6.1.8 del DS N.° 016-2024-JUS). No adoptamos decisiones que te produzcan efectos jurídicos o te afecten de modo significativo basadas **únicamente** en ese tratamiento: siempre puedes pedir la intervención de una persona, corregir el resultado o ejercer tu derecho al tratamiento objetivo (art. 87). Antes de enviar contenido a un proveedor de IA, retiramos o enmascaramos los identificadores cuando es posible, y el proveedor no puede usar tus datos para entrenar sus modelos.`
    : `${company.name} no adopta decisiones basadas únicamente en tratamientos automatizados (incluyendo algoritmos o inteligencia artificial) que produzcan efectos jurídicos negativos o te afecten significativamente de modo similar sin intervención humana. Si esto cambiara, te lo informaremos antes y podrás ejercer tu derecho al tratamiento objetivo (art. 87 del DS N.° 016-2024-JUS).`
}

## 9. Medidas de seguridad y notificación de incidentes

Contamos con un **Documento de Seguridad** interno y aplicamos medidas técnicas, organizativas y legales acordes con el DS N.° 016-2024-JUS: control de accesos por perfil con revisión de privilegios al menos semestral, registro de las interacciones con los datos conservado por mínimo dos años, contraseñas robustas, copias de respaldo semanales con verificación de integridad, cifrado en tránsito y acuerdos de confidencialidad (arts. 46 a 51). Si se produce un incidente de seguridad que exponga grandes volúmenes de datos, pueda afectar a un gran número de personas, involucre datos sensibles o cause un perjuicio evidente a tus derechos, lo notificaremos a la ANPD dentro de las **48 horas** de haber tomado conocimiento y, si te afecta, te lo comunicaremos en el mismo plazo en lenguaje claro junto con las medidas adoptadas (art. 34 del DS N.° 016-2024-JUS).

${sectorSection}

## 11. Cookies, vigencia y modificaciones

Nuestros canales digitales pueden utilizar cookies técnicas indispensables para su funcionamiento y, únicamente previo consentimiento, cookies analíticas o publicitarias. Los identificadores en línea son datos personales (art. 2.4 del DS N.° 016-2024-JUS).

Esta Política de Privacidad entra en vigencia el **${date}**. Canales comprendidos: ${registeredChannels.length ? registeredChannels.join(", ") : "Web, WhatsApp y atención presencial"}. Cualquier modificación futura será publicada oportunamente a través de esta misma dirección (${appUrl()}/p/${company.slug}).

---

*Documento elaborado con DatosPrivados conforme a la Ley N.° 29733 y al DS N.° 016-2024-JUS a partir de la información declarada por ${company.name}.*`;
}

export function buildConsentTexts(company: Company): string {
  const name = company.name;
  const shortId = companyShortId(company);
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const profile = sectorLegalProfile(company);
  const sensitiveLine = profile.sensitive || profile.biometric
    ? `*Tu rubro (${profile.title}) trata datos sensibles de forma habitual: esta autorización es obligatoria antes de la primera atención y debe archivarse firmada.*`
    : `*Úsala solo si recoges datos sensibles (salud, biometría, afiliación sindical, vida afectiva o familiar u otros del art. 2.6 del DS N.° 016-2024-JUS). Si no los recoges, no la uses: pedir datos de más viola el principio de proporcionalidad.*`;
  const minorsSection = profile.minors
    ? `

## F. Consentimiento de padres o tutores y de adolescentes (art. 22 y 23 del DS N.° 016-2024-JUS)

*Menores de 14 años: firma el padre, madre o tutor. De 14 a 17 años: el adolescente puede consentir por sí mismo, con información en lenguaje comprensible; aun así, conviene que firme también un adulto responsable cuando el servicio es continuado (colegio, academia, gimnasio). Solo se piden los datos de identidad y dirección de los padres para obtener el consentimiento (art. 23.2).*

> **AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS DE UN MENOR DE EDAD**
> Yo, ________________________________________, DNI/CE N.° ______________, en calidad de ☐ padre ☐ madre ☐ tutor/a legal de ________________________________________ (edad: ____ años), autorizo a **${name}** (${shortId}) a tratar los datos personales del menor para [indicar finalidad: matrícula, seguimiento, atención, comunicaciones con la familia, emergencias], conforme a la Política de Privacidad ${policyUrl}.
>
> ☐ Autorizo, de forma **separada y opcional**, el uso de fotografías o videos del menor en [redes sociales / página web / material impreso] del establecimiento.
> ☐ **No** autorizo ese uso de imagen (mi decisión no afecta la matrícula ni el servicio).
>
> Puedo revocar esta autorización y ejercer los derechos ARCO gratuitamente en ${arcoUrl} o en ${contact}.
>
> Firma: ________________________   Fecha: ____/____/20___`
    : "";
  const imageSection = profile.imageUse
    ? `

## G. Autorización de uso de imagen y voz (Código Civil, art. 15)

*La imagen y la voz de una persona no pueden aprovecharse sin su autorización expresa. Pídela **por separado** de cualquier otro permiso y no condiciones el servicio a ella.*

> **AUTORIZACIÓN DE USO DE IMAGEN Y VOZ**
> Yo, ________________________________________, DNI/CE N.° ______________, autorizo a **${name}** a utilizar mi imagen y voz captadas en [fotografías / videos] para [indicar medio: redes sociales, web, folletos, publicidad] durante [indicar plazo, p. ej. 2 años], sin que ello afecte mi atención. Puedo revocar esta autorización en cualquier momento escribiendo a ${contact}; el material ya difundido se retirará en un plazo diligente que no excede de 10 días (art. 10.2).
>
> Firma: ________________________   Fecha: ____/____/20___`
    : "";

  return `## A. Formulario web — Separación obligatoria de finalidades (Ley N.° 29733 y DS 016-2024-JUS)

**1. Aviso de lectura obligatoria (para procesar el pedido o consulta):**
> [ ] He leído y comprendo la Política de Privacidad de **${name}** (${shortId}), disponible en ${policyUrl}, respecto al tratamiento de mis datos personales necesarios para atender mi compra, pedido o consulta.

**2. Checkbox opcional e independiente para publicidad / marketing (NO premarcado):**
> [ ] *(Opcional)* Autorizo de forma libre, previa, expresa e informada a **${name}** a tratar mi nombre, correo electrónico y teléfono/WhatsApp en su banco de datos de «Prospectos y Promociones» para enviarme ofertas, descuentos y novedades comerciales, hasta que decida revocar mi consentimiento. Sé que puedo ejercer mis derechos ARCO o darme de baja gratis en ${arcoUrl} o escribiendo a ${contact}.

*Regla legal crítica (ANPD):* La casilla de publicidad **jamás debe estar marcada por defecto** y el cliente debe poder comprar o enviar su consulta aunque deje en blanco la casilla de publicidad.

## B. WhatsApp / Redes Sociales — Solicitud de permiso (Opt-in)

**Mensaje para pedir permiso de promociones por WhatsApp:**
> Hola, te saluda **${name}** (${shortId}). Tus datos de contacto serán utilizados únicamente para atender tu consulta o pedido conforme a nuestra Política de Privacidad (${policyUrl}).
>
> Adicionalmente, ¿nos autorizas de forma voluntaria a enviarte promociones y descuentos futuros por este medio? Responde **«SÍ ACEPTO»** si deseas suscribirte. Puedes solicitar gratis la eliminación de tus datos o ejercer tus derechos ARCO en cualquier momento escribiendo «BAJA» o ingresando a ${arcoUrl}.

*Evidencia (art. 9 del DS 016-2024-JUS: la carga de la prueba del consentimiento es tuya):* Guarda captura o registro del mensaje donde el cliente respondió «SÍ ACEPTO» con fecha y hora. Si no responde afirmativamente, no es lícito volver a contactarlo con publicidad (art. 26.2). Atiende cualquier «BAJA» en un máximo de 10 días (art. 26.5), con un trámite no más complejo que el usado para suscribirse.

## C. Correo electrónico — Confirmación de suscripción (Doble Opt-in)

> **Asunto:** Confirma tu suscripción a las novedades de ${name}
>
> Hola: recibimos una solicitud para suscribir este correo a las comunicaciones comerciales de **${name}** (${shortId}).
>
> Para otorgar tu consentimiento libre, previo, expreso, informado e inequívoco, haz clic en el siguiente botón: **[CONFIRMAR MI SUSCRIPCIÓN]**. Si no realizaste esta solicitud, ignora este mensaje y tus datos no serán almacenados.
>
> Tus datos se conservarán en nuestro banco de datos de promociones hasta que revoques tu autorización. Puedes darte de baja en un clic o ejercer tus derechos ARCO gratis en ${arcoUrl} o escribiendo a ${contact}. Política de Privacidad completa: ${policyUrl}.

## D. Autorización para el tratamiento de datos sensibles${profile.sensitive || profile.biometric ? ` — ${profile.title}` : ""}

*Base legal:* art. 13.6 de la Ley N.° 29733 y art. 8 del DS N.° 016-2024-JUS: el consentimiento para datos sensibles debe darse **por escrito**, con firma manuscrita, digital, electrónica u otra modalidad que garantice la voluntad del titular. La carga de la prueba es tuya (art. 9). Son sensibles, entre otros, los datos genéticos y biométricos, neuronales, de salud física o mental, de afiliación sindical, de la vida afectiva o familiar y los hábitos de la esfera más íntima (art. 2.6).

${sensitiveLine}

> **AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS SENSIBLES**
> Yo, ________________________________________, identificado(a) con DNI/CE N.° ______________, declaro haber sido informado(a) de la Política de Privacidad de **${name}** (${shortId}) y otorgo mi consentimiento libre, previo, expreso, informado, inequívoco y por escrito para el tratamiento de mis datos personales sensibles consistentes en ${profile.consent.data}, con la única finalidad de ${profile.consent.purpose}.
>
> Entiendo que estos datos serán conservados con acceso restringido, que ${name} no los usará para publicidad ni para finalidades distintas, y que no se transfieren a terceros salvo los indicados en la Política de Privacidad o por mandato legal.
>
> Conozco que puedo revocar esta autorización o ejercer gratuitamente mis derechos de acceso, rectificación, cancelación, oposición y portabilidad en ${arcoUrl}, en ${contact} o en ${company.address || "el domicilio de la empresa"}.
>
> Firma del titular: ________________________   Fecha: ____/____/20___

## E. Aviso corto para boletas, cupones físicos o pie de página

> **Privacidad de Datos (Ley N.° 29733):** **${name}** (${shortId}) trata tus datos personales para ejecutar la relación contractual y cumplir obligaciones legales ante SUNAT. Puedes consultar nuestra Política de Privacidad completa en ${policyUrl} y ejercer gratuitamente tus derechos ARCO en ${arcoUrl} o en ${contact}.${minorsSection}${imageSection}

---

*Textos elaborados con DatosPrivados conforme al Art. 5, 13 y 18 de la Ley N.° 29733 y al DS N.° 016-2024-JUS (arts. 5 a 10, 22, 23 y 26). Son un borrador: valida con un abogado las cláusulas de datos sensibles y de menores.*`;
}

export function buildSecurityDocument(company: Company, banks: DataBank[], providers: Provider[] = []): string {
  const date = formatDate(new Date().toISOString(), "long");
  const profile = sectorLegalProfile(company);
  const sectorMeasures = profile.security.length
    ? `\n\n### Medidas propias de tu actividad (${profile.title})\n\n${bullets(profile.security)}`
    : "";
  const inventory = banks
    .map(
      (bank, index) =>
        `${index + 1}. **${bank.name}** — *Finalidad:* ${bank.purpose || "por definir"}. *Categorías:* ${bank.data_categories || "por definir"}. *Canal/Soporte:* ${bank.channel || "digital"}. *Contiene datos sensibles:* ${isSensitiveBank(bank) ? "**Sí**" : "No"}. *Transferencia internacional:* ${bank.transfers === "si" ? "Sí" : "No"}. *Estado RNPDP/SIPDP:* ${bank.status === "registrado" ? `Inscrito (${bank.sipdp_code ?? "código registrado"})` : "En trámite de inscripción"}.`
    )
    .join("\n");

  return `## 1. Objeto, marco normativo y fecha cierta

El presente **Documento de Seguridad** establece las medidas técnicas, organizativas y legales adoptadas por **${company.name}** (${companyShortId(company)}), con domicilio en **${company.address || "por completar"}**, para garantizar la confidencialidad, integridad y disponibilidad de los bancos de datos personales bajo su responsabilidad, en cumplimiento de la **Ley N.° 29733** (art. 16) y de los **arts. 46 a 58 del Decreto Supremo N.° 016-2024-JUS**. Puede tomar como referencia la NTP-ISO/IEC 27001 vigente u otro estándar reconocido (art. 47.1). Es de obligatorio cumplimiento para todo el personal con acceso a los sistemas de información (art. 47.2).

- **Versión vigente y fecha de aprobación:** ${date}.
- **Aprobado por:** Representación legal / Administración de ${company.name}.
- **Fecha cierta (art. 47.1):** el documento debe aprobarse formalmente y tener fecha cierta. Para acreditarla basta con una de estas vías: presentarlo ante notario o funcionario público, difundirlo por un medio público de fecha determinada, o usar otro medio técnico idóneo (por ejemplo firma digital con sello de tiempo), conforme a los criterios del art. 58.
- **Revisión:** al menos una vez al año y cuando cambien los bancos de datos, los sistemas o la normativa.

## 2. Inventario de bancos de datos personales comprendidos

${inventory || "Aún no se han declarado bancos de datos personales en el inventario."}

## 3. Gobernanza, responsables y encargados del tratamiento

- **Responsable del tratamiento:** ${company.name} (${companyShortId(company)}).
- **Responsable de Privacidad / Oficial de Datos Personales (ODP):** ${company.dpo_name || "Administrador designado"} (${company.dpo_email || company.email}), encargado de supervisar el cumplimiento de este documento, gestionar las solicitudes ARCO y coordinar notificaciones ante la ANPD.
- **Personal con acceso a datos:** Todo trabajador o colaborador suscribe un compromiso de confidencialidad y solo accede a los datos estrictamente necesarios para sus funciones (principio de mínimo privilegio).
- **Encargados externos (proveedores):** Los terceros que tratan datos por cuenta de la empresa (contabilidad, courier, pasarela de pagos, hosting o mensajería) operan bajo cláusulas de confidencialidad y prohibición de usar los datos para fines propios.${
    providers.length
      ? `\n- **Inventario de herramientas y proveedores (art. 47.3):**\n${providers
          .map(
            (provider) =>
              `  - ${provider.name} (${categoryLabel(provider.category)}) — país: ${COUNTRY_LABEL(provider.country)} — contrato de encargo: ${DPA_LABEL[provider.dpa_status]}${isAbroad(provider.country) ? ` — flujo transfronterizo: ${TRANSFER_LABEL[provider.transfer_status]}` : ""}`
          )
          .join("\n")}`
      : ""
  }

## 4. Control de accesos y gestión de privilegios (arts. 46 y 47 del DS N.° 016-2024-JUS)

0. **Gestión de accesos de principio a fin (art. 46.1.a):** se documenta quién tiene acceso desde que se crea su usuario hasta su baja, incluyendo periodos de vacaciones, licencias o permisos esporádicos.
1. **Cuentas individuales e intransferibles:** Cada usuario autorizado posee credenciales propias; queda prohibido el uso de cuentas genéricas o compartidas para acceder a bancos de datos personales.
2. **Política de contraseñas y autenticación:** Uso obligatorio de contraseñas robustas (mínimo 10 caracteres alfanuméricos) y activación de verificación en dos pasos (2FA) en el correo corporativo, paneles de administración, WhatsApp Business y almacenamiento en la nube.
3. **Procedimiento de altas y bajas:** Cuando un colaborador cesa o cambia de funciones, sus accesos a correos, carpetas, grupos de WhatsApp y sistemas son revocados el mismo día del cese. Los permisos se revisan al menos cada seis (6) meses y se deja constancia con fecha (art. 46.1.c).
4. **Soportes físicos (si aplica):** Los archivadores con contratos, historias clínicas, boletas o currículums en papel se mantienen bajo llave en áreas restringidas al público; las llaves se asignan formalmente (art. 53). Solo el personal autorizado puede copiar o reproducir documentos y las copias desechadas se destruyen (arts. 54 y 55). El traslado físico de documentación se hace con medidas contra el acceso no autorizado (art. 56).
5. **Registros de interacción (art. 46.3):** en los sistemas digitales se generan y conservan **por un mínimo de dos (2) años** registros legibles de las cuentas con acceso, horas de inicio y cierre de sesión y acciones de procesamiento, visualización, modificación, eliminación, importación y exportación de datos personales. Los registros de trazabilidad se generan de forma continua y están disponibles de inmediato.
6. **Mensajería y correos no institucionales (art. 46.4):** solo se usan aplicaciones de mensajería, cuentas de correo y redes sociales aprobadas por la administración; queda prohibido enviar datos personales por cuentas personales, para evitar transferencias no autorizadas.
7. **Capacitación y monitoreo (art. 46.2):** el personal recibe capacitación según su rol al menos una vez al año y al ingresar; las medidas de seguridad se revisan periódicamente.

## 5. Copias de respaldo (Backups), cifrado y baja segura de equipos

1. **Copias de respaldo periódicas (art. 51.1):** Se realizan copias de seguridad (backups) de los bancos de datos con frecuencia **semanal como mínimo** (salvo que en ese periodo no se hubiera actualizado ningún dato), almacenadas en un soporte o nube segura independiente del equipo principal, con medidas de seguridad para su almacenamiento, transferencia y destrucción.
2. **Verificación de integridad y restauración (art. 51.2):** Al menos cada seis (6) meses se verifica la integridad de las copias de respaldo y se prueba una recuperación completa, comprobando que se retorna al estado anterior a la interrupción.
3. **Protección en tránsito y traslado de datos (art. 52):** Toda salida de datos personales fuera de las instalaciones está autorizada por el responsable y usa medios con cifrado, firmas o certificados digitales, o verificación de integridad (HTTPS / TLS en internet). El envío de bases de datos a encargados (como planilla al estudio contable) se realiza mediante canales seguros o archivos protegidos con contraseña.
4. **Borrado seguro y baja de equipos (art. 50.1.5):** Antes de desechar, vender, reutilizar, formatear o enviar a soporte técnico cualquier computadora, disco duro, memoria USB o teléfono celular del negocio, se ejecuta el borrado seguro o sobrescritura completa de las carpetas que contengan datos personales. Ningún equipo, información o software sale del local sin autorización previa (art. 50.1.4).
5. **Equipos y áreas seguras (arts. 49 y 50):** Los equipos se bloquean al ausentarse el usuario, se mantiene una política de escritorio y pantalla limpios y el acceso a las áreas donde se tratan datos se limita al personal autorizado.

## 6. Protocolo de respuesta y notificación de incidentes en 48 horas (DS N.° 016-2024-JUS)

Ante cualquier incidente de seguridad (robo o pérdida de equipos, acceso no autorizado, ransomware, extravío de archivos o envío masivo erróneo de datos):
1. **Detección y contención inmediata (Hora 0):** Aislar el equipo o cuenta comprometida, revocar contraseñas y registrar el incidente en el módulo de *Incidentes* de DatosPrivados indicando la fecha y hora exacta de detección.
2. **Evaluación de impacto:** Determinar la naturaleza del incidente, categorías de datos comprometidos, cantidad estimada de titulares afectados y consecuencias probables.
3. **Notificación a la ANPD en máximo 48 horas (art. 34.1):** Si el incidente expone grandes volúmenes de datos (en cantidad o tipo), puede afectar a un gran número de personas, involucra datos sensibles o produce un perjuicio evidente a otros derechos o libertades de los titulares, se notifica a la **Autoridad Nacional de Protección de Datos Personales (ANPD)** dentro de las **48 horas** de haber tomado conocimiento, aunque el incidente ya se haya resuelto internamente. Si se notifica después, se explican los motivos de la demora. Si el incidente ocurre en el entorno digital, se reporta asimismo al **Centro Nacional de Seguridad Digital (CNSD)** (art. 34.5).
4. **Comunicación a los titulares afectados (art. 34.3):** Si el incidente afecta a los titulares, se les comunica en lenguaje claro y sencillo dentro de las **48 horas**, indicando las medidas adoptadas para mitigar sus efectos. No es necesario si el incidente no produjo afectación y fue superado totalmente (art. 34.4).
5. **Registro y lecciones aprendidas (art. 35):** Todo incidente se documenta (hechos, efectos y medidas adoptadas), **incluso si no correspondía notificarlo**, junto con las acciones correctivas para evitar que se repita.

## 7. Conservación, bloqueo y supresión definitiva

Cumplida la finalidad del tratamiento y vencidos los plazos legales de conservación (tributarios, laborales o contractuales), los datos personales son eliminados de las bases activas o destruidos de forma segura (trituración de papel o borrado digital irreversible), dejando constancia en el registro de actividad. Antes de eliminar, los datos que deban conservarse por posibles responsabilidades se **bloquean** (se reservan y dejan de ser visibles para el tratamiento ordinario, art. 2.2). Si un titular pide la supresión, se documenta ante él el cumplimiento y a quién se le transfirieron los datos (art. 83). Los proveedores que actúan como encargados conservan los datos como máximo dos (2) años desde el último encargo (art. 31.2).${sectorMeasures}

## 8. Auditoría y revisión anual

Este Documento de Seguridad es de cumplimiento obligatorio para todo el personal de **${company.name}** y se revisa al menos una vez al año o cada vez que se incorporen nuevos bancos de datos, sistemas tecnológicos o cambios normativos.

---

**Constancia de aprobación interna:**
Responsable: ${company.name} (${companyShortId(company)})
Encargado de Privacidad / ODP: ${company.dpo_name || "___________________________"}
Fecha de aprobación: ${date}
Firma: ___________________________`;
}

export function buildInternalClauses(company: Company): string {
  const date = formatDate(new Date().toISOString(), "long");
  const odp = odpDeadline(company);
  const odpLine = odp
    ? `**Para ${company.name} (${odp.band}) el ODP es exigible desde el ${formatDate(odp.from, "long")}, si tu actividad trata datos sensibles, grandes volúmenes o puede afectar a muchas personas (art. 37.1).**`
    : "Indica tus ventas anuales en «Empresa» para saber desde cuándo te aplica.";
  const name = company.name;
  const shortId = companyShortId(company);
  const address = company.address || "[indicar dirección del local]";
  const contact = company.dpo_email || company.email;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const profile = sectorLegalProfile(company);
  const cctvRetention =
    profile.family === "educacion_menores"
      ? "treinta (30) días calendario como máximo (Directiva 01-2020-JUS/DGTAIPD para instituciones educativas)"
      : "entre treinta (30) y sesenta (60) días calendario (Directiva 01-2020-JUS/DGTAIPD)";

  return `## A. Compromiso de Confidencialidad y Deber de Secreto para Trabajadores (Art. 17 Ley N.° 29733)

*¿Para qué sirve?:* La ANPD exige demostrar que todo empleado, vendedor, asistente o practicante que tiene acceso a datos de clientes o planilla firmó una obligación de confidencialidad. Imprímelo o envíalo para firma a cada miembro de tu equipo.

> **COMPROMISO DE CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS PERSONALES**
>
> Conste por el presente documento el Compromiso de Confidencialidad que suscribe **________________________________________**, identificado(a) con DNI/CE N.° **______________** (en adelante, el «COLABORADOR»), frente a **${name}**, ${shortId}, con domicilio en ${address} (en adelante, la «EMPRESA»):
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
> Por medio de la presente cláusula, el PROVEEDOR (**________________________________________**, con RUC N.° **______________**), en su calidad de **Encargado del Tratamiento**, se obliga frente a **${name}** (${shortId}), en su calidad de **Responsable del Tratamiento**, al cumplimiento estricto de la Ley N.° 29733 y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS:
>
> 1. **Uso limitado a las instrucciones:** El PROVEEDOR tratará los datos personales a los que tenga acceso única y exclusivamente para prestar el servicio contratado por **${name}**, quedando prohibido aplicarlos o utilizarlos con un fin distinto, comercializarlos o comunicarlos a terceros sin autorización escrita.
> 2. **Medidas de seguridad y confidencialidad:** El PROVEEDOR garantiza que cuenta con medidas técnicas y organizativas de seguridad equivalentes a las exigidas por el DS N.° 016-2024-JUS y que su personal ha suscrito compromisos de confidencialidad.
> 3. **Notificación inmediata de incidentes:** En caso de sufrir cualquier vulneración, extravío o acceso no autorizado que afecte los datos de **${name}**, el PROVEEDOR lo notificará a **${contact}** en un plazo máximo de **12 horas** desde su detección, a fin de permitir el reporte a la ANPD dentro del plazo legal de 48 horas.
> 4. **Devolución o supresión al término del servicio:** Finalizada la prestación del servicio, el PROVEEDOR devolverá o eliminará de forma segura todos los datos personales recibidos y lo acreditará por escrito. No los conservará por más de **dos (2) años** desde la finalización del último encargo (art. 31.2 del DS N.° 016-2024-JUS), salvo mandato legal expreso, caso en el que los devolverá a **${name}** para su conservación.
> 5. **Subcontratación:** El PROVEEDOR no transferirá los datos ni subcontratará su tratamiento sin autorización previa de **${name}**; el subcontratista asumirá las mismas obligaciones y, si usa los datos para otro fin o los transfiere contra las instrucciones, asumirá las obligaciones del titular del banco de datos (arts. 31 a 33).
>
> *Para proveedores de nube, IA, hosting o software, usa la cláusula completa en «Encargo y transferencias».*
>
>
> Por ${name}: ___________________________   Por el Proveedor: ___________________________

---

## C. Cartel Informativo de Videovigilancia para Local Físico (Directiva 01-2020-JUS/DGTAIPD)

*¿Para qué sirve?:* Si tienes cámaras de seguridad en tu tienda, oficina, consultorio o almacén, la Directiva de la ANPD exige colocar un cartel visible en los accesos a las zonas vigiladas (con ícono de cámara), de color amarillo o contrastante con la pared y de al menos 297 × 210 mm (tamaño A4), que informe quién es el dueño del banco de datos y dónde ejercer los derechos ARCO. Los datos que no entran en el cartel van en un **informativo adicional** (sección E) que debes poder entregar impreso o en línea. Si las cámaras están dentro de un vehículo, el cartel va dentro de la unidad. Las cámaras simuladas o apagadas no están dentro de la Directiva, pero no las presentes como reales.

> **[COLOCAR ÍCONO DE CÁMARA DE SEGURIDAD — ZONA VIDEOVIGILADA]**
>
> **USTED ESTÁ SIENDO GRABADO POR RAZONES DE SEGURIDAD**
> *(Ley N.° 29733 — Ley de Protección de Datos Personales y DS N.° 016-2024-JUS)*
>
> - **Responsable del Banco de Datos («Videovigilancia»):** **${name}** — ${shortId}
> - **Domicilio:** ${address}
> - **Finalidad:** Garantizar la seguridad de las personas, bienes e instalaciones de este establecimiento.
> - **Plazo de conservación:** Las imágenes se conservan ${cctvRetention}, tras lo cual son eliminadas, salvo requerimiento de autoridad competente.
> - **Ejercicio gratuito de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):** Puede presentar su solicitud en nuestro formulario digital **${arcoUrl}**, escribiendo al correo **${contact}** o de forma presencial en este local.
> - **Política de Privacidad completa:** ${policyUrl}

---

## D. Acta de Designación Interna de Contacto de Privacidad / Oficial de Datos Personales (ODP)

*¿Para qué sirve?:* Deja constancia interna con fecha cierta de quién es la persona responsable de vigilar los plazos ARCO y atender a la ANPD dentro de tu empresa.

> **ACTA DE DESIGNACIÓN INTERNA DE RESPONSABLE DE PRIVACIDAD DE DATOS**
>
> En la ciudad de Lima, con fecha **${date}**, la administración de **${name}** (${shortId}) deja constancia de la designación de **${company.dpo_name || "[Nombre del responsable]"}**, con correo electrónico de contacto **${contact}**, como responsable interno de privacidad y atención de Derechos ARCO, encargado de:
> 1. Mantener actualizado el inventario de bancos de datos personales e inscripciones en el portal SIPDP (RNPDP).
> 2. Atender dentro de los plazos legales (8, 10 y 20 días hábiles, art. 69) las solicitudes ARCO recibidas en ${arcoUrl}.
> 3. Custodiar el *Documento de Seguridad* y ejecutar el protocolo de notificación en 48 horas ante la ANPD en caso de incidentes.
>
> *(Nota legal: La designación formal de un Oficial de Datos Personales (ODP) solo es obligatoria en los supuestos del art. 37.1 del DS N.° 016-2024-JUS: entidades públicas, grandes volúmenes de datos o datos sensibles, o actividad principal con datos sensibles. Es exigible por calendario según las ventas anuales: más de 2,300 UIT, desde el 30/11/2025; más de 1,700 hasta 2,300 UIT, desde el 30/11/2026; más de 150 hasta 1,700 UIT, desde el 30/11/2027; y hasta 150 UIT, desde el 30/11/2028 (Primera Disposición Complementaria Final). Cuando es obligatorio, sus datos de contacto deben publicarse en un lugar visible (art. 37.4) y comunicarse a la ANPD dentro de los 15 días siguientes a la designación (art. 37.5); puede ser un trabajador con otras funciones o un externo (art. 38.2). ${profile.sensitive ? "**Tu actividad principal trata datos sensibles: el ODP te aplica según tu calendario de ventas.** " : ""}${odpLine} Mientras no sea exigible, esta acta deja constancia del responsable interno y del canal de contacto).*
>
> Firma del Representante Legal: ___________________________

---

## E. Informativo adicional y protocolo de videovigilancia

*Este texto acompaña al cartel (sección C) y se entrega impreso o por enlace. Guarda el protocolo con el Documento de Seguridad.*

> **INFORMACIÓN ADICIONAL DEL SISTEMA DE VIDEOVIGILANCIA**
> - **Responsable:** ${name} — ${shortId} — ${address}.
> - **Finalidad:** seguridad de personas, bienes e instalaciones. No se usan las imágenes para evaluar el desempeño laboral ni para publicidad.
> - **Zonas:** accesos, caja, almacén y áreas comunes. **No** hay cámaras en baños, vestuarios ni zonas de descanso.
> - **Conservación:** ${cctvRetention}. Ante un incidente (accidente, robo, infracción) se conserva el fragmento pertinente solo el tiempo necesario para la denuncia o el procedimiento.
> - **Destinatarios:** personal autorizado, empresa de seguridad o monitoreo (si existe) y, ante requerimiento escrito, Policía Nacional, Ministerio Público o Poder Judicial.
> - **Derechos:** acceso, rectificación, cancelación y oposición, gratis, en ${arcoUrl} o ${contact}. Si pides acceso a imágenes en que aparecen otras personas, se entregan resguardando su identidad.

**Protocolo interno (5 puntos):**
1. **Responsable del sistema:** una persona designada guarda las claves; nadie más graba, exporta ni borra.
2. **Acceso a las imágenes:** solo por motivo de seguridad y con registro (fecha, persona, motivo). Prohibido mostrar, difundir o publicar las imágenes en redes o grupos de WhatsApp.
3. **Solicitud de un titular:** se atiende dentro de 20 días hábiles (acceso) y se deja constancia; si el video muestra a terceros, se pixelan.
4. **Solicitud de una autoridad:** se atiende solo con requerimiento escrito; se entrega copia y se conserva el cargo.
5. **Eliminación:** la sobrescritura automática se verifica cada mes; si el sistema no sobrescribe, se elimina manualmente al vencer el plazo.`;
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
  const date = formatDate(new Date().toISOString(), "long");
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const cookieType: Record<string, string> = { analitica: "Analítica", publicidad: "Publicitaria" };
  const cookieProviders = providers.filter(
    (provider) =>
      provider.cookies ||
      provider.category === "analitica" ||
      provider.category === "publicidad" ||
      (provider.is_custom && ["login", "pagos", "web", "hosting"].includes(provider.category))
  );
  const providerCookieRows = cookieProviders.map((provider) => [
    provider.cookies || "[cookies de este proveedor: revísalas en tu navegador]",
    provider.name,
    provider.purpose || categoryLabel(provider.category),
    "Según el proveedor",
    cookieType[provider.category] ?? "Técnica o de terceros",
  ]);

  return `## 1. Qué son las cookies y por qué las usamos

Una cookie es un archivo pequeño que el sitio guarda en tu navegador. Sirve para mantener tu sesión abierta, recordar tus preferencias y, solo si lo autorizas, medir cómo se usa el sitio. Cuando una cookie o identificador en línea permite identificarte, es un dato personal (art. 2.4 del DS N.° 016-2024-JUS) y su uso para analítica o publicidad requiere tu consentimiento previo, libre, informado e inequívoco (art. 5 y 6).

## 2. Categorías

| Categoría | Para qué sirve | ¿Requiere consentimiento? |
| --- | --- | --- |
| **Técnicas o esenciales** | Inicio de sesión, seguridad, prevención de fraude, balanceo de carga | No: son necesarias para prestar el servicio |
| **De preferencias** | Idioma, tema claro/oscuro, último panel usado | No, si solo guardan tu elección |
| **Analíticas** | Medir páginas vistas y uso de forma agregada | **Sí** |
| **Publicitarias** | Medir conversiones de campañas y mostrarte anuncios | **Sí** |

## 3. Nada se carga antes de que decidas

El sitio **no ejecuta** scripts de analítica ni de publicidad antes de que pulses «Aceptar» en el banner. Si rechazas las no esenciales, no se descarga ninguna etiqueta de terceros. Guardamos tu decisión para no volver a preguntarte en cada visita.

## 4. Cookies que usamos

${providers.length ? "*Las filas de proveedores salen de las herramientas que declaraste en DatosPrivados.* " : ""}*Esta tabla debe reflejar lo que **realmente** carga tu sitio: abre tu web con las herramientas de desarrollo del navegador (pestaña Aplicación → Cookies) y completa cada fila. Si declaras cookies que no usas, o callas las que usas, la política deja de ser veraz.*

| Cookie | Proveedor | Finalidad | Duración | Tipo |
| --- | --- | --- | --- | --- |
| [nombre de la cookie de sesión de tu web o plataforma] | ${company.name} | Mantener la sesión y la seguridad | Sesión | Técnica |
| [decisión del banner de cookies] | ${company.name} | Recordar tu elección | Hasta que la borres | Preferencias |
${providerCookieRows.length ? providerCookieRows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "| [completar con cada cookie o etiqueta de terceros] | [proveedor] | [finalidad] | [duración] | [tipo] |"}

**Ejemplos habituales, para que los reconozcas (úsalos solo si tu sitio realmente los carga):** \`_ga\` y \`_ga_*\` (Google Analytics, analítica, hasta 2 años), \`_gcl_*\` (Google Ads, publicidad, hasta 90 días), \`_fbp\` (Meta Pixel, publicidad, hasta 90 días), \`__cf_bm\` (Cloudflare, técnica, 30 minutos).

## 5. Terceros

Algunos proveedores pueden instalar sus propias cookies cuando usas funciones concretas (por ejemplo, la pasarela de pagos en la pantalla de cobro). No controlamos esas cookies: revisa sus políticas. La lista de proveedores y transferencias está en la Política de Privacidad (${policyUrl}).

## 6. Cómo revocar o cambiar tu decisión

1. Abre el enlace **«Preferencias de cookies»** del pie de página y cambia las categorías.
2. Borra las cookies del sitio desde la configuración de tu navegador.
3. Para analítica de Google, puedes instalar el complemento de inhabilitación de Google Analytics.

Revocar el consentimiento no afecta la licitud del tratamiento previo.

## 7. Almacenamiento local

Además de cookies, usamos almacenamiento local del navegador para preferencias de interfaz (tema, idioma, decisión del banner). Esos datos se quedan en tu equipo y no viajan en cada solicitud.

## 8. Vigencia y contacto

Vigencia: **${date}**. Cambios relevantes se anuncian en esta página. Consultas: **${contact}**.

---

*Borrador generado con DatosPrivados. Verifica la tabla de cookies con las herramientas de desarrollo del navegador antes de publicar.*`;
}

/**
 * Avisos cortos: el deber de información del art. 18 de la Ley 29733 se cumple
 * en el punto de recolección, no solo en la política publicada.
 */
export function buildShortNotices(company: Company): string {
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const policyUrl = `${appUrl()}/p/${company.slug}`;
  const arcoUrl = `${appUrl()}/solicitud/${company.slug}`;
  const profile = sectorLegalProfile(company);
  const checkoutNotice =
    profile.terms === "plataforma"
      ? `> Al suscribirte, ${name} tratará tus datos de cuenta y de pago para cobrar la suscripción, emitir la constancia de pago y atender reclamos. El cobro se renueva automáticamente hasta que canceles desde tu perfil. Política de Privacidad: ${policyUrl}`
      : `> Al comprar, ${name} tratará tus datos de contacto, entrega y pago para atender tu pedido, emitir el comprobante y gestionar garantías o reclamos. No te enviaremos publicidad sin tu permiso aparte. Política de Privacidad: ${policyUrl}`;
  const sensitiveNotice = profile.sensitive || profile.biometric
    ? `

## G. Ficha de ingreso o historia (antes de recoger datos sensibles)

> Para atenderte necesitamos datos de salud u otros datos sensibles. Los trataremos solo con tu autorización escrita (te la pediremos en el siguiente paso), con acceso restringido y sin usarlos para publicidad. Información completa y derechos ARCO: ${policyUrl} · ${arcoUrl}`
    : "";

  return `## A. Formulario web (debajo del botón «Enviar»)

> Al enviar este formulario, ${name} tratará tus datos para atender tu solicitud. Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición y portabilidad en ${arcoUrl} o escribiendo a ${contact}. Política de Privacidad: ${policyUrl}

## B. Checkout o pantalla de pago (antes de confirmar)

${checkoutNotice}

## C. Primer contacto por WhatsApp o redes (mensaje de bienvenida)

> Hola, te saluda ${name}. Para atender tu consulta trataremos tus datos conforme a nuestra Política de Privacidad (${policyUrl}). No te enviaremos promociones sin tu permiso: si quieres recibirlas, responde «SÍ ACEPTO»; si no, simplemente seguimos con tu consulta. Puedes pedir la baja o ejercer tus derechos ARCO escribiendo «BAJA» o en ${arcoUrl}.

## D. Firma de correo y pie de página

> ${name} · Tratamos tus datos para responder a tu mensaje. Política de Privacidad: ${policyUrl} · Derechos ARCO: ${arcoUrl}

## E. Boleta, recibo o comprobante (pie de documento)

> Tus datos se usan para la emisión de este comprobante y el cumplimiento de obligaciones tributarias. Información completa y derechos ARCO: ${policyUrl} · ${arcoUrl}

## F. Onboarding de la app o registro (checkbox separado)

> [ ] He leído la Política de Privacidad (${policyUrl}) y acepto el tratamiento de mis datos para crear y administrar mi cuenta.
>
> [ ] *(Opcional)* Acepto recibir novedades y promociones. Puedo darme de baja cuando quiera.${sensitiveNotice}

---

*Regla práctica: el aviso corto no reemplaza a la política; la ubica (art. 7 del DS N.° 016-2024-JUS). Debe estar visible antes de que la persona entregue el dato, no después, e incluir al menos quién eres, para qué usas el dato y dónde ejercer derechos.*`;
}

/**
 * Libro de Reclamaciones: aviso obligatorio + hoja + procedimiento interno.
 * (Ley N.° 29571, arts. 150 a 152, y su Reglamento.)
 */
export function buildComplaintBook(company: Company): string {
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const complaintsUrl = complaintsLink(company);
  const idLine = isForeign(company)
    ? `${name} — ${companyShortId(company)} — Representante en el Perú: ${company.representative_name || "[por designar]"} — ${company.address || "[completar domicilio]"}`
    : `${name} — RUC ${company.ruc} — ${company.address || "[completar domicilio]"}`;

  return `## A. Aviso obligatorio (visible en la web y en el local)

Debe estar en el pie de página y en la pantalla de pago, con enlace directo al libro. *DatosPrivados todavía no aloja tu Libro de Reclamaciones virtual: reemplaza el texto entre corchetes por el enlace del libro que uses (por ejemplo, el servicio gratuito del INDECOPI o el de tu plataforma de ventas).* Los datos de las hojas son un banco de datos personales: declara el banco «Libro de Reclamaciones».

> **LIBRO DE RECLAMACIONES**
> Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571) y su Reglamento del Libro de Reclamaciones (DS N.° 011-2011-PCM), este establecimiento cuenta con un **Libro de Reclamaciones** a tu disposición.
> Regístralo aquí: ${complaintsUrl}
> También puedes escribir a ${contact}.
> Si no atendemos tu reclamo, puedes acudir al **INDECOPI**: www.indecopi.gob.pe

Para establecimientos físicos, además: libro en formato físico en el mostrador, con aviso visible en el ingreso.

## B. Hoja de reclamación (formato)

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
> *Plazo de respuesta: máximo 30 días calendario. La respuesta se envía al correo o domicilio indicados.*

## C. Procedimiento interno de atención (5 pasos)

1. **Registro (día 0):** toda hoja se numera y se ingresa el mismo día, con fecha y hora, en ${complaintsUrl} o en el registro interno. Nunca se rechaza una hoja por el motivo del reclamo.
2. **Acuse (día 1):** se envía copia al consumidor con el número asignado.
3. **Investigación (días 2 a 7):** se reúne el pedido, el comprobante, los correos y la grabación o registro de atención.
4. **Respuesta (máximo 30 días calendario):** se responde por escrito, con decisión, fundamento y medidas adoptadas. Se guarda evidencia del envío.
5. **Cierre y reporte:** se archiva la hoja con su respuesta por un mínimo de **2 años** y se revisan los reclamos repetidos para corregir la causa.

## D. Qué NO hacer

- No condicionar la atención a que el consumidor retiere el reclamo por otra vía.
- No responder verbalmente sin dejar constancia.
- No usar el libro como canal de marketing ni pedir datos innecesarios.
- No eliminar hojas: son registro obligatorio y prueba ante INDECOPI.

---

*Borrador generado con DatosPrivados. El aviso y el formato deben coincidir con el canal realmente habilitado.*`;
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
  const date = formatDate(new Date().toISOString(), "long");
  const profile = sectorLegalProfile(company);
  const name = company.name;
  const contact = company.dpo_email || company.email;
  const rows = banks
    .map(
      (bank) =>
        `| «${bank.name}» | ${bank.retention || "[completar]" } | ${bank.channel || "digital"} | Eliminación o anonimización al vencer el plazo | [pendiente de registrar] |`
    )
    .join("\n");

  return `## 1. Regla general

${name} conserva cada dato personal solo mientras exista una finalidad vigente o un plazo legal que obligue a mantenerlo. Al vencer, el dato se elimina, se suprime o se anonimiza de forma segura, y la operación se registra.

## 2. Plazos por banco de datos

Estos plazos son los declarados en tu inventario y deben coincidir con tu Política de Privacidad y tus fichas del SIPDP.

| Banco de datos | Plazo declarado | Soporte | Acción al vencer | Evidencia |
| --- | --- | --- | --- | --- |
${rows || "| [sin bancos declarados] | — | — | — | — |"}

## 3. Plazos por tipo de dato para tu rubro (${profile.title})

${table(
  ["Tipo de dato", "Plazo sugerido", "Fundamento"],
  [
    ...profile.retention.map((row) => [row.data, row.term, row.basis]),
    ["Registros de acceso e interacción con datos (Documento de Seguridad)", "Mínimo 2 años", "Art. 46.3 del DS N.° 016-2024-JUS"],
    ["Datos tratados como encargado de otra empresa", "Máximo 2 años desde el último encargo", "Art. 31.2 del DS N.° 016-2024-JUS"],
    ["Copias de respaldo", "Rotativas (por ejemplo 30 días)", "Recuperación ante desastres"],
  ]
)}

*Los plazos son una referencia: si una norma especial fija un plazo distinto, prevalece. No se conservan datos de forma indeterminada (art. 31.2, regla general).*

## 4. Bloqueo y eliminación anticipada

Cuando el titular pide la supresión o cancelación, la sola presentación de la solicitud implica el **cese del tratamiento mediante el bloqueo** de los datos mientras se evalúa su eliminación (art. 82.3). Se eliminan sus datos salvo los que deban conservarse por razones históricas, estadísticas o científicas, o por la relación contractual o una obligación legal (art. 84); cuando es posible, se usan medios de disociación o anonimización para seguir tratándolos (art. 85). En ese caso se le informa qué se conserva y por qué, y se documenta ante él la supresión indicando a quién se transfirieron los datos (art. 83).

Al eliminar una cuenta o cerrar la relación, los datos activos se eliminan o bloquean de inmediato y las copias de respaldo se sobrescriben en su ciclo.

## 5. Registro de purgas

Cada purga deja constancia de: fecha, banco o tabla afectada, criterio aplicado, número de registros eliminados y persona que la ejecutó. Este registro es la prueba del principio de minimización ante una fiscalización.

## 6. Responsable y revisión

- Responsable de ejecutar y registrar las purgas: ${company.dpo_name || "[responsable de privacidad]"} (${contact}).
- Revisión de plazos: al menos una vez al año y cada vez que se cree o modifique un banco de datos.
- Aprobación: ${date}.

---

*Borrador generado con DatosPrivados a partir de los plazos declarados en tus bancos de datos.*`;
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

import type { DocumentKind } from "@/lib/db";

/** Copia del switch de buildDocument (src/lib/document-catalog.ts). */
export function legacyBuildDocument(
  kind: DocumentKind,
  company: Company,
  banks: DataBank[],
  providers: Provider[] = []
): string {
  switch (kind) {
    case "politica":
      return buildPrivacyPolicy(company, banks, providers);
    case "terminos":
      return buildTermsOfService(company, banks);
    case "cookies":
      return buildCookiePolicy(company, providers);
    case "aviso":
      return buildShortNotices(company);
    case "reclamaciones":
      return buildComplaintBook(company);
    case "consentimiento":
      return buildConsentTexts(company);
    case "seguridad":
      return buildSecurityDocument(company, banks, providers);
    case "retencion":
      return buildRetentionPolicy(company, banks);
    case "encargo":
      return buildProcessingAgreement(company, banks, providers);
    case "clausulas":
      return buildInternalClauses(company);
    case "eipd":
      return buildImpactAssessment(company, banks, providers);
    case "trabajadores":
      return buildWorkerNotice(company);
    case "arco":
      return buildArcoProcedure(company);
    case "sectorial":
      return buildSectorProtocol(company, banks, providers);
  }
}
