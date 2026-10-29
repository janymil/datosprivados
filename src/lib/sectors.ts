import type { BankPresetId } from "./bank-presets";

/**
 * Catálogo de rubros para el onboarding. Cada rubro sugiere los bancos de datos
 * que normalmente tiene ese tipo de negocio; el usuario puede ajustarlos.
 */

export type Sector = {
  id: string;
  label: string;
  group: string;
  /** Palabras extra para el buscador. */
  keywords?: string;
  banks: BankPresetId[];
  /** Advertencia específica del rubro (datos sensibles, menores, etc.). */
  note?: string;
};

const RETAIL: BankPresetId[] = ["clientes", "reclamaciones", "proveedores", "camaras"];

const HEALTH_NOTE =
  "Manejas datos de salud (datos sensibles): necesitas autorización por escrito de cada paciente. Te damos el formato listo en Documentos.";
const MINORS_NOTE =
  "Manejas datos de menores de edad: el consentimiento lo otorgan sus padres o apoderados.";

export const SECTORS: Sector[] = [
  // Comercio
  { id: "bodega", label: "Bodega, minimarket o abarrotes", group: "Comercio y ventas", keywords: "tienda barrio market", banks: RETAIL },
  { id: "ropa", label: "Tienda de ropa, calzado o accesorios", group: "Comercio y ventas", keywords: "boutique moda zapatos", banks: [...RETAIL, "marketing"] },
  { id: "ecommerce", label: "Tienda online / e-commerce", group: "Comercio y ventas", keywords: "web shopify woocommerce internet", banks: ["clientes", "marketing", "reclamaciones", "proveedores"] },
  { id: "redes", label: "Ventas por WhatsApp, Instagram, Facebook o TikTok", group: "Comercio y ventas", keywords: "emprendimiento redes sociales delivery", banks: ["clientes", "marketing", "reclamaciones"] },
  { id: "ferreteria", label: "Ferretería o materiales de construcción", group: "Comercio y ventas", banks: RETAIL },
  { id: "tecnologia-tienda", label: "Tienda de tecnología o celulares", group: "Comercio y ventas", keywords: "computadoras electronica", banks: [...RETAIL, "marketing"] },
  { id: "libreria", label: "Librería, bazar o regalos", group: "Comercio y ventas", keywords: "papeleria utiles", banks: RETAIL },
  { id: "farmacia", label: "Farmacia o botica", group: "Comercio y ventas", keywords: "medicinas drogueria", banks: [...RETAIL, "pacientes"], note: "Si guardas recetas o historial de compras de medicamentos, son datos de salud (sensibles)." },
  { id: "optica", label: "Óptica", group: "Comercio y ventas", keywords: "lentes medida vista", banks: [...RETAIL, "pacientes"], note: HEALTH_NOTE },
  { id: "mayorista", label: "Distribuidora o venta al por mayor", group: "Comercio y ventas", keywords: "importadora b2b", banks: ["clientes", "proveedores", "camaras"] },
  { id: "autos", label: "Venta de autos, motos o repuestos", group: "Comercio y ventas", keywords: "concesionario autopartes", banks: [...RETAIL, "marketing"] },

  // Alimentos
  { id: "restaurante", label: "Restaurante, cafetería, pollería o cevichería", group: "Alimentos y bebidas", keywords: "comida menu chifa", banks: ["clientes", "reclamaciones", "proveedores", "camaras"] },
  { id: "delivery", label: "Delivery de comida o dark kitchen", group: "Alimentos y bebidas", keywords: "cocina oculta pedidos", banks: ["clientes", "marketing", "reclamaciones", "proveedores"] },
  { id: "panaderia", label: "Panadería o pastelería", group: "Alimentos y bebidas", keywords: "tortas", banks: RETAIL },
  { id: "bar", label: "Bar, discoteca o karaoke", group: "Alimentos y bebidas", keywords: "eventos noche", banks: ["clientes", "reclamaciones", "camaras", "marketing"] },
  { id: "catering", label: "Catering, eventos o bodas", group: "Alimentos y bebidas", keywords: "fiestas buffet", banks: ["clientes", "proveedores", "marketing"] },

  // Turismo y transporte
  { id: "hotel", label: "Hotel, hostal u hospedaje", group: "Turismo y transporte", keywords: "airbnb alojamiento booking", banks: ["huespedes", "reclamaciones", "camaras", "proveedores"] },
  { id: "agencia-viajes", label: "Agencia de viajes o turismo", group: "Turismo y transporte", keywords: "tours paquetes", banks: ["clientes", "marketing", "reclamaciones", "proveedores"] },
  { id: "transporte-pasajeros", label: "Transporte de pasajeros (taxi, buses, colectivo)", group: "Turismo y transporte", keywords: "movilidad escolar transporte taxi buses", banks: ["clientes", "reclamaciones", "camaras"] },
  { id: "courier", label: "Courier, mudanzas o transporte de carga", group: "Turismo y transporte", keywords: "envios logistica", banks: ["clientes", "reclamaciones", "proveedores"] },

  // Salud y bienestar
  { id: "clinica", label: "Clínica o consultorio médico", group: "Salud y bienestar", keywords: "doctor medico policlinico", banks: ["pacientes", "reclamaciones", "camaras", "proveedores"], note: HEALTH_NOTE },
  { id: "dental", label: "Consultorio dental u odontología", group: "Salud y bienestar", keywords: "dentista ortodoncia clinica", banks: ["pacientes", "reclamaciones", "camaras"], note: HEALTH_NOTE },
  { id: "psicologia", label: "Psicología, terapia o coaching", group: "Salud y bienestar", keywords: "psicologo terapeuta", banks: ["pacientes", "reclamaciones"], note: HEALTH_NOTE },
  { id: "laboratorio", label: "Laboratorio clínico o centro de imágenes", group: "Salud y bienestar", keywords: "analisis rayos", banks: ["pacientes", "reclamaciones", "proveedores"], note: HEALTH_NOTE },
  { id: "fisioterapia", label: "Fisioterapia, nutrición u otras terapias", group: "Salud y bienestar", keywords: "nutricionista rehabilitacion", banks: ["pacientes", "reclamaciones"], note: HEALTH_NOTE },
  { id: "veterinaria", label: "Veterinaria o pet shop", group: "Salud y bienestar", keywords: "mascotas grooming", banks: ["clientes", "reclamaciones", "marketing", "camaras"] },
  { id: "estetica", label: "Centro de estética, spa o cosmetología", group: "Salud y bienestar", keywords: "depilacion masajes tratamientos faciales", banks: ["clientes", "pacientes", "reclamaciones", "marketing"], note: "Las fichas de evaluación (alergias, tratamientos, fotos antes/después) son datos de salud: pide autorización por escrito." },
  { id: "peluqueria", label: "Peluquería, barbería o salón de uñas", group: "Salud y bienestar", keywords: "salon belleza", banks: ["clientes", "reclamaciones", "marketing"] },
  { id: "gimnasio", label: "Gimnasio, yoga o centro deportivo", group: "Salud y bienestar", keywords: "crossfit pilates club", banks: ["socios", "reclamaciones", "camaras", "marketing"], note: "Si usas huella o reconocimiento facial para el acceso, son datos biométricos (sensibles)." },

  // Educación
  { id: "colegio", label: "Colegio, nido o cuna", group: "Educación", keywords: "escuela inicial primaria", banks: ["alumnos", "reclamaciones", "camaras", "proveedores"], note: MINORS_NOTE },
  { id: "academia", label: "Academia, preuniversitaria o refuerzo escolar", group: "Educación", keywords: "pre clases", banks: ["alumnos", "reclamaciones", "marketing"], note: MINORS_NOTE },
  { id: "instituto", label: "Instituto, centro de idiomas o universidad", group: "Educación", keywords: "ingles carrera tecnica", banks: ["alumnos", "reclamaciones", "marketing", "camaras"] },
  { id: "cursos-online", label: "Cursos online, talleres o capacitación", group: "Educación", keywords: "e-learning webinar", banks: ["alumnos", "marketing", "reclamaciones"] },

  // Servicios profesionales
  { id: "contable", label: "Estudio contable", group: "Servicios profesionales", keywords: "contador tributario planillas", banks: ["clientes", "proveedores"], note: "Tratas datos de planilla de tus clientes por encargo: firma con ellos la cláusula de encargo de tratamiento (está en Documentos)." },
  { id: "abogados", label: "Estudio de abogados", group: "Servicios profesionales", keywords: "legal juridico", banks: ["clientes", "proveedores"] },
  { id: "agencia-marketing", label: "Agencia de marketing, diseño o publicidad", group: "Servicios profesionales", keywords: "community manager", banks: ["clientes", "marketing", "proveedores"], note: "Si manejas bases de datos de tus clientes, eres su «encargado del tratamiento»: firma la cláusula de encargo." },
  { id: "consultoria", label: "Consultoría o asesoría", group: "Servicios profesionales", banks: ["clientes", "proveedores", "marketing"] },
  { id: "rrhh", label: "Agencia de empleo, reclutamiento o RR.HH.", group: "Servicios profesionales", keywords: "headhunter outsourcing", banks: ["clientes", "proveedores"], note: "Los CVs y evaluaciones de candidatos son tu banco principal; pueden incluir datos sensibles." },
  { id: "seguros", label: "Corredor de seguros", group: "Servicios profesionales", banks: ["clientes", "marketing", "reclamaciones"], note: "Los datos de salud de los asegurados son sensibles." },
  { id: "arquitectura", label: "Arquitectura, ingeniería o diseño de interiores", group: "Servicios profesionales", banks: ["clientes", "proveedores"] },

  // Inmobiliaria y construcción
  { id: "inmobiliaria", label: "Inmobiliaria o corretaje de propiedades", group: "Inmobiliaria y construcción", keywords: "alquiler venta departamentos", banks: ["clientes", "marketing", "reclamaciones", "proveedores"] },
  { id: "constructora", label: "Constructora o contratista", group: "Inmobiliaria y construcción", keywords: "obras", banks: ["clientes", "proveedores", "camaras"] },
  { id: "condominio", label: "Administración de edificios o condominios", group: "Inmobiliaria y construcción", keywords: "junta de propietarios", banks: ["clientes", "camaras", "proveedores"] },

  // Finanzas
  { id: "prestamos", label: "Financiera, cooperativa o casa de préstamos", group: "Finanzas", keywords: "credito prestamista caja", banks: ["clientes", "reclamaciones", "marketing", "camaras"], note: "Los ingresos económicos de tus clientes son datos sensibles según la Ley 29733." },
  { id: "cambio", label: "Casa de cambio o remesas", group: "Finanzas", keywords: "dolares envio dinero", banks: ["clientes", "reclamaciones", "camaras"] },

  // Tecnología
  { id: "software", label: "Software, app o plataforma digital (SaaS)", group: "Tecnología y medios", keywords: "startup aplicacion app saas plataforma software web", banks: ["clientes", "marketing", "reclamaciones"], note: "Si alojas datos de tus clientes en tu plataforma, también eres su «encargado del tratamiento»." },
  { id: "medios", label: "Medios, productora o creador de contenido", group: "Tecnología y medios", keywords: "influencer youtube fotografia", banks: ["clientes", "marketing"] },

  // Otros servicios
  { id: "taller", label: "Taller mecánico o servicio técnico", group: "Otros servicios", keywords: "reparacion electrodomesticos", banks: RETAIL },
  { id: "lavanderia", label: "Lavandería", group: "Otros servicios", banks: ["clientes", "reclamaciones"] },
  { id: "seguridad", label: "Seguridad o vigilancia privada", group: "Otros servicios", keywords: "agentes", banks: ["clientes", "camaras"] },
  { id: "ong", label: "ONG, asociación, iglesia o gremio", group: "Otros servicios", keywords: "fundacion religioso sindicato", banks: ["socios", "marketing"], note: "La afiliación religiosa, política o sindical es un dato sensible." },
  { id: "industria", label: "Industria, fábrica o manufactura", group: "Otros servicios", keywords: "planta produccion", banks: ["clientes", "proveedores", "camaras"] },
  { id: "agro", label: "Agro, agroexportación o pesca", group: "Otros servicios", keywords: "campo fundo", banks: ["clientes", "proveedores", "camaras"] },
  { id: "otro", label: "Otro tipo de negocio", group: "Otros servicios", banks: ["clientes", "proveedores"] },
];

export const SECTOR_GROUPS = Array.from(new Set(SECTORS.map((sector) => sector.group)));

export function findSectorByLabel(label: string): Sector | undefined {
  return SECTORS.find((sector) => sector.label === label);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Palabras de las etiquetas demasiado genéricas para identificar un rubro.
const GENERIC_WORDS = new Set([
  "tienda", "venta", "ventas", "servicio", "servicios", "centro", "empresa", "negocio", "otro", "otros",
  "tipo", "casa", "local", "online", "otras", "datos", "personas", "digital",
]);

/** Intenta reconocer el rubro mencionado en un texto libre ("soy una empresa SaaS"). */
export function detectSector(text: string): Sector | undefined {
  const words = normalize(text).match(/[a-z0-9]+/g) ?? [];
  // Coincidencia exacta, o por prefijo para palabras largas (plurales: "dentistas").
  const mentions = (keyword: string) =>
    words.some((word) => word === keyword || (keyword.length >= 5 && word.startsWith(keyword)));
  let best: { sector: Sector; score: number } | undefined;
  for (const sector of SECTORS) {
    if (sector.id === "otro") continue;
    const labelWords = (normalize(sector.label).match(/[a-z0-9]+/g) ?? []).filter(
      (word) => word.length >= 4 && !GENERIC_WORDS.has(word)
    );
    const keywords = (normalize(sector.keywords ?? "").match(/[a-z0-9]+/g) ?? []).filter(
      (word) => word.length >= 3 && !GENERIC_WORDS.has(word)
    );
    const score = [...new Set([...labelWords, ...keywords])].filter(mentions).length;
    if (score > 0 && (!best || score > best.score)) best = { sector, score };
  }
  return best?.sector;
}
