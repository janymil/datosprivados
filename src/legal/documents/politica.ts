import { isSensitiveBank } from "@/lib/sector-legal";
import {
  appUrl,
  bullets,
  categoryLabel,
  controllerParagraph,
  COUNTRY_LABEL,
  foreignProviders,
  legalBasisLabel,
  sentence,
  table,
  usesAutomation,
} from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Política de privacidad (antes `buildPrivacyPolicy`). */

const hasTransfers = ({ banks, providers }: LegalContext) =>
  banks.some((b) => b.transfers === "si") || foreignProviders(providers).length > 0;

/** Tabla de proveedores que sigue, sin línea en blanco propia, al párrafo de transferencias. */
function providerTable({ providers }: LegalContext): string {
  return providers.length
    ? `

**Herramientas y proveedores que reciben o alojan datos, y país de destino:**

${table(
  ["Proveedor", "Para qué", "País donde se tratan los datos"],
  providers.map((provider) => [provider.name, provider.purpose || categoryLabel(provider.category), COUNTRY_LABEL(provider.country)])
)}`
    : "";
}

const sensitiveBanksOf = ({ banks }: LegalContext) => banks.filter(isSensitiveBank);

export const politicaSpec: DocumentSpec = {
  kind: "politica",
  join: "\n\n",
  clauses: [
    {
      id: "politica.1.responsable",
      cites: [],
      text: ({ company }) => `## 1. Identidad y domicilio del responsable del tratamiento

${controllerParagraph(company)}. Es la titular de los bancos de datos personales y responsable del tratamiento de los datos que recopila a través de sus canales físicos y digitales, en cumplimiento de la **Ley N.° 29733**, Ley de Protección de Datos Personales, y su Reglamento aprobado por **Decreto Supremo N.° 016-2024-JUS**.

Para cualquier consulta, solicitud o reclamo vinculado a la protección de datos personales, puedes comunicarte con nuestro canal de privacidad / Oficial de Datos Personales en **${company.dpo_email || company.email}**${company.dpo_name ? ` (a cargo de ${company.dpo_name})` : ""}.`,
    },
    {
      id: "politica.2.bancos-finalidades",
      cites: [
        { norm: "ds-016-2024-jus", art: "5.2" },
        { norm: "ds-016-2024-jus", art: "46.3" },
        { norm: "ley-29733", art: "5" },
        { norm: "ley-29733", art: "13.5" },
        { norm: "ley-29733", art: "14" },
        { norm: "ley-29733", art: "14.5" },
        { norm: "ley-29733", art: "18" },
      ],
      text: ({ banks }) => {
        const purposes = banks
          .map(
            (bank) =>
              `- **Banco de datos «${bank.name}»** (${bank.status === "registrado" && bank.sipdp_code ? `inscrito en el RNPDP con código ${bank.sipdp_code}` : "en proceso de inscripción ante el RNPDP"}): ${sentence(bank.purpose || "finalidad por definir")} *Categorías de datos:* ${sentence(bank.data_categories || "por definir")} *Base legal:* ${legalBasisLabel(bank.legal_basis)}. *Destinatarios / encargados:* ${sentence(bank.recipients || "uso estrictamente interno")} *Plazo de conservación:* ${sentence(bank.retention || "mientras dure la finalidad y los plazos de prescripción legal")}`
          )
          .join("\n");
        return `## 2. Bancos de datos personales, finalidades y categorías de datos (Art. 18 de la Ley N.° 29733)

Los datos personales que recopilamos se almacenan en nuestros bancos de datos personales declarados ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH) y son tratados únicamente para las siguientes finalidades determinadas, explícitas y lícitas:

${purposes || "- *Bancos de datos por declarar en el inventario de la empresa.*"}

No utilizamos tus datos personales para finalidades incompatibles o distintas a las informadas en esta política sin recabar previamente un nuevo consentimiento válido.`;
      },
    },
    {
      id: "politica.3.obligatorio-facultativo",
      cites: [],
      text: () => `## 3. Carácter obligatorio o facultativo y consecuencias de no proporcionar los datos

La entrega de los datos personales solicitados para la ejecución de una compra, contrato, prestación de servicio, atención de reclamos o cumplimiento de obligaciones legales (como la emisión de comprobantes de pago ante SUNAT o registro en planilla) es **obligatoria**. La negativa a proporcionarlos o la entrega de datos inexactos impedirá concretar la venta, prestar el servicio contratado o atender la solicitud correspondiente.

Por el contrario, la entrega de datos personales para finalidades de **prospección comercial, publicidad o envío de promociones** es completamente **voluntaria y facultativa**; la negativa a otorgar dicho consentimiento no afectará ni condicionará la contratación o prestación de nuestros servicios principales.`,
    },
    {
      id: "politica.4.base-legal",
      cites: [
        { norm: "ds-016-2024-jus", art: "5.2" },
        { norm: "ds-016-2024-jus", art: "7" },
        { norm: "ley-29733", art: "5" },
        { norm: "ley-29733", art: "13.5" },
        { norm: "ley-29733", art: "14" },
        { norm: "ley-29733", art: "14.5" },
      ],
      text: () => `## 4. Base legal del tratamiento (Art. 5 y 14 de la Ley N.° 29733)

Tratamos tus datos personales amparados en:
1. Tu **consentimiento libre, previo, expreso, informado e inequívoco** (art. 5 y 13.5 de la Ley N.° 29733), requerido obligatoriamente para envíos publicitarios y tratamiento de datos sensibles cuando corresponda.
2. La **preparación, celebración y ejecución de la relación contractual** en la que eres parte (art. 14, numeral 5 de la Ley N.° 29733).
3. El **cumplimiento de mandatos y obligaciones legales** tributarias, laborales, contables o de defensa del consumidor.
4. La **seguridad de nuestras instalaciones** mediante videovigilancia, informada con un cartel visible antes de que ingreses a la zona vigilada (consentimiento inequívoco por actos concluyentes, art. 5.2 del DS N.° 016-2024-JUS, y Directiva 01-2020-JUS/DGTAIPD), y la salvaguarda de los intereses legítimos del titular en los supuestos que contempla el art. 14 de la Ley N.° 29733.

La publicación de esta política cumple nuestro deber de informar (art. 7 del DS N.° 016-2024-JUS) pero **no reemplaza** tu consentimiento cuando la ley lo exige.`,
    },
    {
      id: "politica.5.conservacion",
      cites: [],
      text: () => `## 5. Plazo de conservación y eliminación segura

Conservamos tus datos personales únicamente durante el tiempo necesario para cumplir la finalidad para la cual fueron recopilados (detallado en la sección 2) y, posteriormente, durante los plazos legales de prescripción tributaria, laboral, civil o administrativa aplicables en el Perú. Cuando el tratamiento se basa en tu consentimiento para fines publicitarios, los conservamos hasta que revoques dicho consentimiento o solicites su cancelación. Vencidos los plazos, los datos son eliminados, suprimidos o anonimizados de manera segura.`,
    },
    {
      id: "politica.6.destinatarios",
      cites: [],
      text: ({ company }) => `## 6. Destinatarios, encargados del tratamiento y transferencias internacionales

Tienen acceso a los datos nuestro personal autorizado bajo deber de confidencialidad y los proveedores terceros que nos brindan soporte operativo (logística y courier, pasarelas de pago, facturación electrónica, estudio contable, alojamiento tecnológico y mensajería), quienes actúan únicamente como **encargados del tratamiento** siguiendo nuestras instrucciones y bajo garantías contractuales de seguridad. **${company.name} no vende ni comercializa datos personales a terceros.**`,
    },
    {
      id: "politica.6-transferencia.si",
      cites: [
        { norm: "ds-016-2024-jus", art: "18" },
        { norm: "ds-016-2024-jus", art: "20" },
        { norm: "ds-016-2024-jus", art: "21.2" },
      ],
      when: hasTransfers,
      text: (ctx) => {
        const { company, banks, providers } = ctx;
        const transfers = banks.filter((b) => b.transfers === "si");
        const abroad = foreignProviders(providers);
        const countries = Array.from(new Set(abroad.map((provider) => COUNTRY_LABEL(provider.country))));
        const transferTarget = transfers.length
          ? `de los bancos de datos (${transfers.map((t) => `«${t.name}»`).join(", ")})`
          : "de nuestras herramientas";
        return `Para la operación tecnológica ${transferTarget}, realizamos **flujo transfronterizo (transferencia internacional) de datos personales** hacia servidores en la nube y plataformas tecnológicas ubicadas fuera del territorio peruano. Solo los enviamos a países con nivel adecuado de protección reconocido por la Autoridad o, en los demás casos, con garantías adecuadas: cláusulas contractuales que imponen al receptor, como mínimo, las mismas obligaciones que a nosotros (art. 18 y 20 del DS N.° 016-2024-JUS). Comunicamos cada flujo transfronterizo a la Autoridad Nacional de Protección de Datos Personales para su inscripción en el RNPDP (art. 21.2). ${countries.length ? `Los países de destino son: ${countries.join(", ")}. ` : ""}Puedes pedir más detalle escribiendo a ${company.dpo_email || company.email}.${providerTable(ctx)}`;
      },
    },
    {
      id: "politica.6-transferencia.no",
      cites: [],
      when: (ctx) => !hasTransfers(ctx),
      text: (ctx) =>
        `Actualmente almacenamos y procesamos los datos en el Perú y no realizamos flujo transfronterizo (transferencias internacionales) de datos personales. Si en el futuro contratáramos servidores en el exterior, actualizaremos esta política y lo declararemos ante el RNPDP.${providerTable(ctx)}`,
    },
    {
      id: "politica.7.derechos-arco",
      cites: [
        { norm: "ds-016-2024-jus", art: "2.8" },
        { norm: "ds-016-2024-jus", art: "10.2" },
        { norm: "ds-016-2024-jus", art: "26.5" },
        { norm: "ds-016-2024-jus", art: "67.3" },
        { norm: "ds-016-2024-jus", art: "69" },
        { norm: "ds-016-2024-jus", art: "70" },
        { norm: "ds-016-2024-jus", art: "71" },
        { norm: "ds-016-2024-jus", art: "73" },
        { norm: "ds-016-2024-jus", art: "76" },
        { norm: "ds-016-2024-jus", art: "86" },
        { norm: "ds-016-2024-jus", art: "87" },
      ],
      text: ({ company }) => `## 7. Ejercicio de Derechos ARCO, portabilidad y revocación (DS N.° 016-2024-JUS)

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

Si tu solicitud no es atendida, se atiende parcialmente o es denegada, la respuesta debe estar justificada e indicarte que puedes presentar una reclamación ante la **Dirección de Protección de Datos Personales de la Autoridad Nacional de Protección de Datos Personales (ANPD)** del Ministerio de Justicia y Derechos Humanos, a través de la plataforma «Yo cuido mis datos personales» (www.gob.pe/anpd), o acudir al Poder Judicial mediante acción de hábeas data (art. 73).`,
    },
    {
      id: "politica.8.encabezado",
      cites: [],
      nonLegal: "Encabezado de sección",
      text: () => `## 8. Decisiones automatizadas y elaboración de perfiles`,
    },
    {
      id: "politica.8-automatizado.si",
      cites: [
        { norm: "ds-016-2024-jus", art: "6.1.8" },
        { norm: "ds-016-2024-jus", art: "87" },
      ],
      when: ({ profile, banks }) => usesAutomation(profile, banks),
      text: ({ company }) =>
        `${company.name} utiliza tratamientos automatizados (por ejemplo, categorización, extracción de texto, reconocimiento de voz, evaluación de perfiles o inteligencia artificial) como apoyo a su servicio. Te informamos que existen y las consecuencias que pueden tener para ti (art. 6.1.8 del DS N.° 016-2024-JUS). No adoptamos decisiones que te produzcan efectos jurídicos o te afecten de modo significativo basadas **únicamente** en ese tratamiento: siempre puedes pedir la intervención de una persona, corregir el resultado o ejercer tu derecho al tratamiento objetivo (art. 87). Antes de enviar contenido a un proveedor de IA, retiramos o enmascaramos los identificadores cuando es posible, y el proveedor no puede usar tus datos para entrenar sus modelos.`,
    },
    {
      id: "politica.8-automatizado.no",
      cites: [
        { norm: "ds-016-2024-jus", art: "87" },
      ],
      when: ({ profile, banks }) => !usesAutomation(profile, banks),
      text: ({ company }) =>
        `${company.name} no adopta decisiones basadas únicamente en tratamientos automatizados (incluyendo algoritmos o inteligencia artificial) que produzcan efectos jurídicos negativos o te afecten significativamente de modo similar sin intervención humana. Si esto cambiara, te lo informaremos antes y podrás ejercer tu derecho al tratamiento objetivo (art. 87 del DS N.° 016-2024-JUS).`,
    },
    {
      id: "politica.9.seguridad-incidentes",
      cites: [
        { norm: "ds-016-2024-jus", art: "34" },
        { norm: "ds-016-2024-jus", art: "46" },
        { norm: "ds-016-2024-jus", art: "47" },
        { norm: "ds-016-2024-jus", art: "48" },
        { norm: "ds-016-2024-jus", art: "49" },
        { norm: "ds-016-2024-jus", art: "50" },
        { norm: "ds-016-2024-jus", art: "51" },
      ],
      text: () => `## 9. Medidas de seguridad y notificación de incidentes

Contamos con un **Documento de Seguridad** interno y aplicamos medidas técnicas, organizativas y legales acordes con el DS N.° 016-2024-JUS: control de accesos por perfil con revisión de privilegios al menos semestral, registro de las interacciones con los datos conservado por mínimo dos años, contraseñas robustas, copias de respaldo semanales con verificación de integridad, cifrado en tránsito y acuerdos de confidencialidad (arts. 46 a 51). Si se produce un incidente de seguridad que exponga grandes volúmenes de datos, pueda afectar a un gran número de personas, involucre datos sensibles o cause un perjuicio evidente a tus derechos, lo notificaremos a la ANPD dentro de las **48 horas** de haber tomado conocimiento y, si te afecta, te lo comunicaremos en el mismo plazo en lenguaje claro junto con las medidas adoptadas (art. 34 del DS N.° 016-2024-JUS).`,
    },
    {
      id: "politica.10.encabezado",
      cites: [],
      nonLegal: "Encabezado de sección",
      text: () => `## 10. Datos sensibles, menores y normas de nuestra actividad`,
    },
    {
      id: "politica.10-sensibles.si",
      cites: [
        { norm: "ds-016-2024-jus", art: "8" },
      ],
      when: (ctx) => sensitiveBanksOf(ctx).length > 0 || ctx.profile.sensitive,
      text: (ctx) => {
        const sensitiveBanks = sensitiveBanksOf(ctx);
        return `**Datos sensibles.** En el marco de nuestra actividad (${ctx.profile.title.toLowerCase()}) tratamos datos sensibles${sensitiveBanks.length ? ` en los bancos ${sensitiveBanks.map((b) => `«${b.name}»`).join(", ")}` : ""}. Solo los tratamos con tu consentimiento otorgado **por escrito** (firma manuscrita, digital, electrónica u otra modalidad que garantice tu voluntad, art. 8 del DS N.° 016-2024-JUS), para la finalidad específica que te informamos, con acceso restringido al personal que lo necesita y con medidas de seguridad reforzadas.`;
      },
    },
    {
      id: "politica.10-sensibles.no",
      cites: [
        { norm: "ds-016-2024-jus", art: "2.6" },
      ],
      when: (ctx) => !(sensitiveBanksOf(ctx).length > 0 || ctx.profile.sensitive),
      text: () =>
        `**Datos sensibles.** No necesitamos datos sensibles (salud, datos biométricos, afiliación sindical u otros del art. 2.6 del DS N.° 016-2024-JUS) para prestarte nuestro servicio principal. Si en algún caso fuera necesario, te pediremos tu autorización por escrito antes de recogerlos.`,
    },
    {
      id: "politica.10-menores.si",
      cites: [
        { norm: "ds-016-2024-jus", art: "22" },
        { norm: "ds-016-2024-jus", art: "23" },
      ],
      when: ({ profile }) => profile.minors,
      text: () =>
        `**Menores de edad.** Si eres menor de 14 años, el tratamiento de tus datos requiere el consentimiento de tus padres o tutores; si tienes entre 14 y 17 años, puedes consentir según tu capacidad, y te informaremos en lenguaje comprensible (art. 22 del DS N.° 016-2024-JUS). No recogemos datos de tu grupo familiar más allá de la identidad y dirección de tus padres o tutores cuando se necesita su consentimiento (art. 23).`,
    },
    {
      id: "politica.10-menores.no",
      cites: [],
      when: ({ profile }) => !profile.minors,
      text: () =>
        `**Menores de edad.** Nuestros servicios no están dirigidos a menores de 14 años. Si tomamos conocimiento de que hemos recogido datos de un menor sin la autorización de sus padres o tutores, los eliminaremos.`,
    },
    {
      id: "politica.10.normas",
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
      text: ({ profile }) => `**Normas que además aplican a nuestra actividad:**
${bullets(profile.norms)}`,
    },
    {
      id: "politica.11.cookies-vigencia",
      cites: [
        { norm: "ds-016-2024-jus", art: "2.4" },
      ],
      text: ({ company, banks, date }) => {
        const registeredChannels = Array.from(new Set(banks.map((b) => b.channel).filter(Boolean)));
        return `## 11. Cookies, vigencia y modificaciones

Nuestros canales digitales pueden utilizar cookies técnicas indispensables para su funcionamiento y, únicamente previo consentimiento, cookies analíticas o publicitarias. Los identificadores en línea son datos personales (art. 2.4 del DS N.° 016-2024-JUS).

Esta Política de Privacidad entra en vigencia el **${date}**. Canales comprendidos: ${registeredChannels.length ? registeredChannels.join(", ") : "Web, WhatsApp y atención presencial"}. Cualquier modificación futura será publicada oportunamente a través de esta misma dirección (${appUrl()}/p/${company.slug}).`;
      },
    },
    {
      id: "politica.nota.elaborado",
      cites: [],
      text: ({ company }) => `---

*Documento elaborado con DatosPrivados conforme a la Ley N.° 29733 y al DS N.° 016-2024-JUS a partir de la información declarada por ${company.name}.*`,
    },
  ],
};
