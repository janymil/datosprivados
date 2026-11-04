import { getDb, newId, nowIso } from "@/lib/db";

/**
 * Textos legales de la propia plataforma (no los de los clientes: esos están en documents.ts).
 *
 * BORRADOR. Falta la razón social y el RUC de la empresa operadora (P0-ENTITY) y la revisión
 * del abogado (P0-LEGAL). Mientras `LEGAL_REVIEWED` sea false las páginas muestran el aviso de
 * borrador y no se indexan. Al cambiar el texto, sube `LEGAL_VERSION`: el registro de
 * aceptaciones guarda la versión que vio cada persona.
 */
export const LEGAL_VERSION = "2026-11-04-borrador-2";
export const LEGAL_REVIEWED = false;

export type LegalDocument = "terms" | "privacy" | "cookies";
export type ConsentContext = "signup" | "checkout";

export const LEGAL_PAGES: Record<LegalDocument, { href: string; title: string }> = {
  terms: { href: "/terminos", title: "Términos y condiciones" },
  privacy: { href: "/privacidad", title: "Política de privacidad" },
  cookies: { href: "/cookies", title: "Política de cookies" },
};

export type LegalSection = { heading: string; paragraphs: string[] };

const OPERATOR = "[razón social y RUC de la empresa operadora — pendiente]";

export const LEGAL_CONTENT: Record<LegalDocument, LegalSection[]> = {
  terms: [
    {
      heading: "1. Quién presta el servicio",
      paragraphs: [
        `DatosPrivados es operado por ${OPERATOR}. Es una herramienta tecnológica de gestión y educación sobre la Ley N.° 29733 y su reglamento; no es un estudio jurídico ni sustituye asesoría legal.`,
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
        "Los datos de las personas que ejercen sus derechos ante tu empresa son tuyos como titular del banco de datos; la plataforma los trata como encargada, solo para prestarte el servicio. Puedes descargar tus datos y eliminar tu cuenta en cualquier momento desde «Cuenta».",
      ],
    },
    {
      heading: "6. Inteligencia artificial",
      paragraphs: [
        "Las funciones de IA son opcionales y requieren tu consentimiento en Ajustes. El texto se anonimiza antes de enviarse a un proveedor externo, pero la anonimización no es infalible: no escribas datos de terceros que no sean necesarios. Las respuestas son orientativas.",
      ],
    },
    {
      heading: "7. Responsabilidad",
      paragraphs: [
        "[Limitación de responsabilidad, ley aplicable y jurisdicción: texto pendiente de revisión del abogado.]",
      ],
    },
  ],
  privacy: [
    {
      heading: "1. Responsable del tratamiento",
      paragraphs: [
        `${OPERATOR}. Contacto de privacidad: hola@datosprivados.pe.`,
      ],
    },
    {
      heading: "2. Datos de tu cuenta",
      paragraphs: [
        "Nombre, correo, contraseña (guardada solo como hash), nombre de la empresa, RUC, domicilio, teléfono, datos del oficial de datos personales y estado de facturación. Los usamos para prestar el servicio, cobrar, enviarte avisos de plazos y cumplir obligaciones tributarias.",
      ],
    },
    {
      heading: "3. Datos que guardas en la plataforma",
      paragraphs: [
        "Bancos de datos, solicitudes ARCO (nombre, DNI, correo, teléfono y descripción de quien solicita, y tus respuestas), incidentes, documentos, evidencias y registro de actividad. En ese tratamiento actuamos como encargados por cuenta de tu empresa.",
      ],
    },
    {
      heading: "4. Con quién los compartimos",
      paragraphs: [
        "Proveedor de alojamiento y Cloudflare; MercadoPago (pagos); proveedor de correo; proveedor de inteligencia artificial, solo si activas esa función y con texto anonimizado; servicios de respaldo. [Lista final, países y garantías: pendiente de confirmar.]",
      ],
    },
    {
      heading: "5. Datos técnicos",
      paragraphs: [
        "Dirección IP, agente de usuario e identificadores de sesión, para seguridad, límites de intentos y registro de aceptaciones.",
      ],
    },
    {
      heading: "6. Conservación",
      paragraphs: [
        "Mientras tu cuenta esté vigente. Si vence y no renuevas, la eliminamos tras un periodo de gracia con aviso previo. Conservamos los comprobantes de pago por obligación tributaria.",
      ],
    },
    {
      heading: "7. Tus derechos",
      paragraphs: [
        "Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición y los demás que reconoce la ley escribiendo a hola@datosprivados.pe. Si no estás conforme con la respuesta, puedes acudir a la autoridad de protección de datos personales.",
      ],
    },
  ],
  cookies: [
    {
      heading: "Cookies que usamos",
      paragraphs: [
        "Solo una cookie técnica, necesaria para mantener tu sesión iniciada (pdp_session). No usamos cookies de publicidad ni de análisis. Si en el futuro agregamos alguna, pediremos tu consentimiento antes y actualizaremos esta página.",
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
