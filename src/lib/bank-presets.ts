/**
 * Plantillas de bancos de datos personales más comunes en negocios peruanos.
 *
 * Se usan en el formulario de banco (botones de autocompletado) y en el
 * onboarding, donde se crean como borradores según el rubro del negocio.
 */

export type BankPresetId =
  | "clientes"
  | "trabajadores"
  | "marketing"
  | "proveedores"
  | "camaras"
  | "reclamaciones"
  | "pacientes"
  | "alumnos"
  | "huespedes"
  | "socios";

export type BankPreset = {
  id: BankPresetId;
  badge: string;
  /** Pregunta en lenguaje simple que se muestra en el onboarding. */
  question: string;
  example: string;
  /** El banco incluye datos sensibles (art. 2.5 de la Ley 29733). */
  sensitive?: boolean;
  name: string;
  purpose: string;
  data_categories: string;
  legal_basis: string;
  channel: string;
  retention: string;
  transfers: string;
  recipients: string;
};

export const BANK_PRESETS: BankPreset[] = [
  {
    id: "clientes",
    badge: "Clientes (Tienda / WhatsApp)",
    question: "¿Guardas datos de tus clientes?",
    example: "Nombre, DNI, celular o dirección para ventas, entregas o boletas.",
    name: "Clientes y compradores",
    purpose:
      "Atención de consultas, gestión de ventas y pedidos, coordinación de entregas (delivery), emisión de comprobantes de pago (boletas/facturas) y garantía posventa.",
    data_categories:
      "Nombres y apellidos, DNI o RUC, dirección de entrega, teléfono / WhatsApp, correo electrónico e historial de compras.",
    legal_basis: "ejecucion_contrato",
    channel: "WhatsApp",
    retention: "Durante la relación comercial y hasta 5 años adicionales por obligación tributaria (SUNAT).",
    transfers: "si",
    recipients:
      "Empresa de courier/delivery, pasarela de pagos (Culqi/Niubiz/Yape), estudio contable externo y proveedor de facturación electrónica.",
  },
  {
    id: "trabajadores",
    badge: "Trabajadores y planilla",
    question: "¿Tienes trabajadores, practicantes o recibes CVs?",
    example: "Contratos, planilla, CVs de postulantes, descansos médicos.",
    sensitive: true,
    name: "Colaboradores y postulantes",
    purpose:
      "Evaluación de postulantes, gestión de contratos laborales, pago de remuneraciones (planilla PLAME), beneficios sociales, seguridad y salud en el trabajo.",
    data_categories:
      "Nombres y apellidos, DNI, domicilio, teléfono, correo, estado civil, cuenta bancaria de haberes, CV y datos sensibles de salud (descansos médicos).",
    legal_basis: "obligacion_legal",
    channel: "Presencial",
    retention: "Mientras dure el vínculo laboral y hasta 5 años tras el cese por exigencia laboral y tributaria.",
    transfers: "no",
    recipients:
      "Estudio contable externo, bancos (pago de haberes), EsSalud, AFP/ONP, SUNAFIL y aseguradoras (SCTR/EPS).",
  },
  {
    id: "marketing",
    badge: "Prospectos / Ofertas WhatsApp",
    question: "¿Envías promociones u ofertas?",
    example: "Listas de difusión de WhatsApp, newsletters, campañas por correo o SMS.",
    name: "Prospectos y suscriptores de promociones",
    purpose:
      "Envío de promociones, descuentos, catálogos, campañas publicitarias y novedades comerciales por WhatsApp, correo electrónico o redes sociales.",
    data_categories: "Nombre, número de celular (WhatsApp), correo electrónico e intereses de compra.",
    legal_basis: "consentimiento",
    channel: "WhatsApp",
    retention: "Hasta que la persona solicite darse de baja o revoque su consentimiento.",
    transfers: "si",
    recipients:
      "Plataforma de envíos de correo (ej. Mailchimp/Brevo), WhatsApp Business / Meta Cloud y agencia de marketing digital.",
  },
  {
    id: "proveedores",
    badge: "Proveedores",
    question: "¿Trabajas con proveedores que son personas naturales?",
    example: "Proveedores con RUC 10, técnicos o freelancers a los que pagas.",
    name: "Proveedores y prestadores de servicios",
    purpose:
      "Evaluación, contratación, coordinación de pedidos de insumos/servicios, recepción de recibos por honorarios o facturas y gestión de pagos.",
    data_categories:
      "Nombres y apellidos o razón social, DNI/RUC, dirección, teléfono, correo electrónico y número de cuenta bancaria / CCI.",
    legal_basis: "ejecucion_contrato",
    channel: "Correo electrónico",
    retention: "5 años desde el último pago o fin del contrato (normativa tributaria SUNAT).",
    transfers: "no",
    recipients: "Estudio contable externo y entidades bancarias locales.",
  },
  {
    id: "camaras",
    badge: "Cámaras de seguridad",
    question: "¿Tienes cámaras de seguridad?",
    example: "Cámaras en tu local, oficina, almacén o en la entrada.",
    name: "Videovigilancia y seguridad del local",
    purpose:
      "Garantizar la seguridad de las instalaciones, bienes, clientes y trabajadores mediante cámaras de seguridad en el local.",
    data_categories: "Imágenes y grabaciones de video (rostro y desplazamiento de personas que ingresan al local).",
    legal_basis: "interes_legitimo",
    channel: "Presencial",
    retention:
      "Entre 30 y 60 días calendario (Directiva de Videovigilancia de la ANPD); luego las grabaciones se eliminan, salvo requerimiento de autoridad.",
    transfers: "no",
    recipients: "Empresa de seguridad o monitoreo (y Policía Nacional / Fiscalía solo ante requerimiento legal).",
  },
  {
    id: "reclamaciones",
    badge: "Libro de Reclamaciones",
    question: "¿Atiendes al público (tienes Libro de Reclamaciones)?",
    example: "Hojas de reclamo físicas o virtuales exigidas por INDECOPI.",
    name: "Libro de Reclamaciones",
    purpose:
      "Registro, atención y respuesta de reclamos y quejas de consumidores conforme al Código de Protección y Defensa del Consumidor.",
    data_categories:
      "Nombres y apellidos, DNI/CE, domicilio, teléfono, correo electrónico, datos del padre o madre si el consumidor es menor de edad y detalle del reclamo.",
    legal_basis: "obligacion_legal",
    channel: "Presencial",
    retention: "Mínimo 2 años desde la fecha del reclamo, conforme al Reglamento del Libro de Reclamaciones.",
    transfers: "no",
    recipients: "INDECOPI cuando lo requiera en el marco de sus funciones.",
  },
  {
    id: "pacientes",
    badge: "Pacientes / Consultorio",
    question: "¿Atiendes pacientes o guardas datos de salud?",
    example: "Historias clínicas, fichas de evaluación, recetas, fotos clínicas.",
    sensitive: true,
    name: "Pacientes e historias de atención",
    purpose:
      "Agendamiento de citas, evaluación clínica, diagnóstico, seguimiento de tratamientos y facturación del servicio de salud o bienestar.",
    data_categories:
      "Nombres y apellidos, DNI, edad, teléfono, correo y datos sensibles de salud (antecedentes médicos, diagnósticos, recetas e imágenes clínicas).",
    legal_basis: "consentimiento",
    channel: "Presencial",
    retention: "Según la Norma Técnica de Salud para la Gestión de la Historia Clínica (MINSA).",
    transfers: "no",
    recipients: "Personal de salud autorizado, laboratorios aliados y estudio contable (solo datos de facturación).",
  },
  {
    id: "alumnos",
    badge: "Alumnos y apoderados",
    question: "¿Tienes alumnos (niños o adultos)?",
    example: "Matrículas, notas, asistencia, datos de padres o apoderados.",
    sensitive: true,
    name: "Alumnos y apoderados",
    purpose:
      "Gestión de matrícula, dictado de clases, evaluación académica, comunicación con padres o apoderados, emisión de certificados y cobro de pensiones.",
    data_categories:
      "Nombres y apellidos, DNI, fecha de nacimiento, datos del padre, madre o apoderado, teléfono, correo, notas, asistencia y, de ser necesario, información de salud (alergias, condiciones médicas).",
    legal_basis: "ejecucion_contrato",
    channel: "Presencial",
    retention:
      "Mientras dure la matrícula; las actas y certificados se conservan según la normativa del sector educación.",
    transfers: "no",
    recipients: "Plataforma educativa o de aula virtual, estudio contable y autoridades educativas (MINEDU/UGEL) cuando corresponda.",
  },
  {
    id: "huespedes",
    badge: "Huéspedes / Reservas",
    question: "¿Recibes reservas o registras huéspedes?",
    example: "Check-in, copia de DNI o pasaporte, reservas por Booking o Airbnb.",
    name: "Huéspedes y reservas",
    purpose:
      "Gestión de reservas, registro de huéspedes exigido por la normativa de establecimientos de hospedaje, check-in/check-out, facturación y atención durante la estadía.",
    data_categories:
      "Nombres y apellidos, DNI/pasaporte, nacionalidad, fechas de estadía, teléfono, correo electrónico y datos de pago.",
    legal_basis: "ejecucion_contrato",
    channel: "Web",
    retention: "Durante la estadía y hasta 5 años adicionales por obligación tributaria (SUNAT).",
    transfers: "si",
    recipients: "Plataformas de reservas (Booking, Airbnb, Expedia), pasarela de pagos y estudio contable externo.",
  },
  {
    id: "socios",
    badge: "Socios / Membresías",
    question: "¿Manejas socios, membresías o suscripciones?",
    example: "Gimnasio, club, academia de baile, suscripción mensual.",
    name: "Socios y membresías",
    purpose:
      "Gestión de membresías y suscripciones, control de acceso, cobro de cuotas, reserva de clases y comunicaciones sobre el servicio.",
    data_categories:
      "Nombres y apellidos, DNI, fecha de nacimiento, teléfono, correo, plan contratado, historial de pagos y asistencia.",
    legal_basis: "ejecucion_contrato",
    channel: "Presencial",
    retention: "Mientras la membresía esté vigente y hasta 5 años adicionales por obligación tributaria (SUNAT).",
    transfers: "si",
    recipients: "Software de gestión de membresías, pasarela de pagos y estudio contable externo.",
  },
];

export function getBankPreset(id: string): BankPreset | undefined {
  return BANK_PRESETS.find((preset) => preset.id === id);
}
