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
  | "socios"
  | "visitantes"
  | "creditos"
  // Plataformas digitales, apps y SaaS: los cuatro bancos que casi nunca se declaran.
  | "usuarios_plataforma"
  | "facturacion"
  | "registros_seguridad"
  | "terceros_invitados";

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
  {
    id: "visitantes",
    badge: "Visitantes y control de acceso",
    question: "¿Registras a las personas que visitan tu local, edificio o planta?",
    example: "Cuaderno o sistema de visitas en portería, recepción de oficinas, condominios o plantas.",
    name: "Visitantes y control de acceso",
    purpose:
      "Controlar el ingreso de visitas y proveedores a las instalaciones, y mantener un registro para la seguridad de las personas y los bienes.",
    data_categories: "Nombres y apellidos, número de documento, empresa o unidad visitada, hora de ingreso y salida, y placa del vehículo.",
    legal_basis: "consentimiento",
    channel: "Presencial",
    retention: "Entre 30 y 90 días; luego se destruyen las hojas o se borran los registros.",
    transfers: "no",
    recipients: "Personal de seguridad y administración del local; autoridades solo ante requerimiento legal.",
  },
  {
    id: "creditos",
    badge: "Créditos y debida diligencia",
    question: "¿Evalúas créditos, cambias dinero o haces operaciones que exigen conocer al cliente?",
    example: "Solicitudes de préstamo, contratos de crédito, casa de cambio, remesas, operaciones sujetas a la UIF-Perú.",
    sensitive: true,
    name: "Solicitantes, deudores y debida diligencia",
    purpose:
      "Evaluar solicitudes, otorgar y cobrar créditos u operaciones financieras, conocer al cliente y cumplir las obligaciones de prevención de lavado de activos y financiamiento del terrorismo.",
    data_categories:
      "Nombres y apellidos, DNI/CE, domicilio, ocupación, ingresos económicos, historial de pagos, referencias, origen de fondos y datos de operaciones.",
    legal_basis: "obligacion_legal",
    channel: "Presencial",
    retention: "10 años desde la operación si eres sujeto obligado ante la UIF-Perú (verifica); solicitudes rechazadas, máximo 2 años.",
    transfers: "no",
    recipients: "Centrales de riesgo (con autorización), UIF-Perú y SBS cuando corresponda, estudio contable y entidades bancarias.",
  },
  {
    id: "usuarios_plataforma",
    badge: "Usuarios de la plataforma",
    question: "¿La gente crea una cuenta en tu app, web o plataforma?",
    example: "Registro con correo o Google, foto de perfil, idioma, preferencias y actividad dentro de la app.",
    name: "Usuarios y cuentas de la plataforma",
    purpose:
      "Creación y administración de cuentas, autenticación, personalización de la experiencia, soporte, comunicaciones operativas del servicio y control de planes contratados.",
    data_categories:
      "Nombres y apellidos, correo electrónico, teléfono, foto de perfil, idioma, zona horaria, plan contratado, preferencias, identificador de inicio de sesión y registros de uso de la plataforma.",
    legal_basis: "ejecucion_contrato",
    channel: "Web/app",
    retention:
      "Mientras la cuenta esté activa y hasta 5 años después de su cierre, por obligaciones legales y defensa ante reclamaciones.",
    transfers: "si",
    recipients:
      "Proveedor de autenticación, base de datos gestionada en la nube, servicio de correo transaccional y mesa de soporte (indica el nombre y el país de cada uno).",
  },
  {
    id: "facturacion",
    badge: "Pagos y suscripciones",
    question: "¿Cobras suscripciones, planes o pagos en línea?",
    example: "Cobros mensuales con tarjeta, renovaciones automáticas, contracargos y facturas.",
    name: "Facturación, pagos y suscripciones",
    purpose:
      "Cobro de planes y renovaciones, reintentos por pago rechazado, emisión de comprobantes o constancias, gestión de contracargos y conciliación contable.",
    data_categories:
      "Nombre y correo del titular, identificador de cliente en la pasarela, historial y estado de pagos, moneda, importes y últimos cuatro dígitos de la tarjeta (el número completo lo conserva únicamente la pasarela de pagos).",
    legal_basis: "ejecucion_contrato",
    channel: "Web/app",
    retention: "5 años desde el último cobro (obligaciones tributarias y contables).",
    transfers: "si",
    recipients:
      "Pasarela de pagos internacional, pasarela local para soles (por ejemplo, Culqi, Niubiz o Mercado Pago) y estudio contable.",
  },
  {
    id: "registros_seguridad",
    badge: "Logs y seguridad",
    question: "¿Guardas registros técnicos (IP, errores, accesos)?",
    example: "Logs del servidor, dirección IP, intentos de inicio de sesión, errores de la app.",
    name: "Registros de seguridad y analítica",
    purpose:
      "Prevención de fraude y abuso, seguridad e integridad del servicio, diagnóstico de errores, medición agregada de uso y control de costos de proveedores.",
    data_categories:
      "Dirección IP, identificador de agente de usuario (navegador y sistema operativo), rutas y fechas de acceso, eventos de error, país y ciudad derivados de la IP, y métricas de uso por cuenta.",
    // Los registros de interacción con datos personales son una obligación del art. 46.3 del DS 016-2024-JUS.
    legal_basis: "obligacion_legal",
    channel: "Web/app",
    retention:
      "30 días para registros técnicos y de errores; mínimo 2 años para los registros de acceso exigidos por el art. 46.3 del Reglamento.",
    transfers: "si",
    recipients:
      "Proveedor de CDN y cortafuegos, base de datos gestionada, herramientas internas de monitoreo y, solo con consentimiento, analítica web.",
  },
  {
    id: "terceros_invitados",
    badge: "Terceros invitados",
    question: "¿Tus usuarios invitan a otras personas o comparten datos con ellas?",
    example: "Invitaciones por correo a un amigo, familia o equipo para una meta o función compartida.",
    name: "Contactos de terceros e invitaciones",
    purpose:
      "Enviar la invitación solicitada por un usuario, gestionar las funciones compartidas y prevenir el uso abusivo de las invitaciones.",
    data_categories:
      "Dirección de correo electrónico de una persona que todavía no es usuaria, nombre de quien invita, fecha y estado de la invitación.",
    legal_basis: "consentimiento",
    channel: "Web/app",
    retention:
      "90 días si la invitación no se acepta; mientras la función compartida esté activa si la persona acepta.",
    transfers: "si",
    recipients: "Servicio de correo transaccional.",
  },
];

export function getBankPreset(id: string): BankPreset | undefined {
  return BANK_PRESETS.find((preset) => preset.id === id);
}
