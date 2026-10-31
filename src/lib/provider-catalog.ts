import type { LegalFamily } from "./sector-legal";

/**
 * Catálogo de herramientas y proveedores que suelen recibir o alojar datos
 * personales de un negocio.
 *
 * Cada herramienta lleva un país por defecto, que es solo una sugerencia: el
 * dueño lo confirma en su cuenta. Donde no estamos seguros, el país es «No sé»
 * y el documento lo trata como transferencia por verificar. El catálogo nunca es
 * cerrado: toda categoría admite escribir una herramienta propia.
 */

export const COUNTRIES = [
  "Perú",
  "Estados Unidos",
  "Unión Europea",
  "Reino Unido",
  "Canadá",
  "México",
  "Colombia",
  "Chile",
  "Argentina",
  "Brasil",
  "Singapur",
  "India",
  "Otro país",
  "No sé",
] as const;

export type Country = (typeof COUNTRIES)[number];

/** ¿Los datos salen del Perú (o no sabemos)? Es lo que activa las obligaciones de flujo transfronterizo. */
export function isAbroad(country: string): boolean {
  return country !== "Perú" && country.trim() !== "";
}

export type ToolOption = {
  id: string;
  name: string;
  country: Country;
  /** Sobrescribe el propósito de la categoría. */
  purpose?: string;
  /** Cookies o identificadores que instala en la web del negocio, si los hay. */
  cookies?: string;
};

export type ToolCategory = {
  id: string;
  label: string;
  question: string;
  hint?: string;
  /** Propósito y datos por defecto de las herramientas de la categoría. */
  purpose: string;
  data: string;
  /** Solo aplica si el negocio tiene web, tienda online o app. */
  web?: boolean;
  /** Rubros para los que la categoría se muestra destacada. */
  families?: LegalFamily[];
  tools: ToolOption[];
};

const t = (id: string, name: string, country: Country, extra: Partial<ToolOption> = {}): ToolOption => ({
  id,
  name,
  country,
  ...extra,
});

export const TOOL_CATEGORIES: ToolCategory[] = [
  /* ---- Generales ---- */
  {
    id: "servicios",
    label: "Personas y empresas que ven tus datos",
    question: "¿Quién más ve los datos de tus clientes o trabajadores?",
    hint: "Contador, courier, marketing, seguridad: son «encargados» y necesitan contrato.",
    purpose: "Prestar servicios al negocio con acceso a datos de clientes o trabajadores",
    data: "Datos de clientes, proveedores o trabajadores según el servicio",
    tools: [
      t("estudio-contable", "Estudio contable externo", "Perú", { purpose: "Contabilidad, planilla y declaraciones tributarias" }),
      t("courier", "Courier o empresa de delivery", "Perú", { purpose: "Entrega de pedidos" }),
      t("agencia-marketing", "Agencia de marketing o community manager", "Perú", { purpose: "Gestión de redes y campañas" }),
      t("seguridad", "Empresa de seguridad o monitoreo", "Perú", { purpose: "Vigilancia y monitoreo de cámaras" }),
      t("aseguradora", "Aseguradora o corredor de seguros", "Perú", { purpose: "Seguros de trabajadores (SCTR/EPS) o de clientes" }),
      t("ti-externo", "Soporte técnico o informático externo", "Perú", { purpose: "Mantenimiento de sistemas y equipos" }),
    ],
  },
  {
    id: "correo",
    label: "Correo y herramientas de oficina",
    question: "¿Qué correo y herramientas de oficina usas?",
    purpose: "Correo, documentos y comunicación interna y con clientes",
    data: "Nombre, correo y el contenido de los mensajes y archivos",
    tools: [
      t("google-workspace", "Gmail / Google Workspace", "Estados Unidos"),
      t("microsoft-365", "Outlook / Microsoft 365", "Estados Unidos"),
      t("zoho-mail", "Zoho Mail", "India"),
      t("hosting-correo", "Correo del hosting de mi web", "No sé"),
      t("mailchimp", "Mailchimp (correos masivos)", "Estados Unidos", { purpose: "Envío de correos masivos y promociones" }),
      t("brevo", "Brevo / Sendinblue (correos masivos)", "Unión Europea", { purpose: "Envío de correos masivos y promociones" }),
      t("sendgrid", "SendGrid / Twilio (correos automáticos)", "Estados Unidos", { purpose: "Correos transaccionales" }),
      t("resend", "Resend / Amazon SES (correos automáticos)", "Estados Unidos", { purpose: "Correos transaccionales" }),
    ],
  },
  {
    id: "mensajeria",
    label: "WhatsApp, chat y atención al cliente",
    question: "¿Por dónde hablas con tus clientes?",
    purpose: "Atención de consultas, pedidos y seguimiento de clientes",
    data: "Nombre, teléfono, mensajes e imágenes que envía el cliente",
    tools: [
      t("whatsapp", "WhatsApp / WhatsApp Business", "Estados Unidos"),
      t("meta-messenger", "Messenger / Instagram Direct", "Estados Unidos"),
      t("telegram", "Telegram", "No sé"),
      t("manychat", "ManyChat u otro chatbot", "Estados Unidos"),
      t("zendesk", "Zendesk, Freshdesk o Intercom", "Estados Unidos"),
      t("tidio", "Tidio, Crisp o chat de la web", "No sé"),
      t("sms", "SMS masivos (Twilio, Infobip u otros)", "No sé", { purpose: "Envío de SMS" }),
    ],
  },
  {
    id: "almacenamiento",
    label: "Dónde guardas archivos y listas",
    question: "¿Dónde guardas tus archivos, listas de clientes y copias de seguridad?",
    hint: "Si solo usas tu computadora o papel en tu local, marca la opción en Perú.",
    purpose: "Almacenamiento de archivos, listas de clientes y copias de seguridad",
    data: "Archivos del negocio: listas de clientes, comprobantes, contratos, fotos",
    tools: [
      t("local", "Computadora, disco o servidor propio en mi local", "Perú"),
      t("papel", "Archivadores de papel en mi local", "Perú"),
      t("google-drive", "Google Drive", "Estados Unidos"),
      t("onedrive", "OneDrive / SharePoint", "Estados Unidos"),
      t("dropbox", "Dropbox", "Estados Unidos"),
      t("icloud", "iCloud", "Estados Unidos"),
      t("sheets", "Excel o Google Sheets en la nube", "Estados Unidos"),
      t("s3", "Amazon S3 / Cloudflare R2 / almacenamiento de apps", "Estados Unidos"),
      t("notion", "Notion o Airtable", "Estados Unidos"),
    ],
  },
  {
    id: "pagos",
    label: "Pagos y cobros",
    question: "¿Cómo cobras?",
    hint: "Si cobras solo en efectivo o con POS físico, marca el proveedor del POS.",
    purpose: "Cobro de ventas y suscripciones, conciliación y contracargos",
    data: "Nombre, correo, importes y últimos dígitos de la tarjeta (el número completo lo guarda la pasarela)",
    tools: [
      t("mercadopago", "Mercado Pago", "Argentina", { cookies: "Cookies de la pasarela en la pantalla de pago" }),
      t("culqi", "Culqi", "Perú", { cookies: "Cookies de la pasarela en la pantalla de pago" }),
      t("niubiz", "Niubiz (Visanet)", "Perú", { cookies: "Cookies de la pasarela en la pantalla de pago" }),
      t("izipay", "Izipay", "Perú", { cookies: "Cookies de la pasarela en la pantalla de pago" }),
      t("yape-plin", "Yape o Plin", "Perú"),
      t("paypal", "PayPal", "Estados Unidos", { cookies: "Cookies de PayPal en la pantalla de pago" }),
      t("stripe", "Stripe", "Estados Unidos", { cookies: "Cookies de Stripe en la pantalla de pago" }),
      t("pos-banco", "POS de mi banco", "Perú"),
    ],
  },
  {
    id: "facturacion",
    label: "Facturación y contabilidad",
    question: "¿Con qué emites boletas y facturas?",
    purpose: "Emisión de comprobantes electrónicos y contabilidad",
    data: "Nombre, RUC/DNI, dirección y detalle de las ventas",
    tools: [
      t("sunat", "Sistema de SUNAT / Facturador SUNAT", "Perú"),
      t("nubefact", "Nubefact", "Perú"),
      t("alegra", "Alegra", "Colombia"),
      t("siigo", "Siigo", "Colombia"),
      t("quickbooks", "QuickBooks", "Estados Unidos"),
      t("sap", "SAP, Odoo u otro ERP", "No sé"),
      t("excel-facturas", "Excel / mi estudio contable emite por mí", "Perú"),
    ],
  },

  /* ---- Web, tienda o app ---- */
  {
    id: "web",
    label: "Tu web o tienda online",
    question: "¿Con qué hiciste tu web o tienda?",
    purpose: "Publicar la web o tienda y recibir pedidos o consultas",
    data: "Nombre, correo, teléfono, dirección y pedidos hechos por la web",
    web: true,
    tools: [
      t("shopify", "Shopify", "No sé", { cookies: "Cookies de la tienda (carrito, sesión)" }),
      t("woocommerce", "WordPress / WooCommerce", "No sé", { cookies: "Cookies de sesión y carrito" }),
      t("wix", "Wix", "No sé", { cookies: "Cookies de sesión del sitio" }),
      t("squarespace", "Squarespace", "Estados Unidos", { cookies: "Cookies de sesión del sitio" }),
      t("tiendanube", "Tiendanube / Jumpseller", "No sé", { cookies: "Cookies de la tienda (carrito, sesión)" }),
      t("a-medida", "Desarrollo a medida (programado para mí)", "No sé"),
    ],
  },
  {
    id: "hosting",
    label: "Hosting y servidores",
    question: "¿Dónde está alojada tu web o app?",
    hint: "Es el país donde están los servidores. Si no lo sabes, pregúntale a quien hizo tu web.",
    purpose: "Alojamiento de la web, la app y sus datos",
    data: "Todos los datos que manejan la web o la app",
    web: true,
    tools: [
      t("vercel", "Vercel", "Estados Unidos"),
      t("netlify", "Netlify", "Estados Unidos"),
      t("aws", "Amazon Web Services (AWS)", "Estados Unidos"),
      t("gcp", "Google Cloud", "Estados Unidos"),
      t("azure", "Microsoft Azure", "Estados Unidos"),
      t("digitalocean", "DigitalOcean", "Estados Unidos"),
      t("cloudflare", "Cloudflare (CDN y seguridad)", "Estados Unidos", { cookies: "__cf_bm (técnica, 30 minutos)" }),
      t("godaddy", "GoDaddy", "Estados Unidos"),
      t("hostinger", "Hostinger", "Unión Europea"),
      t("hosting-peru", "Hosting en un proveedor peruano", "Perú"),
    ],
  },
  {
    id: "base_datos",
    label: "Base de datos",
    question: "¿Dónde guarda tu app los datos de los usuarios?",
    purpose: "Almacenamiento de las cuentas y los datos de los usuarios",
    data: "Datos de cuentas, pedidos y actividad de los usuarios",
    web: true,
    tools: [
      t("neon", "Neon / PostgreSQL gestionado", "Estados Unidos"),
      t("supabase", "Supabase", "No sé"),
      t("firebase", "Firebase / Firestore", "Estados Unidos"),
      t("mongodb", "MongoDB Atlas", "Estados Unidos"),
      t("rds", "Amazon RDS / Google Cloud SQL", "Estados Unidos"),
      t("planetscale", "PlanetScale u otra base MySQL gestionada", "Estados Unidos"),
      t("db-propia", "Base de datos en mi propio servidor", "No sé"),
    ],
  },
  {
    id: "login",
    label: "Inicio de sesión (login)",
    question: "¿Cómo inician sesión tus clientes o usuarios?",
    hint: "«Continuar con Google» o «con Facebook» también cuenta.",
    purpose: "Autenticación de usuarios y gestión de sesiones",
    data: "Nombre, correo, foto de perfil e identificador de inicio de sesión",
    web: true,
    tools: [
      t("login-google", "Iniciar sesión con Google", "Estados Unidos", { cookies: "Cookies de Google en el inicio de sesión" }),
      t("login-facebook", "Iniciar sesión con Facebook", "Estados Unidos", { cookies: "Cookies de Meta en el inicio de sesión" }),
      t("login-apple", "Iniciar sesión con Apple", "Estados Unidos"),
      t("clerk", "Clerk", "Estados Unidos", { cookies: "__session / __client_uat (técnicas, sesión)" }),
      t("auth0", "Auth0", "Estados Unidos", { cookies: "auth0 / auth0_compat (técnicas, sesión)" }),
      t("firebase-auth", "Firebase Authentication", "Estados Unidos"),
      t("supabase-auth", "Supabase Auth", "No sé"),
      t("login-propio", "Correo y contraseña propios (sin terceros)", "No sé"),
    ],
  },
  {
    id: "analitica",
    label: "Estadísticas de visitas (analítica)",
    question: "¿Mides las visitas de tu web?",
    hint: "Requiere permiso previo del visitante (banner de cookies).",
    purpose: "Medición agregada del uso de la web",
    data: "Dirección IP, dispositivo, páginas visitadas e identificadores de cookies",
    web: true,
    tools: [
      t("ga", "Google Analytics", "Estados Unidos", { cookies: "_ga, _ga_* (analítica, hasta 2 años)" }),
      t("gtm", "Google Tag Manager", "Estados Unidos", { cookies: "Carga las etiquetas que configures" }),
      t("hotjar", "Hotjar", "Unión Europea", { cookies: "_hj* (analítica, hasta 1 año)" }),
      t("clarity", "Microsoft Clarity", "Estados Unidos", { cookies: "_clck, _clsk (analítica, hasta 1 año)" }),
      t("plausible", "Plausible o Fathom", "Unión Europea"),
      t("vercel-analytics", "Vercel Analytics", "Estados Unidos"),
      t("mixpanel", "Mixpanel o Amplitude", "Estados Unidos", { cookies: "Cookie del proveedor (analítica)" }),
    ],
  },
  {
    id: "publicidad",
    label: "Publicidad en internet",
    question: "¿Haces publicidad pagada o usas píxeles?",
    hint: "Facebook/Instagram Ads, Google Ads, TikTok… Requiere permiso previo del visitante.",
    purpose: "Publicidad dirigida y medición de campañas",
    data: "Identificadores de cookies, eventos de navegación y datos de contacto para audiencias",
    web: true,
    tools: [
      t("meta-ads", "Facebook / Instagram Ads (Meta Pixel)", "Estados Unidos", { cookies: "_fbp, _fbc (publicidad, hasta 90 días)" }),
      t("google-ads", "Google Ads", "Estados Unidos", { cookies: "_gcl_* (publicidad, hasta 90 días)" }),
      t("tiktok-ads", "TikTok Ads (TikTok Pixel)", "No sé", { cookies: "_ttp (publicidad, hasta 13 meses)" }),
      t("linkedin-ads", "LinkedIn Ads", "Estados Unidos", { cookies: "Cookies de LinkedIn Insight Tag" }),
      t("x-ads", "X (Twitter) Ads", "Estados Unidos"),
    ],
  },
  {
    id: "redes",
    label: "Redes sociales",
    question: "¿Vendes o atiendes por redes sociales?",
    purpose: "Promoción, ventas y atención por redes sociales",
    data: "Nombre de usuario, mensajes, comentarios y datos que el cliente comparte",
    tools: [
      t("instagram-facebook", "Instagram / Facebook", "Estados Unidos"),
      t("tiktok", "TikTok", "No sé"),
      t("youtube", "YouTube", "Estados Unidos"),
      t("linkedin", "LinkedIn", "Estados Unidos"),
      t("marketplace", "Mercado Libre / Facebook Marketplace", "Argentina"),
    ],
  },
  {
    id: "crm",
    label: "CRM y gestión de clientes",
    question: "¿Llevas tus clientes en algún sistema?",
    purpose: "Gestión de clientes, oportunidades y tareas",
    data: "Nombre, contacto, historial de compras y notas de atención",
    web: true,
    tools: [
      t("hubspot", "HubSpot", "Estados Unidos"),
      t("salesforce", "Salesforce", "Estados Unidos"),
      t("zoho-crm", "Zoho CRM", "India"),
      t("odoo", "Odoo", "No sé"),
      t("trello", "Trello, Asana o similares", "Estados Unidos"),
    ],
  },
  {
    id: "ia",
    label: "Inteligencia artificial",
    question: "¿Usas IA con datos de tus clientes (chatbots, OCR, transcripción, resúmenes)?",
    hint: "Enviar datos de personas a una IA externa es una transferencia y conviene hacer una EIPD.",
    purpose: "Procesamiento automatizado de texto, voz o imágenes",
    data: "Texto, audio o imágenes que se envían al proveedor para su procesamiento",
    web: true,
    tools: [
      t("openai", "OpenAI / ChatGPT", "Estados Unidos"),
      t("anthropic", "Anthropic / Claude", "Estados Unidos"),
      t("gemini", "Google Gemini / Google Vision", "Estados Unidos"),
      t("copilot", "Microsoft Copilot", "Estados Unidos"),
      t("mistral", "Mistral", "Unión Europea"),
      t("groq", "Groq", "Estados Unidos"),
    ],
  },
  {
    id: "reuniones",
    label: "Videollamadas y agendas",
    question: "¿Haces videollamadas o reservas con tus clientes?",
    purpose: "Reuniones, clases o consultas por video y agendamiento de citas",
    data: "Nombre, correo, imagen, voz y, a veces, grabaciones",
    tools: [
      t("zoom", "Zoom", "Estados Unidos"),
      t("meet", "Google Meet", "Estados Unidos"),
      t("teams", "Microsoft Teams", "Estados Unidos"),
      t("calendly", "Calendly u otra agenda online", "Estados Unidos"),
    ],
  },
  {
    id: "delivery",
    label: "Delivery y logística",
    question: "¿Usas apps de delivery o empresas de envíos?",
    purpose: "Entrega de pedidos y seguimiento de envíos",
    data: "Nombre, teléfono y dirección de entrega",
    families: ["alimentos", "venta_online", "comercio", "carga", "farmacia"],
    tools: [
      t("rappi", "Rappi", "Colombia"),
      t("pedidosya", "PedidosYa", "Otro país"),
      t("olva", "Olva Courier", "Perú"),
      t("shalom", "Shalom", "Perú"),
      t("chazki", "Chazki", "Perú"),
      t("dhl", "DHL", "Unión Europea"),
    ],
  },

  /* ---- Específicas de rubro ---- */
  {
    id: "clinica",
    label: "Software de clínica, consultorio o historia clínica",
    question: "¿Con qué llevas las historias clínicas y las citas?",
    hint: "Las historias clínicas son datos de salud (sensibles): el software y su país importan.",
    purpose: "Historias clínicas, agenda de pacientes y facturación de atenciones",
    data: "Datos de salud, diagnósticos, recetas, resultados e imágenes clínicas",
    families: ["salud", "bienestar"],
    tools: [
      t("papel-hc", "Historias clínicas en papel", "Perú"),
      t("excel-hc", "Excel o Word en mi computadora", "Perú"),
      t("dentalink", "Dentalink", "Chile"),
      t("medilink", "Medilink", "Chile"),
      t("agendapro", "AgendaPro", "Chile"),
      t("reservo", "Reservo", "Chile"),
      t("doctoralia", "Doctoralia", "Unión Europea"),
      t("clinic-cloud", "Clinic Cloud", "Unión Europea"),
      t("his-propio", "Sistema de clínica hecho a medida", "No sé"),
    ],
  },
  {
    id: "aula",
    label: "Aula virtual y gestión escolar",
    question: "¿Qué plataformas usan tus alumnos y docentes?",
    hint: "Si tus alumnos son menores, el país y el contrato de la plataforma son críticos.",
    purpose: "Clases, tareas, notas y comunicación con alumnos y familias",
    data: "Datos de alumnos y apoderados, notas, asistencia y trabajos",
    families: ["educacion_menores", "educacion_adultos"],
    tools: [
      t("classroom", "Google Classroom", "Estados Unidos"),
      t("teams-edu", "Microsoft Teams para educación", "Estados Unidos"),
      t("moodle", "Moodle", "No sé"),
      t("canvas", "Canvas o Schoology", "Estados Unidos"),
      t("siagie", "SIAGIE (MINEDU)", "Perú"),
      t("zoom-edu", "Zoom", "Estados Unidos"),
    ],
  },
  {
    id: "cursos",
    label: "Plataformas de cursos y video",
    question: "¿Dónde publicas o vendes tus cursos?",
    purpose: "Alojar cursos, videos y matrículas",
    data: "Nombre, correo, progreso y compras de los alumnos",
    families: ["educacion_adultos", "medios"],
    tools: [
      t("hotmart", "Hotmart", "Brasil"),
      t("teachable", "Teachable o Thinkific", "Estados Unidos"),
      t("udemy", "Udemy", "Estados Unidos"),
      t("vimeo", "Vimeo", "Estados Unidos"),
    ],
  },
  {
    id: "reservas",
    label: "Reservas y portales de viaje",
    question: "¿Por qué plataformas recibes reservas?",
    purpose: "Recibir reservas y gestionar huéspedes",
    data: "Nombre, documento, nacionalidad, fechas de estadía y datos de pago",
    families: ["hospedaje", "viajes"],
    tools: [
      t("booking", "Booking.com", "Unión Europea"),
      t("airbnb", "Airbnb", "Estados Unidos"),
      t("expedia", "Expedia", "Estados Unidos"),
      t("despegar", "Despegar", "Argentina"),
      t("cloudbeds", "Cloudbeds u otro sistema de recepción (PMS)", "Estados Unidos"),
    ],
  },
  {
    id: "pos",
    label: "Caja, POS y sistema de ventas",
    question: "¿Con qué registras tus ventas en el local?",
    purpose: "Registro de ventas, clientes y programas de fidelidad",
    data: "Nombre, teléfono, historial de compras y medios de pago",
    families: ["alimentos", "comercio", "farmacia", "nocturno", "bienestar"],
    tools: [
      t("fudo", "Fudo", "Argentina"),
      t("square", "Square", "Estados Unidos"),
      t("pos-local", "Caja o sistema instalado en mi local", "Perú"),
      t("pos-nube", "Otro sistema de ventas en la nube", "No sé"),
    ],
  },
  {
    id: "membresias",
    label: "Gimnasio: membresías y acceso",
    question: "¿Cómo gestionas socios y el ingreso?",
    hint: "Huella o reconocimiento facial son datos biométricos (sensibles).",
    purpose: "Gestión de membresías y control de acceso",
    data: "Datos de socios, asistencia y, si corresponde, huella o rostro",
    families: ["bienestar"],
    tools: [
      t("mindbody", "Mindbody", "Estados Unidos"),
      t("wellhub", "Wellhub (Gympass)", "No sé"),
      t("biometrico", "Lector de huella o rostro en mi local", "Perú"),
      t("zkteco", "ZKTeco u otro software biométrico", "No sé"),
    ],
  },
  {
    id: "inmuebles",
    label: "Portales inmobiliarios",
    question: "¿Dónde publicas propiedades y recibes interesados?",
    purpose: "Publicar propiedades y captar interesados",
    data: "Nombre, teléfono y correo de interesados",
    families: ["inmobiliaria", "vehiculos"],
    tools: [
      t("urbania", "Urbania", "Perú"),
      t("adondevivir", "Adondevivir", "Perú"),
      t("mercadolibre-inm", "Mercado Libre", "Argentina"),
      t("neoauto", "Neoauto u otro portal de vehículos", "Perú"),
    ],
  },
  {
    id: "camaras",
    label: "Cámaras de seguridad",
    question: "¿Cómo guardas las imágenes de tus cámaras?",
    hint: "Si las ves por celular desde la nube, las imágenes pueden salir del Perú.",
    purpose: "Videovigilancia y seguridad del local",
    data: "Imágenes y grabaciones de personas",
    families: ["alimentos", "comercio", "hospedaje", "salud", "educacion_menores", "condominio", "industria", "seguridad_privada", "nocturno", "bienestar"],
    tools: [
      t("grabador-local", "Grabador en mi local (sin nube)", "Perú"),
      t("hikconnect", "Hik-Connect (Hikvision)", "Otro país"),
      t("dahua", "Imou / DMSS (Dahua)", "Otro país"),
      t("ezviz", "EZVIZ", "Otro país"),
      t("tapo", "TP-Link Tapo / VIGI", "Otro país"),
      t("monitoreo", "Empresa de monitoreo", "Perú"),
    ],
  },
  {
    id: "empleo",
    label: "Portales de empleo y recursos humanos",
    question: "¿Dónde buscas personal o gestionas planilla?",
    purpose: "Reclutamiento, planilla y gestión de personal",
    data: "CV, datos de contacto y datos laborales de postulantes y trabajadores",
    families: ["rrhh", "industria", "hospedaje", "alimentos", "salud", "educacion_menores"],
    tools: [
      t("computrabajo", "Computrabajo", "No sé"),
      t("bumeran", "Bumeran", "Argentina"),
      t("linkedin-jobs", "LinkedIn / Indeed", "Estados Unidos"),
      t("buk", "Buk u otro sistema de planilla", "Chile"),
      t("plame", "PLAME / T-Registro (SUNAT)", "Perú"),
    ],
  },
  {
    id: "riesgo",
    label: "Centrales de riesgo y verificación de identidad",
    question: "¿Consultas centrales de riesgo o verificas identidad?",
    hint: "Las consultas de historial crediticio exigen base legal o autorización del titular.",
    purpose: "Evaluación crediticia y verificación de identidad",
    data: "Documento de identidad, historial crediticio e ingresos",
    families: ["finanzas", "seguros", "vehiculos", "inmobiliaria"],
    tools: [
      t("equifax", "Equifax (Infocorp)", "Perú"),
      t("sbs", "Consulta a la SBS / RCC", "Perú"),
      t("reniec", "Validación con RENIEC", "Perú"),
      t("otra-central", "Otra central de riesgo", "No sé"),
    ],
  },
];

const BY_ID = new Map(TOOL_CATEGORIES.map((category) => [category.id, category]));

export function toolCategory(id: string): ToolCategory | undefined {
  return BY_ID.get(id);
}

export function findTool(categoryId: string, name: string): ToolOption | undefined {
  return BY_ID.get(categoryId)?.tools.find((tool) => tool.name === name);
}

/**
 * Categorías en el orden que se le muestran al dueño:
 * `forYou` (su rubro), `general` (siempre útiles), `web` (si tiene web o app) y `more` (el resto).
 */
export function categoriesFor(family: LegalFamily, hasWeb: boolean) {
  const forYou: ToolCategory[] = [];
  const general: ToolCategory[] = [];
  const web: ToolCategory[] = [];
  const more: ToolCategory[] = [];
  for (const category of TOOL_CATEGORIES) {
    if (category.families?.includes(family)) forYou.push(category);
    else if (category.families) more.push(category);
    else if (category.web) (hasWeb ? web : more).push(category);
    else general.push(category);
  }
  return { forYou, general, web, more };
}

/** Herramientas que son del propio negocio (no hay un tercero al que firmar contrato de encargo). */
const OWN_TOOL_IDS = new Set([
  "local",
  "papel",
  "papel-hc",
  "excel-hc",
  "pos-local",
  "grabador-local",
  "biometrico",
  "excel-facturas",
  "db-propia",
  "login-propio",
  "yape-plin",
  "pos-banco",
]);

export function isOwnTool(categoryId: string, name: string): boolean {
  const tool = findTool(categoryId, name);
  return Boolean(tool && OWN_TOOL_IDS.has(tool.id));
}

/**
 * Países que la Autoridad declaró con nivel adecuado de protección (art. 19 del
 * DS N.° 016-2024-JUS, mediante resolución de la Dirección General de
 * Transparencia, Acceso a la Información Pública y Protección de Datos
 * Personales).
 *
 * Revisado el 2026-10-31: no encontramos ninguna resolución publicada, por lo que
 * la lista está vacía y todo flujo transfronterizo exige garantías (art. 18.2 y
 * 20). Cuando la ANPD publique una, agrégala aquí con su número de resolución:
 * los documentos y la pantalla de herramientas la usarán sin más cambios.
 */
export const ADEQUATE_COUNTRIES: Array<{ country: Country; resolution: string }> = [];

export const ADEQUATE_LIST_REVIEWED = "2026-10-31";

export function adequacyOf(country: string) {
  return ADEQUATE_COUNTRIES.find((entry) => entry.country === country);
}
