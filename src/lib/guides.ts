/**
 * Guías públicas (/guias/[slug]). Cada una responde una búsqueda concreta del
 * comprador: el administrador, el gerente o el contador de una empresa peruana.
 *
 * Regla de redacción: solo se usan cifras, plazos y artículos que ya están
 * verificados en el producto (glossary.ts, legal-faq.ts, sector-legal.ts,
 * documents.ts). Si una guía necesita un dato nuevo, primero se verifica ahí.
 * Admite **negritas** y [enlaces](/ruta-interna).
 */

export type GuideTable = { head: string[]; rows: string[][] };

export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  table?: GuideTable;
  bullets?: string[];
  steps?: string[];
};

import { SALES_BANDS } from "./sector-legal";

export type Guide = {
  slug: string;
  /** Título de la pestaña y del resultado en Google (≈60 caracteres). */
  title: string;
  h1: string;
  description: string;
  /** Resumen visible al inicio: la respuesta corta a la búsqueda. */
  answer: string;
  updated: string;
  sections: GuideSection[];
  faq?: Array<{ q: string; a: string }>;
  related: string[];
};

const UPDATED = "2026-11-03";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

/** «2026-11-30» → «30 de noviembre de 2026», sin pasar por Date (evita desfases de zona horaria). */
function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

const BAND_NAME: Record<string, string> = {
  grande: "Gran empresa",
  mediana: "Mediana empresa",
  pequena: "Pequeña empresa",
  micro: "Microempresa",
};

/** Calendario del ODP leído de SALES_BANDS (la misma fuente que usa el panel), de la fecha más cercana a la más lejana. */
const ODP_ROWS = [...SALES_BANDS]
  .sort((a, b) => a.odpFrom.localeCompare(b.odpFrom))
  .map((band) => [BAND_NAME[band.id], band.label, band.hint.split(": ")[1] ?? band.hint, longDate(band.odpFrom)]);

export const GUIDES: Guide[] = [
  {
    slug: "inscribir-banco-de-datos-personales",
    title: "Cómo inscribir un banco de datos personales ante la ANPD (2026)",
    h1: "Cómo inscribir los bancos de datos personales de tu empresa",
    description:
      "Paso a paso para inscribir en el SIPDP los bancos de datos de clientes, trabajadores y cámaras de tu empresa. Gratis desde 2025, con aprobación automática.",
    answer:
      "Cada lista de personas que maneja tu empresa (clientes, trabajadores, postulantes, cámaras, proveedores) es un banco de datos y se inscribe en el Registro Nacional de Protección de Datos Personales a través del portal **sipdp.minjus.gob.pe**. El trámite es virtual, gratuito y de aprobación automática desde el 31 de marzo de 2025. No inscribirlos es una infracción leve: de 0.5 a 5 UIT.",
    updated: UPDATED,
    sections: [
      {
        heading: "Qué cuenta como banco de datos",
        paragraphs: [
          "Un banco de datos no tiene nada que ver con un banco financiero. Es cualquier conjunto ordenado de datos de personas que tu empresa usa para una finalidad: un Excel, un ERP, un CRM, una carpeta de legajos o el disco del sistema de cámaras.",
          "La regla práctica es **un banco por finalidad**, no por archivo. Si la planilla está en el sistema de RR.HH. y los legajos en papel, ambos forman el mismo banco «Trabajadores». Si usas los datos de clientes para vender y también para enviar promociones, son dos bancos con bases legales distintas.",
        ],
        bullets: [
          "**Colaboradores y postulantes**: contratos, planilla, legajos, CVs recibidos, descansos médicos.",
          "**Clientes**: datos para vender, facturar, entregar y dar posventa.",
          "**Prospectos y marketing**: listas para enviar ofertas, que requieren consentimiento.",
          "**Videovigilancia**: grabaciones de cámaras de seguridad.",
          "**Proveedores**: contactos de personas naturales o representantes de empresas proveedoras.",
          "**Libro de Reclamaciones**, si atiendes a consumidores finales.",
        ],
      },
      {
        heading: "Qué datos pide la ficha de inscripción",
        paragraphs: [
          "Antes de entrar al portal, ten a mano por cada banco la misma información que luego va en tu Política de Privacidad. Si la ficha y la política no coinciden, el expediente pierde valor ante una fiscalización. Imprime el [checklist de inscripción](/plantillas/checklist-inscripcion-sipdp) y parte del [modelo de política de privacidad](/plantillas/politica-de-privacidad).",
        ],
        bullets: [
          "Nombre del banco y **finalidad** concreta (para qué usas los datos).",
          "**Categorías de datos**: identificación, contacto, laborales, económicos, sensibles.",
          "**Base legal**: ejecución de contrato, obligación legal o consentimiento.",
          "**Canal de recolección**: formulario web, WhatsApp, presencial, portal de empleo.",
          "**Plazo de conservación**, por ejemplo 5 años para comprobantes por prescripción tributaria.",
          "**Destinatarios y encargados**: contador externo, courier, nube, software de planillas.",
          "Si hay **transferencia internacional**: Google Workspace, Microsoft 365, AWS u otros servidores fuera del Perú.",
        ],
      },
      {
        heading: "Paso a paso",
        steps: [
          "Haz el inventario: lista cada conjunto de datos de personas y agrúpalos por finalidad.",
          "Completa la ficha de cada banco con los campos de arriba. Declara solo lo que realmente tienes.",
          "Ingresa a **sipdp.minjus.gob.pe** con el RUC de la empresa y registra cada banco.",
          "Guarda el código de inscripción que te asigna el sistema y la constancia con fecha.",
          "Actualiza tu Política de Privacidad para que mencione los mismos bancos, finalidades y destinatarios.",
          "Vuelve a la ficha cada vez que cambie algo: un nuevo proveedor en la nube, un nuevo canal o una nueva finalidad.",
        ],
      },
      {
        heading: "Errores frecuentes en empresas",
        bullets: [
          "Inscribir «Clientes» y olvidar **Colaboradores y postulantes**, que casi siempre incluye datos sensibles (descansos médicos, huella para asistencia).",
          "No declarar las **cámaras**, aunque el cartel de videovigilancia esté colgado.",
          "Marcar «sin transferencia internacional» usando correo de Google o Microsoft.",
          "Inscribir y no volver a actualizar cuando la empresa crece o cambia de software.",
        ],
      },
      {
        heading: "Cómo lo resuelve DatosPrivados",
        paragraphs: [
          "Eliges tu sector y el sistema propone los bancos típicos con la ficha ya redactada. Ajustas lo que no aplica, copias cada campo al portal SIPDP y registras el código obtenido. La política y el documento de seguridad se generan con los mismos datos, así que nunca se contradicen. Mira cómo se ve en la [demo](/demo).",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cuánto cuesta inscribir un banco de datos?",
        a: "Nada. Desde el 31 de marzo de 2025 la inscripción es gratuita y de aprobación automática.",
      },
      {
        q: "¿Una empresa pequeña también tiene que inscribirlos?",
        a: "Sí. La Ley 29733 no exime a nadie por tamaño. Lo que cambia con el tamaño son otros plazos, como el del Oficial de Datos Personales.",
      },
      {
        q: "¿Qué pasa si no los inscribo?",
        a: "Es una infracción leve: multa de 0.5 a 5 UIT (de S/ 2,750 a S/ 27,500 con la UIT 2026).",
      },
    ],
    related: ["datos-personales-de-trabajadores", "multas-ley-29733", "ds-016-2024-jus-reglamento"],
  },
  {
    slug: "multas-ley-29733",
    title: "Multas por la Ley 29733 en 2026: montos en soles y ejemplos",
    h1: "Multas de la ANPD por incumplir la Ley 29733",
    description:
      "Cuánto multa la ANPD en 2026: leves de S/ 2,750 a S/ 27,500, graves hasta S/ 275,000 y muy graves hasta S/ 550,000. Qué infracciones son las más comunes.",
    answer:
      "La Ley 29733 clasifica las infracciones en leves (0.5 a 5 UIT), graves (5 a 50 UIT) y muy graves (50 a 100 UIT). Con la UIT 2026 de S/ 5,500, eso va de **S/ 2,750 a S/ 550,000**. No inscribir bancos de datos, responder tarde una solicitud ARCO o no notificar un incidente cuando corresponde son infracciones leves.",
    updated: UPDATED,
    sections: [
      {
        heading: "Escala de multas (art. 39 de la Ley 29733)",
        bullets: [
          "**Leve:** 0.5 a 5 UIT, es decir, de S/ 2,750 a S/ 27,500.",
          "**Grave:** 5 a 50 UIT, hasta S/ 275,000.",
          "**Muy grave:** 50 a 100 UIT, hasta S/ 550,000.",
        ],
        paragraphs: [
          "Valores calculados con la UIT 2026 (S/ 5,500). Estima tu exposición con la [calculadora de multas](/herramientas/calculadora-multas-ley-29733).",
        ],
      },
      {
        heading: "Las infracciones que más se repiten en empresas",
        bullets: [
          "No haber inscrito los bancos de datos en el SIPDP.",
          "Responder fuera de plazo, o no responder, una solicitud de derechos ARCO.",
          "No notificar a la ANPD un incidente de seguridad cuando correspondía.",
          "Enviar publicidad por WhatsApp, SMS o correo sin consentimiento previo.",
          "Grabar con cámaras sin cartel informativo o conservar las grabaciones más tiempo del permitido.",
          "Tratar datos sensibles (salud, biometría) sin consentimiento por escrito.",
        ],
      },
      {
        heading: "Por qué el tamaño de la empresa no te protege",
        paragraphs: [
          "La ley aplica a cualquier organización que trate datos de personas. Una empresa con trabajadores en planilla trata datos laborales y, casi siempre, datos sensibles: descansos médicos, exámenes ocupacionales o huella para el control de asistencia. Un solo reclamo de un extrabajador o de un cliente puede iniciar un procedimiento.",
          "Lo que más pesa en una fiscalización es poder **demostrar** lo que hiciste: fichas inscritas, política publicada, documento de seguridad, registro de solicitudes y de incidentes, con fechas.",
        ],
      },
      {
        heading: "Cómo reducir el riesgo",
        steps: [
          "Inscribe todos tus bancos de datos ([guía](/guias/inscribir-banco-de-datos-personales)).",
          "Publica la Política de Privacidad y ten un canal para solicitudes ARCO con control de plazos ([guía](/guias/derechos-arco-plazos)).",
          "Ten un Documento de Seguridad y un procedimiento para incidentes de 48 horas ([guía](/guias/incidente-de-seguridad-48-horas)).",
          "Pide consentimiento separado para publicidad ([guía](/guias/consentimiento-publicidad-whatsapp)).",
          "Guarda evidencia fechada de cada paso.",
        ],
      },
    ],
    faq: [
      {
        q: "¿La multa se calcula por cada infracción?",
        a: "Cada infracción se evalúa dentro de su rango. Por eso conviene corregir todos los puntos, no solo el que motivó la denuncia.",
      },
    ],
    related: ["inscribir-banco-de-datos-personales", "derechos-arco-plazos", "incidente-de-seguridad-48-horas"],
  },
  {
    slug: "ds-016-2024-jus-reglamento",
    title: "DS 016-2024-JUS: qué cambió con el nuevo reglamento de la Ley 29733",
    h1: "DS 016-2024-JUS: el nuevo reglamento de protección de datos, explicado",
    description:
      "Qué cambió para las empresas con el Decreto Supremo 016-2024-JUS: registro gratuito, aviso de incidentes en 48 horas, Oficial de Datos Personales, plazos ARCO y publicidad.",
    answer:
      "El DS N.° 016-2024-JUS, publicado en El Peruano el 30 de noviembre de 2024, reemplazó al reglamento anterior de la Ley 29733. Para una empresa, los cambios clave son: **registro de bancos gratuito**, **aviso a la ANPD en 48 horas** ante incidentes relevantes, el **Oficial de Datos Personales** con calendario por tamaño, plazos ARCO precisos y reglas estrictas para la publicidad.",
    updated: UPDATED,
    sections: [
      {
        heading: "1. Inscripción gratuita y automática",
        paragraphs: [
          "Desde el 31 de marzo de 2025 inscribir bancos de datos en el SIPDP no cuesta nada y se aprueba de forma automática. Ya no hay excusa de costo o de trámite para no tenerlos inscritos. Ver [cómo inscribirlos](/guias/inscribir-banco-de-datos-personales).",
        ],
      },
      {
        heading: "2. Incidentes de seguridad: 48 horas",
        paragraphs: [
          "Si un incidente expone muchos datos, puede afectar a muchas personas, involucra datos sensibles o causa un daño evidente, la empresa debe notificar a la ANPD en un máximo de 48 horas (art. 34). Todos los incidentes, se notifiquen o no, deben quedar documentados (art. 35). Ver [la guía de incidentes](/guias/incidente-de-seguridad-48-horas).",
        ],
      },
      {
        heading: "3. Oficial de Datos Personales",
        paragraphs: [
          "Es obligatorio si tratas grandes volúmenes de datos o datos sensibles como parte de tu actividad, o si eres entidad pública (art. 37). El plazo depende de las ventas anuales: grandes empresas desde noviembre de 2025, **medianas desde noviembre de 2026**, pequeñas desde noviembre de 2027 y microempresas desde el 30 de noviembre de 2028. Calendario completo en [Plazos del DS 016-2024-JUS](/guias/plazos-ds-016-2024-jus); detalle del cargo en [la guía del ODP](/guias/oficial-de-datos-personales).",
        ],
      },
      {
        heading: "4. Plazos ARCO en días hábiles",
        paragraphs: [
          "Información: 8 días. Rectificación, cancelación, oposición y revocación: 10 días. Acceso y portabilidad: 20 días. Se cuentan desde el día siguiente de recibida la solicitud (art. 69) y, salvo información, pueden ampliarse una vez avisando antes del vencimiento (art. 71). Ver [la guía ARCO](/guias/derechos-arco-plazos).",
        ],
      },
      {
        heading: "5. Publicidad solo con consentimiento previo",
        paragraphs: [
          "Enviar publicidad por WhatsApp, SMS, llamadas o correo exige consentimiento previo obtenido de forma directa (art. 26). Quien se niega o revoca debe ser atendido en un máximo de 10 días. Ver [la guía de consentimiento](/guias/consentimiento-publicidad-whatsapp).",
        ],
      },
      {
        heading: "6. Datos sensibles y en línea",
        bullets: [
          "Los datos sensibles (salud, biometría, entre otros) requieren consentimiento por escrito, con firma manuscrita, digital o electrónica (art. 8).",
          "Las cookies y píxeles publicitarios identifican al navegante (identificador en línea, art. 2.4): necesitan consentimiento previo.",
          "Los sistemas con datos personales deben tener usuarios individuales y registro de accesos (art. 46).",
        ],
      },
    ],
    related: ["plazos-ds-016-2024-jus", "oficial-de-datos-personales", "incidente-de-seguridad-48-horas"],
  },
  {
    slug: "derechos-arco-plazos",
    title: "Derechos ARCO en Perú: plazos para responder y cómo hacerlo",
    h1: "Derechos ARCO: plazos y cómo responder una solicitud",
    description:
      "Plazos ARCO del DS 016-2024-JUS en días hábiles: 8 días información, 10 días rectificación, cancelación u oposición, 20 días acceso. Cómo responder sin errores.",
    answer:
      "Cualquier persona puede pedir a tu empresa acceder, rectificar, cancelar u oponerse al uso de sus datos. Tienes **8 días hábiles** para pedidos de información, **10** para rectificación, cancelación, oposición o revocación, y **20** para acceso y portabilidad, contados desde el día siguiente de recibida la solicitud. Responder tarde es una infracción leve.",
    updated: UPDATED,
    sections: [
      {
        heading: "Qué significa cada derecho",
        bullets: [
          "**Acceso:** saber qué datos tienes de la persona, de dónde los obtuviste y con quién los compartes.",
          "**Rectificación:** corregir un dato inexacto o incompleto.",
          "**Cancelación:** suprimir sus datos cuando ya no son necesarios o no hay base legal.",
          "**Oposición:** impedir un uso concreto, por ejemplo la publicidad.",
        ],
      },
      {
        heading: "Plazos (días hábiles, art. 69 del DS 016-2024-JUS)",
        bullets: [
          "**Información:** 8 días.",
          "**Rectificación, cancelación u oposición:** 10 días.",
          "**Revocación del consentimiento:** 10 días.",
          "**Acceso y portabilidad:** 20 días.",
        ],
        paragraphs: [
          "Los días hábiles excluyen sábados, domingos y feriados nacionales. Salvo en pedidos de información, puedes ampliar el plazo **una vez** por el mismo periodo, avisando antes de que venza (art. 71).",
        ],
      },
      {
        heading: "Cómo responder bien",
        steps: [
          "Registra la solicitud con fecha y hora de recepción, aunque llegue por WhatsApp o en persona.",
          "Verifica la identidad del solicitante sin pedir más datos de los necesarios.",
          "Busca sus datos en todos los bancos: clientes, marketing, cámaras, planilla si fue trabajador.",
          "Si cancelas, conserva **bloqueados** los datos que exige la ley (por ejemplo, comprobantes por 5 años ante SUNAT).",
          "Responde por escrito, en lenguaje claro, y guarda la constancia de envío.",
        ],
      },
      {
        heading: "Por qué fallan las empresas",
        paragraphs: [
          "Las solicitudes llegan a cualquier canal: el correo de ventas, el WhatsApp de un vendedor o la recepción. Si nadie las centraliza, el plazo vence sin que el responsable se entere. DatosPrivados te da un formulario público con número de ticket y un contador de plazo que descuenta feriados del Perú, con plantillas de respuesta para cada derecho.",
        ],
      },
    ],
    related: ["multas-ley-29733", "consentimiento-publicidad-whatsapp", "inscribir-banco-de-datos-personales"],
  },
  {
    slug: "incidente-de-seguridad-48-horas",
    title: "Incidente de seguridad de datos: aviso a la ANPD en 48 horas",
    h1: "Qué hacer ante un incidente de seguridad de datos personales",
    description:
      "Robo de laptop, hackeo o correo enviado a quien no debía: cuándo notificar a la ANPD en 48 horas, qué documentar y cómo avisar a los afectados.",
    answer:
      "Un incidente es cualquier robo, hackeo, pérdida o error que expone datos personales. Si expone muchos datos, puede afectar a muchas personas, involucra datos sensibles o causa un daño evidente, debes **notificar a la ANPD en máximo 48 horas** (art. 34 del DS 016-2024-JUS). Todos los incidentes deben quedar documentados, aunque no se notifiquen (art. 35).",
    updated: UPDATED,
    sections: [
      {
        heading: "Ejemplos de incidentes en una empresa",
        bullets: [
          "Roban o pierden una laptop sin clave con la base de clientes o la planilla.",
          "Hackean el correo corporativo o la tienda online.",
          "Envías un correo masivo con todos los destinatarios visibles en «Para:».",
          "Un extrabajador se lleva la lista de clientes.",
          "Se envían resultados o boletas de pago al número de WhatsApp equivocado.",
        ],
      },
      {
        heading: "Las primeras 48 horas",
        steps: [
          "**Contén:** cambia contraseñas, cierra sesiones y anota la hora exacta de detección.",
          "**Evalúa:** cuántas personas, qué datos, si hay datos sensibles o riesgo de fraude.",
          "**Notifica a la ANPD** si se cumple alguno de los criterios del art. 34. Si fue un incidente digital, también al CNSD.",
          "**Avisa a los afectados** en lenguaje claro cuando el incidente los afecta.",
          "**Documenta todo**: qué pasó, qué hiciste y por qué decidiste notificar o no.",
        ],
      },
      {
        heading: "Cómo lo resuelve DatosPrivados",
        paragraphs: [
          "Registras el incidente y empieza a correr el reloj de 48 horas. Un cuestionario te dice si corresponde notificar y genera el borrador para la ANPD y el comunicado a los afectados. Todo queda en tu expediente con fecha, que es lo que la ANPD pedirá ver.",
        ],
      },
    ],
    related: ["ds-016-2024-jus-reglamento", "multas-ley-29733", "datos-personales-de-trabajadores"],
  },
  {
    slug: "oficial-de-datos-personales",
    title: "Oficial de Datos Personales: ¿es obligatorio para tu empresa?",
    h1: "Oficial de Datos Personales (ODP): cuándo es obligatorio",
    description:
      "Quién debe designar un Oficial de Datos Personales según el DS 016-2024-JUS y desde cuándo: medianas empresas desde noviembre de 2026, pequeñas desde 2027.",
    answer:
      "El Oficial de Datos Personales es obligatorio si tu empresa trata **grandes volúmenes de datos** o **datos sensibles** como parte de su actividad, o si es entidad pública (art. 37 del DS 016-2024-JUS). El plazo depende de las ventas anuales: medianas empresas desde **noviembre de 2026**, pequeñas desde noviembre de 2027 y microempresas desde el 30 de noviembre de 2028.",
    updated: UPDATED,
    sections: [
      {
        heading: "¿Tu empresa está obligada?",
        bullets: [
          "**Sí, probablemente**, si tu actividad principal trata datos sensibles: clínicas, laboratorios, centros de salud ocupacional, colegios con fichas de salud, gimnasios con biometría.",
          "**Posiblemente**, si tratas grandes volúmenes de datos como parte del negocio, por ejemplo una plataforma digital con miles de usuarios o una financiera.",
          "**Probablemente no**, si solo tratas datos de clientes para vender y de tus trabajadores para la planilla. Aun así, conviene designar un responsable interno.",
        ],
      },
      {
        heading: "Calendario por tamaño (ventas anuales)",
        paragraphs: ["Con las ventas de cada tamaño en [Plazos del DS 016-2024-JUS](/guias/plazos-ds-016-2024-jus)."],
        bullets: [
          "Grandes empresas (más de 2,300 UIT): desde noviembre de 2025.",
          "**Medianas empresas: desde noviembre de 2026.**",
          "Pequeñas empresas: desde noviembre de 2027.",
          "Microempresas: desde el 30 de noviembre de 2028.",
        ],
      },
      {
        heading: "Qué hace el ODP",
        paragraphs: [
          "Supervisa que la empresa cumpla la Ley 29733, asesora a las áreas que tratan datos, atiende a la ANPD y coordina las solicitudes ARCO y los incidentes. Puede ser una persona de la empresa o un servicio externo, pero necesita información ordenada para hacer su trabajo.",
          "Mientras no te toque, basta con un responsable interno y un correo de contacto para privacidad.",
        ],
      },
      {
        heading: "Cómo ayuda DatosPrivados",
        paragraphs: [
          "El ODP, interno o externo, trabaja sobre el expediente: bancos inscritos, documentos vigentes, solicitudes con plazos y registro de incidentes. DatosPrivados mantiene ese expediente al día y exportable, para que el oficial no empiece de cero.",
        ],
      },
    ],
    related: ["ds-016-2024-jus-reglamento", "incidente-de-seguridad-48-horas", "multas-ley-29733"],
  },
  {
    slug: "datos-personales-de-trabajadores",
    title: "Datos personales de trabajadores: qué exige la Ley 29733",
    h1: "Protección de datos de tus trabajadores y postulantes",
    description:
      "Planilla, legajos, descansos médicos, huella digital y CVs: qué exige la Ley 29733 a las empresas con trabajadores, cuánto tiempo conservar y qué documentos firmar.",
    answer:
      "Si tienes trabajadores o recibes CVs, tienes al menos un banco de datos que inscribir: **Colaboradores y postulantes**. Suele incluir datos sensibles (descansos médicos, exámenes ocupacionales, huella para asistencia), así que exige consentimiento por escrito para lo que no venga impuesto por ley, medidas de seguridad reforzadas y un aviso de privacidad para el personal.",
    updated: UPDATED,
    sections: [
      {
        heading: "Qué datos de trabajadores trata tu empresa",
        bullets: [
          "Identificación y contacto, contrato, cuenta bancaria, régimen de pensiones.",
          "Remuneraciones e ingresos: pueden considerarse sensibles.",
          "**Descansos médicos y exámenes ocupacionales**: datos de salud, sensibles.",
          "**Huella o rostro** para el control de asistencia: datos biométricos, sensibles.",
          "Grabaciones de cámaras en el centro de trabajo.",
          "CVs de **postulantes**, que forman parte del mismo banco aunque nunca los contrates.",
        ],
      },
      {
        heading: "Qué tienes que tener",
        steps: [
          "Inscribir el banco **Colaboradores y postulantes** en el SIPDP.",
          "Entregar un **aviso de privacidad para trabajadores** y obtener consentimiento escrito para los usos que no exige la ley.",
          "Firmar **compromisos de confidencialidad** con quienes acceden a datos de clientes o del personal.",
          "Firmar **cláusulas de encargo** con el estudio contable, el software de planillas o la empresa de salud ocupacional.",
          "Definir **plazos de conservación**: planillas y legajos durante el vínculo y 5 años desde el cese.",
          "Restringir el acceso a legajos y descansos médicos al personal de RR.HH. que lo necesita.",
        ],
      },
      {
        heading: "Control de asistencia con huella o rostro",
        paragraphs: [
          "La biometría es un dato sensible. Si la usas para marcar asistencia, necesitas consentimiento expreso y, por el riesgo, una evaluación de impacto. Ofrece una alternativa cuando sea posible y nunca reutilices la huella para otro fin.",
        ],
      },
      {
        heading: "Cuando el trabajador se va",
        paragraphs: [
          "Retira sus accesos el mismo día, recupera equipos y conserva el legajo solo por el plazo legal. Si después pide la cancelación de sus datos, bloquea lo que debes conservar por ley y elimina el resto. Ver [plazos ARCO](/guias/derechos-arco-plazos).",
        ],
      },
    ],
    related: ["inscribir-banco-de-datos-personales", "videovigilancia-camaras-de-seguridad", "oficial-de-datos-personales"],
  },
  {
    slug: "videovigilancia-camaras-de-seguridad",
    title: "Cámaras de seguridad y Ley 29733: cartel, plazos y registro",
    h1: "Cámaras de seguridad en tu empresa: qué exige la ley",
    description:
      "Cartel de videovigilancia tamaño A4, conservación de 30 a 60 días, inscripción del banco y zonas prohibidas: lo que exige la Directiva de la ANPD a las empresas.",
    answer:
      "Las grabaciones de tus cámaras son un banco de datos: debes **inscribirlo** en el SIPDP, colocar un **cartel visible** en los accesos a las zonas vigiladas y conservar las grabaciones **entre 30 y 60 días**, salvo que una autoridad las pida. No se graban baños, vestidores ni conversaciones.",
    updated: UPDATED,
    sections: [
      {
        heading: "El cartel de videovigilancia",
        bullets: [
          "Visible en los accesos a cada zona vigilada, con el ícono de una cámara.",
          "Amarillo o de un color que contraste con la pared, de al menos 297 × 210 mm (tamaño A4).",
          "Debe decir quién es el responsable del banco de datos y dónde ejercer los derechos ARCO.",
          "Lo que no entra en el cartel va en un **informativo adicional**, impreso o en línea.",
          "Si las cámaras están dentro de un vehículo, el cartel va dentro de la unidad.",
        ],
      },
      {
        heading: "Reglas de uso",
        bullets: [
          "Conserva las grabaciones entre 30 y 60 días y luego elimínalas, salvo pedido de una autoridad.",
          "No grabes zonas privadas (baños, vestidores) ni audio de conversaciones.",
          "Limita quién puede ver y exportar las grabaciones, y registra cada exportación.",
          "Si el proveedor de seguridad monitorea las cámaras, firma con él una cláusula de encargo.",
        ],
      },
      {
        heading: "Cómo lo resuelve DatosPrivados",
        paragraphs: [
          "El banco «Videovigilancia» viene con la ficha redactada y el cartel se genera con los datos de tu empresa, listo para imprimir. Ver todas las [plantillas](/plantillas).",
        ],
      },
    ],
    related: ["inscribir-banco-de-datos-personales", "datos-personales-de-trabajadores", "multas-ley-29733"],
  },
  {
    slug: "consentimiento-publicidad-whatsapp",
    title: "Consentimiento para publicidad por WhatsApp y correo en Perú",
    h1: "Cómo pedir consentimiento para enviar publicidad",
    description:
      "Qué exige el art. 26 del DS 016-2024-JUS para enviar promociones por WhatsApp, SMS, llamadas o correo, y cómo dejar evidencia del consentimiento.",
    answer:
      "Vender o atender a alguien **no** te autoriza a enviarle publicidad. Necesitas su consentimiento previo, expreso e informado, obtenido de forma directa (art. 26 del DS 016-2024-JUS). Quien se niega o revoca debe salir de tus listas en un máximo de **10 días**.",
    updated: UPDATED,
    sections: [
      {
        heading: "Las reglas",
        bullets: [
          "Casilla de publicidad **separada, opcional y sin marcar** en formularios y contratos.",
          "Nunca condiciones la compra o el servicio a aceptar publicidad.",
          "Por WhatsApp: pide un «SÍ ACEPTO» antes de agregar a alguien a listas de difusión y guarda la evidencia con fecha.",
          "Para correo comercial aplica además la Ley N.° 28493.",
          "Los datos comprados o «heredados» de otra empresa no traen el consentimiento contigo.",
        ],
      },
      {
        heading: "Evidencia que debes poder mostrar",
        bullets: [
          "Texto exacto que aceptó la persona y la fecha.",
          "Canal por el que lo aceptó (web, formulario físico, WhatsApp).",
          "Registro de bajas y la fecha en que se atendieron.",
        ],
      },
      {
        heading: "Cómo lo resuelve DatosPrivados",
        paragraphs: [
          "Tienes textos de consentimiento listos para formularios, WhatsApp y correos, y un revisor que detecta casillas premarcadas o condicionadas antes de publicarlas. Las bajas entran como solicitudes con plazo controlado.",
        ],
      },
    ],
    related: ["derechos-arco-plazos", "multas-ley-29733", "ds-016-2024-jus-reglamento"],
  },
  {
    slug: "plazos-ds-016-2024-jus",
    title: "Plazos del DS 016-2024-JUS: calendario de obligaciones por tamaño",
    h1: "Plazos del DS 016-2024-JUS: calendario de obligaciones para tu empresa",
    description:
      "Fechas del Oficial de Datos Personales por tamaño de empresa y plazos permanentes: 48 horas para incidentes, 8, 10 y 20 días hábiles para solicitudes ARCO.",
    answer:
      "El DS 016-2024-JUS se publicó el 30 de noviembre de 2024 y rige desde marzo de 2025 con obligaciones progresivas. Lo que se escalona por tamaño es el **Oficial de Datos Personales**: grandes empresas desde el 30 de noviembre de 2025, **medianas desde el 30 de noviembre de 2026**, pequeñas desde el 30 de noviembre de 2027 y microempresas desde el 30 de noviembre de 2028. El resto (inscripción, solicitudes ARCO e incidentes) no espera esas fechas.",
    updated: UPDATED,
    sections: [
      {
        heading: "Calendario del Oficial de Datos Personales",
        paragraphs: [
          "El Oficial de Datos Personales (art. 37) solo es obligatorio si tu actividad trata **datos sensibles** o **grandes volúmenes de datos**, o si eres entidad pública. Si te aplica, la fecha depende de tus ventas anuales, medidas en UIT (la UIT 2026 es de S/ 5,500).",
        ],
        table: {
          head: ["Tamaño", "Ventas anuales", "Equivale a, aprox.", "Obligatorio desde"],
          rows: ODP_ROWS,
        },
      },
      {
        heading: "Plazos que corren siempre",
        paragraphs: [
          "Estos plazos no dependen del tamaño de la empresa. Los de las solicitudes ARCO se cuentan en días hábiles desde el día siguiente de recibida la solicitud (art. 69).",
        ],
        table: {
          head: ["Obligación", "Plazo", "Base"],
          rows: [
            ["Notificar a la ANPD un incidente de seguridad relevante", "48 horas", "Art. 34"],
            ["Documentar todo incidente, aunque no se notifique", "Siempre", "Art. 35"],
            ["Responder una solicitud de información", "8 días hábiles", "Art. 69"],
            ["Rectificación, cancelación u oposición", "10 días hábiles", "Art. 69"],
            ["Revocación del consentimiento", "10 días hábiles", "Art. 69"],
            ["Acceso y portabilidad", "20 días hábiles", "Art. 69"],
            ["Ampliar el plazo (salvo información): una sola vez, avisando antes de que venza", "Por el mismo periodo", "Art. 71"],
            ["Dar de baja a quien rechaza o revoca la publicidad", "Máximo 10 días", "Art. 26.5"],
          ],
        },
      },
      {
        heading: "Fechas del reglamento",
        table: {
          head: ["Fecha", "Hito"],
          rows: [
            ["30 de noviembre de 2024", "Publicación del DS 016-2024-JUS en El Peruano."],
            ["Marzo de 2025", "El reglamento rige, con obligaciones progresivas."],
            ["31 de marzo de 2025", "La inscripción de bancos de datos en el SIPDP pasa a ser gratuita y de aprobación automática."],
          ],
        },
      },
      {
        heading: "Plazos de conservación que conviene tener a mano",
        table: {
          head: ["Dato", "Plazo habitual"],
          rows: [
            ["Comprobantes y registros de ventas", "5 años desde la operación"],
            ["Planillas y legajos de trabajadores", "Durante el vínculo y 5 años desde el cese"],
            ["Hojas del Libro de Reclamaciones", "Mínimo 2 años desde el reclamo"],
            ["Grabaciones de cámaras de seguridad", "Entre 30 y 60 días"],
          ],
        },
      },
      {
        heading: "Qué hacer según tu situación",
        steps: [
          "Identifica tu tamaño por ventas anuales y la fecha de la tabla que te corresponde.",
          "Verifica si tu actividad trata datos sensibles o grandes volúmenes: ahí el Oficial de Datos Personales te obliga.",
          "Inscribe tus bancos de datos ya: es gratis y no depende de esos calendarios ([guía](/guias/inscribir-banco-de-datos-personales)).",
          "Ten el canal ARCO y el procedimiento de incidentes funcionando antes de que lleguen ([ARCO](/guias/derechos-arco-plazos), [incidentes](/guias/incidente-de-seguridad-48-horas)).",
          "Estima tu exposición con la [calculadora de multas](/herramientas/calculadora-multas-ley-29733) y mide tu punto de partida con el [diagnóstico](/diagnostico).",
        ],
      },
    ],
    faq: [
      {
        q: "¿Mi microempresa tiene plazo hasta 2028?",
        a: "Solo para el Oficial de Datos Personales, y únicamente si tu actividad lo hace obligatorio. Inscribir tus bancos de datos, responder solicitudes ARCO y notificar incidentes no esperan a esa fecha.",
      },
      {
        q: "¿Cómo sé si soy micro, pequeña o mediana empresa?",
        a: "Por tus ventas anuales en UIT: hasta 150 UIT es micro; más de 150 y hasta 1,700, pequeña; más de 1,700 y hasta 2,300, mediana; más de 2,300, grande.",
      },
      {
        q: "¿Qué pasa si incumplo un plazo?",
        a: "Responder tarde una solicitud ARCO o no notificar un incidente cuando corresponde son infracciones leves, con multa de 0.5 a 5 UIT.",
      },
    ],
    related: ["oficial-de-datos-personales", "ds-016-2024-jus-reglamento", "multas-ley-29733"],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
