import type { Company, DataBank, DocumentKind } from "./db";
import { SECTORS, findSectorByLabel } from "./sectors";
import { fact } from "@/legal/facts";

/**
 * Perfil legal por rubro.
 *
 * Los 63 rubros del onboarding se agrupan en familias que comparten el mismo
 * marco legal (datos sensibles, menores, normas sectoriales, plazos de
 * conservación). Los generadores de `documents.ts` leen este perfil para que el
 * mismo borrador no sea idéntico para una clínica, un colegio y una bodega.
 *
 * Reglas de redacción de este archivo:
 *  - Solo se citan normas cuya existencia está verificada. Cuando el plazo o el
 *    detalle depende de una norma sectorial que cambia, el texto remite a ella en
 *    lugar de inventar una cifra.
 *  - Las referencias al DS N.° 016-2024-JUS son al texto publicado en El Peruano
 *    el 30 de noviembre de 2024.
 */

export type LegalFamily =
  | "comercio"
  | "venta_online"
  | "alimentos"
  | "nocturno"
  | "hospedaje"
  | "viajes"
  | "pasajeros"
  | "carga"
  | "salud"
  | "bienestar"
  | "farmacia"
  | "educacion_menores"
  | "educacion_adultos"
  | "profesional"
  | "rrhh"
  | "seguros"
  | "inmobiliaria"
  | "vehiculos"
  | "condominio"
  | "finanzas"
  | "plataforma"
  | "fintech"
  | "medios"
  | "seguridad_privada"
  | "organizacion"
  | "industria";

export type Applicability = "esencial" | "recomendado" | "opcional";

export type RetentionRow = { data: string; term: string; basis: string };
export type RiskRow = { risk: string; probability: string; impact: string; level: string };

export type SectorLegalProfile = {
  family: LegalFamily;
  title: string;
  /** Variante de Términos y Condiciones: servicio digital o venta de bienes/servicios. */
  terms: "plataforma" | "venta";
  /** Atiende a consumidores finales (Libro de Reclamaciones, Ley N.° 29571). */
  consumer: boolean;
  /** Captura datos por web, app o redes. */
  web: boolean;
  /** La actividad principal trata datos sensibles (art. 37.1.3 del DS 016-2024-JUS). */
  sensitive: boolean;
  minors: boolean;
  /** Usa fotos o videos de personas (Código Civil, art. 15). */
  imageUse: boolean;
  biometric: boolean;
  /** Puede ser sujeto obligado ante la UIF-Perú (verificar según actividad). */
  splaft: boolean;
  /** Trata datos por encargo de otros o aloja datos de terceros. */
  processor: boolean;
  /** Tiene plantilla numerosa de trabajadores. */
  staffHeavy: boolean;
  /** Toma decisiones o perfila con IA como parte del servicio. */
  automated: boolean;
  norms: string[];
  retention: RetentionRow[];
  consent: { purpose: string; data: string };
  security: string[];
  risks: RiskRow[];
  /** Plazo de conservación de videovigilancia (Directiva 01-2020-JUS/DGTAIPD). */
  cctvDays: string;
};

const CONSUMER_NORM =
  "Código de Protección y Defensa del Consumidor (Ley N.° 29571): deber de información, Libro de Reclamaciones y prohibición de métodos comerciales agresivos.";
const ADVERTISING_NORM =
  "Publicidad por WhatsApp, SMS, llamadas o correo: solo con consentimiento previo obtenido de forma directa (art. 26 del DS N.° 016-2024-JUS) y, para correo comercial, Ley N.° 28493. Quien se niega o revoca debe ser atendido en un máximo de 10 días (art. 26.5).";
const TAX_ROW: RetentionRow = {
  data: "Comprobantes y registros de ventas",
  term: "5 años desde la operación",
  basis: "Prescripción tributaria (Código Tributario) más un año de margen",
};
const COMPLAINT_ROW: RetentionRow = {
  data: "Hojas del Libro de Reclamaciones",
  term: "Mínimo 2 años desde el reclamo",
  basis: "Reglamento del Libro de Reclamaciones (DS N.° 011-2011-PCM)",
};
const MARKETING_ROW: RetentionRow = {
  data: "Listas de promociones",
  term: "Hasta que la persona se dé de baja o revoque",
  basis: "Consentimiento (art. 10 y 26 del DS N.° 016-2024-JUS)",
};
const STAFF_ROW: RetentionRow = {
  data: "Planillas y legajos de trabajadores",
  term: "Durante el vínculo y 5 años desde el cese",
  basis: "Obligaciones laborales y tributarias",
};

const BASE: SectorLegalProfile = {
  family: "comercio",
  title: "Comercio y servicios generales",
  terms: "venta",
  consumer: true,
  web: false,
  sensitive: false,
  minors: false,
  imageUse: false,
  biometric: false,
  splaft: false,
  processor: false,
  staffHeavy: false,
  automated: false,
  norms: [CONSUMER_NORM, ADVERTISING_NORM],
  retention: [TAX_ROW, COMPLAINT_ROW, MARKETING_ROW],
  consent: {
    purpose: "[indicar finalidad específica]",
    data: "[indicar los datos sensibles que se tratarán]",
  },
  security: [
    "Archivo de comprobantes y fichas de clientes en mueble con llave; caja y computadora con clave propia.",
  ],
  risks: [
    { risk: "Pérdida o robo de equipos con listas de clientes", probability: "Media", impact: "Medio", level: "Medio" },
    { risk: "Envío de publicidad sin consentimiento", probability: "Media", impact: "Medio", level: "Medio" },
  ],
  cctvDays: "30 a 60 días calendario",
};

function profile(family: LegalFamily, title: string, overrides: Partial<SectorLegalProfile>): SectorLegalProfile {
  return { ...BASE, family, title, ...overrides };
}

const HEALTH_NORMS = [
  "Ley General de Salud (Ley N.° 26842): el acto médico y la historia clínica son reservados; Ley N.° 29414 (derechos de los usuarios de servicios de salud, incluido el consentimiento informado y el acceso a la historia clínica).",
  "NTS N.° 139-MINSA/2018/DGAIN (RM N.° 214-2018/MINSA): gestión, custodia, archivo activo/pasivo y eliminación de historias clínicas. Ley N.° 30024 (Registro Nacional de Historias Clínicas Electrónicas) si usas historia electrónica.",
  "Los datos de salud son sensibles: consentimiento por escrito, firma manuscrita, digital o electrónica (art. 8 del DS N.° 016-2024-JUS). Tu actividad principal trata datos sensibles, por lo que el Oficial de Datos Personales es obligatorio en el calendario del art. 37 y la Disposición Complementaria Final Primera.",
];
const HEALTH_RETENTION: RetentionRow = {
  data: "Historias clínicas",
  term: "Según la NTS N.° 139-MINSA/2018/DGAIN (archivo activo y pasivo). No se purgan con la regla general",
  basis: "Norma técnica de salud; la política de privacidad remite a ella",
};

export const FAMILIES: Record<LegalFamily, SectorLegalProfile> = {
  comercio: profile("comercio", "Comercio y servicios generales", {}),
  venta_online: profile("venta_online", "Venta online, redes y delivery", {
    web: true,
    imageUse: false,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Venta a distancia: informa precio final con IGV, identidad del proveedor, plazos de entrega y cambios antes de cobrar; el Libro de Reclamaciones virtual debe ser visible en la web o app.",
      "Cookies y píxeles de publicidad identifican al navegante (identificador en línea, art. 2.4 del DS N.° 016-2024-JUS): requieren consentimiento previo.",
    ],
    retention: [
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
      { data: "Direcciones de entrega", term: "Hasta 90 días tras la entrega, salvo cliente recurrente que lo autorice", basis: "Minimización" },
    ],
    security: [
      "Pasarela de pago certificada: tu negocio no guarda el número completo de la tarjeta.",
      "Doble verificación en la tienda online, el correo y las redes de ventas.",
    ],
    risks: [
      { risk: "Listas de difusión de WhatsApp armadas con contactos sin consentimiento", probability: "Alta", impact: "Medio", level: "Alto" },
      { risk: "Cuenta de la tienda o de redes tomada por terceros", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  alimentos: profile("alimentos", "Alimentos y bebidas", {
    staffHeavy: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Reservas, delivery y eventos: usa los datos del pedido solo para el pedido; la lista de difusión necesita su propio permiso.",
      "Cámaras de salón y cocina: cartel visible; no grabes baños ni vestuarios del personal.",
    ],
    risks: [
      { risk: "Cámaras de cocina usadas para control laboral sin informar al personal", probability: "Media", impact: "Medio", level: "Medio" },
      { risk: "Pedidos con dirección y teléfono visibles para repartidores externos", probability: "Media", impact: "Medio", level: "Medio" },
    ],
  }),
  nocturno: profile("nocturno", "Bar, discoteca y entretenimiento", {
    staffHeavy: true,
    imageUse: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Control de edad en el ingreso: la comercialización de alcohol a menores está prohibida (Ley N.° 28681). Si escaneas o fotocopias el DNI, solo guarda lo necesario para verificar la edad y bórralo.",
      "Fotos y videos del local con clientes: requieren autorización (Código Civil, art. 15).",
    ],
    risks: [
      { risk: "Copia del DNI de clientes guardada sin necesidad", probability: "Alta", impact: "Alto", level: "Alto" },
      { risk: "Publicación de fotos de clientes en redes sin permiso", probability: "Alta", impact: "Medio", level: "Alto" },
    ],
  }),
  hospedaje: profile("hospedaje", "Hospedaje", {
    web: true,
    staffHeavy: true,
    norms: [
      CONSUMER_NORM,
      "Registro de huéspedes exigido por el Reglamento de Establecimientos de Hospedaje (DS N.° 001-2015-MINCETUR); conserva solo lo que la norma pide.",
      "Huéspedes extranjeros y menores de edad: datos de pasaporte y de los padres o tutores solo para el registro y la autorización de ingreso.",
      "Plataformas de reservas (Booking, Airbnb, etc.) son responsables propios de los datos que recogen: coordina quién informa qué.",
    ],
    retention: [
      { data: "Registro de huéspedes", term: "Según el Reglamento de Establecimientos de Hospedaje y hasta 5 años por obligación tributaria", basis: "DS N.° 001-2015-MINCETUR y normativa tributaria" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    risks: [
      { risk: "Copias de pasaportes y DNI en recepción sin custodia", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Envío de datos de huéspedes a terceros sin base legal", probability: "Baja", impact: "Alto", level: "Medio" },
    ],
  }),
  viajes: profile("viajes", "Agencia de viajes y turismo", {
    web: true,
    imageUse: true,
    splaft: false,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Reservas con aerolíneas, hoteles y operadores en el exterior son transferencias internacionales: infórmalas (art. 6.1.7) y asegura garantías (arts. 18 a 21 del DS N.° 016-2024-JUS).",
      "Datos de salud (alergias, movilidad reducida) para un viaje son sensibles: pide autorización por escrito.",
    ],
    risks: [
      { risk: "Datos de pasaporte compartidos por WhatsApp con proveedores del exterior", probability: "Alta", impact: "Alto", level: "Alto" },
    ],
  }),
  pasajeros: profile("pasajeros", "Transporte de pasajeros", {
    norms: [
      CONSUMER_NORM,
      "Manifiesto y registro de pasajeros según el Reglamento Nacional de Administración de Transportes (DS N.° 017-2009-MTC), en lo que corresponda a tu modalidad.",
      "Cámaras dentro del vehículo: cartel visible dentro de la unidad (criterio de la ANPD en la Opinión Consultiva N.° 045-2021-JUS/DGTAIPD) y sin audio salvo que lo informes.",
      "Localización GPS de conductores: informa la finalidad y no la uses fuera de horario laboral.",
    ],
    risks: [
      { risk: "GPS usado para vigilar al conductor fuera de la jornada", probability: "Media", impact: "Medio", level: "Medio" },
    ],
  }),
  carga: profile("carga", "Courier, mudanzas y carga", {
    processor: true,
    web: true,
    norms: [
      CONSUMER_NORM,
      "Guías de remisión y comprobantes electrónicos (SUNAT) contienen datos de remitente y destinatario: se conservan por exigencia tributaria.",
      "Si repartes pedidos de otras empresas, eres su encargado del tratamiento: firma la cláusula de encargo y no uses las direcciones para tu propia publicidad (art. 31 del DS N.° 016-2024-JUS).",
    ],
    retention: [
      TAX_ROW,
      COMPLAINT_ROW,
      { data: "Direcciones y teléfonos de destinatarios de otras empresas", term: "Máximo 2 años desde el último encargo, salvo norma que obligue a más", basis: "Art. 31.2 del DS N.° 016-2024-JUS" },
    ],
    risks: [
      { risk: "Repartidores con listas de destinatarios en sus celulares personales", probability: "Alta", impact: "Medio", level: "Alto" },
    ],
  }),
  salud: profile("salud", "Servicios de salud", {
    sensitive: true,
    minors: true,
    imageUse: true,
    staffHeavy: true,
    automated: false,
    norms: [
      ...HEALTH_NORMS,
      "Telesalud y teleconsulta (D. Leg. N.° 1490): el consentimiento y la seguridad de la plataforma de videollamada son parte del tratamiento.",
      "Salud mental: reserva reforzada (Ley N.° 30947, Ley de Salud Mental). No compartas notas de sesión con terceros, ni con el empleador o familiares sin autorización expresa.",
    ],
    retention: [HEALTH_RETENTION, TAX_ROW, COMPLAINT_ROW],
    consent: {
      purpose:
        "brindarme la atención de salud contratada, elaborar y custodiar mi historia clínica, coordinar con laboratorios o profesionales que intervengan y facturar el servicio",
      data: "datos de salud física y mental, antecedentes, diagnósticos, recetas, resultados de exámenes e imágenes clínicas",
    },
    security: [
      "Historias clínicas físicas en archivo con llave y registro de quién las retira; historias electrónicas con usuario individual y registro de accesos (art. 46 del DS N.° 016-2024-JUS).",
      "Los resultados de laboratorio se entregan solo al paciente o a quien él autorice por escrito; no por grupos de WhatsApp.",
      "Equipos de diagnóstico por imágenes y estaciones de trabajo con borrado seguro antes de su baja o reparación (art. 50.1.5).",
    ],
    risks: [
      { risk: "Acceso de personal no asistencial a historias clínicas", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Resultados enviados a un número de WhatsApp equivocado", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Fotografías clínicas guardadas en celulares personales", probability: "Alta", impact: "Alto", level: "Alto" },
    ],
  }),
  bienestar: profile("bienestar", "Bienestar, estética y gimnasios", {
    sensitive: false,
    imageUse: true,
    biometric: true,
    minors: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Fichas de evaluación (alergias, lesiones, cuestionario de aptitud física, tratamientos) y fotos antes/después contienen datos de salud: son sensibles y requieren autorización por escrito (art. 8 del DS N.° 016-2024-JUS).",
      "Huella dactilar o reconocimiento facial para el ingreso son datos biométricos, sensibles. Si hay alternativa menos intrusiva (tarjeta o código), úsala.",
      "Adolescentes de 14 a 17 años pueden consentir por sí mismos si se les informa en lenguaje comprensible; menores de 14 requieren a sus padres o tutores (art. 22).",
      "Uso de fotos y videos con fines publicitarios: autorización expresa (Código Civil, art. 15).",
    ],
    retention: [
      { data: "Fichas de evaluación y tratamientos", term: "Mientras dure la relación y hasta 2 años después, salvo que una norma sanitaria exija más", basis: "Finalidad y defensa de reclamaciones" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
      { data: "Huella o plantilla facial de acceso", term: "Hasta la baja del socio; se borra el mismo día", basis: "Minimización de datos sensibles" },
    ],
    consent: {
      purpose:
        "evaluar mi estado físico, indicarme y ejecutar el plan o tratamiento contratado, registrar mi progreso y emitir los comprobantes",
      data: "datos de salud (antecedentes, alergias, lesiones, medidas y fotografías de evaluación) y, si corresponde, datos biométricos de acceso",
    },
    security: [
      "Las fichas de evaluación no se dejan en recepción: se guardan bajo llave o en el sistema con acceso solo del profesional.",
      "Las fotos antes/después se guardan en el sistema del negocio, no en el celular personal del terapeuta.",
    ],
    risks: [
      { risk: "Fotos antes/después publicadas en redes sin autorización", probability: "Alta", impact: "Alto", level: "Alto" },
      { risk: "Huellas dactilares almacenadas sin cifrado", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  farmacia: profile("farmacia", "Farmacias, boticas y ópticas", {
    sensitive: false,
    norms: [
      CONSUMER_NORM,
      "Ley N.° 29459 y DS N.° 014-2011-SA (productos farmacéuticos y establecimientos farmacéuticos): recetas y registros de dispensación.",
      "Las recetas, el historial de compra de medicamentos y la graduación óptica revelan salud: tratamiento sensible; no los uses para publicidad sin autorización escrita.",
      ADVERTISING_NORM,
    ],
    retention: [
      { data: "Recetas y registros de dispensación", term: "Según la normativa sanitaria aplicable al establecimiento farmacéutico", basis: "Ley N.° 29459 y su reglamento" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    consent: {
      purpose: "dispensarme los productos indicados en mi receta o prescripción, mantener mi historial de atención y emitir el comprobante",
      data: "datos de salud contenidos en recetas, prescripciones ópticas y el historial de productos dispensados",
    },
    risks: [
      { risk: "Campañas de publicidad por tipo de medicamento comprado", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  educacion_menores: profile("educacion_menores", "Educación con menores de edad", {
    sensitive: false,
    minors: true,
    imageUse: true,
    staffHeavy: true,
    web: true,
    norms: [
      CONSUMER_NORM,
      "Los menores de 14 años necesitan el consentimiento de sus padres o tutores; de 14 a 17 pueden consentir según su capacidad con información en lenguaje comprensible (art. 22 del DS N.° 016-2024-JUS). No se pide a los menores datos del grupo familiar más allá de la identidad y dirección de sus padres (art. 23).",
      "Ley N.° 28044 (Ley General de Educación) y Ley N.° 29719 (convivencia sin violencia): registro de incidencias de violencia escolar, que contiene datos de menores y debe ser reservado.",
      "Cámaras en colegios: conservación de 30 días como máximo según la Directiva 01-2020-JUS/DGTAIPD; no en baños ni vestuarios.",
      "Fotos y videos de actividades: autorización de los padres para publicarlos (Código Civil, art. 15).",
      "Plataformas de aula virtual y aplicaciones educativas del exterior son transferencias internacionales (arts. 18 a 21).",
    ],
    retention: [
      { data: "Nóminas, actas y certificados", term: "Según la normativa del sector educación; los certificados no se eliminan", basis: "Ley N.° 28044 y normas del MINEDU" },
      { data: "Fichas de salud y alergias del alumno", term: "Mientras dure la matrícula", basis: "Finalidad" },
      { data: "Pensiones y comprobantes", term: "5 años desde la operación", basis: "Prescripción tributaria más margen" },
      COMPLAINT_ROW,
      { data: "Video de cámaras", term: "Máximo 30 días", basis: "Directiva 01-2020-JUS/DGTAIPD (instituciones educativas)" },
    ],
    consent: {
      purpose:
        "gestionar la matrícula, el seguimiento académico y de salud básico del estudiante, la comunicación con la familia y el cobro de pensiones",
      data: "datos del estudiante, de sus padres o apoderados y, cuando corresponda, información de salud (alergias, condiciones médicas, atención de emergencias)",
    },
    security: [
      "Los grupos de WhatsApp de aula no se usan para publicar notas, deudas ni datos de salud de alumnos.",
      "Las listas de morosidad no se publican en paneles ni pasillos.",
    ],
    risks: [
      { risk: "Publicación de fotos de alumnos en redes sin autorización de los padres", probability: "Alta", impact: "Alto", level: "Alto" },
      { risk: "Lista de alumnos con deudas expuesta en un panel", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Uso de aplicaciones educativas gratuitas que recolectan datos de menores", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  educacion_adultos: profile("educacion_adultos", "Educación de adultos y cursos online", {
    web: true,
    imageUse: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Si hay participantes menores de 18 años, aplica el art. 22 del DS N.° 016-2024-JUS (de 14 a 17 consienten por sí mismos; menores de 14, sus padres).",
      "Clases grabadas: avisa al inicio que se graba, para qué y cuánto tiempo se guardará la grabación.",
    ],
    retention: [
      { data: "Registros académicos y certificados", term: "Según la normativa educativa aplicable; los certificados no se eliminan", basis: "Normas del sector educación" },
      { data: "Grabaciones de clases", term: "Máximo 6 meses salvo autorización", basis: "Minimización" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    risks: [
      { risk: "Grabaciones de clases con la imagen de los alumnos publicadas", probability: "Media", impact: "Medio", level: "Medio" },
    ],
  }),
  profesional: profile("profesional", "Servicios profesionales y consultoría", {
    processor: true,
    norms: [
      CONSUMER_NORM,
      "Secreto profesional y deber de confidencialidad (art. 17 de la Ley N.° 29733): lo que te confía el cliente no se comparte con terceros ni se usa para otra cosa.",
      "Si manejas datos de planilla, clientes o trabajadores de tus clientes, eres su encargado del tratamiento (arts. 31 a 33 del DS N.° 016-2024-JUS): firma la cláusula de encargo y devuelve o elimina los datos como máximo 2 años después del último encargo.",
      "Según tu actividad puedes ser sujeto obligado ante la UIF-Perú (Ley N.° 27693 y DS N.° 020-2017-JUS): revisa la relación publicada por la SBS.",
    ],
    retention: [
      { data: "Expedientes y papeles de trabajo de clientes", term: "Los que fije la norma de tu profesión; datos de encargos para terceros, máximo 2 años desde el último encargo", basis: "Art. 31.2 del DS N.° 016-2024-JUS y normas profesionales" },
      TAX_ROW,
      { data: "Registro de operaciones (si eres sujeto obligado)", term: "10 años desde la operación", basis: "Art. 24 del DS N.° 020-2017-JUS" },
    ],
    risks: [
      { risk: "Archivos de clientes enviados por correo personal o WhatsApp", probability: "Alta", impact: "Alto", level: "Alto" },
      { risk: "Dependientes que llevan carpetas de clientes a casa", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  rrhh: profile("rrhh", "Reclutamiento y recursos humanos", {
    sensitive: false,
    processor: true,
    web: true,
    automated: true,
    norms: [
      "CV, entrevistas y evaluaciones psicológicas pueden revelar datos sensibles (salud, afiliación sindical, vida familiar): no los pidas si el puesto no los exige.",
      "Si usas filtros automáticos o IA para descartar candidatos, informa que existen decisiones automatizadas y ofrece revisión humana (arts. 6.1.8 y 87 del DS N.° 016-2024-JUS).",
      "Eres encargado del tratamiento de las empresas que te contratan: arts. 31 a 33 y cláusula de encargo.",
      "Postulantes no seleccionados: elimina sus datos o pide autorización para conservarlos en una bolsa de trabajo.",
    ],
    retention: [
      { data: "CV de postulantes no seleccionados", term: "6 meses, o más con autorización para bolsa de trabajo", basis: "Minimización y consentimiento" },
      { data: "Datos tratados por encargo de empresas clientes", term: "Máximo 2 años desde el último encargo", basis: "Art. 31.2 del DS N.° 016-2024-JUS" },
      TAX_ROW,
    ],
    consent: {
      purpose: "evaluar mi candidatura, contactar a mis referencias y compartir mi perfil con la empresa contratante",
      data: "datos de mi CV, resultados de evaluaciones y, solo si el puesto lo requiere, información de salud",
    },
    risks: [
      { risk: "Descarte automático de candidatos sin intervención humana", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "CV circulando por grupos de WhatsApp de reclutadores", probability: "Alta", impact: "Medio", level: "Alto" },
    ],
  }),
  seguros: profile("seguros", "Corredores de seguros", {
    sensitive: true,
    web: true,
    splaft: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Ley N.° 29946 (Ley del Contrato de Seguro) y Ley N.° 26702 (supervisión de la SBS): declaraciones de asegurabilidad y siniestros contienen datos de salud, sensibles.",
      "Eres sujeto obligado ante la UIF-Perú si la normativa lo indica para tu actividad: verifica en la relación de la SBS (Ley N.° 27693).",
      "Compartir datos con aseguradoras y reaseguradoras del exterior es una transferencia internacional (arts. 18 a 21).",
    ],
    retention: [
      { data: "Pólizas y declaraciones", term: "Mientras dure la póliza y hasta 5 años después", basis: "Defensa de reclamaciones y prescripción" },
      { data: "Registro de operaciones (si eres sujeto obligado)", term: "10 años desde la operación", basis: "Art. 24 del DS N.° 020-2017-JUS" },
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    consent: {
      purpose: "evaluar y gestionar mi póliza, comunicar mis datos a las aseguradoras que cotizan o emiten el seguro y gestionar siniestros",
      data: "datos de salud contenidos en declaraciones de asegurabilidad, informes médicos y reclamos",
    },
    risks: [
      { risk: "Declaraciones de salud enviadas por correo sin cifrar", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  inmobiliaria: profile("inmobiliaria", "Inmobiliarias y construcción", {
    web: true,
    splaft: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Las inmobiliarias y constructoras pueden ser sujetos obligados ante la UIF-Perú (Ley N.° 27693; relación de la SBS): conserva el registro de operaciones y la debida diligencia por 10 años.",
      "Fotos de interiores con personas o documentos a la vista no se publican en avisos.",
    ],
    retention: [
      { data: "Contratos y registro de operaciones", term: "10 años desde la operación (si eres sujeto obligado) o 5 años como mínimo", basis: "Art. 24 del DS N.° 020-2017-JUS y prescripción tributaria" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    risks: [
      { risk: "Copias de DNI y estados de cuenta de compradores en celulares de vendedores", probability: "Alta", impact: "Alto", level: "Alto" },
    ],
  }),
  vehiculos: profile("vehiculos", "Venta de autos, motos y repuestos", {
    web: true,
    splaft: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "La compraventa de vehículos puede obligarte a informar a la UIF-Perú (Ley N.° 27693; relación de la SBS) y a conservar el registro de operaciones por 10 años.",
      "Verificación crediticia: consulta centrales de riesgo solo con autorización o fuente legal (Ley N.° 27489).",
    ],
    retention: [
      { data: "Contratos de compraventa y financiamiento", term: "10 años (si eres sujeto obligado) o 5 años como mínimo", basis: "Art. 24 del DS N.° 020-2017-JUS y normativa tributaria" },
      TAX_ROW,
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    risks: [
      { risk: "Copias de DNI y licencias archivadas sin control", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  condominio: profile("condominio", "Condominios y edificios", {
    consumer: false,
    imageUse: false,
    norms: [
      "Ley N.° 27157 y su Reglamento (DS N.° 008-2000-MTC): la junta de propietarios y su administración tratan datos de propietarios, residentes y visitantes.",
      "Registro de visitantes: pide solo nombre y documento; no fotocopies el DNI y borra el cuaderno cuando venza su plazo.",
      "No publiques listas de morosos en áreas comunes con nombre y monto: revela la situación económica de las personas.",
      "Cámaras de áreas comunes: cartel visible y conservación de 30 a 60 días (Directiva 01-2020-JUS/DGTAIPD).",
    ],
    retention: [
      { data: "Registro de visitantes", term: "30 a 90 días", basis: "Minimización" },
      { data: "Actas de junta y cobros de cuotas", term: "5 años desde su fecha", basis: "Prescripción y obligaciones contables" },
      { data: "Video de cámaras", term: "30 a 60 días calendario", basis: "Directiva 01-2020-JUS/DGTAIPD" },
    ],
    risks: [
      { risk: "Cuaderno de visitas visible para cualquiera en portería", probability: "Alta", impact: "Medio", level: "Alto" },
      { risk: "Lista de morosos pegada en el ascensor", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  finanzas: profile("finanzas", "Financieras, cooperativas y casas de cambio", {
    web: true,
    splaft: true,
    automated: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Sujetos obligados ante la UIF-Perú según tu actividad (Ley N.° 27693, Ley N.° 29038 y DS N.° 020-2017-JUS): debida diligencia del cliente y registro de operaciones por 10 años.",
      "Cooperativas de ahorro y crédito, entidades financieras y empresas supervisadas: normativa de la SBS (Ley N.° 26702; Ley N.° 30822 para cooperativas) y secreto bancario.",
      "Centrales de riesgo (Ley N.° 27489): el reporte de morosidad exige informar al deudor y respetar los plazos de la ley.",
      "Los datos de solvencia y capacidad de pago están protegidos por el principio de proporcionalidad; los ingresos económicos pueden considerarse sensibles en la Ley N.° 29733: trátalos con las medidas más altas.",
    ],
    retention: [
      { data: "Registro de operaciones y debida diligencia", term: "10 años desde la operación", basis: "Art. 24 del DS N.° 020-2017-JUS" },
      { data: "Solicitudes de crédito rechazadas", term: "Máximo 2 años", basis: "Minimización" },
      COMPLAINT_ROW,
      MARKETING_ROW,
    ],
    consent: {
      purpose: "evaluar mi solicitud de crédito o la operación requerida, verificar mi identidad y cumplir las obligaciones de prevención de lavado de activos",
      data: "datos de ingresos, situación patrimonial, historial crediticio y documentos de identidad",
    },
    risks: [
      { risk: "Consulta de centrales de riesgo sin autorización del titular", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Decisiones de crédito automatizadas sin revisión humana", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  plataforma: profile("plataforma", "Software y plataformas digitales", {
    terms: "plataforma",
    web: true,
    processor: true,
    automated: true,
    norms: [
      "Servicio digital con cuentas de usuario: aplican los arts. 28 a 30 del DS N.° 016-2024-JUS (tratamiento por medios tecnológicos tercerizados) y el art. 46 (seguridad en plataformas y aplicaciones, con registros de interacción conservados por mínimo 2 años).",
      "Cuando alojas datos de tus clientes empresas, eres su encargado: no puedes asumir la titularidad de esos datos ni usarlos para tus fines (art. 29.2) y debes eliminarlos al terminar el servicio (art. 30.4).",
      "Inteligencia artificial: Ley N.° 31814 y su reglamento. Si tomas decisiones o perfilas, informa (art. 6.1.8) y permite intervención humana (art. 87). Una EIPD es recomendable (art. 40).",
      "Menores de 14 años en servicios digitales: consentimiento de sus padres o tutores y esfuerzos razonables de verificación (art. 25).",
      "Si no tienes establecimiento en el Perú, designa un representante en el país e infórmalo en la política (art. 7).",
    ],
    retention: [
      { data: "Cuenta y perfil", term: "Mientras la cuenta esté activa y hasta 5 años tras su cierre", basis: "Ejecución del contrato y defensa de reclamaciones" },
      { data: "Registros de interacción con datos personales", term: "Mínimo 2 años", basis: "Art. 46.3 del DS N.° 016-2024-JUS" },
      { data: "Registros técnicos y errores", term: "30 días", basis: "Diagnóstico" },
      { data: "Copias de respaldo", term: "30 días rotativos", basis: "Recuperación ante desastres" },
      { data: "Datos tratados por encargo de clientes empresa", term: "Hasta el fin del servicio; supresión acreditada", basis: "Arts. 30.4 y 31.2" },
      { data: "Facturación y pagos", term: "5 años desde el último cobro", basis: "Obligaciones tributarias" },
      COMPLAINT_ROW,
    ],
    security: [
      "Registro continuo de acciones sobre datos personales (acceso, modificación, eliminación, importación, exportación) con cuentas, horas de inicio y cierre de sesión; legible y conservado 2 años (art. 46.3).",
      "Revisión semestral de privilegios de administradores y del personal de soporte (art. 46.1.c).",
      "Ambientes de prueba sin datos reales de usuarios.",
      "Plan de capacitación del personal según su rol (art. 46.2).",
    ],
    risks: [
      { risk: "Reidentificación de datos seudonimizados enviados a proveedores de IA", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Subencargados sin contrato de encargo", probability: "Alta", impact: "Alto", level: "Alto" },
      { risk: "Acceso del equipo de soporte a datos de usuarios sin registro", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  fintech: profile("fintech", "Apps de finanzas y contabilidad personal", {
    terms: "plataforma",
    web: true,
    processor: true,
    automated: true,
    norms: [
      "Los movimientos financieros del usuario no están en la lista del art. 2.6 del DS N.° 016-2024-JUS, pero los ingresos económicos figuran como dato sensible en la Ley N.° 29733 y los estados de cuenta pueden revelar salud (farmacias, clínicas): trátalos con medidas reforzadas y consentimiento por escrito electrónico claro.",
      "Procesamiento de recibos, estados de cuenta o audio con proveedores de IA del exterior: transferencia internacional (arts. 18 a 21) y encargo con prohibición de entrenamiento con los datos del usuario.",
      "Decisiones automatizadas o categorización con IA: informa y permite corrección humana (arts. 6.1.8 y 87). EIPD recomendable (art. 40).",
      "No eres entidad financiera si solo organizas los datos del usuario: dilo en los Términos para no inducir a error al consumidor (Ley N.° 29571).",
    ],
    retention: [
      { data: "Registros financieros del usuario", term: "Mientras la cuenta esté activa y hasta 5 años tras su cierre", basis: "Defensa de reclamaciones y obligaciones contables" },
      { data: "Recibos e imágenes", term: "Hasta que el usuario los elimine o cierre la cuenta", basis: "Finalidad" },
      { data: "Audio de voz", term: "Transitorio: se elimina tras la transcripción", basis: "Minimización" },
      { data: "Registros de interacción con datos personales", term: "Mínimo 2 años", basis: "Art. 46.3 del DS N.° 016-2024-JUS" },
      { data: "Invitaciones no aceptadas", term: "90 días", basis: "Minimización" },
      { data: "Facturación y pagos", term: "5 años desde el último cobro", basis: "Obligaciones tributarias" },
      COMPLAINT_ROW,
    ],
    consent: {
      purpose: "procesar mis recibos, estados de cuenta y movimientos para categorizarlos y mostrarme resúmenes",
      data: "datos de ingresos, gastos, comercios y, si aparecen en los documentos, referencias a salud",
    },
    security: [
      "Cifrado de descripciones y montos financieros en reposo; llaves separadas de la base de datos.",
      "Enmascaramiento de identificadores antes de enviar texto a un proveedor de IA.",
      "Registro continuo de interacciones con datos (art. 46.3), conservado 2 años.",
    ],
    risks: [
      { risk: "Reidentificación de datos seudonimizados enviados a IA", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Audio de voz enviado sin enmascarar a un proveedor externo", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Recibos con datos de salud de terceros en el banco de recibos", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  medios: profile("medios", "Medios, producción y creadores de contenido", {
    web: true,
    imageUse: true,
    consumer: true,
    norms: [
      CONSUMER_NORM,
      ADVERTISING_NORM,
      "Imagen y voz de terceros: no se aprovechan sin autorización expresa (Código Civil, art. 15). Pide cesión de derechos de imagen firmada a modelos, invitados y asistentes.",
      "Menores en contenidos: autorización de ambos padres o tutores y límites a la exposición (art. 22 del DS N.° 016-2024-JUS).",
      "Sorteos y concursos: los datos de participantes se usan solo para el sorteo salvo permiso aparte.",
    ],
    retention: [
      { data: "Cesiones de derechos de imagen", term: "Mientras el contenido siga publicado y 5 años después", basis: "Defensa de derechos" },
      TAX_ROW,
      MARKETING_ROW,
    ],
    risks: [
      { risk: "Contenido con rostros de terceros publicado sin cesión", probability: "Alta", impact: "Medio", level: "Alto" },
    ],
  }),
  seguridad_privada: profile("seguridad_privada", "Seguridad y vigilancia privada", {
    processor: true,
    staffHeavy: true,
    imageUse: false,
    norms: [
      "Servicios de seguridad privada: D. Leg. N.° 1213 y su reglamento. Si monitoreas cámaras o controlas accesos de otro negocio, eres su encargado del tratamiento (arts. 31 a 33 del DS N.° 016-2024-JUS).",
      "Libros de ocurrencias y registros de ingreso contienen datos de terceros: restringe su consulta y no los copies.",
      "Entrega de imágenes: solo a la autoridad que las pida por escrito (Policía, Fiscalía o juez) o al titular que ejerza su derecho de acceso.",
      "Cámaras y monitoreo: cartel visible y conservación de 30 a 60 días calendario (Directiva 01-2020-JUS/DGTAIPD).",
    ],
    retention: [
      { data: "Imágenes de videovigilancia", term: "30 a 60 días calendario; ampliación solo ante un incidente o requerimiento", basis: "Directiva 01-2020-JUS/DGTAIPD" },
      { data: "Libros de ocurrencias", term: "Según el contrato con el cliente; máximo 2 años desde el último servicio", basis: "Art. 31.2 del DS N.° 016-2024-JUS" },
      STAFF_ROW,
    ],
    risks: [
      { risk: "Agentes que fotografían con su celular a personas o placas", probability: "Media", impact: "Alto", level: "Alto" },
      { risk: "Entrega de videos a terceros sin requerimiento formal", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  organizacion: profile("organizacion", "ONG, asociaciones, iglesias y gremios", {
    consumer: false,
    sensitive: true,
    web: true,
    imageUse: true,
    norms: [
      "Datos de afiliación religiosa, política o sindical de tus miembros son sensibles. El art. 14 de la Ley N.° 29733 contempla una excepción para organizaciones sin fines de lucro con fines políticos, religiosos o sindicales sobre los datos de sus miembros, pero no pueden transferirse sin su consentimiento.",
      "Padrones de socios, donantes y voluntarios: informa para qué se usan y no los cedas a otras instituciones ni a campañas ajenas.",
      "Menores en actividades (catequesis, escuelas dominicales, campamentos): consentimiento de los padres (art. 22).",
      ADVERTISING_NORM,
    ],
    retention: [
      { data: "Padrón de socios o miembros", term: "Mientras sea miembro y hasta 2 años después", basis: "Finalidad y defensa" },
      { data: "Donaciones y comprobantes", term: "5 años desde la operación", basis: "Obligaciones tributarias" },
      MARKETING_ROW,
    ],
    consent: {
      purpose: "gestionar mi pertenencia, comunicarme actividades y registrar mi participación",
      data: "datos de afiliación religiosa, política o sindical y, si corresponde, datos de salud para actividades",
    },
    risks: [
      { risk: "Padrón de miembros compartido con grupos o campañas externas", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
  industria: profile("industria", "Industria, agro y manufactura", {
    consumer: false,
    staffHeavy: true,
    norms: [
      "Tu mayor volumen de datos personales es el de trabajadores y contratistas: aplican la Ley de Seguridad y Salud en el Trabajo (Ley N.° 29783) y los exámenes médicos ocupacionales, que son datos de salud sensibles.",
      "Control biométrico de asistencia (huella o rostro): dato sensible; informa la finalidad y ofrece una alternativa cuando sea posible.",
      "Cámaras de planta: cartel visible y respeto de las zonas de descanso y servicios higiénicos (Directiva 01-2020-JUS/DGTAIPD).",
    ],
    retention: [STAFF_ROW, TAX_ROW, { data: "Examen médico ocupacional", term: "Según la normativa de seguridad y salud en el trabajo", basis: "Ley N.° 29783" }],
    risks: [
      { risk: "Exámenes médicos de trabajadores en carpetas de acceso general", probability: "Media", impact: "Alto", level: "Alto" },
    ],
  }),
};

/**
 * Cada identificador de `sectors.ts` apunta a una familia. `verify-sector-legal`
 * (scripts) comprueba que no quede ningún rubro sin familia.
 */
export const SECTOR_FAMILY: Record<string, LegalFamily> = {
  bodega: "comercio",
  mercado: "comercio",
  ropa: "comercio",
  ecommerce: "venta_online",
  redes: "venta_online",
  ferreteria: "comercio",
  "tecnologia-tienda": "comercio",
  libreria: "comercio",
  farmacia: "farmacia",
  optica: "farmacia",
  mayorista: "comercio",
  autos: "vehiculos",
  restaurante: "alimentos",
  comedor: "alimentos",
  "food-truck": "alimentos",
  delivery: "venta_online",
  panaderia: "alimentos",
  bar: "nocturno",
  catering: "alimentos",
  hotel: "hospedaje",
  "agencia-viajes": "viajes",
  "transporte-pasajeros": "pasajeros",
  courier: "carga",
  clinica: "salud",
  policlinico: "salud",
  "casa-reposo": "salud",
  "salud-ocupacional": "salud",
  dental: "salud",
  psicologia: "salud",
  laboratorio: "salud",
  fisioterapia: "bienestar",
  veterinaria: "comercio",
  estetica: "bienestar",
  peluqueria: "comercio",
  gimnasio: "bienestar",
  colegio: "educacion_menores",
  academia: "educacion_menores",
  instituto: "educacion_adultos",
  "cursos-online": "educacion_adultos",
  contable: "profesional",
  abogados: "profesional",
  "agencia-marketing": "profesional",
  consultoria: "profesional",
  rrhh: "rrhh",
  seguros: "seguros",
  arquitectura: "profesional",
  inmobiliaria: "inmobiliaria",
  constructora: "inmobiliaria",
  condominio: "condominio",
  prestamos: "finanzas",
  cambio: "finanzas",
  software: "plataforma",
  "app-finanzas": "fintech",
  medios: "medios",
  taller: "comercio",
  confeccion: "comercio",
  mantenimiento: "comercio",
  lavanderia: "comercio",
  seguridad: "seguridad_privada",
  ong: "organizacion",
  industria: "industria",
  agro: "industria",
  otro: "comercio",
};

export function sectorFamilyOf(sectorId: string): LegalFamily | undefined {
  return SECTOR_FAMILY[sectorId];
}

/** Rubros sin familia asignada (debe ser una lista vacía). */
export function sectorsWithoutFamily(): string[] {
  return SECTORS.filter((sector) => !SECTOR_FAMILY[sector.id]).map((sector) => sector.id);
}

/** Perfil legal por identificador de rubro (para el onboarding, antes de guardar el rubro). */
export function sectorLegalProfileById(sectorId: string): SectorLegalProfile {
  const family = SECTOR_FAMILY[sectorId];
  return family ? FAMILIES[family] : BASE;
}

/** Perfil legal de la empresa a partir de su rubro; sin rubro conocido, el genérico. */
export function sectorLegalProfile(company: Pick<Company, "sector">): SectorLegalProfile {
  const sector = findSectorByLabel(company.sector);
  const family = sector ? SECTOR_FAMILY[sector.id] : undefined;
  return family ? FAMILIES[family] : BASE;
}

/* -------------------------------------------------------------------------- */
/*  Qué documentos le tocan a cada negocio                                    */
/* -------------------------------------------------------------------------- */

export type DocumentFit = { level: Applicability; reason: string };

const SENSITIVE_BANK = /salud|m[eé]dic|cl[ií]nic|paciente|biom[eé]tr|huella|sindical|gen[eé]tic|discapacidad|religi/i;

/** ¿El banco contiene datos sensibles según lo que declaró la empresa? */
export function isSensitiveBank(bank: Pick<DataBank, "name" | "data_categories">): boolean {
  return SENSITIVE_BANK.test(`${bank.name} ${bank.data_categories}`);
}

/**
 * Prioridad de cada documento para este negocio.
 * Es una recomendación orientativa: la obligación real depende de lo que el
 * negocio hace (por ejemplo, si no tiene cámaras no usará el cartel).
 */
export function documentFit(
  kind: DocumentKind,
  company: Pick<Company, "sector">,
  banks: Pick<DataBank, "name" | "data_categories" | "transfers">[]
): DocumentFit {
  const p = sectorLegalProfile(company);
  const sensitive = p.sensitive || banks.some(isSensitiveBank);
  const hasMinors = p.minors;
  switch (kind) {
    case "politica":
      return { level: "esencial", reason: "Todo negocio que recoge datos debe informar (art. 18 de la Ley y art. 6 del Reglamento)." };
    case "consentimiento":
      return {
        level: "esencial",
        reason: sensitive
          ? "Tu rubro trata datos sensibles: necesitas consentimiento por escrito (art. 8 del Reglamento)."
          : "Para publicidad y datos opcionales necesitas consentimiento separado (art. 26).",
      };
    case "seguridad":
      return { level: "esencial", reason: "Obligatorio, aprobado y con fecha cierta (art. 47 del Reglamento)." };
    case "clausulas":
      return { level: "esencial", reason: "Confidencialidad de tu equipo (art. 17 de la Ley) y, si tienes cámaras, el cartel obligatorio." };
    case "arco":
      return { level: "esencial", reason: "Debes poder atender derechos en 8, 10 y 20 días (art. 69) y dejar constancia." };
    case "aviso":
      return {
        level: p.web || p.consumer ? "esencial" : "recomendado",
        reason: "El aviso debe estar visible donde pides el dato (art. 6 del Reglamento).",
      };
    case "terminos":
      return p.terms === "plataforma"
        ? { level: "esencial", reason: "Tu servicio es digital: necesita contrato con el usuario, precio con IGV y reglas de renovación." }
        : { level: p.web ? "recomendado" : "opcional", reason: "Úsalo si vendes o cobras por web, redes o app." };
    case "cookies":
      return p.web
        ? { level: p.terms === "plataforma" ? "esencial" : "recomendado", reason: "Tu web o app usa identificadores en línea (art. 2.4): necesitan información y consentimiento." }
        : { level: "opcional", reason: "Solo si tienes web con analítica, píxeles o publicidad." };
    case "reclamaciones":
      return p.consumer
        ? { level: "esencial", reason: "Atiendes consumidores finales: Libro de Reclamaciones obligatorio (Ley N.° 29571)." }
        : { level: "opcional", reason: "Tu relación no es de consumo; solo si vendes a personas naturales." };
    case "retencion":
      return {
        level: sensitive || hasMinors ? "esencial" : "recomendado",
        reason: sensitive || hasMinors
          ? "Tratas datos sensibles o de menores: demuestra plazos y purgas (art. 47.3 y 31.2)."
          : "Demuestra minimización y complementa el Documento de Seguridad.",
      };
    case "encargo":
      return {
        level: p.processor ? "esencial" : "recomendado",
        reason: p.processor
          ? "Tratas datos por cuenta de otros o los alojas: debes tener contrato de encargo (arts. 31 a 33)."
          : "Cada proveedor que toque datos (contador, nube, courier) necesita cláusula de encargo (art. 31).",
      };
    case "eipd":
      return sensitive || hasMinors || p.automated || p.biometric
        ? { level: "recomendado", reason: "Facultativa pero recomendada para datos sensibles, menores, perfilado o IA (art. 40.1); atenúa sanciones (art. 125.4)." }
        : { level: "opcional", reason: "No es obligatoria; hazla si incorporas IA, perfilado o grandes volúmenes." };
    case "sectorial":
      return {
        level: sensitive || hasMinors || p.splaft ? "esencial" : "recomendado",
        reason: `Procedimientos, normas y riesgos propios de tu rubro (${p.title.toLowerCase()}).`,
      };
    case "trabajadores":
      return {
        level: p.staffHeavy ? "esencial" : "recomendado",
        reason: "Si tienes trabajadores, practicantes o recibes CVs, debes informarles el tratamiento de sus datos.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/*  Ventas anuales y calendario del Oficial de Datos Personales               */
/* -------------------------------------------------------------------------- */

export type SalesBand = "micro" | "pequena" | "mediana" | "grande";

/**
 * Primera Disposición Complementaria Final del DS N.° 016-2024-JUS: el Oficial de
 * Datos Personales (art. 37.1, numerales 2 y 3) entra en vigor por tamaño de empresa.
 */
export const SALES_BANDS: Array<{ id: SalesBand; label: string; hint: string; odpFrom: string }> = [
  { id: "micro", label: "Hasta 150 UIT al año", hint: "Microempresa: hasta unos S/ 825,000 al año", odpFrom: String(fact("odp.desde.micro").value) },
  { id: "pequena", label: "Más de 150 y hasta 1,700 UIT", hint: "Pequeña empresa: hasta unos S/ 9.35 millones", odpFrom: String(fact("odp.desde.pequena").value) },
  { id: "mediana", label: "Más de 1,700 y hasta 2,300 UIT", hint: "Mediana empresa: hasta unos S/ 12.65 millones", odpFrom: String(fact("odp.desde.mediana").value) },
  { id: "grande", label: "Más de 2,300 UIT al año", hint: "Gran empresa: más de unos S/ 12.65 millones", odpFrom: String(fact("odp.desde.grande").value) },
];

export function salesBand(id: string | null | undefined) {
  return SALES_BANDS.find((band) => band.id === id);
}

/** ¿Cuándo es exigible el ODP para esta empresa, si su actividad lo hace obligatorio? */
export function odpDeadline(company: Pick<Company, "sales_band">): { from: string; band: string } | undefined {
  const band = salesBand(company.sales_band);
  return band ? { from: band.odpFrom, band: band.label } : undefined;
}

/* -------------------------------------------------------------------------- */
/*  Protocolos operativos por familia                                         */
/* -------------------------------------------------------------------------- */

const PROTOCOLS: Partial<Record<LegalFamily, string[]>> = {
  comercio: [
    "Antes de anotar un teléfono o correo para publicidad, pide el permiso aparte y anótalo con fecha.",
    "Los comprobantes y fichas de clientes se guardan bajo llave; la computadora de caja tiene clave propia.",
    "Reclamos: entrega la hoja del Libro de Reclamaciones sin condicionar y responde en 30 días calendario.",
  ],
  venta_online: [
    "Pide el permiso de publicidad con una casilla vacía, separada de la compra, y guarda la captura.",
    "No armes listas de difusión de WhatsApp con contactos que no dijeron «SÍ ACEPTO».",
    "Activa verificación en dos pasos en la tienda, el correo y cada red de ventas, y revoca accesos de quien se va.",
    "Declara en tu política las herramientas de analítica y publicidad y no las cargues antes del consentimiento.",
  ],
  alimentos: [
    "El pedido se usa solo para el pedido: el repartidor ve nombre, dirección y teléfono, nada más.",
    "Cámaras: cartel visible y ninguna en baños o vestuarios del personal.",
    "Fotos de clientes o eventos para redes: pide permiso por escrito o avisa con un cartel donde se toman.",
  ],
  nocturno: [
    "Control de edad: verifica el DNI sin fotocopiarlo; si lo escaneas, guarda solo el dato de edad y bórralo.",
    "Fotografías del local con clientes: aviso visible y retiro inmediato si alguien lo pide.",
    "Videos del incidente de seguridad: solo se entregan a la autoridad con requerimiento escrito.",
  ],
  hospedaje: [
    "Registro de huéspedes: pide solo lo que exige el reglamento de hospedaje y guarda las copias de documentos bajo llave.",
    "Huéspedes menores de edad: registra a los padres o tutores y su autorización; no pidas más datos de la familia.",
    "Reservas por Booking o Airbnb: la plataforma es responsable de lo que recoge; tú, de lo que descargas y guardas.",
    "Al hacer el check-out, elimina las copias de pasaportes que ya no necesites.",
  ],
  viajes: [
    "Envía datos de pasajeros a aerolíneas y hoteles del exterior solo por canales cifrados, no por WhatsApp.",
    "Pide autorización por escrito para datos de salud (alergias, movilidad reducida) de un viaje.",
    "Informa en tu política los países de destino de los datos de los pasajeros.",
  ],
  pasajeros: [
    "Cámara dentro de la unidad: cartel visible dentro del vehículo y sin audio salvo aviso.",
    "GPS de conductores: informa la finalidad y no lo uses fuera del horario laboral.",
    "Manifiesto de pasajeros: solo la información que exige tu modalidad de transporte.",
  ],
  carga: [
    "Si repartes pedidos de otras empresas, eres su encargado: usa las direcciones solo para la entrega y no para tu publicidad.",
    "Los repartidores no guardan listas de destinatarios en celulares personales; usa una aplicación o planilla de la empresa.",
    "Elimina las direcciones de pedidos entregados cuando venza el plazo del contrato (máximo 2 años).",
  ],
  salud: [
    "Antes de la primera atención, el paciente firma la autorización de datos sensibles (art. 8) y recibe el aviso de privacidad.",
    "Historia clínica: acceso solo del personal asistencial que atiende al paciente; registra quién la abre y retira.",
    "Resultados de exámenes: se entregan solo al paciente o a quien él autorice por escrito, nunca por grupos de WhatsApp.",
    "Fotos clínicas: se toman con equipos de la clínica y se guardan en el sistema, no en celulares personales.",
    "Entrega de la historia clínica o de copias: solo al paciente, su representante o la autoridad competente.",
    "Eliminación: las historias clínicas se conservan según la NTS 139-MINSA/2018; no apliques la purga general.",
  ],
  bienestar: [
    "Antes de evaluar a un cliente, firma la ficha de salud con autorización por escrito; guarda la ficha bajo llave.",
    "Fotos antes/después: autorización aparte, sin rostro si el cliente lo prefiere, y nunca en el celular personal.",
    "Control de acceso con huella o rostro: ofrece una alternativa y borra la plantilla el mismo día de la baja del socio.",
    "Adolescentes de 14 a 17 años: pueden consentir; para menores de 14, firman sus padres.",
  ],
  farmacia: [
    "No uses el historial de compra de medicamentos para publicidad sin autorización escrita.",
    "Recetas: guárdalas o devuélvelas según la norma sanitaria y mantenlas bajo llave.",
    "Programas de fidelidad: informa qué datos pides y para qué, y que son opcionales.",
  ],
  educacion_menores: [
    "Matrícula: los padres firman la autorización de datos del menor y, por separado, el uso de imagen.",
    "Grupos de WhatsApp de aula: no publiques notas, deudas ni datos de salud de alumnos.",
    "Fotos y videos de actividades: publica solo las de alumnos con autorización vigente.",
    "Lista de morosos: no la expongas en paneles; comunica la deuda de forma individual y reservada.",
    "Plataformas educativas: verifica el país y el contrato antes de subir datos de menores.",
  ],
  educacion_adultos: [
    "Clases grabadas: avisa al inicio, indica para qué se graban y elimina la grabación en el plazo informado.",
    "Participantes menores de 18: aplica la regla de 14 a 17 años (consienten) y menores de 14 (sus padres).",
    "Certificados: se conservan; los datos de contacto para publicidad requieren permiso aparte.",
  ],
  profesional: [
    "Firma el compromiso de confidencialidad con todo el equipo y con los practicantes.",
    "Los archivos de clientes se envían por canales cifrados, no por WhatsApp ni correos personales.",
    "Si procesas datos de planilla o clientes de terceros, firma la cláusula de encargo y elimina los datos a los 2 años del último encargo.",
    "Verifica si, por tu actividad, eres sujeto obligado ante la UIF-Perú y conserva el registro de operaciones.",
  ],
  rrhh: [
    "Informa al postulante qué haces con su CV y por cuánto tiempo; elimínalo a los 6 meses salvo autorización.",
    "Si usas filtros automáticos o IA para descartar candidatos, asegura revisión humana.",
    "No pidas datos sensibles (salud, afiliación) ni de la familia si el puesto no lo exige.",
  ],
  seguros: [
    "Las declaraciones de salud se piden por escrito, con autorización, y se envían a la aseguradora por un canal seguro.",
    "Registra a qué aseguradoras envías los datos (incluidas las del exterior) en tu política.",
    "Conserva el registro de operaciones si eres sujeto obligado ante la UIF-Perú.",
  ],
  inmobiliaria: [
    "Copias de DNI y estados de cuenta de compradores: solo en el sistema de la empresa, no en celulares de vendedores.",
    "Debida diligencia y registro de operaciones si eres sujeto obligado ante la UIF-Perú: conserva 10 años.",
    "Avisos de propiedades: sin datos personales del dueño ni fotos con personas o documentos visibles.",
  ],
  vehiculos: [
    "Copias de DNI y licencias: se archivan bajo llave y se eliminan al vencer el plazo.",
    "Verificación crediticia: solo con autorización del titular o fuente legal.",
    "Registro de operaciones si eres sujeto obligado ante la UIF-Perú.",
  ],
  condominio: [
    "Cuaderno de visitas: el visitante no ve los datos de los anteriores; borra los registros pasado el plazo.",
    "Morosos: comunica la deuda de forma individual; no la publiques en áreas comunes.",
    "Cámaras de áreas comunes: cartel visible y conservación de 30 a 60 días.",
  ],
  finanzas: [
    "Conoce a tu cliente: identifica, valida el origen de fondos y guarda el registro de operaciones 10 años.",
    "Consulta de centrales de riesgo: solo con autorización y con aviso al deudor.",
    "Decisiones de crédito automatizadas: informa y ofrece revisión humana.",
    "Reporta operaciones sospechosas a la UIF-Perú según tu régimen.",
  ],
  plataforma: [
    "Registra continuamente quién accede, modifica o exporta datos personales y conserva esos registros 2 años.",
    "Revisa cada seis meses los privilegios de administradores y soporte.",
    "Ten un contrato de encargo firmado con cada proveedor cloud, de IA o de analítica, con prohibición de entrenamiento.",
    "Cuando alojas datos de tus clientes empresa, trátalos solo bajo sus instrucciones y elimínalos al terminar el servicio.",
    "Documenta la EIPD antes de lanzar funciones con IA o perfilado.",
  ],
  fintech: [
    "Cifra los montos y descripciones financieras en reposo y separa las llaves de la base de datos.",
    "Enmascara identificadores antes de enviar texto o audio a un proveedor de IA y prohíbe el entrenamiento.",
    "Trata los recibos como datos potencialmente de salud y minimiza su conservación.",
    "Mantén una EIPD actualizada para OCR, voz y categorización.",
  ],
  medios: [
    "Firma una cesión de imagen con modelos, invitados y asistentes antes de publicar.",
    "Contenidos con menores: autorización de ambos padres o tutores y límites de exposición.",
    "Sorteos: usa los datos solo para el sorteo, salvo permiso aparte.",
  ],
  seguridad_privada: [
    "Eres encargado de tus clientes: trata las imágenes y los libros de ocurrencias solo bajo sus instrucciones.",
    "Entrega videos solo con requerimiento escrito de la autoridad o a pedido del titular.",
    "Prohíbe a los agentes fotografiar personas o placas con su celular personal.",
  ],
  organizacion: [
    "Padrón de miembros: acceso solo del personal autorizado; no lo cedas a otras instituciones ni a campañas.",
    "Datos de afiliación religiosa, política o sindical: trátalos como sensibles y con autorización escrita.",
    "Actividades con menores: autorización de los padres y fotos solo con permiso.",
  ],
  industria: [
    "Exámenes médicos ocupacionales: el empleador recibe la conclusión de aptitud, no el diagnóstico.",
    "Control biométrico de asistencia: informa y ofrece alternativa.",
    "Cámaras de planta: cartel visible y respeto de zonas de descanso y servicios higiénicos.",
  ],
};

const GENERIC_PROTOCOL = [
  "Pide el consentimiento antes de usar un dato para algo distinto al servicio contratado.",
  "Guarda los documentos con datos personales bajo llave o con clave y restringe quién los ve.",
  "Atiende cualquier solicitud de derechos en los plazos del procedimiento ARCO.",
];

export function sectorProtocol(family: LegalFamily): string[] {
  return PROTOCOLS[family] ?? GENERIC_PROTOCOL;
}
