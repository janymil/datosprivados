import { getDb, newId, nowIso } from "@/lib/db";
import { PLATFORM_COMPLAINTS_URL, PLATFORM_CONTACT_EMAIL, PLATFORM_ENTITY } from "@/lib/platform-entity";

/**
 * Textos legales de la propia plataforma (no los de los clientes: esos están en documents.ts).
 *
 * BORRADOR. La empresa operadora ya está identificada (platform-entity.ts); falta la revisión
 * del abogado (P0-LEGAL) y el código de inscripción del banco de datos propio. Mientras `LEGAL_REVIEWED` sea false las páginas muestran el aviso de
 * borrador y no se indexan. Al cambiar el texto, sube `LEGAL_VERSION`: el registro de
 * aceptaciones guarda la versión que vio cada persona.
 */
export const LEGAL_VERSION = "2026-11-13-borrador-4";
export const LEGAL_REVIEWED = false;

export type LegalDocument = "terms" | "privacy" | "cookies";
export type ConsentContext = "signup" | "checkout";

export const LEGAL_PAGES: Record<LegalDocument, { href: string; title: string }> = {
  terms: { href: "/terminos", title: "Términos y condiciones" },
  privacy: { href: "/privacidad", title: "Política de privacidad" },
  cookies: { href: "/cookies", title: "Política de cookies" },
};

export type LegalSection = { heading: string; paragraphs: string[] };

const E = PLATFORM_ENTITY;
const IDENTITY = `${E.legalName}, RUC ${E.ruc}, con domicilio en ${E.address}`;
const CHANNELS = `el correo ${PLATFORM_CONTACT_EMAIL}, el teléfono y WhatsApp ${E.phone} o un escrito dirigido a nuestro domicilio (${E.address})`;

export { PLATFORM_COMPLAINTS_URL };

export const LEGAL_CONTENT: Record<LegalDocument, LegalSection[]> = {
  terms: [
    {
      heading: "1. Quién presta el servicio",
      paragraphs: [
        `DatosPrivados es operado por ${IDENTITY}. Contacto: ${PLATFORM_CONTACT_EMAIL} y ${E.phone}.`,
        "DatosPrivados es una herramienta tecnológica de gestión y educación sobre la Ley N.° 29733 y su reglamento; no es un estudio jurídico ni sustituye asesoría legal.",
      ],
    },
    {
      heading: "2. Qué obtienes",
      paragraphs: [
        "Acceso a un panel para registrar bancos de datos, atender solicitudes ARCO, documentar incidentes y generar borradores de documentos. Los documentos son borradores de trabajo: recomendamos validarlos con un abogado antes de publicarlos o firmarlos.",
        "La inscripción de tus bancos de datos en el registro de la autoridad la haces tú; la plataforma te prepara la información.",
      ],
    },
    {
      heading: "3. Cuenta y uso",
      paragraphs: [
        "Eres responsable de la veracidad de los datos que ingresas, de custodiar tu contraseña y de las acciones hechas con tu cuenta. El servicio es para empresas o personas con negocio constituidas en el Perú.",
      ],
    },
    {
      heading: "4. Planes, cobro y cancelación",
      paragraphs: [
        "El servicio se contrata por años. El primer año tiene un precio que incluye la implementación (documentos, fichas y 12 meses de acceso) y cada renovación anual tiene un precio menor. El pago se hace a través de MercadoPago o por transferencia contra factura. El precio, el IGV y el periodo se muestran antes de pagar.",
        "El pago del primer año no se renueva solo: antes de que venza te avisamos para que renueves al precio de renovación. Si renuevas con tarjeta, esa renovación se cobra automáticamente cada año hasta que la canceles; conservas el acceso hasta el fin del periodo pagado. Si no renuevas, puedes exportar tus datos desde «Cuenta».",
        "[Reembolsos, mora y suspensión: texto pendiente de definir con el abogado.]",
      ],
    },
    {
      heading: "5. Tus datos y los de tus clientes",
      paragraphs: [
        "Los datos de las personas que ejercen sus derechos ante tu empresa son tuyos como titular del banco de datos; la plataforma los trata como encargada, solo para prestarte el servicio. Puedes descargar tus datos y eliminar tu cuenta en cualquier momento desde «Cuenta». El tratamiento de los datos de tu cuenta se explica en la Política de privacidad.",
      ],
    },
    {
      heading: "6. Inteligencia artificial",
      paragraphs: [
        "Las funciones de IA son opcionales y requieren tu consentimiento en Ajustes. El texto se anonimiza antes de enviarse a un proveedor externo, pero la anonimización no es infalible: no escribas datos de terceros que no sean necesarios. Las respuestas son orientativas.",
      ],
    },
    {
      heading: "7. Libro de Reclamaciones",
      paragraphs: [
        `Conforme a la Ley N.° 29571, Código de Protección y Defensa del Consumidor, y al DS N.° 011-2011-PCM y sus modificatorias, ponemos a tu disposición nuestro Libro de Reclamaciones virtual: ${PLATFORM_COMPLAINTS_URL}. Al registrar tu reclamo o queja recibes una copia en tu correo y puedes imprimir la hoja.`,
        "Respondemos en un plazo no mayor a 15 días hábiles. Presentar un reclamo no limita otras vías de solución ni es requisito previo para acudir al INDECOPI.",
      ],
    },
    {
      heading: "8. Responsabilidad",
      paragraphs: [
        "[Limitación de responsabilidad, ley aplicable y jurisdicción: texto pendiente de revisión del abogado.]",
      ],
    },
  ],
  privacy: [
    {
      heading: "1. Quién trata tus datos",
      paragraphs: [
        `El responsable del tratamiento es ${IDENTITY}, operador de DatosPrivados. Puedes escribirnos por ${CHANNELS}.`,
        "Tratamos los datos conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y a su Reglamento aprobado por el Decreto Supremo N.° 016-2024-JUS.",
      ],
    },
    {
      heading: "2. Banco de datos donde se guardan",
      paragraphs: [
        "Los datos de las cuentas se guardan en nuestro banco de datos «Clientes y usuarios de DatosPrivados», inscrito en el Registro Nacional de Protección de Datos Personales con el código [código de inscripción — pendiente].",
      ],
    },
    {
      heading: "3. Qué datos tratamos y para qué",
      paragraphs: [
        "Datos de tu cuenta: nombre, correo, contraseña (guardada solo como hash), nombre de la empresa, RUC, domicilio, teléfono, datos del oficial de datos personales y estado de facturación.",
        "Los usamos para: (a) crear tu cuenta y prestarte el servicio contratado; (b) cobrar y emitir comprobantes, por obligación tributaria; (c) enviarte avisos del servicio, como plazos ARCO, vencimientos, pagos y seguridad; (d) proteger la plataforma: inicio de sesión, límites de intentos, prevención de fraude y respaldos; y (e) si activas las funciones de IA, preparar sugerencias con texto anonimizado.",
        "No usamos tus datos para publicidad y no te enviamos correos comerciales. Si algún día lo hiciéramos, te pediríamos permiso con una casilla aparte, desmarcada y que no condiciona el servicio.",
        "Datos técnicos: dirección IP, navegador e identificadores de sesión, para la seguridad y para registrar qué versión de estos textos aceptaste.",
      ],
    },
    {
      heading: "4. Datos que guardas en la plataforma",
      paragraphs: [
        "Bancos de datos, solicitudes ARCO (nombre, documento, correo, teléfono y descripción de quien solicita, y tus respuestas), incidentes, documentos, evidencias y registro de actividad. En ese tratamiento actuamos como encargados por cuenta de tu empresa, que es la responsable: solo los tratamos para prestarte el servicio y nunca para fines propios.",
      ],
    },
    {
      heading: "5. Qué pasa si das o no das tus datos",
      paragraphs: [
        "Los datos marcados como obligatorios en el registro y en el pago son necesarios para crear la cuenta, verificar el RUC ante la SUNAT y emitir el comprobante: sin ellos no podemos prestarte el servicio. Los demás son opcionales y no darlos no limita el servicio. Si das datos falsos o de otra empresa, podemos suspender la cuenta.",
      ],
    },
    {
      heading: "6. Destinatarios y encargados",
      paragraphs: [
        "No vendemos datos. Los compartimos solo con quienes nos ayudan a prestar el servicio, con acceso limitado a lo necesario:",
        "• Contabo GmbH (Alemania): alojamiento del servidor, ubicado en Francia, y de sus copias de respaldo.",
        "• Cloudflare, Inc. (Estados Unidos): red de entrega y protección del sitio; todo el tráfico web pasa cifrado por ella.",
        "• Resend (Estados Unidos): envío de los correos del servicio.",
        "• Anthropic, PBC (Estados Unidos) y, solo si este no responde, OpenAI (Estados Unidos): funciones de IA, únicamente si las activas y con el texto anonimizado.",
        "• Decolecta: consulta del RUC en los registros públicos de la SUNAT; solo recibe el número de RUC.",
        "• Mercado Pago: cobro con tarjeta. Los datos de tu tarjeta los ingresas en Mercado Pago y no pasan por nuestros servidores.",
        "• Autoridades, cuando exista un requerimiento legal debidamente formulado.",
      ],
    },
    {
      heading: "7. Transferencias internacionales",
      paragraphs: [
        "Algunos de esos proveedores están fuera del Perú: el servidor está en Francia (Unión Europea) y Cloudflare, Resend, Anthropic y OpenAI están en Estados Unidos. Esas transferencias se hacen para prestar el servicio y bajo los contratos de tratamiento de datos de cada proveedor, que los obligan a proteger la información. [Garantías específicas y comunicación del flujo transfronterizo a la autoridad: pendiente de revisión del abogado.]",
      ],
    },
    {
      heading: "8. Cuánto tiempo los conservamos",
      paragraphs: [
        "Mientras tu cuenta esté vigente. Si tu plan vence y no renuevas, te avisamos y eliminamos la cuenta y sus datos 90 días después del fin del periodo pagado. Un registro que no se completa se elimina a los 30 días.",
        "Los comprobantes y registros de pago se conservan el plazo que exige la normativa tributaria (5 años). El registro de correos enviados se borra a los 90 días y las copias de respaldo del servidor se renuevan cada 7 días.",
      ],
    },
    {
      heading: "9. Tus derechos y cómo ejercerlos",
      paragraphs: [
        `Puedes ejercer gratis tus derechos de información, acceso, rectificación, cancelación y oposición (ARCO), y revocar tu consentimiento, por ${CHANNELS}. Indica tu nombre, el derecho que ejerces y el dato al que se refiere; podemos pedirte una verificación razonable de identidad. También puedes corregir tus datos, descargarlos y eliminar tu cuenta tú mismo desde «Cuenta».`,
        "Respondemos dentro de los plazos del Reglamento: 8 días hábiles para el derecho de información, 20 días hábiles para el de acceso y 10 días hábiles para los de rectificación, cancelación y oposición.",
        "Si no estás conforme con la respuesta o no te respondemos a tiempo, puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.",
      ],
    },
    {
      heading: "10. Otras cláusulas",
      paragraphs: [
        "Menores de edad: el servicio está dirigido a empresas y a personas mayores de edad; no recogemos a sabiendas datos de menores.",
        "Decisiones automatizadas: no tomamos decisiones con efectos jurídicos basadas solo en tratamiento automatizado. Las sugerencias de la IA siempre las revisa una persona de tu empresa.",
        "Seguridad: tráfico cifrado con HTTPS, contraseñas guardadas como hash, acceso separado por empresa, registro de actividad y respaldos periódicos. Si ocurre un incidente que afecte tus datos, te avisaremos y lo comunicaremos a la autoridad cuando corresponda.",
        "Cambios: publicamos aquí la versión vigente con su fecha y te avisamos por correo si el cambio es importante.",
      ],
    },
  ],
  cookies: [
    {
      heading: "Cookies que usamos",
      paragraphs: [
        "Solo una cookie técnica, necesaria para mantener tu sesión iniciada (pdp_session). Además, el centro de ayuda guarda en tu navegador (almacenamiento local, dp-help-journey-v1) qué pasos de la guía marcaste; no se envía a nuestros servidores y puedes borrarlo desde tu navegador. No usamos cookies de publicidad ni de análisis. Si en el futuro agregamos alguna, pediremos tu consentimiento antes y actualizaremos esta página.",
      ],
    },
  ],
};

/** Guarda qué versión de cada documento aceptó la persona, cuándo y desde dónde. */
export function recordConsents(input: {
  userId: string;
  companyId: string;
  documents: LegalDocument[];
  context: ConsentContext;
  ip: string;
  userAgent: string;
}) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO legal_consents (id, user_id, company_id, document, version, context, ip, user_agent, accepted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const at = nowIso();
  for (const document of input.documents) {
    insert.run(newId(), input.userId, input.companyId, document, LEGAL_VERSION, input.context, input.ip, input.userAgent.slice(0, 300), at);
  }
}
