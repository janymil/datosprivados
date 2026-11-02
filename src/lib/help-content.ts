/**
 * Contenido de la Ayuda de DatosPrivados.
 *
 * Es la fuente única de todo lo que se explica al usuario: la página /app/ayuda,
 * los artículos, el buscador, la ruta de la A a la Z y el conocimiento del
 * asistente de IA (ver `help-knowledge.ts`). Si cambia una pantalla, se corrige
 * aquí y se actualiza todo a la vez.
 *
 * Es solo datos: no importa nada del servidor para poder usarse también en el
 * navegador. Los textos admiten **negrita** en línea.
 */

import { GLOSSARY } from "./glossary";

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

export type SectionId = "primeros-pasos" | "configurar" | "atender" | "ia" | "cuenta";

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[] }
  | { t: "steps"; items: Array<{ title: string; text: string }> }
  | { t: "callout"; tone: "tip" | "warn" | "law" | "example"; title?: string; text: string }
  | { t: "facts"; items: Array<{ label: string; value: string }> };

export type HelpTopic = {
  slug: string;
  section: SectionId;
  title: string;
  /** Una frase para tarjetas y resultados de búsqueda. */
  summary: string;
  /** «En 30 segundos»: lo esencial para quien no va a leer más. */
  tldr: string;
  minutes: number;
  /** Pantalla de la app que explica este artículo. */
  route?: { href: string; label: string };
  /** Palabras que la gente usa al buscar y que no están en el título. */
  keywords: string[];
  blocks: Block[];
  related: string[];
  /** Preguntas que se pueden hacer al asistente sobre este tema. */
  ask: string[];
};

export const SECTIONS: Array<{ id: SectionId; title: string; blurb: string }> = [
  { id: "primeros-pasos", title: "Primeros pasos", blurb: "Si es tu primera vez: qué es esto y por dónde empezar." },
  { id: "configurar", title: "Configurar tu cumplimiento", blurb: "Empresa, listas de datos, herramientas y documentos." },
  { id: "atender", title: "Atender el día a día", blurb: "Lo que llega solo: solicitudes de personas, incidentes y pruebas." },
  { id: "ia", title: "Asistente con IA", blurb: "Pregunta en lenguaje normal y recibe borradores listos." },
  { id: "cuenta", title: "Tu cuenta", blurb: "Plan, pagos, seguridad y tus datos." },
];

/* -------------------------------------------------------------------------- */
/*  Artículos                                                                 */
/* -------------------------------------------------------------------------- */

export const TOPICS: HelpTopic[] = [
  /* ---------------------------- Primeros pasos ---------------------------- */
  {
    slug: "que-es-datosprivados",
    section: "primeros-pasos",
    title: "Qué es DatosPrivados y cómo funciona",
    summary: "Tu expediente de cumplimiento de la Ley 29733, paso a paso y sin saber de leyes.",
    tldr: "DatosPrivados te dice qué exige la ley de protección de datos a tu negocio, te arma los documentos con los datos de tu empresa y te avisa cuando vence un plazo. No es un estudio de abogados: es tu orden y tu constancia.",
    minutes: 4,
    route: { href: "/app", label: "Ir a Mi plan" },
    keywords: ["inicio", "empezar", "como funciona", "para que sirve", "que hace", "resumen", "demo", "recorrido", "menu", "navegar", "secciones"],
    blocks: [
      { t: "p", text: "Si guardas nombres, celulares, correos, fotos o grabaciones de personas (clientes, trabajadores, proveedores), la **Ley 29733** te obliga a cuidarlos y a ordenarlos. DatosPrivados convierte esa obligación en una lista de pasos que puedes hacer en varios días." },
      { t: "h", text: "Cómo está organizada la app" },
      { t: "p", text: "El menú de la izquierda (en el celular, la barra inferior y «Más») tiene cinco grupos. Siempre puedes volver a **Mi plan** para ver qué sigue." },
      {
        t: "facts",
        items: [
          { label: "Mi plan", value: "Tu puntaje, tus alertas y los pasos pendientes en orden." },
          { label: "Configurar", value: "Bancos de datos (tus listas), Herramientas (los programas que usas) y Documentos (política, consentimientos, seguridad, contratos)." },
          { label: "Atender", value: "Evidencias (tus pruebas), Solicitudes ARCO (personas que piden sus datos) e Incidentes (robos, pérdidas o filtraciones)." },
          { label: "Ayuda", value: "Esta Ayuda y el Asistente legal con IA, que conoce toda la app." },
          { label: "Cuenta", value: "Empresa (tus datos) y Ajustes (plan, pagos, contraseña, IA, exportar)." },
        ],
      },
      { t: "h", text: "El ciclo en una frase" },
      {
        t: "steps",
        items: [
          { title: "Declaras", text: "Cuentas qué listas de personas manejas y qué herramientas usas." },
          { title: "Inscribes", text: "Copias la ficha que te damos en el portal del Estado (SIPDP). Es gratis." },
          { title: "Publicas", text: "Pones tu política de privacidad y tus textos de consentimiento donde pides datos." },
          { title: "Atiendes", text: "Respondes las solicitudes de personas en plazo y reaccionas si hay un incidente." },
          { title: "Dejas constancia", text: "Registras las pruebas de que aplicas las medidas." },
        ],
      },
      { t: "callout", tone: "warn", title: "Qué NO es", text: "DatosPrivados es una herramienta de gestión. Los documentos son borradores bien armados, pero no reemplazan a un abogado: si tu caso es complejo (datos de salud masivos, menores, transferencias grandes), pide una revisión legal." },
      { t: "callout", tone: "tip", title: "Cuenta de demostración", text: "Si solo quieres mirar, en la página de inicio está el botón «Probar la demo»: una empresa ficticia (Casa Verde Perú) en modo solo lectura. Para trabajar con tus datos, crea tu cuenta." },
    ],
    related: ["la-ley-en-simple", "ruta-completa", "panel"],
    ask: ["¿Cómo funciona DatosPrivados?", "¿Por dónde empiezo?"],
  },
  {
    slug: "la-ley-en-simple",
    section: "primeros-pasos",
    title: "La Ley 29733 explicada desde cero",
    summary: "Qué es, a quién le toca, qué te piden y cuánto cuesta no cumplir. Sin jerga.",
    tldr: "Si tu negocio tiene RUC y guarda datos de personas, la ley te aplica. Te pide: avisar para qué usas los datos, pedir permiso cuando corresponde, inscribir tus listas (gratis), cuidarlas, responder a quien te las pida y avisar en 48 horas si se filtran.",
    minutes: 6,
    keywords: ["ley", "29733", "reglamento", "016-2024-jus", "a quien aplica", "obligatorio", "multas", "sanciones", "anpd", "datos personales", "que es", "principios", "derechos", "fiscalizacion", "uit"],
    blocks: [
      { t: "h", text: "¿Qué es un dato personal?" },
      { t: "p", text: "Cualquier información que identifique a una persona: nombre, DNI, celular, correo, dirección, foto, voz, la imagen de una cámara, una placa asociada a su dueño. No importa si está en Excel, en WhatsApp, en un cuaderno o en un sistema." },
      { t: "h", text: "¿A quién le aplica?" },
      { t: "p", text: "A **todo negocio con RUC** (persona natural con negocio o empresa) que trate datos de personas en el Perú: la bodega que anota deudas, el consultorio, la tienda online, el estudio contable, el gimnasio, la startup. No existe «demasiado pequeño para que aplique»." },
      { t: "h", text: "¿Qué te pide, en lenguaje normal?" },
      {
        t: "steps",
        items: [
          { title: "Avisar", text: "Decir quién eres, qué datos recoges, para qué, por cuánto tiempo y con quién los compartes. Se hace con la **política de privacidad** y avisos cortos donde pides datos." },
          { title: "Pedir permiso", text: "Para usar los datos en publicidad (WhatsApp, correo, sorteos) necesitas un «sí» libre, informado y que puedas demostrar. Para datos sensibles, por escrito." },
          { title: "Inscribir tus listas", text: "Cada lista de personas (clientes, trabajadores, cámaras…) es un **banco de datos** y se inscribe en el SIPDP del Ministerio de Justicia. Desde el reglamento de 2024 es **gratis** y de aprobación automática." },
          { title: "Protegerlos", text: "Medidas razonables: claves, accesos solo para quien los necesita, copias de respaldo, capacitación, un documento de seguridad." },
          { title: "Responder a las personas", text: "Cualquiera puede pedirte ver, corregir, borrar sus datos u oponerse a su uso. Son los **derechos ARCO** y tienen plazo." },
          { title: "Avisar si se filtran", text: "Si hay un robo, pérdida o filtración que cumple los criterios del art. 34.1, avisas a la ANPD en **48 horas**." },
        ],
      },
      { t: "h", text: "¿Quién vigila y qué pasa si no cumples?" },
      { t: "p", text: "Vigila la **ANPD** (Autoridad Nacional de Protección de Datos Personales, del Ministerio de Justicia). Puede fiscalizarte de oficio o por la denuncia de una persona. Las multas (art. 39 de la Ley) se miden en UIT; con la UIT 2026 de S/ 5,500:" },
      {
        t: "facts",
        items: [
          { label: "Leves", value: "0.5 a 5 UIT (S/ 2,750 a S/ 27,500). Ej.: no inscribir tus bancos, responder tarde una solicitud ARCO." },
          { label: "Graves", value: "5 a 50 UIT (hasta S/ 275,000)." },
          { label: "Muy graves", value: "50 a 100 UIT (hasta S/ 550,000)." },
        ],
      },
      { t: "callout", tone: "law", title: "Fechas que conviene conocer", text: "El nuevo reglamento (DS 016-2024-JUS) rige desde marzo de 2025 con obligaciones progresivas. El **Oficial de Datos Personales** solo es obligatorio si tratas grandes volúmenes o datos sensibles; para microempresas desde el 30 de noviembre de 2028 (art. 37). Mientras tanto basta un responsable interno." },
      { t: "callout", tone: "example", title: "Ejemplo", text: "Una bodega que anota los nombres de clientes que fían, guarda videos de una cámara y tiene dos empleados ya maneja **tres bancos de datos**: clientes, videovigilancia y trabajadores. Cada uno se declara, se inscribe y se protege." },
    ],
    related: ["que-es-datosprivados", "bancos", "arco", "incidentes"],
    ask: ["¿Mi negocio está obligado a cumplir la Ley 29733?", "¿Qué multas hay si no cumplo?", "¿Qué es un dato personal?"],
  },
  {
    slug: "ruta-completa",
    section: "primeros-pasos",
    title: "Ruta de la A a la Z: qué hacer y en qué orden",
    summary: "Desde crear la cuenta hasta el mantenimiento mensual, con el tiempo que toma cada paso.",
    tldr: "Sigue el orden de «Mi plan»: empresa → bancos → herramientas → SIPDP → política → consentimientos → seguridad → contratos. Después atiendes ARCO e incidentes y dejas evidencias. La primera configuración toma entre 1 y 3 horas, repartidas como quieras.",
    minutes: 5,
    route: { href: "/app", label: "Abrir Mi plan" },
    keywords: ["paso a paso", "orden", "guia", "checklist", "de la a a la z", "tutorial", "empezar", "primera vez", "lista de tareas", "cuanto demora"],
    blocks: [
      { t: "p", text: "Esta es la ruta completa. En la página principal de Ayuda la ves como un recorrido interactivo que **marca automáticamente** los pasos que ya hiciste en tu cuenta." },
      {
        t: "steps",
        items: [
          { title: "1. Entiende lo básico (10 min)", text: "Lee «La Ley 29733 explicada desde cero». No hace falta memorizar nada." },
          { title: "2. Crea tu cuenta y activa tu plan (5 min)", text: "Registro con RUC, correo y contraseña; luego pagas con MercadoPago o por transferencia. Ver «Crear tu cuenta y activarla»." },
          { title: "3. Configura tu negocio (5 min)", text: "El asistente de bienvenida te pregunta tu rubro, qué listas manejas, qué herramientas usas y tu contacto. Con eso crea tus bancos en borrador y la primera política." },
          { title: "4. Completa los datos de la empresa (5 min)", text: "En Empresa: razón social, RUC, dirección, teléfono, correo y responsable de privacidad. Aparecen en tus documentos." },
          { title: "5. Revisa tus bancos de datos (15–30 min)", text: "En Bancos de datos confirma finalidad, base legal, plazo y encargados de cada lista. Quita los que no tengas y agrega los que falten." },
          { title: "6. Declara tus herramientas (10 min)", text: "En Herramientas marca web, correo, WhatsApp, pagos, nube, etc. Si alguna guarda datos fuera del Perú, registra el contrato y la comunicación a la ANPD." },
          { title: "7. Inscribe cada banco en el SIPDP (10 min por banco)", text: "Abre la ficha del banco, cópiala campo por campo en sipdp.minjus.gob.pe y pega el código que te dé el portal." },
          { title: "8. Publica tu política de privacidad (10 min)", text: "En Documentos, revisa el borrador, publícalo y pega el enlace en tu web, Instagram o WhatsApp Business." },
          { title: "9. Usa los textos de consentimiento (10 min)", text: "Copia las frases en tus formularios, WhatsApp y correos antes de enviar publicidad." },
          { title: "10. Genera tu Documento de Seguridad (15 min)", text: "Marca el checklist con las medidas que sí aplicas, descarga el documento, fírmalo y guárdalo." },
          { title: "11. Haz firmar confidencialidad y contratos (15 min)", text: "Para trabajadores y proveedores; y el cartel de cámaras si tienes videovigilancia." },
          { title: "12. Deja lista la atención de solicitudes ARCO (5 min)", text: "Copia el enlace de tu página pública ARCO en tu política y web." },
          { title: "13. Conoce el plan para incidentes (5 min)", text: "Lee cómo funciona el reloj de 48 horas antes de necesitarlo." },
          { title: "14. Registra evidencias y mantén al día (continuo)", text: "Cada capacitación, revisión de accesos, prueba de respaldo y purga queda registrada con fecha." },
        ],
      },
      { t: "callout", tone: "tip", title: "No tiene que ser todo hoy", text: "Tu puntaje sube con cada paso. Lo más urgente, si tienes que priorizar: inscribir bancos (S/ 0 y evita la multa más común), publicar la política y dejar listo cómo responder solicitudes ARCO." },
    ],
    related: ["configuracion-inicial", "panel", "mantenimiento"],
    ask: ["¿Qué tengo que hacer, paso a paso?", "¿Qué es lo más urgente?"],
  },
  {
    slug: "registro-y-activacion",
    section: "primeros-pasos",
    title: "Crear tu cuenta y activarla",
    summary: "Registro con RUC, verificación del correo, elección de plan y pago.",
    tldr: "Te registras con tu RUC (se valida con SUNAT), eliges plan mensual o anual y pagas con MercadoPago o transferencia. Hasta que el pago se confirme, la cuenta queda pendiente y no entra al panel.",
    minutes: 3,
    route: { href: "/app/ajustes", label: "Ver mi plan en Ajustes" },
    keywords: ["registro", "registrarme", "crear cuenta", "ruc", "pagar", "suscripcion", "mercadopago", "transferencia", "factura", "activar", "verificar correo", "pendiente", "contrasena", "olvide"],
    blocks: [
      {
        t: "steps",
        items: [
          { title: "Regístrate", text: "Con razón social, RUC (11 dígitos), tu nombre, correo, contraseña y tu rubro. Aceptas los Términos y la Política de privacidad. El RUC se consulta en SUNAT para traer tu razón social y dirección." },
          { title: "Verifica tu correo", text: "Te enviamos un enlace de verificación. Si no llega, puedes pedir otro desde el aviso dentro de la app." },
          { title: "Elige plan y periodo", text: "Básico (S/ 19 al mes o S/ 190 al año) o Pro (S/ 39 al mes o S/ 390 al año). El anual cobra 12 meses con 2 de ahorro. Los precios incluyen IGV." },
          { title: "Paga", text: "Con **MercadoPago** (suscripción que se renueva sola) o por **transferencia bancaria** contra factura: recibes los datos y la cuenta se activa cuando se confirma el dinero." },
          { title: "Configura tu negocio", text: "Al activarse entras al asistente de bienvenida. Ver «Configuración inicial»." },
        ],
      },
      { t: "callout", tone: "law", title: "Solo negocios peruanos", text: "Atendemos empresas y personas con negocio constituidas en el Perú y con RUC. El SIPDP exige una empresa peruana para inscribir bancos de datos." },
      { t: "callout", tone: "tip", title: "¿Olvidaste tu contraseña?", text: "En la pantalla de ingreso usa «Olvidé mi contraseña»: recibes un enlace para crear una nueva." },
    ],
    related: ["plan-y-pagos", "configuracion-inicial"],
    ask: ["¿Cómo pago?", "¿Puedo pagar por transferencia?", "¿Qué diferencia hay entre Básico y Pro?"],
  },
  {
    slug: "configuracion-inicial",
    section: "primeros-pasos",
    title: "Configuración inicial (asistente de bienvenida)",
    summary: "Cuatro pantallas para que DatosPrivados arme tu plan con tus datos reales.",
    tldr: "Respondes cuatro cosas: qué negocio tienes, qué listas de personas manejas, qué herramientas usas y cómo contactarte. Al terminar se crean tus bancos en borrador, tus herramientas y los primeros borradores de política y consentimientos.",
    minutes: 3,
    route: { href: "/app", label: "Ir a Mi plan" },
    keywords: ["onboarding", "bienvenida", "rubro", "sector", "asistente inicial", "configurar", "ventas anuales", "plantillas de bancos", "primeros borradores"],
    blocks: [
      {
        t: "steps",
        items: [
          { title: "Tu negocio", text: "Busca tu rubro (hay más de 60: bodega, consultorio, colegio, gimnasio, SaaS, estudio contable…). Cada rubro sugiere las listas que normalmente tiene y muestra advertencias propias (por ejemplo, datos de salud o de menores)." },
          { title: "Datos que manejas", text: "Marca las listas que de verdad tengas. Vienen preseleccionadas las habituales de tu rubro; quita o agrega con libertad." },
          { title: "Herramientas", text: "Indica qué programas usan tus datos (web, correo, WhatsApp, pagos, nube…). Sirve para que tus documentos y tus transferencias al exterior sean correctos." },
          { title: "Contacto", text: "Dirección, teléfono, responsable de privacidad y su correo, y tus ventas anuales aproximadas (determinan cuándo te tocaría un Oficial de Datos Personales)." },
        ],
      },
      { t: "p", text: "Al terminar verás «Mi plan» con un mensaje de bienvenida. Todo lo creado es **editable**: nada queda fijo." },
    ],
    related: ["panel", "bancos", "herramientas"],
    ask: ["¿Qué pasa si elegí mal mi rubro?"],
  },
  {
    slug: "panel",
    section: "primeros-pasos",
    title: "Mi plan: tu puntaje, alertas y pasos pendientes",
    summary: "La pantalla principal: cómo leer el puntaje y qué hacer con las alertas.",
    tldr: "Mi plan te dice cómo vas (0–100), qué vence y cuál es el siguiente paso. Los pasos suman puntos; las obligaciones vencidas restan 15 puntos cada una.",
    minutes: 3,
    route: { href: "/app", label: "Abrir Mi plan" },
    keywords: ["puntaje", "score", "dashboard", "inicio", "panel", "alertas", "pendientes", "al dia", "en riesgo", "porcentaje", "nivel de cumplimiento", "anillo"],
    blocks: [
      { t: "h", text: "El puntaje" },
      { t: "p", text: "Es un número de 0 a 100 con un nivel: **Al día** (90 o más y sin alertas rojas), **En progreso** y **En riesgo** (menos de 50 o con una alerta roja)." },
      {
        t: "facts",
        items: [
          { label: "Completar datos de la empresa", value: "10 puntos" },
          { label: "Declarar bancos de datos", value: "15 puntos" },
          { label: "Inscribirlos en el SIPDP", value: "20 puntos" },
          { label: "Declarar herramientas", value: "10 puntos" },
          { label: "Publicar la política de privacidad (y mantenerla actualizada)", value: "15 puntos" },
          { label: "Textos de consentimiento", value: "10 puntos" },
          { label: "Documento de seguridad", value: "10 puntos" },
          { label: "Confidencialidad y contratos", value: "10 puntos" },
        ],
      },
      { t: "p", text: "A ese total se le **restan 15 puntos** por cada tipo de obligación vencida: solicitudes ARCO sin responder a tiempo o incidentes que superaron las 48 horas sin notificación registrada." },
      { t: "h", text: "Las alertas" },
      { t: "list", items: [
        "**Rojas**: algo ya venció (solicitud ARCO fuera de plazo, incidente sin notificar). Restan puntos: atiéndelas primero.",
        "**Amarillas**: algo corre o necesita revisión (solicitudes dentro del plazo, herramientas en el exterior sin contrato, ficha SIPDP desactualizada, revisión de accesos de hace más de seis meses, Oficial de Datos Personales próximo). No restan puntos.",
      ] },
      { t: "h", text: "Los pasos pendientes" },
      { t: "p", text: "Debajo del puntaje ves la lista en el orden recomendado. Cada paso tiene un botón que te lleva directo a donde se hace." },
      { t: "callout", tone: "tip", text: "También verás tus enlaces públicos (política y formulario ARCO) para copiarlos y pegarlos en tu web o redes." },
    ],
    related: ["ruta-completa", "arco", "incidentes"],
    ask: ["¿Cómo se calcula mi puntaje?", "¿Qué me falta para estar al día?"],
  },

  /* ----------------------------- Configurar ------------------------------ */
  {
    slug: "empresa",
    section: "configurar",
    title: "Empresa: los datos que salen en tus documentos",
    summary: "Razón social, RUC, dirección, contacto y responsable de privacidad.",
    tldr: "Lo que completes aquí se escribe solo en tus documentos. Si cambias algo importante, tus documentos pueden quedar «desactualizados» y te avisamos para regenerarlos.",
    minutes: 2,
    route: { href: "/app/empresa", label: "Ir a Empresa" },
    keywords: ["razon social", "ruc", "direccion", "telefono", "responsable de privacidad", "dpo", "oficial de datos", "ventas anuales", "sitio web", "libro de reclamaciones url", "perfil", "datos de la empresa"],
    blocks: [
      { t: "list", items: [
        "**Razón social y RUC**: el RUC se validó con SUNAT al registrarte.",
        "**Dirección, teléfono y correo**: deben figurar en tu política de privacidad para que las personas sepan cómo contactarte. Sin ellos el paso «Completar datos» no suma.",
        "**Responsable de privacidad**: quien recibe las consultas sobre datos personales. Puede ser el dueño.",
        "**Ventas anuales**: solo sirve para calcular desde cuándo te tocaría un Oficial de Datos Personales.",
        "**Sitio web y enlace del libro de reclamaciones**: si los tienes, se incluyen en los documentos.",
      ] },
      { t: "callout", tone: "tip", text: "Al cambiar la razón social, la dirección o el contacto, revisa en Documentos si alguno aparece como «desactualizado» y regéneralo." },
    ],
    related: ["documentos", "panel"],
    ask: ["¿Quién puede ser mi responsable de privacidad?", "¿Necesito un Oficial de Datos Personales?"],
  },
  {
    slug: "bancos",
    section: "configurar",
    title: "Bancos de datos: tus listas de personas",
    summary: "Qué es un banco, cómo declararlo bien y qué significa cada campo.",
    tldr: "Un banco de datos es cada lista organizada de personas que manejas (clientes, trabajadores, cámaras…). Declaras para qué la usas, con qué permiso, por cuánto tiempo y quién más la ve. Lo ideal es 3 a 6 bancos, no uno por cada archivo.",
    minutes: 6,
    route: { href: "/app/bancos", label: "Ir a Bancos de datos" },
    keywords: ["banco de datos", "lista", "inventario", "clientes", "trabajadores", "camaras", "pacientes", "alumnos", "finalidad", "base legal", "plazo de conservacion", "encargados", "plantilla", "borrador", "inscrito", "editar", "reabrir", "marketing", "proveedores", "saas", "usuarios"],
    blocks: [
      { t: "p", text: "«Banco de datos» suena técnico, pero es simple: **una lista de personas con un mismo propósito**. No importa si está en Excel, en el celular, en un sistema o en un cuaderno." },
      { t: "h", text: "Cómo declararlos" },
      { t: "steps", items: [
        { title: "Parte de una plantilla", text: "Hay plantillas listas: Clientes, Colaboradores y postulantes, Prospectos y suscriptores de promociones, Proveedores, Videovigilancia, Libro de Reclamaciones, Pacientes, Alumnos, Huéspedes, Socios, Visitantes, Solicitantes de crédito, y para plataformas digitales: Usuarios, Facturación, Registros de seguridad y Contactos de terceros." },
        { title: "Ajusta los campos", text: "Finalidad, categorías de datos, base legal, plazo de conservación, encargados y si hay transferencia internacional." },
        { title: "Guarda como borrador", text: "Queda «Borrador» hasta que lo inscribas en el SIPDP." },
        { title: "Inscríbelo", text: "Abre la ficha, cópiala en el portal del Estado y registra el código. Ver «Inscribir en el SIPDP»." },
      ] },
      { t: "h", text: "Qué significa cada campo" },
      { t: "facts", items: [
        { label: "Finalidad", value: "Para qué usas esos datos, concreto y honesto («emitir boletas y coordinar entregas»). Solo puedes usarlos para eso." },
        { label: "Categorías de datos", value: "Qué tipo de datos guardas: identificación, contacto, financieros, salud, imagen…" },
        { label: "Base legal", value: "El permiso que te autoriza: consentimiento, ejecución de contrato, obligación legal u otra excepción." },
        { label: "Plazo", value: "Cuánto tiempo los guardas. Comprobantes de pago y planilla: 5 años. Cámaras: 30 a 60 días." },
        { label: "Encargados / destinatarios", value: "Quién más ve esos datos: tu contador, la nube, el courier, tu proveedor de WhatsApp." },
        { label: "Transferencia internacional", value: "«Sí» si algún servicio los guarda fuera del Perú. Debe coincidir con tus herramientas." },
      ] },
      { t: "callout", tone: "example", title: "Ejemplo: un gimnasio", text: "Bancos típicos: **Socios y membresías** (cobros, asistencia), **Videovigilancia** (cámaras del local), **Colaboradores** (entrenadores) y **Prospectos** (quienes pidieron información por WhatsApp o Instagram)." },
      { t: "callout", tone: "warn", title: "Datos sensibles", text: "Si una lista incluye salud, huella, rostro, ingresos u otros datos sensibles, necesitas consentimiento **por escrito** y medidas reforzadas. La plantilla lo advierte." },
      { t: "h", text: "Después de inscribir" },
      { t: "p", text: "Si cambias un banco o una herramienta después de inscribirlo, aparece una alerta: la inscripción debe mantenerse **actualizada** (art. 44). Pulsa «Editar datos» (si ya estaba inscrito puedes usar «Cambiar estado a borrador»), y actualiza la ficha en el SIPDP." },
      { t: "callout", tone: "tip", text: "Con el **Plan Pro** puedes describir en tus palabras cómo manejas los datos y la IA completa los campos del banco (Autocompletado inteligente)." },
    ],
    related: ["inscripcion-sipdp", "herramientas", "casos-especiales"],
    ask: ["¿Qué bancos de datos necesita un consultorio?", "¿Qué pongo en finalidad?", "¿Cuántos bancos debo tener?"],
  },
  {
    slug: "inscripcion-sipdp",
    section: "configurar",
    title: "Inscribir tus bancos en el SIPDP (gratis)",
    summary: "Cómo pasar de la ficha de DatosPrivados al portal del Estado, paso a paso.",
    tldr: "Entras a sipdp.minjus.gob.pe, creas el banco y copias cada campo de la ficha (numerada I a X como el formulario). Es gratis y la aprobación es automática. Al terminar pegas el código en DatosPrivados.",
    minutes: 5,
    route: { href: "/app/bancos", label: "Ir a Bancos de datos" },
    keywords: ["sipdp", "rnpdp", "inscribir", "inscripcion", "registro", "ficha", "minjus", "portal del estado", "codigo", "gratis", "tasa", "actualizar", "copiar", "imprimir", "anpd"],
    blocks: [
      { t: "p", text: "El **SIPDP** es el portal del Ministerio de Justicia donde se inscriben los bancos de datos (Registro Nacional de Protección de Datos Personales). Desde el reglamento de 2024 **no tiene costo** y es de aprobación automática. La multa más común es simplemente no haberlo hecho." },
      { t: "steps", items: [
        { title: "Abre la ficha del banco", text: "En Bancos de datos entra al banco y pulsa «Abrir Ficha para el SIPDP». Verás los campos numerados I a X igual que el formulario del Estado (la finalidad va en el V y el flujo transfronterizo en el VI)." },
        { title: "Entra al SIPDP", text: "Ve a sipdp.minjus.gob.pe e ingresa con tu cuenta del portal (el titular debe ser el representante de tu empresa)." },
        { title: "Crea el banco", text: "Copia cada dato de la ficha en su campo. La ficha tiene botones de copiar para no tipear." },
        { title: "Envía y guarda el código", text: "El portal te entrega un código/constancia. Pégalo en DatosPrivados con «Guardar código y marcar como inscrito» (guarda también el PDF de la constancia que emite la ANPD)." },
        { title: "Repite con cada banco", text: "Cada lista se inscribe por separado." },
      ] },
      { t: "callout", tone: "warn", title: "Mantenlo actualizado", text: "Si cambias el banco o agregas herramientas, actualiza la inscripción (art. 44). DatosPrivados te muestra una alerta cuando detecta cambios posteriores a la inscripción." },
      { t: "callout", tone: "tip", text: "Con «Imprimir / Guardar PDF» puedes guardar la ficha como respaldo." },
    ],
    related: ["bancos", "herramientas", "documentos"],
    ask: ["¿Cómo inscribo mis bancos en el SIPDP?", "¿Cuánto cuesta inscribir un banco de datos?"],
  },
  {
    slug: "herramientas",
    section: "configurar",
    title: "Herramientas y transferencias al exterior",
    summary: "Los programas que reciben datos de tus clientes y qué hacer si están fuera del Perú.",
    tldr: "Cada servicio que guarda o ve datos de tus clientes (web, correo, WhatsApp, pagos, nube, publicidad) se declara aquí. Si está fuera del Perú necesitas un contrato de encargo y comunicar el flujo a la ANPD.",
    minutes: 5,
    route: { href: "/app/herramientas", label: "Ir a Herramientas" },
    keywords: ["herramientas", "proveedores", "google", "microsoft", "meta", "whatsapp business", "shopify", "aws", "nube", "hosting", "pagos", "culqi", "niubiz", "izipay", "mailchimp", "analitica", "pixel", "extranjero", "flujo transfronterizo", "transferencia internacional", "encargo", "dpa", "contrato", "estados unidos", "crm"],
    blocks: [
      { t: "p", text: "Cuando usas Google Workspace, WhatsApp Business, Shopify, un sistema de facturación o un hosting, esas empresas **tratan datos por tu cuenta** (son «encargados»). Tú sigues siendo el responsable. Por eso se declaran." },
      { t: "h", text: "Cómo declararlas" },
      { t: "p", text: "En la pantalla marcas las herramientas del catálogo (organizado por tipo: correo, WhatsApp, almacenamiento, pagos, facturación, web, hosting, base de datos, login, analítica, publicidad, redes, CRM, IA, videollamadas, delivery, software sectorial, cámaras, RR. HH. y verificación de identidad) o agregas las tuyas. También puedes indicar que no usas ninguna." },
      { t: "h", text: "Los dos estados que importan" },
      { t: "facts", items: [
        { label: "Contrato de encargo", value: "Pendiente / Firmado / No aplica. Es el acuerdo que prohíbe al proveedor usar tus datos para otros fines. Muchos grandes proveedores ya lo traen en sus términos: guarda la prueba." },
        { label: "Comunicación a la ANPD", value: "Si el proveedor guarda datos fuera del Perú, el flujo transfronterizo se comunica a la ANPD (art. 21.2). Pasa de «Pendiente» a «Comunicado» cuando lo hagas." },
      ] },
      { t: "callout", tone: "law", title: "Es legal, pero hay que declararlo", text: "Usar proveedores en el exterior es normal y permitido. Lo que la ley pide es que el destino tenga un nivel de protección adecuado o garantías contractuales, que lo informes en tu política y que coincida con lo que dicen tus bancos." },
      { t: "callout", tone: "tip", text: "Cada vez que guardas cambios, tus documentos pueden quedar desactualizados (por ejemplo, la política y el encargo). Revísalos en Documentos." },
    ],
    related: ["bancos", "documentos", "catalogo-documentos"],
    ask: ["Uso Google y WhatsApp Business: ¿qué debo hacer?", "¿Qué es una transferencia internacional de datos?"],
  },
  {
    slug: "documentos",
    section: "configurar",
    title: "Documentos: generar, publicar y mantener",
    summary: "Cómo se arman con tus datos, cuáles se publican y qué hacer cuando quedan desactualizados.",
    tldr: "Los 14 documentos se generan con los datos de tu empresa, tus bancos y tus herramientas. Unos se publican (política, consentimientos), otros se firman (contratos) y otros se guardan (seguridad). Si cambias algo, el documento queda «desactualizado» y lo regeneras.",
    minutes: 5,
    route: { href: "/app/documentos", label: "Ir a Documentos" },
    keywords: ["documentos", "generar", "regenerar", "publicar", "politica de privacidad", "enlace publico", "desactualizado", "imprimir", "pdf", "descargar", "copiar", "borrador", "abogado", "asesor", "versiones", "esenciales"],
    blocks: [
      { t: "p", text: "En Documentos ves primero lo **esencial para tu negocio** y un asesor que, si le cuentas cómo vendes o atiendes, te dice cuáles documentos te corresponden. Luego están todos agrupados según qué debes hacer con ellos:" },
      { t: "facts", items: [
        { label: "Publicar o pegar", value: "Los ve tu cliente: política, términos, cookies, avisos cortos, libro de reclamaciones, consentimientos." },
        { label: "Hacer firmar", value: "Los firman tu equipo o proveedores: encargo, confidencialidad, aviso a trabajadores." },
        { label: "Guardar", value: "Quedan archivados por si la ANPD los pide: documento de seguridad, retención, EIPD, protocolo del rubro, procedimiento ARCO." },
      ] },
      { t: "h", text: "Cómo trabajar un documento" },
      { t: "steps", items: [
        { title: "Genera", text: "El documento se arma con tu empresa, bancos y herramientas." },
        { title: "Revisa", text: "Léelo completo: es un borrador. Cambia lo que no sea cierto en tu negocio (mejor en el banco o herramienta, para que todos los documentos coincidan)." },
        { title: "Usa", text: "Copia, imprime o descarga. La política además se **publica** con enlace propio." },
        { title: "Mantén", text: "Si aparece «desactualizado», regéneralo; tu enlace público no cambia." },
      ] },
      { t: "callout", tone: "warn", title: "Son borradores", text: "Los textos legales generados deben ser validados por un abogado antes de publicarse, especialmente si manejas datos sensibles, menores o transferencias grandes." },
      { t: "callout", tone: "tip", title: "Documento de seguridad", text: "Incluye un checklist de las medidas de los arts. 46 y 47. Marca solo las que aplicas: el documento afirma exactamente lo que marcaste." },
    ],
    related: ["catalogo-documentos", "bancos", "herramientas"],
    ask: ["¿Qué documentos necesita mi negocio?", "¿Cómo publico mi política de privacidad?", "¿Por qué mi documento está desactualizado?"],
  },
  {
    slug: "catalogo-documentos",
    section: "configurar",
    title: "Los 14 documentos: para qué sirve cada uno",
    summary: "Qué es, cuándo lo necesitas y dónde se usa cada documento.",
    tldr: "Esenciales para todos: política de privacidad, textos de consentimiento, documento de seguridad, confidencialidad y cartel CCTV, y procedimiento ARCO. El resto depende de si vendes online, tienes trabajadores, atiendes consumidores, usas IA, etc.",
    minutes: 6,
    route: { href: "/app/documentos", label: "Ir a Documentos" },
    keywords: ["politica de privacidad", "terminos y condiciones", "cookies", "avisos cortos", "libro de reclamaciones", "consentimiento", "documento de seguridad", "retencion", "eliminacion", "encargo", "confidencialidad", "cartel", "camaras", "eipd", "evaluacion de impacto", "trabajadores", "protocolo", "arco", "procedimiento", "cuales necesito"],
    blocks: [
      { t: "h", text: "Para publicar o pegar (los ve tu cliente)" },
      { t: "facts", items: [
        { label: "Política de privacidad ★", value: "El documento central: quién trata los datos, para qué, con qué base legal, a quién se entregan y cómo ejercer ARCO. Va en tu web, pie de página, Instagram o WhatsApp Business. Todos los negocios." },
        { label: "Términos y condiciones", value: "Contrato con el usuario: planes, precios con IGV, renovación, reembolsos, uso aceptable. Si vendes o cobras por web o app." },
        { label: "Política de cookies", value: "Qué cookies usas, para qué y cómo revocarlas. Si tu web usa analítica, píxeles o publicidad." },
        { label: "Avisos cortos", value: "El aviso del art. 18 en el punto donde pides datos: formularios, checkout, WhatsApp, firma de correo, boletas." },
        { label: "Libro de Reclamaciones", value: "Aviso, hoja y procedimiento de 30 días calendario (Ley 29571). Si atiendes consumidores finales." },
        { label: "Textos de consentimiento ★", value: "Casillas por finalidad, opt-in de WhatsApp, doble opt-in de correo y autorización escrita para datos sensibles. Antes de enviar publicidad." },
      ] },
      { t: "h", text: "Para hacer firmar (equipo y proveedores)" },
      { t: "facts", items: [
        { label: "Encargo y transferencias", value: "Cláusula de encargado, anexo de proveedores y cláusula de flujo transfronterizo. Si un proveedor trata datos por ti (contador, nube, courier)." },
        { label: "Confidencialidad y cartel CCTV ★", value: "Compromiso de confidencialidad, cláusula para proveedores, cartel de videovigilancia y acta del responsable de privacidad." },
        { label: "Aviso para trabajadores", value: "Aviso laboral, autorización para datos sensibles, aviso a postulantes, monitoreo y constancia de capacitación. Si tienes trabajadores, practicantes o recibes CVs." },
      ] },
      { t: "h", text: "Para guardar (por si te fiscalizan)" },
      { t: "facts", items: [
        { label: "Documento de seguridad ★", value: "Manual interno: inventario de bancos, accesos, respaldos, retención y protocolo de incidentes de 48 horas. No se publica; se guarda firmado." },
        { label: "Retención y eliminación", value: "Cuánto se guarda cada banco y cómo se acredita la purga. Complementa al Documento de seguridad." },
        { label: "Evaluación de impacto (EIPD)", value: "Análisis de riesgos cuando usas IA, perfilado o datos sensibles a gran escala. Facultativa (art. 40) pero se considera al graduar multas." },
        { label: "Protocolo de tu rubro", value: "Pasos diarios, normas sectoriales y riesgos típicos de tu tipo de negocio." },
        { label: "Procedimiento de derechos ARCO ★", value: "Quién atiende, plazos de 8, 10 y 20 días hábiles, subsanación, ampliación y registro de evidencia." },
      ] },
      { t: "p", text: "★ = forma parte del plan básico de cumplimiento de todos los negocios." },
    ],
    related: ["documentos", "arco", "casos-especiales"],
    ask: ["¿Para qué sirve el documento de seguridad?", "¿Necesito términos y condiciones?", "¿Qué es una EIPD?"],
  },

  /* ------------------------------- Atender -------------------------------- */
  {
    slug: "arco",
    section: "atender",
    title: "Solicitudes ARCO: responder a las personas",
    summary: "Qué son, cómo llegan, los plazos y cómo responder sin equivocarte.",
    tldr: "Cualquier persona puede pedirte acceso, rectificación, cancelación u oposición sobre sus datos. Entra por tu página pública con ticket y plazo automático (8, 10 o 20 días hábiles). Respondes desde la app con plantillas y queda la evidencia.",
    minutes: 6,
    route: { href: "/app/arco", label: "Ir a Solicitudes ARCO" },
    keywords: ["arco", "acceso", "rectificacion", "cancelacion", "supresion", "oposicion", "portabilidad", "informacion", "revocar consentimiento", "plazo", "dias habiles", "ticket", "ampliar", "denegar", "borrar mis datos", "titular", "formulario publico", "respuesta", "vencido", "tutela", "feriados", "dar de baja"],
    blocks: [
      { t: "h", text: "Los derechos" },
      { t: "facts", items: [
        { label: "Acceso (20 días hábiles)", value: "La persona pide saber qué datos tuyos tienes sobre ella. La portabilidad se atiende igual." },
        { label: "Rectificación (10 días)", value: "Pide corregir o actualizar datos errados." },
        { label: "Cancelación o supresión (10 días)", value: "Pide que borres sus datos. Los comprobantes de pago y la planilla se mantienen **bloqueados 5 años** por ley." },
        { label: "Oposición (10 días)", value: "Pide que dejes de usar sus datos para un fin (por ejemplo, publicidad)." },
        { label: "Información (8 días)", value: "Pide saber cómo se tratan sus datos." },
        { label: "Revocar consentimiento (10 días)", value: "Retira el permiso dado, por ejemplo, para recibir promociones." },
      ] },
      { t: "p", text: "Los plazos son **días hábiles** (sin sábados, domingos ni feriados nacionales; la app los calcula sola) contados desde el día siguiente de presentada la solicitud. Salvo información, se pueden **ampliar una sola vez por un plazo igual** comunicándolo dentro del plazo original." },
      { t: "h", text: "El flujo en la app" },
      { t: "steps", items: [
        { title: "Comparte tu página pública", text: "En Mi plan y en la bandeja ves el enlace del formulario ARCO de tu empresa. Pégalo en tu política y en tu web." },
        { title: "La solicitud llega con ticket", text: "Recibes un aviso y la persona recibe la confirmación. El plazo corre desde el primer día." },
        { title: "Si te escriben por otro canal", text: "Regístrala tú con «Registrar solicitud recibida por otro canal» (correo, WhatsApp, presencial): así también tiene ticket y plazo." },
        { title: "Verifica la identidad", text: "Pide copia del DNI si hay dudas de que es el titular." },
        { title: "Responde", text: "Usa «Restaurar plantilla» para partir del texto base, ajústalo y marca como respondida. Queda la fecha como evidencia (aunque respondas tarde, no se borra)." },
        { title: "Si no puedes atender", text: "Puedes denegar con motivo (por ejemplo, obligación legal de conservar). Explícalo siempre por escrito." },
      ] },
      { t: "h", text: "Estados" },
      { t: "list", items: ["**Nuevo**: llegó y nadie la tocó.", "**En proceso**: la estás atendiendo.", "**Respondido**: ya contestaste.", "**Vencido**: pasó el plazo sin respuesta. Es una infracción y resta puntos.", "**Rechazado**: denegada con motivo."] },
      { t: "callout", tone: "warn", title: "Si no respondes", text: "La persona puede iniciar un Procedimiento Trilateral de Tutela ante la ANPD o acudir al Poder Judicial (hábeas data), y tú podrías ser sancionado." },
      { t: "callout", tone: "tip", title: "Plan Pro: Copiloto ARCO con IA", text: "Dentro de cada solicitud, el Copiloto identifica qué derecho se ejerce, el riesgo, los pasos internos y te redacta una respuesta a medida." },
    ],
    related: ["evidencias", "catalogo-documentos", "asistente-ia"],
    ask: ["¿Cuánto tiempo tengo para responder una solicitud ARCO?", "Un cliente pide que borre sus datos, ¿qué hago?", "¿Puedo ampliar el plazo?"],
  },
  {
    slug: "incidentes",
    section: "atender",
    title: "Incidentes: qué hacer si se pierden o filtran datos",
    summary: "El reloj de 48 horas, los criterios del art. 34.1 y cómo registrar el caso.",
    tldr: "Si hay un robo, pérdida, hackeo o envío por error de datos, lo registras de inmediato. Si cumple algún criterio (muchas personas, datos sensibles, gran volumen o daño evidente) tienes 48 horas para notificar a la ANPD. Si no cumple, igual lo documentas.",
    minutes: 5,
    route: { href: "/app/incidentes", label: "Ir a Incidentes" },
    keywords: ["incidente", "brecha", "filtracion", "hackeo", "robo", "perdida", "laptop", "celular", "ransomware", "virus", "correo por error", "copia oculta", "48 horas", "notificar", "anpd", "cnsd", "afectados", "art 34", "art 35", "phishing"],
    blocks: [
      { t: "p", text: "Un **incidente de seguridad** es cualquier hecho que expone, pierde o altera datos personales sin autorización: te robaron una laptop, hackearon tu correo, enviaste la lista de clientes a todos sin copia oculta, un trabajador se llevó la base de datos." },
      { t: "h", text: "Qué hacer, en orden" },
      { t: "steps", items: [
        { title: "Contén el problema", text: "Cambia claves, bloquea el equipo, recupera el correo enviado. No borres evidencia." },
        { title: "Regístralo en Incidentes", text: "Con qué pasó, cuándo te enteraste, qué datos, cuántas personas y qué medidas tomaste." },
        { title: "Marca los criterios del art. 34.1", text: "Afecta a muchas personas, datos sensibles, gran volumen o daño evidente. Con **uno solo** corre el reloj de 48 horas." },
        { title: "Notifica a la ANPD", text: "Usa el «Borrador para la ANPD» que genera la app dentro del incidente (con botón de copiar). Si fue en entorno digital, también corresponde reportarlo al Centro Nacional de Seguridad Digital (CNSD). Marca el incidente como «Notificado»." },
        { title: "Avisa a los afectados", text: "En lenguaje claro y dentro de las 48 horas si el incidente los afecta (art. 34.3). El Asistente legal puede redactarte el mensaje." },
        { title: "Cierra y aprende", text: "Cuando se supera, ciérralo anotando qué cambiarás para que no se repita." },
      ] },
      { t: "callout", tone: "law", title: "Si no cumple ningún criterio", text: "No debes notificar a la ANPD, pero sí **documentarlo** internamente (art. 35). La app guarda el análisis de por qué no correspondía." },
      { t: "callout", tone: "warn", title: "El reloj", text: "Las 48 horas cuentan desde que te enteras. Si notificas después, debes explicar el motivo de la demora. Pasadas las 48 h sin notificación registrada, aparece una alerta roja y se restan 15 puntos." },
      { t: "callout", tone: "tip", title: "Plan Pro: Evaluador IA de incidentes", text: "Dentro de cada incidente la IA te ayuda a decidir si corresponde notificar, estima el riesgo y propone pasos." },
    ],
    related: ["catalogo-documentos", "evidencias", "asistente-ia"],
    ask: ["Perdí una laptop con datos de clientes: ¿qué hago?", "¿Cuándo debo avisar a la ANPD?", "Envié un correo a todos sin copia oculta, ¿es un incidente?"],
  },
  {
    slug: "evidencias",
    section: "atender",
    title: "Evidencias: demuestra que cumples",
    summary: "Cinco tipos de pruebas con fecha que la ANPD puede pedirte.",
    tldr: "Tener documentos no basta: en una fiscalización pides demostrar que aplicas las medidas. Aquí registras con fecha consentimientos, capacitaciones, revisiones de accesos, pruebas de respaldo y purgas.",
    minutes: 3,
    route: { href: "/app/evidencias", label: "Ir a Evidencias" },
    keywords: ["evidencia", "prueba", "constancia", "fiscalizacion", "inspeccion", "capacitacion", "revision de accesos", "respaldo", "backup", "purga", "eliminar datos", "consentimientos", "semestral", "auditoria"],
    blocks: [
      { t: "facts", items: [
        { label: "Consentimientos", value: "La carga de la prueba es tuya (art. 9). Anota cómo y cuándo obtuviste cada permiso (capturas, formularios)." },
        { label: "Capacitaciones", value: "El plan de capacitación del personal es una medida de seguridad (art. 46.2)." },
        { label: "Revisiones de accesos", value: "Verifica quién accede a qué como mínimo cada **seis meses** (art. 46.1.c). Si pasan más, aparece una alerta." },
        { label: "Pruebas de respaldo", value: "Verifica que las copias se pueden restaurar (art. 51.2)." },
        { label: "Purgas de datos", value: "Cada eliminación demuestra minimización y cumplimiento de tus plazos." },
      ] },
      { t: "p", text: "Cada registro lleva **fecha** (hoy o una anterior, nunca futura) y una descripción corta. Puedes eliminar uno si te equivocaste." },
      { t: "callout", tone: "tip", text: "Hazlo en el momento, en 30 segundos. Lo que no está registrado, ante la ANPD es lo mismo que no hecho." },
    ],
    related: ["catalogo-documentos", "mantenimiento", "arco"],
    ask: ["¿Qué evidencias debo guardar?", "¿Cada cuánto reviso accesos?"],
  },
  {
    slug: "casos-especiales",
    section: "atender",
    title: "Casos especiales: cámaras, WhatsApp, menores, salud y más",
    summary: "Lo que cambia según tu negocio, en lenguaje simple.",
    tldr: "Cámaras: cartel y 30–60 días. WhatsApp y correo de promociones: opt-in. Salud, huellas y datos sensibles: consentimiento escrito. Menores de 14: permiso de sus padres. Trabajadores: aviso laboral. IA: consentimiento y evaluación de impacto.",
    minutes: 5,
    route: { href: "/app/documentos", label: "Ir a Documentos" },
    keywords: ["camaras", "cctv", "videovigilancia", "whatsapp", "promociones", "publicidad", "sorteos", "sensibles", "salud", "pacientes", "huella", "biometria", "menores", "ninos", "colegio", "trabajadores", "cv", "postulantes", "ia", "inteligencia artificial", "fotos", "imagen", "newsletter", "cookies"],
    blocks: [
      { t: "h", text: "Cámaras de seguridad" },
      { t: "list", items: ["Son un banco de datos: declara «Videovigilancia».", "Pon un **cartel visible** en el ingreso (plantilla en Documentos → Confidencialidad y cartel CCTV).", "Conserva las grabaciones **30 a 60 días** y elimínalas después, salvo pedido de una autoridad.", "No grabes baños, vestidores ni audio de conversaciones."] },
      { t: "h", text: "Promociones por WhatsApp, correo y redes" },
      { t: "list", items: ["Necesitas un **«sí» claro y separado** antes de enviar publicidad; tener el número no basta.", "Usa los **textos de consentimiento** (casillas por finalidad, opt-in de WhatsApp, doble opt-in de correo).", "Cada baja o «no quiero recibir más» se atiende ya: es un derecho de oposición.", "Anota cómo obtuviste cada permiso en **Evidencias → Consentimientos**."] },
      { t: "h", text: "Datos sensibles (salud, biometría, ingresos…)" },
      { t: "list", items: ["Requieren consentimiento **por escrito** (art. 13.6): hay un formato en Textos de consentimiento.", "Exigen medidas de seguridad reforzadas.", "Una filtración de datos sensibles cumple un criterio del art. 34.1: reloj de 48 horas."] },
      { t: "h", text: "Menores de edad" },
      { t: "list", items: ["Menores de 14 años: consentimiento de sus padres o tutores.", "De 14 a 17: pueden consentir según su capacidad, con información en lenguaje comprensible (art. 22 del Reglamento).", "Las fotos de alumnos para redes necesitan una autorización aparte."] },
      { t: "h", text: "Trabajadores y postulantes" },
      { t: "list", items: ["Declara «Colaboradores y postulantes» si tienes personal o recibes CVs.", "Entrega el **aviso para trabajadores** al firmar contrato y archiva el cargo.", "Si monitoreas computadoras o usas biometría para asistencia, debe constar en el aviso."] },
      { t: "h", text: "Inteligencia artificial en tu negocio" },
      { t: "p", text: "Si tu negocio usa IA para decidir sobre personas (perfilado, voz, reconocimiento) conviene una **Evaluación de impacto (EIPD)** antes de empezar y declarar la herramienta de IA en Herramientas." },
      { t: "callout", tone: "tip", text: "Si no encuentras tu caso, describe tu negocio al Asistente legal: te dice qué listas y documentos corresponden." },
    ],
    related: ["catalogo-documentos", "bancos", "asistente-ia"],
    ask: ["Tengo cámaras en mi local, ¿qué hago?", "¿Cómo pido permiso para enviar promociones por WhatsApp?", "Atiendo menores de edad, ¿qué cambia?"],
  },
  {
    slug: "mantenimiento",
    section: "atender",
    title: "Rutina de mantenimiento: qué revisar y cuándo",
    summary: "Un calendario simple para mantener tu cumplimiento al día.",
    tldr: "Semanal: mira Mi plan. Cada vez que cambias algo: regenera documentos y actualiza el SIPDP. Cada 6 meses: revisión de accesos, prueba de respaldo y capacitación. Anual: repasa bancos, herramientas y plazos.",
    minutes: 3,
    route: { href: "/app", label: "Abrir Mi plan" },
    keywords: ["mantenimiento", "rutina", "calendario", "cada cuanto", "periodico", "semestral", "anual", "recordatorio", "actualizar", "revision"],
    blocks: [
      { t: "facts", items: [
        { label: "Cada semana (2 min)", value: "Abre Mi plan: revisa alertas y solicitudes ARCO abiertas." },
        { label: "Cada vez que cambies algo", value: "Nuevo proveedor, nueva lista, nuevo local o canal: actualiza bancos y herramientas, regenera documentos «desactualizados» y actualiza la ficha del SIPDP." },
        { label: "Cada mes", value: "Registra una evidencia de cualquier purga hecha (cámaras, CVs antiguos)." },
        { label: "Cada 6 meses", value: "Revisión de accesos, prueba de restauración de respaldo y capacitación breve al equipo." },
        { label: "Cada año", value: "Repasa tus bancos y plazos, vuelve a leer tu política y confirma que lo que dice es cierto." },
      ] },
      { t: "p", text: "La app te recuerda lo que vence con alertas en Mi plan y avisos por correo (puedes desactivarlos en Ajustes)." },
    ],
    related: ["evidencias", "panel", "documentos"],
    ask: ["¿Qué debo revisar cada mes?"],
  },

  /* --------------------------------- IA ---------------------------------- */
  {
    slug: "asistente-ia",
    section: "ia",
    title: "Asistente legal con IA: qué puede hacer y cómo usarlo",
    summary: "Pregunta en lenguaje normal, pide borradores y usa las herramientas Pro.",
    tldr: "El asistente conoce la ley y toda esta app: puedes preguntarle «¿cómo hago X?», «¿qué me falta?» o pedirle un correo o una respuesta ARCO. Está en el botón flotante de cada pantalla y en el menú. Anonimiza tus datos antes de enviarlos y respeta el límite mensual de tu plan.",
    minutes: 5,
    route: { href: "/app/asistente", label: "Abrir el asistente" },
    keywords: ["asistente", "ia", "inteligencia artificial", "chat", "preguntar", "redactar", "borrador", "anonimizar", "consentimiento ia", "cuota", "consultas", "modo basico", "copiloto", "auditor", "evaluador", "autocompletado", "pro"],
    blocks: [
      { t: "h", text: "Qué puedes preguntarle" },
      { t: "list", items: [
        "**Sobre la ley**: plazos, multas, qué es un banco de datos, si te aplica algo.",
        "**Sobre la app**: «¿cómo inscribo un banco?», «¿dónde publico mi política?», «¿qué significa Borrador?». Conoce todo el contenido de esta Ayuda.",
        "**Sobre tu situación**: «¿qué me falta?», «¿cómo voy?».",
        "**Para tu rubro**: «soy un gimnasio, ¿qué necesito?».",
        "**Redacción**: respuestas ARCO, correos a proveedores, avisos a afectados, cláusulas.",
      ] },
      { t: "h", text: "Dónde está" },
      { t: "p", text: "En el botón flotante de cada pantalla del panel y en el menú «Asistente legal». En esta Ayuda, cada artículo trae preguntas sugeridas que abren el asistente con la pregunta lista." },
      { t: "h", text: "Modo básico y modo IA" },
      { t: "list", items: ["**IA activa**: responde preguntas abiertas y redacta textos libres.", "**Modo básico**: respuestas predefinidas y verificadas (plazos, consentimiento, incidentes, qué necesita tu rubro, cómo usar la app). Se usa cuando la IA no está conectada, no la activaste o agotaste tus consultas."] },
      { t: "h", text: "Privacidad: cómo se protegen tus datos" },
      { t: "steps", items: [
        { title: "Activas la IA una vez", text: "En Ajustes → Inteligencia artificial aceptas el envío anonimizado. Puedes desactivarla cuando quieras." },
        { title: "Anonimizamos antes de enviar", text: "Nombres, RUC, correos, teléfonos y documentos se reemplazan por marcadores como {{EMPRESA_NOMBRE}}." },
        { title: "Se restituyen al volver", text: "La respuesta se completa aquí con tus datos reales." },
      ] },
      { t: "callout", tone: "warn", text: "El proveedor del modelo está en el extranjero (EE. UU.). No pegues datos de personas que no aceptaron ese uso. Todo lo que genera la IA es un borrador: revísalo." },
      { t: "h", text: "Cuota mensual" },
      { t: "p", text: "Plan Básico: **60 consultas al mes**. Plan Pro: **400**. Se cuentan por mes calendario (hora de Lima). Si se agotan, sigues usando el modo básico." },
      { t: "h", text: "Herramientas de IA del Plan Pro" },
      { t: "facts", items: [
        { label: "Copiloto de solicitudes ARCO", value: "Dentro de cada solicitud: detecta el derecho, el riesgo y redacta la respuesta." },
        { label: "Autocompletado de bancos", value: "En Nuevo banco: describes tu forma de manejar datos y completa los campos." },
        { label: "Evaluador de incidentes", value: "En cada incidente: te orienta sobre si notificar y cómo." },
        { label: "Auditor de formularios y WhatsApp", value: "En Documentos → Textos de consentimiento: pegas tu formulario o mensaje y te dice qué le falta." },
      ] },
      { t: "p", text: "Para todos los planes: el **Asesor de documentos** en Documentos, donde cuentas cómo vendes o atiendes y te dice cuáles documentos te corresponden." },
    ],
    related: ["plan-y-pagos", "arco", "incidentes"],
    ask: ["¿Qué puedes hacer por mí?", "¿Mis datos están seguros cuando uso la IA?", "¿Cuántas consultas me quedan?"],
  },

  /* -------------------------------- Cuenta -------------------------------- */
  {
    slug: "plan-y-pagos",
    section: "cuenta",
    title: "Plan, pagos y facturas",
    summary: "Qué incluye Básico y Pro, cómo se cobra, cómo cambiar o cancelar.",
    tldr: "Básico S/ 19 al mes y Pro S/ 39 al mes (anual: S/ 190 y S/ 390). Se cobra con MercadoPago o transferencia contra factura. Puedes cancelar desde Ajustes y mantienes el acceso hasta el fin del periodo pagado.",
    minutes: 3,
    route: { href: "/app/ajustes", label: "Ir a Ajustes" },
    keywords: ["plan", "precio", "basico", "pro", "mensual", "anual", "cancelar", "factura", "boleta", "igv", "mercadopago", "transferencia", "cambiar de plan", "renovacion", "pago", "suscripcion", "tarjeta"],
    blocks: [
      { t: "facts", items: [
        { label: "Básico: S/ 19 al mes o S/ 190 al año", value: "Para ordenar lo esencial: bodegas, consultorios, tiendas y estudios que empiezan. Incluye todo el expediente (bancos, herramientas, documentos, ARCO, incidentes, evidencias), asistente legal con 60 consultas de IA al mes y asesor de documentos." },
        { label: "Pro: S/ 39 al mes o S/ 390 al año", value: "Para consultorios y equipos con varios profesionales, sedes o canales. Suma el Copiloto ARCO, el autocompletado de bancos, el evaluador de incidentes, el auditor de formularios y 400 consultas de IA al mes." },
      ] },
      { t: "p", text: "Precios con IGV. El plan anual cobra 12 meses y regala 2." },
      { t: "h", text: "Qué puedes hacer en Ajustes" },
      { t: "list", items: ["Ver tu plan y tu próxima fecha de cobro.", "**Cambiar de plan o de periodo**: el anterior se cancela cuando el nuevo queda autorizado.", "**Cancelar la suscripción**: conservas el acceso hasta el final del periodo pagado.", "Ver tus **pagos y facturas** (cada pago aprobado genera su factura electrónica con IGV desglosado)."] },
      { t: "callout", tone: "tip", text: "Si pagas por transferencia, recibes los datos bancarios por correo; el plan se activa o renueva cuando se confirma el dinero." },
    ],
    related: ["registro-y-activacion", "cuenta-seguridad", "asistente-ia"],
    ask: ["¿Cómo cancelo mi suscripción?", "¿Qué incluye el plan Pro?"],
  },
  {
    slug: "cuenta-seguridad",
    section: "cuenta",
    title: "Tu cuenta: contraseña, correo, exportar y eliminar",
    summary: "Gestiona tu acceso, tus avisos y tus datos dentro de DatosPrivados.",
    tldr: "En Ajustes cambias contraseña y correo, activas o desactivas la IA y los avisos por correo, descargas todo tu expediente en ZIP (documentos en texto, tablas en CSV y el JSON completo) y puedes eliminar la cuenta.",
    minutes: 2,
    route: { href: "/app/ajustes", label: "Ir a Ajustes" },
    keywords: ["contrasena", "password", "correo", "email", "cambiar", "exportar", "json", "zip", "csv", "respaldo", "eliminar cuenta", "borrar cuenta", "avisos", "notificaciones", "darme de baja", "descargar", "mis datos", "cerrar sesion", "salir"],
    blocks: [
      { t: "list", items: [
        "**Contraseña**: cámbiala cuando quieras. Si la olvidas, usa «Olvidé mi contraseña» al ingresar.",
        "**Correo de acceso**: al cambiarlo, confirmas desde el nuevo correo.",
        "**Inteligencia artificial**: activa o desactiva el envío anonimizado, y ve cuántas consultas llevas este mes.",
        "**Avisos por correo**: elige si recibes recordatorios y resúmenes.",
        "**Exportar el expediente**: descarga un ZIP con tus documentos en texto, tus tablas en CSV y el JSON completo. Sirve de respaldo o para dárselo a tu abogado o contador.",
        "**Eliminar la cuenta**: borra tu empresa y sus datos de DatosPrivados. Exporta antes tu expediente: no se puede deshacer.",
      ] },
      { t: "callout", tone: "tip", text: "Para salir de la app usa «Salir» al pie del menú (o arriba en el celular)." },
    ],
    related: ["plan-y-pagos", "asistente-ia"],
    ask: ["¿Cómo descargo mis datos?", "¿Cómo elimino mi cuenta?"],
  },
];

/* -------------------------------------------------------------------------- */
/*  Ruta de la A a la Z                                                       */
/* -------------------------------------------------------------------------- */

/** Claves de `ComplianceItem.key` que marcan un paso como hecho automáticamente. */
export type JourneyDoneKey =
  | "perfil"
  | "bancos"
  | "sipdp"
  | "herramientas"
  | "politica"
  | "consentimiento"
  | "seguridad"
  | "clausulas";

export type JourneyStep = {
  id: string;
  title: string;
  why: string;
  minutes: number;
  topic: string;
  href: string;
  cta: string;
  /** Si existe, el paso se marca solo cuando ese ítem del puntaje está completo. */
  doneKey?: JourneyDoneKey;
  /** Pasos recurrentes u opcionales que no se pueden comprobar solos. */
  manual?: boolean;
};

export const JOURNEY: JourneyStep[] = [
  { id: "ley", title: "Entiende qué te pide la ley", why: "Para saber por qué haces cada paso y qué te protege de multas.", minutes: 10, topic: "la-ley-en-simple", href: "/app/ayuda/la-ley-en-simple", cta: "Leer en 6 minutos", manual: true },
  { id: "cuenta", title: "Crea tu cuenta y activa tu plan", why: "Es lo que abre el panel con tu expediente.", minutes: 5, topic: "registro-y-activacion", href: "/app/ajustes", cta: "Ver mi plan", manual: true },
  { id: "empresa", title: "Completa los datos de tu empresa", why: "Aparecen escritos en tus documentos: dirección, contacto y responsable.", minutes: 5, topic: "empresa", href: "/app/empresa", cta: "Completar datos", doneKey: "perfil" },
  { id: "bancos", title: "Declara tus bancos de datos", why: "Son tus listas de personas: la base de todo el cumplimiento.", minutes: 20, topic: "bancos", href: "/app/bancos", cta: "Declarar listas", doneKey: "bancos" },
  { id: "herramientas", title: "Declara las herramientas que usas", why: "Web, correo, WhatsApp, pagos y nube: determinan tus transferencias y contratos.", minutes: 10, topic: "herramientas", href: "/app/herramientas", cta: "Declarar herramientas", doneKey: "herramientas" },
  { id: "sipdp", title: "Inscribe tus bancos en el SIPDP", why: "Es gratis y su falta es la infracción más común.", minutes: 30, topic: "inscripcion-sipdp", href: "/app/bancos", cta: "Inscribir", doneKey: "sipdp" },
  { id: "politica", title: "Publica tu política de privacidad", why: "Cumple tu deber de informar con un enlace para tu web y redes.", minutes: 10, topic: "documentos", href: "/app/documentos?tab=politica", cta: "Revisar y publicar", doneKey: "politica" },
  { id: "consentimiento", title: "Usa los textos de consentimiento", why: "Te permiten demostrar que la persona aceptó recibir publicidad.", minutes: 10, topic: "casos-especiales", href: "/app/documentos?tab=consentimiento", cta: "Generar textos", doneKey: "consentimiento" },
  { id: "seguridad", title: "Genera tu Documento de Seguridad", why: "Tu manual interno de medidas; lo primero que pide la ANPD.", minutes: 15, topic: "catalogo-documentos", href: "/app/documentos?tab=seguridad", cta: "Generar documento", doneKey: "seguridad" },
  { id: "clausulas", title: "Haz firmar confidencialidad y contratos", why: "Obliga a tu equipo y proveedores a guardar reserva; incluye el cartel de cámaras.", minutes: 15, topic: "catalogo-documentos", href: "/app/documentos?tab=clausulas", cta: "Generar formatos", doneKey: "clausulas" },
  { id: "arco", title: "Deja lista la atención de solicitudes ARCO", why: "Cualquiera puede pedirte sus datos y el plazo corre desde el primer día.", minutes: 5, topic: "arco", href: "/app/arco", cta: "Ver mi bandeja", manual: true },
  { id: "incidentes", title: "Conoce el plan para incidentes", why: "Con 48 horas para reaccionar, no es momento de aprender.", minutes: 5, topic: "incidentes", href: "/app/incidentes", cta: "Ver cómo funciona", manual: true },
  { id: "evidencias", title: "Registra tus evidencias", why: "Demuestra con fechas que aplicas lo que declaras.", minutes: 5, topic: "evidencias", href: "/app/evidencias", cta: "Registrar evidencia", manual: true },
  { id: "mantener", title: "Mantén tu cumplimiento al día", why: "La ley es continua: pequeñas revisiones evitan grandes multas.", minutes: 5, topic: "mantenimiento", href: "/app/ayuda/mantenimiento", cta: "Ver la rutina", manual: true },
];

/* -------------------------------------------------------------------------- */
/*  «¿Qué necesita mi negocio?»                                               */
/* -------------------------------------------------------------------------- */

export type NeedOption = {
  id: string;
  label: string;
  hint: string;
  /** Ids de plantillas de bancos de `bank-presets.ts`. */
  banks: string[];
  /** Claves de DocumentKind. */
  docs: string[];
  topic?: string;
  note?: string;
};

/** Documentos y bancos que necesita todo negocio. */
export const BASE_NEEDS = {
  banks: ["clientes"],
  docs: ["politica", "consentimiento", "seguridad", "clausulas", "arco"],
};

export const NEEDS: NeedOption[] = [
  { id: "online", label: "Vendo o cobro por web, app o redes", hint: "Tienda online, suscripciones, reservas, checkout.", banks: ["usuarios_plataforma", "facturacion"], docs: ["terminos", "cookies", "aviso"], topic: "catalogo-documentos" },
  { id: "consumidores", label: "Atiendo al público (consumidores finales)", hint: "Tienda, restaurante, consultorio, academia.", banks: ["reclamaciones"], docs: ["reclamaciones"], topic: "catalogo-documentos" },
  { id: "trabajadores", label: "Tengo trabajadores, practicantes o recibo CVs", hint: "Aunque sea uno solo.", banks: ["trabajadores"], docs: ["trabajadores"], topic: "casos-especiales" },
  { id: "camaras", label: "Tengo cámaras de seguridad", hint: "En el local, almacén u oficina.", banks: ["camaras"], docs: ["retencion"], topic: "casos-especiales", note: "Cartel visible y grabaciones entre 30 y 60 días." },
  { id: "marketing", label: "Envío promociones por WhatsApp, correo o redes", hint: "Listas de difusión, newsletters, sorteos.", banks: ["marketing"], docs: ["aviso"], topic: "casos-especiales", note: "Necesitas un «sí» claro de cada persona y poder demostrarlo (Evidencias → Consentimientos)." },
  { id: "salud", label: "Manejo datos de salud, huellas, rostro o ingresos", hint: "Pacientes, historias clínicas, biometría para asistencia.", banks: ["pacientes"], docs: ["eipd"], topic: "casos-especiales", note: "Datos sensibles: consentimiento por escrito y medidas reforzadas." },
  { id: "menores", label: "Trato datos de menores de edad", hint: "Alumnos, hijos de clientes, actividades infantiles.", banks: ["alumnos"], docs: [], topic: "casos-especiales", note: "Menores de 14: consentimiento de sus padres o tutores." },
  { id: "nube", label: "Uso servicios en la nube o fuera del Perú", hint: "Google, Microsoft, Meta, Shopify, AWS, Mailchimp…", banks: [], docs: ["encargo"], topic: "herramientas", note: "Declara las herramientas y firma o guarda el contrato de encargo." },
  { id: "proveedores", label: "Un proveedor maneja datos por mí", hint: "Contador, courier, agencia de marketing, soporte técnico.", banks: ["proveedores"], docs: ["encargo"], topic: "herramientas" },
  { id: "ia", label: "Uso IA para decidir o analizar personas", hint: "Perfilado, scoring, voz, reconocimiento facial, chatbots con datos.", banks: [], docs: ["eipd"], topic: "casos-especiales" },
];

/** Etiqueta de cada documento para los resultados del «¿Qué necesita mi negocio?». */
export const DOC_LABELS: Record<string, string> = {
  politica: "Política de privacidad",
  terminos: "Términos y condiciones",
  cookies: "Política de cookies",
  aviso: "Avisos cortos",
  reclamaciones: "Libro de Reclamaciones",
  consentimiento: "Textos de consentimiento",
  seguridad: "Documento de seguridad",
  retencion: "Retención y eliminación",
  encargo: "Encargo y transferencias",
  clausulas: "Confidencialidad y cartel CCTV",
  eipd: "Evaluación de impacto (EIPD)",
  trabajadores: "Aviso para trabajadores",
  sectorial: "Protocolo de tu rubro",
  arco: "Procedimiento ARCO",
};

/* -------------------------------------------------------------------------- */
/*  Preguntas frecuentes                                                      */
/* -------------------------------------------------------------------------- */

export type Faq = { q: string; a: string; topic?: string; keywords?: string[] };

export const FAQ: Faq[] = [
  { q: "Soy un negocio muy pequeño, ¿igual me aplica la ley?", a: "Sí. La ley no distingue por tamaño: si tienes RUC y guardas datos de personas (aunque sea en Excel o WhatsApp), te aplica. Lo que cambia con el tamaño es el plazo para el Oficial de Datos Personales.", topic: "la-ley-en-simple" },
  { q: "¿Tengo que pagar para inscribir mis bancos de datos?", a: "No. Desde el reglamento de 2024 la inscripción en el SIPDP es gratuita y de aprobación automática. DatosPrivados no te cobra por inscribir: te da la ficha lista para copiar.", topic: "inscripcion-sipdp", keywords: ["costo", "tasa"] },
  { q: "¿DatosPrivados inscribe mis bancos por mí?", a: "No: el SIPDP exige que lo hagas con tu cuenta del portal. La app te entrega la ficha numerada como el formulario del Estado, con botón de copiar, y registra el código que te devuelve el portal.", topic: "inscripcion-sipdp" },
  { q: "¿Cuántos bancos de datos debo tener?", a: "Uno por cada propósito, no por cada archivo. Un negocio típico tiene entre 3 y 6: clientes, trabajadores, proveedores, cámaras, reclamaciones y, si hace promociones, prospectos. Elige tu rubro y te sugerimos los habituales.", topic: "bancos" },
  { q: "¿Qué es la finalidad y qué pongo?", a: "Es para qué usas los datos, en una frase concreta: «emitir comprobantes y coordinar entregas». Solo puedes usarlos para eso; si luego quieres hacer publicidad, necesitas permiso aparte.", topic: "bancos" },
  { q: "¿Qué pasa si mis documentos aparecen como «desactualizados»?", a: "Cambiaste bancos, herramientas o datos de tu empresa desde que los generaste. Regenéralos en Documentos: se reescriben con la información actual y tu enlace público no cambia.", topic: "documentos" },
  { q: "¿Los documentos reemplazan a un abogado?", a: "No. Son borradores bien armados con los datos de tu empresa y la norma vigente. Para casos complejos (datos de salud masivos, menores, transferencias grandes) conviene una revisión legal.", topic: "documentos" },
  { q: "¿Dónde publico mi política de privacidad?", a: "Al publicarla en Documentos obtienes un enlace permanente. Pégalo en el pie de tu web, en la bio de Instagram, en el perfil de WhatsApp Business y en tus formularios.", topic: "documentos" },
  { q: "¿Cuánto tiempo tengo para responder una solicitud ARCO?", a: "Depende del derecho, en días hábiles: información 8, rectificación/cancelación/oposición 10, acceso y portabilidad 20. Se puede ampliar una vez por un plazo igual si avisas dentro del plazo.", topic: "arco", keywords: ["plazo", "dias"] },
  { q: "Un cliente me pide que borre sus datos, ¿borro todo?", a: "Lo sacas de inmediato de listas de marketing y WhatsApp, pero los comprobantes de pago (boletas, facturas) y la planilla deben conservarse bloqueados 5 años por ley tributaria y laboral. Se lo explicas en la respuesta.", topic: "arco", keywords: ["cancelacion", "supresion"] },
  { q: "Alguien me escribió por WhatsApp pidiendo sus datos: ¿cuenta como solicitud ARCO?", a: "Sí, llega por cualquier canal. Regístrala en Solicitudes ARCO con «Registrar solicitud recibida por otro canal» para que tenga ticket y el plazo corra automáticamente.", topic: "arco" },
  { q: "¿Qué hago si pierdo una laptop o me hackean el correo?", a: "Regístralo ya en Incidentes. Marca los criterios del art. 34.1: si cumple alguno, tienes 48 horas para notificar a la ANPD (y avisar a los afectados). Si no cumple, igual lo documentas.", topic: "incidentes" },
  { q: "¿Desde cuándo cuentan las 48 horas?", a: "Desde que tomas conocimiento del incidente, no desde que ocurrió. Si notificas después, debes explicar el motivo de la demora.", topic: "incidentes" },
  { q: "¿Necesito un Oficial de Datos Personales?", a: "Solo si tratas grandes volúmenes o datos sensibles como parte de tu actividad (art. 37). Para microempresas el plazo es desde el 30 de noviembre de 2028. Mientras tanto basta con un responsable de privacidad interno.", topic: "empresa" },
  { q: "Si uso Google, WhatsApp o Shopify, ¿mando datos al extranjero?", a: "Sí, esos servicios guardan datos fuera del Perú. Es legal, pero debes declarar las herramientas, marcar la transferencia internacional en tus bancos, mencionarla en tu política y tener el contrato de encargo.", topic: "herramientas", keywords: ["transferencia", "extranjero"] },
  { q: "¿Necesito pedir permiso para enviar promociones?", a: "Sí. Necesitas un «sí» claro, separado de otros términos, antes de enviar publicidad por WhatsApp, correo o redes. Usa los textos de consentimiento y registra cómo lo obtuviste en Evidencias.", topic: "casos-especiales" },
  { q: "Tengo cámaras en mi local, ¿qué debo hacer?", a: "Declara un banco «Videovigilancia», coloca un cartel visible en el ingreso, conserva las grabaciones 30 a 60 días y no grabes baños ni vestidores. El cartel está en Documentos → Confidencialidad y cartel CCTV.", topic: "casos-especiales" },
  { q: "¿Qué son los datos sensibles?", a: "Salud, biometría (huella, rostro), ingresos económicos, origen racial, opiniones políticas, religión, afiliación sindical y vida sexual. Requieren consentimiento por escrito y más seguridad.", topic: "casos-especiales" },
  { q: "¿Cuánto es la multa si no cumplo?", a: "Leves: 0.5 a 5 UIT; graves: 5 a 50; muy graves: 50 a 100. Con la UIT 2026 (S/ 5,500) van de S/ 2,750 hasta S/ 550,000. No inscribir bancos o responder tarde un ARCO son infracciones leves.", topic: "la-ley-en-simple" },
  { q: "¿Cómo se calcula mi puntaje?", a: "Sumas puntos por cada paso de configuración (perfil 10, bancos 15, SIPDP 20, herramientas 10, política 15, consentimientos 10, seguridad 10, contratos 10) y se restan 15 por cada tipo de obligación vencida (ARCO fuera de plazo o incidente sin notificar).", topic: "panel" },
  { q: "¿Qué diferencia hay entre Básico y Pro?", a: "Ambos incluyen todo el expediente y el asistente legal. Pro agrega el Copiloto ARCO, el autocompletado de bancos, el evaluador de incidentes, el auditor de formularios y 400 consultas de IA al mes (Básico tiene 60).", topic: "plan-y-pagos" },
  { q: "¿Cómo cancelo mi suscripción?", a: "En Ajustes → Cancelar suscripción. Mantienes el acceso hasta el final del periodo ya pagado.", topic: "plan-y-pagos" },
  { q: "¿La IA ve los datos de mis clientes?", a: "Antes de enviar tu mensaje reemplazamos nombres, RUC, correos, teléfonos y documentos por marcadores. Aun así, no pegues datos de personas que no aceptaron ese uso. Puedes desactivar la IA en Ajustes.", topic: "asistente-ia" },
  { q: "El asistente dice «modo básico», ¿por qué?", a: "Porque la IA no está conectada en el servidor, no la activaste en Ajustes o agotaste tus consultas del mes. En modo básico sigue respondiendo preguntas frecuentes verificadas.", topic: "asistente-ia" },
  { q: "¿Puedo tener varios usuarios o varias empresas?", a: "Hoy cada cuenta es una empresa con un usuario. Si manejas varias empresas, cada una necesita su propia cuenta con su RUC.", topic: "que-es-datosprivados" },
  { q: "¿Cómo exporto o elimino mis datos?", a: "En Ajustes puedes descargar tu expediente completo en JSON y, si lo decides, eliminar la cuenta. Exporta antes: eliminar no se puede deshacer.", topic: "cuenta-seguridad" },
  { q: "No me llegó el correo de verificación o de recuperación", a: "Revisa spam y promociones. En la app puedes pedir otro correo de verificación; para la contraseña usa «Olvidé mi contraseña» en la pantalla de ingreso.", topic: "registro-y-activacion" },
];

/* -------------------------------------------------------------------------- */
/*  Mapa de pantallas                                                         */
/* -------------------------------------------------------------------------- */

export type Screen = { label: string; href: string; group: string; what: string; when: string; topic: string };

/** Cada pantalla del menú: para qué sirve y cuándo entrar. */
export const SCREENS: Screen[] = [
  { label: "Mi plan", href: "/app", group: "Inicio", what: "Tu puntaje de 0 a 100, las alertas y la lista de pasos pendientes.", when: "Cada vez que entres: te dice qué sigue.", topic: "panel" },
  { label: "Bancos de datos", href: "/app/bancos", group: "Configurar", what: "Tus listas de personas, su ficha para el SIPDP y el estado de inscripción.", when: "Al empezar y cada vez que sumes una lista nueva.", topic: "bancos" },
  { label: "Herramientas", href: "/app/herramientas", group: "Configurar", what: "Los programas que reciben datos (web, correo, WhatsApp, nube) y sus contratos.", when: "Al empezar y cuando cambies de proveedor.", topic: "herramientas" },
  { label: "Documentos", href: "/app/documentos", group: "Configurar", what: "Los 14 documentos legales armados con tus datos; la política se publica con enlace.", when: "Después de declarar bancos y herramientas.", topic: "documentos" },
  { label: "Evidencias", href: "/app/evidencias", group: "Atender", what: "Tus pruebas con fecha: consentimientos, capacitaciones, accesos, respaldos y purgas.", when: "En el momento en que hagas cada una.", topic: "evidencias" },
  { label: "Solicitudes ARCO", href: "/app/arco", group: "Atender", what: "Bandeja de personas que piden ver, corregir, borrar u oponerse al uso de sus datos.", when: "Cuando llegue una; el plazo corre solo.", topic: "arco" },
  { label: "Incidentes", href: "/app/incidentes", group: "Atender", what: "Registro de pérdidas, robos o filtraciones, con el reloj de 48 horas.", when: "Apenas te enteres de un problema.", topic: "incidentes" },
  { label: "Centro de ayuda", href: "/app/ayuda", group: "Ayuda", what: "Esta guía: ruta de la A a la Z, artículos, glosario y preguntas.", when: "Cuando tengas una duda o seas nuevo.", topic: "que-es-datosprivados" },
  { label: "Asistente legal", href: "/app/asistente", group: "Ayuda", what: "Chat con IA que conoce la ley y toda la app; redacta borradores.", when: "Cuando prefieras preguntar en tus palabras.", topic: "asistente-ia" },
  { label: "Empresa", href: "/app/empresa", group: "Cuenta", what: "Razón social, dirección, contacto y responsable de privacidad.", when: "Al empezar y cuando cambie algo.", topic: "empresa" },
  { label: "Ajustes", href: "/app/ajustes", group: "Cuenta", what: "Plan, pagos y facturas, contraseña, IA, avisos y exportar tu expediente.", when: "Para cambiar plan, cancelar o descargar tus datos.", topic: "plan-y-pagos" },
];

/* -------------------------------------------------------------------------- */
/*  Utilidades: texto plano y búsqueda                                        */
/* -------------------------------------------------------------------------- */

export function topicBySlug(slug: string): HelpTopic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

/** Convierte los `**negritas**` del contenido en texto sin marcas. */
export function stripMarks(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

export function blocksToPlainText(blocks: Block[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.t) {
      case "p":
        out.push(stripMarks(block.text));
        break;
      case "h":
        out.push(`${block.text}:`);
        break;
      case "list":
        out.push(...block.items.map((item) => `- ${stripMarks(item)}`));
        break;
      case "steps":
        out.push(...block.items.map((item, index) => `${index + 1}. ${stripMarks(item.title)}: ${stripMarks(item.text)}`));
        break;
      case "callout":
        out.push(`${block.title ? `${block.title}: ` : ""}${stripMarks(block.text)}`);
        break;
      case "facts":
        out.push(...block.items.map((item) => `- ${stripMarks(item.label)}: ${stripMarks(item.value)}`));
        break;
    }
  }
  return out.join("\n");
}

export function topicToPlainText(topic: HelpTopic): string {
  return `${topic.title}\nEn breve: ${topic.tldr}\n${blocksToPlainText(topic.blocks)}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "en", "a", "que", "es", "por", "para",
  "con", "mi", "mis", "tu", "tus", "se", "lo", "al", "del", "como", "cual", "cuales", "qu", "me", "te", "si", "no",
  "hay", "hago", "debo", "puedo", "tengo", "quiero", "necesito", "esta", "este", "eso", "son", "ser", "mas",
]);

export function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export type SearchDoc = {
  id: string;
  kind: "articulo" | "pregunta" | "glosario";
  title: string;
  /** Texto corto para mostrar bajo el título. */
  snippet: string;
  /** Texto completo, solo para puntuar. */
  body: string;
  keywords: string;
  href: string;
  section?: SectionId;
};

export type SearchHit = { doc: SearchDoc; score: number };

/** Todo lo buscable de la Ayuda, listo para enviarse al navegador. */
export function buildSearchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const topic of TOPICS) {
    docs.push({
      id: `topic:${topic.slug}`,
      kind: "articulo",
      title: topic.title,
      snippet: topic.summary,
      body: normalizeText(topicToPlainText(topic)),
      keywords: normalizeText(topic.keywords.join(" ")),
      href: `/app/ayuda/${topic.slug}`,
      section: topic.section,
    });
  }
  FAQ.forEach((faq, index) => {
    docs.push({
      id: `faq:${index}`,
      kind: "pregunta",
      title: faq.q,
      snippet: faq.a,
      body: normalizeText(`${faq.q} ${faq.a}`),
      keywords: normalizeText((faq.keywords ?? []).join(" ")),
      href: faq.topic ? `/app/ayuda/${faq.topic}` : "/app/ayuda#preguntas",
    });
  });
  for (const [key, entry] of Object.entries(GLOSSARY)) {
    docs.push({
      id: `glosario:${key}`,
      kind: "glosario",
      title: entry.term,
      snippet: entry.plain,
      body: normalizeText(`${entry.term} ${entry.official} ${entry.plain} ${entry.example}`),
      keywords: "",
      href: `/app/ayuda#glosario-${key}`,
    });
  }
  return docs;
}

/** Puntúa por título, palabras clave y texto; tolera tildes y plurales sencillos. */
export function searchDocs(docs: SearchDoc[], query: string, limit = 12): SearchHit[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = normalizeText(doc.title);
    let score = 0;
    let matched = 0;
    for (const token of tokens) {
      const stem = token.length > 4 ? token.replace(/(es|s)$/, "") : token;
      let tokenScore = 0;
      if (title.includes(stem)) tokenScore += 8;
      if (doc.keywords.includes(stem)) tokenScore += 6;
      if (doc.body.includes(stem)) tokenScore += 2;
      if (tokenScore) matched += 1;
      score += tokenScore;
    }
    if (!matched) continue;
    // Premia que coincidan todas las palabras y las frases completas.
    if (matched === tokens.length) score += 6;
    const phrase = normalizeText(query).trim();
    if (phrase.length > 3 && (title.includes(phrase) || doc.body.includes(phrase))) score += 10;
    if (doc.kind === "articulo") score += 2;
    hits.push({ doc, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
