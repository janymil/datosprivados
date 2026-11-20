/**
 * Hoja de ruta interna: ideas, servicios y decisiones pendientes que no deben
 * olvidarse. Solo la ve el operador (/operador/hoja-de-ruta). No es contenido
 * público ni compromete fechas con clientes.
 *
 * Para agregar o cambiar algo, edita esta lista. Fuente principal:
 * docs/ESTRATEGIA-DIFERENCIACION-Y-PRECIOS.md (y ANALISIS-PRECIOS-V2.md).
 */

export const ROADMAP_STATUSES = ["en-curso", "planificado", "idea", "hecho"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  "en-curso": "En curso",
  planificado: "Planificado",
  idea: "Ideas",
  hecho: "Hecho",
};

export type RoadmapItem = {
  id: string;
  title: string;
  status: RoadmapStatus;
  /** Una o dos frases: qué es y por qué importa. */
  summary: string;
  /** Detalles, condiciones y próximos pasos. */
  details: string[];
  /** Precio propuesto, si aplica (con IGV). */
  price?: string;
  /** Qué hace falta antes de empezar. */
  dependsOn?: string;
  /** De dónde sale la idea o la decisión. */
  source: string;
  /** Fecha en que se anotó (AAAA-MM-DD). */
  addedAt: string;
};

const ESTRATEGIA = "docs/ESTRATEGIA-DIFERENCIACION-Y-PRECIOS.md";

export const ROADMAP: RoadmapItem[] = [
  {
    id: "motor-legal",
    title: "Motor legal: documentos que se actualizan solos con la ley",
    status: "en-curso",
    summary:
      "Biblioteca de cláusulas con citas verificadas contra el texto oficial, auditoría, monitor diario de El Peruano y la ANPD, y aprobación en un clic desde /operador/legal.",
    details: [
      "Plan 1 (biblioteca de cláusulas con salida idéntica): PR #9.",
      "Plan 2 (biblioteca de normas, citas, lint y reglas): en construcción.",
      "Planes 3 a 7: módulos no documentales, panel de aprobación, auditoría, monitor y control de respuestas de IA.",
      "Argumento de venta: la renovación incluye la actualización legal.",
    ],
    source: "docs/superpowers/specs/2026-11-13-motor-legal-design.md",
    addedAt: "2026-11-13",
  },
  {
    id: "politica-precios",
    title: "Nueva política de precios",
    status: "planificado",
    summary:
      "Precio de lista, de lanzamiento (primeros 30 clientes) y renovación. Todavía no aplicada en src/lib/plans.ts.",
    details: [
      "Básico: lista S/ 390 · lanzamiento S/ 290 · renovación S/ 149.",
      "Pro: lista S/ 590 · lanzamiento S/ 490 · renovación S/ 249.",
      "Contadores: compran a precio de lanzamiento y revenden a lista; 15 % sobre complementos con abogado.",
      "Solo pago anual en planes; el Oficial de Datos externo sí es mensual.",
    ],
    source: `${ESTRATEGIA} §5`,
    addedAt: "2026-11-14",
  },
  {
    id: "oficial-datos-externo",
    title: "Oficial de Datos Personales externo (servicio mensual)",
    status: "planificado",
    summary:
      "Un abogado socio actúa como Oficial de Datos Personales de la empresa cliente; DatosPrivados le da las herramientas (documentos, bancos, ARCO, incidentes, evidencias).",
    details: [
      "Obligatorio según el art. 37 del DS 016-2024-JUS para quien trata datos sensibles como actividad principal, grandes volúmenes o es entidad pública; puede ser externo (art. 38.2). Citas a verificar en la auditoría del motor legal.",
      "Calendario por ventas anuales: más de 2,300 UIT desde 30-11-2025; medianas (1,700–2,300 UIT) desde 30-11-2026; pequeñas desde 30-11-2027; micro desde 30-11-2028.",
      "Al designarlo: publicar sus datos de contacto y comunicarlos a la ANPD dentro de 15 días.",
      "La responsabilidad profesional es del abogado: contrato directo abogado–cliente; DatosPrivados cobra y provee la plataforma.",
      "Clientes objetivo: clínicas, laboratorios, colegios, academias y empresas medianas.",
    ],
    price: "Desde S/ 250 al mes (S/ 2,400 al año pagado por adelantado)",
    dependsOn: "Acuerdo con uno o dos abogados socios y su tarifa fija por cliente.",
    source: `${ESTRATEGIA} §4 idea 4 y §5.2`,
    addedAt: "2026-11-14",
  },
  {
    id: "revision-abogado",
    title: "Revisión del expediente por abogado colegiado",
    status: "planificado",
    summary:
      "Complemento de pago único: un abogado revisa los documentos generados para la empresa y deja constancia («revisado por <nombre>, CAL N.° …»).",
    details: [
      "Incluye revisión de los 14 documentos, correcciones y una reunión virtual de 30 minutos.",
      "Flujo en el operador: asignar abogado, revisión, constancia guardada en evidencias.",
      "Base posible: el enlace /revision/[token] de la rama de respaldo backup/2026-10-31-equipo-roles.",
      "Hoy un usuario pertenece a una sola empresa: dar acceso al abogado exige un diseño propio (seguridad entre empresas).",
    ],
    price: "S/ 490 (Básico) · S/ 790 (Pro, datos sensibles o de menores)",
    dependsOn: "Tarifa fija acordada con 2–3 abogados (supuesto: S/ 300 y S/ 450 por revisión).",
    source: `${ESTRATEGIA} §5.2`,
    addedAt: "2026-11-14",
  },
  {
    id: "defensa-anpd",
    title: "Defensa ante la ANPD (fiscalización o procedimiento sancionador)",
    status: "idea",
    summary: "El abogado socio atiende la fiscalización; DatosPrivados entrega la carpeta del expediente.",
    details: ["Se cotiza caso por caso; DatosPrivados cobra comisión por derivación."],
    price: "A cotizar",
    dependsOn: "Abogado socio.",
    source: `${ESTRATEGIA} §5.2`,
    addedAt: "2026-11-14",
  },
  {
    id: "libro-reclamaciones-incluido",
    title: "Libro de Reclamaciones (LibroDigital.pe) dentro del plan",
    status: "planificado",
    summary:
      "Dos obligaciones peruanas en un solo pago y un solo panel. Nadie en el mercado lo une a la protección de datos.",
    details: [
      "Pro: incluido.",
      "Básico: +S/ 99 al año (KOM cobra S/ 125 + IGV; Legaly S/ 290).",
      "El banco de datos «Libro de Reclamaciones» se declara automáticamente.",
    ],
    price: "Incluido en Pro · +S/ 99/año en Básico",
    source: `${ESTRATEGIA} §4 idea 1`,
    addedAt: "2026-11-14",
  },
  {
    id: "escaner-web-librodigital",
    title: "Escáner de la web del cliente (ya existe en LibroDigital)",
    status: "idea",
    summary:
      "Usar en DatosPrivados el escáner de librodigital.pe/revisar-mi-web y sumarle lo que falte de privacidad: cookies y píxeles, formularios sin aviso, enlace a la política.",
    details: [
      "Captación gratuita compartida por los dos productos.",
      "El resultado llena «Herramientas» (proveedores y países) automáticamente.",
      "Solo analiza páginas públicas que el cliente indica; nunca envía formularios ni recoge datos personales.",
    ],
    source: `${ESTRATEGIA} §4 idea 5`,
    addedAt: "2026-11-14",
  },
  {
    id: "capacitacion-personal",
    title: "Capacitación del personal con constancia",
    status: "idea",
    summary: "Curso corto con evaluación y constancia en PDF, guardada en evidencias.",
    details: [
      "El reglamento pide capacitación según el rol, al ingresar y al menos una vez al año (art. 46.2, a verificar en la auditoría).",
      "Motivo anual para renovar; candidato para el plan Pro.",
    ],
    source: `${ESTRATEGIA} §4 idea 6`,
    addedAt: "2026-11-14",
  },
  {
    id: "consentimientos-whatsapp",
    title: "Registro de consentimientos por WhatsApp («SÍ ACEPTO» / «BAJA»)",
    status: "idea",
    summary: "Evidencia de consentimiento donde venden las MYPE peruanas; la carga de la prueba es del negocio.",
    details: [
      "Empezar con carga manual (captura o exportación del chat).",
      "La API oficial de WhatsApp cobra por conversación: evaluar después.",
    ],
    source: `${ESTRATEGIA} §4 idea 7`,
    addedAt: "2026-11-14",
  },
  {
    id: "carpeta-fiscalizacion",
    title: "Carpeta de fiscalización en un clic",
    status: "idea",
    summary: "Documentos, fichas, ARCO, incidentes y evidencias en un solo paquete, listo para el inspector.",
    details: ["La exportación ya existe: empaquetarla y presentarla como «Carpeta de fiscalización»."],
    source: `${ESTRATEGIA} §4 idea 8`,
    addedAt: "2026-11-14",
  },
  {
    id: "perfil-publico-verificable",
    title: "Perfil público de privacidad con QR",
    status: "idea",
    summary: "Página y QR para que clientes B2B y pasarelas vean que la empresa tiene su expediente al día.",
    details: [
      "Base: la página pública /p/[slug].",
      "Nunca llamarlo «certificado»: la ANPD no certifica; sería publicidad engañosa.",
    ],
    source: `${ESTRATEGIA} §4 idea 9`,
    addedAt: "2026-11-14",
  },
  {
    id: "canal-contadores",
    title: "Canal de contadores",
    status: "idea",
    summary: "El contador es el asesor de confianza de la MYPE: precio mayorista y comisión por derivar al abogado.",
    details: ["Base: la página /contadores."],
    source: `${ESTRATEGIA} §4 idea 10`,
    addedAt: "2026-11-14",
  },
  {
    id: "banner-cookies",
    title: "Banner de cookies simple con registro",
    status: "idea",
    summary: "Script ligero para la web del cliente, en lugar de iubenda o Termly.",
    details: ["Prioridad baja: primero el escáner y el Libro de Reclamaciones."],
    source: `${ESTRATEGIA} §4 idea 11`,
    addedAt: "2026-11-14",
  },
];

/** Agrupa la hoja de ruta por estado, en el orden de ROADMAP_STATUSES, sin grupos vacíos. */
export function roadmapByStatus(items: RoadmapItem[] = ROADMAP) {
  return ROADMAP_STATUSES.map((status) => ({ status, items: items.filter((item) => item.status === status) })).filter(
    (group) => group.items.length > 0
  );
}
