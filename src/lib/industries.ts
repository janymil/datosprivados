/**
 * Páginas públicas por sector (/sectores/[slug]). Cada una se arma con el perfil
 * legal de su familia (sector-legal.ts) y los bancos del rubro (sectors.ts), así
 * que normas, plazos de conservación y riesgos son los mismos que usan los
 * documentos del producto. Aquí solo va el texto comercial de cada sector.
 */

export type Industry = {
  slug: string;
  /** Rubro de `src/lib/sectors.ts` que se precarga al registrarse. */
  sectorId: string;
  name: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  /** Lo que más preocupa a este comprador, en sus palabras. */
  concerns: string[];
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "clinicas-y-centros-medicos",
    sectorId: "policlinico",
    name: "Clínicas y centros médicos",
    title: "Protección de datos para clínicas y centros médicos en Perú",
    h1: "Ley 29733 para clínicas, policlínicos y centros médicos",
    description:
      "Historias clínicas, consentimiento por escrito, Oficial de Datos Personales y bancos de datos de pacientes: lo que exige la Ley 29733 a una clínica o centro médico.",
    intro:
      "Un centro de salud trata datos sensibles todos los días: historias clínicas, diagnósticos, resultados e imágenes. Es el sector que la ANPD mira con más atención y uno de los primeros obligados a designar un Oficial de Datos Personales.",
    concerns: [
      "Resultados enviados por WhatsApp al número equivocado.",
      "Personal administrativo con acceso a historias clínicas.",
      "Fotos clínicas guardadas en celulares personales.",
    ],
  },
  {
    slug: "colegios-y-academias",
    sectorId: "colegio",
    name: "Colegios y academias",
    title: "Protección de datos para colegios y academias en Perú",
    h1: "Ley 29733 para colegios, nidos y academias",
    description:
      "Datos de alumnos menores de edad, apoderados, fichas de salud, fotos y cámaras: lo que exige la Ley 29733 a colegios, nidos y academias del Perú.",
    intro:
      "Un colegio trata datos de menores de edad, de sus padres y de su salud, y publica fotos en redes. Cada uno de esos puntos tiene reglas propias de consentimiento.",
    concerns: [
      "Fotos de alumnos publicadas sin autorización de los padres.",
      "Fichas de salud y psicopedagógicas al alcance de todo el personal.",
      "Grupos de WhatsApp de padres con datos expuestos.",
    ],
  },
  {
    slug: "empresas-de-software-y-saas",
    sectorId: "software",
    name: "Software y SaaS",
    title: "Protección de datos para empresas de software y SaaS en Perú",
    h1: "Ley 29733 para empresas de software, apps y SaaS",
    description:
      "Usuarios, pagos, logs y datos de terceros: los bancos de datos que una empresa SaaS en Perú debe inscribir, y su rol de encargado del tratamiento ante sus clientes.",
    intro:
      "Una plataforma digital trata datos a escala y casi siempre en servidores fuera del Perú. Además, cuando aloja datos de sus clientes, es su encargado del tratamiento y tiene que poder demostrarlo.",
    concerns: [
      "Clientes corporativos que piden la cláusula de encargo y el documento de seguridad.",
      "Transferencia internacional por usar AWS, Google Cloud o Azure.",
      "Logs con IP y datos de uso que nadie declaró.",
    ],
  },
  {
    slug: "financieras-y-cooperativas",
    sectorId: "prestamos",
    name: "Financieras y cooperativas",
    title: "Protección de datos para financieras y cooperativas en Perú",
    h1: "Ley 29733 para financieras, cooperativas y casas de préstamos",
    description:
      "Debida diligencia, centrales de riesgo, datos de ingresos y decisiones automatizadas: cómo cumple la Ley 29733 una financiera o cooperativa en Perú.",
    intro:
      "Una entidad de crédito trata ingresos, patrimonio e historial crediticio, conserva registros por 10 años para la UIF y decide con modelos de puntaje. Protección de datos y prevención de lavado se cruzan en cada expediente.",
    concerns: [
      "Consultas a centrales de riesgo sin autorización del titular.",
      "Decisiones de crédito automatizadas sin revisión humana.",
      "Expedientes rechazados que se guardan indefinidamente.",
    ],
  },
  {
    slug: "inmobiliarias-y-constructoras",
    sectorId: "inmobiliaria",
    name: "Inmobiliarias y constructoras",
    title: "Protección de datos para inmobiliarias y constructoras en Perú",
    h1: "Ley 29733 para inmobiliarias y constructoras",
    description:
      "Prospectos, compradores, inquilinos, contratistas y cámaras de obra: los bancos de datos y documentos que exige la Ley 29733 a una inmobiliaria o constructora.",
    intro:
      "Una inmobiliaria capta prospectos en ferias y portales, evalúa ingresos de compradores e inquilinos y comparte datos con bancos y notarías. Cada paso necesita una base legal clara.",
    concerns: [
      "Bases de prospectos compradas o captadas sin consentimiento para publicidad.",
      "Documentos de sustento de ingresos circulando por correo.",
      "Datos de compradores compartidos con brokers externos.",
    ],
  },
  {
    slug: "hoteles-y-hospedajes",
    sectorId: "hotel",
    name: "Hoteles y hospedajes",
    title: "Protección de datos para hoteles y hospedajes en Perú",
    h1: "Ley 29733 para hoteles, hostales y hospedajes",
    description:
      "Registro de huéspedes, reservas por Booking y Airbnb, pasaportes, cámaras y transferencia internacional: lo que exige la Ley 29733 a un hotel en Perú.",
    intro:
      "Un hotel registra huéspedes por obligación sectorial, recibe reservas a través de plataformas extranjeras y graba áreas comunes. Es un caso típico de transferencia internacional sin declarar.",
    concerns: [
      "Copias de pasaportes y DNI guardadas sin plazo.",
      "Plataformas de reservas extranjeras no declaradas.",
      "Grabaciones de pasillos y recepción sin cartel.",
    ],
  },
  {
    slug: "estudios-contables-y-de-abogados",
    sectorId: "contable",
    name: "Estudios contables y de abogados",
    title: "Protección de datos para estudios contables y de abogados",
    h1: "Ley 29733 para estudios contables y de abogados",
    description:
      "Planillas de clientes, expedientes y claves SOL: cuándo un estudio contable o legal es encargado del tratamiento y qué debe firmar y documentar.",
    intro:
      "Un estudio contable procesa las planillas y la información tributaria de decenas de empresas. Frente a cada cliente es encargado del tratamiento: necesita contratos de encargo, seguridad documentada y respuesta rápida ante incidentes.",
    concerns: [
      "Clientes que piden la cláusula de encargo antes de renovar.",
      "Claves SOL y planillas de terceros en equipos compartidos.",
      "Correos con archivos de planilla enviados al cliente equivocado.",
    ],
  },
  {
    slug: "agencias-de-empleo-y-rrhh",
    sectorId: "rrhh",
    name: "Agencias de empleo y RR.HH.",
    title: "Protección de datos para agencias de empleo y RR.HH. en Perú",
    h1: "Ley 29733 para agencias de empleo, reclutamiento y outsourcing",
    description:
      "CVs, evaluaciones psicológicas, antecedentes y datos de trabajadores destacados: lo que exige la Ley 29733 a una agencia de reclutamiento o de RR.HH.",
    intro:
      "Una agencia de empleo trata miles de CVs, evaluaciones y, a veces, antecedentes, y los comparte con empresas cliente. Es responsable frente a los postulantes y encargada frente a sus clientes.",
    concerns: [
      "CVs conservados durante años sin consentimiento.",
      "Evaluaciones psicológicas compartidas con el cliente sin autorización.",
      "Bases de candidatos reutilizadas para otros procesos.",
    ],
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.slug === slug);
}
