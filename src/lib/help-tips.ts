/**
 * Textos de los tooltips contextuales (el ⓘ junto a un campo, estado o botón).
 * `topic` apunta al artículo de la Ayuda que lo explica a fondo. Fuente única:
 * también alimenta el conocimiento del asistente de IA.
 */

export type HelpTip = {
  title: string;
  text: string;
  /** Slug de un artículo de /app/ayuda. */
  topic?: string;
};

export const TIPS = {
  score: {
    title: "¿Cómo se calcula tu puntaje?",
    text: "Suma los pasos de configuración que ya hiciste (perfil, bancos, SIPDP, herramientas, política, consentimientos, seguridad, contratos). Se descuentan 15 puntos por cada obligación vencida: una solicitud ARCO fuera de plazo o un incidente sin notificar a tiempo.",
    topic: "panel",
  },
  alertas: {
    title: "Alertas",
    text: "Son cosas que requieren acción hoy: plazos que corren o se vencieron, herramientas sin contrato, fichas desactualizadas. Las rojas restan puntos; las amarillas solo avisan.",
    topic: "panel",
  },
  banco_estado: {
    title: "Borrador o inscrito",
    text: "«Borrador» significa que declaraste la lista aquí pero todavía no la inscribiste en el portal del Estado (SIPDP). Cuando la inscribas, pega el código que te da el portal y pasa a «Inscrito».",
    topic: "inscripcion-sipdp",
  },
  banco_finalidad: {
    title: "Finalidad",
    text: "Es para qué usas esos datos, dicho de forma concreta («enviar boletas y coordinar entregas»). Solo puedes usar los datos para lo que declaraste; para otra cosa necesitas permiso nuevo.",
    topic: "bancos",
  },
  banco_base_legal: {
    title: "Base legal",
    text: "Es el permiso que te autoriza a usar los datos: el consentimiento de la persona, un contrato, una obligación legal (como emitir boletas) u otra excepción de la ley.",
    topic: "bancos",
  },
  banco_plazo: {
    title: "Plazo de conservación",
    text: "Cuánto tiempo guardas los datos. Cuando vence, debes eliminarlos o bloquearlos. Los comprobantes de pago y la planilla se guardan 5 años por mandato tributario y laboral.",
    topic: "bancos",
  },
  banco_transferencia: {
    title: "Transferencia internacional",
    text: "Marca «Sí» si algún servicio que usas (Google, Microsoft, Meta, Shopify, AWS…) guarda los datos fuera del Perú. Es legal, pero debe declararse y coincidir con tus herramientas.",
    topic: "herramientas",
  },
  ficha_sipdp: {
    title: "Ficha para el SIPDP",
    text: "Es la ficha de ese banco numerada como el formulario del Estado (I a X). Cópiala campo por campo en sipdp.minjus.gob.pe: la inscripción es gratuita y de aprobación automática.",
    topic: "inscripcion-sipdp",
  },
  herramienta_contrato: {
    title: "Contrato de encargo",
    text: "Cuando una herramienta trata datos por tu cuenta (nube, correo, contador) debes tener un contrato que le prohíba usarlos para otros fines. «Firmado» = ya lo tienes; «Pendiente» = falta.",
    topic: "herramientas",
  },
  herramienta_comunicacion: {
    title: "Comunicación a la ANPD",
    text: "Si una herramienta guarda datos fuera del Perú, el flujo transfronterizo se comunica a la ANPD (art. 21.2). Cuando lo hagas, márcalo como «Comunicado».",
    topic: "herramientas",
  },
  doc_publico_interno: {
    title: "Público o interno",
    text: "Los documentos públicos los ve tu cliente (política, avisos, consentimientos). Los internos son para tu equipo y por si te fiscalizan (seguridad, contratos, ARCO): no se publican.",
    topic: "documentos",
  },
  doc_desactualizado: {
    title: "Documento desactualizado",
    text: "Cambiaste bancos, herramientas o datos de la empresa después de generar este documento. Regenéralo para que diga lo que realmente haces; tu enlace público no cambia.",
    topic: "documentos",
  },
  doc_publicar: {
    title: "Publicar la política",
    text: "Al publicarla obtienes un enlace permanente (datosprivados.pe/p/tu-empresa) para pegar en tu web, Instagram o WhatsApp Business. Puedes despublicarla cuando quieras.",
    topic: "documentos",
  },
  doc_seguridad_checklist: {
    title: "Checklist de seguridad",
    text: "Marca las medidas que de verdad aplicas (claves, copias de respaldo, antivirus…). El documento solo afirma lo que marcaste: no declares medidas que no existen.",
    topic: "documentos",
  },
  arco_plazo: {
    title: "Plazo legal",
    text: "Cuenta en días hábiles (sin sábados, domingos ni feriados): 8 para información, 10 para rectificar, cancelar u oponerse, 20 para acceso y portabilidad. Se puede ampliar una sola vez, avisando dentro del plazo.",
    topic: "arco",
  },
  arco_enlace: {
    title: "Tu página pública ARCO",
    text: "Es el formulario que cualquier persona puede usar para pedirte acceso, rectificación, cancelación u oposición. Pega el enlace en tu política y en tu web: cada solicitud entra aquí con su ticket y su plazo.",
    topic: "arco",
  },
  arco_estados: {
    title: "Estados de una solicitud",
    text: "Nuevo → En proceso (la estás atendiendo) → Respondido (ya contestaste y queda la fecha como evidencia). «Vencido» significa que pasó el plazo sin responder.",
    topic: "arco",
  },
  incidente_48h: {
    title: "Reloj de 48 horas",
    text: "Solo corre si el incidente cumple algún criterio del art. 34.1 (muchas personas, datos sensibles, gran volumen, daño evidente). Cuenta desde que te enteras. Si no cumple ninguno, igual lo documentas (art. 35).",
    topic: "incidentes",
  },
  incidente_criterios: {
    title: "Criterios del art. 34.1",
    text: "Marca los que apliquen: afecta a muchas personas, hay datos sensibles, es gran volumen de datos o hay daño evidente (fraude, suplantación). Con uno solo, debes avisar a la ANPD en 48 horas.",
    topic: "incidentes",
  },
  evidencia: {
    title: "Evidencias",
    text: "Son tus pruebas con fecha de que aplicas las medidas: consentimientos, capacitaciones, revisiones de accesos, pruebas de respaldo y purgas. En una fiscalización, lo que no está registrado se considera no hecho.",
    topic: "evidencias",
  },
  ia_consentimiento: {
    title: "Activar la IA",
    text: "Las funciones de IA envían texto anonimizado a un proveedor en el extranjero. Por eso necesitas aceptarlo una vez en Ajustes. Puedes desactivarla cuando quieras.",
    topic: "asistente-ia",
  },
  ia_anonimizado: {
    title: "Anonimización",
    text: "Antes de enviar tu mensaje a la IA, reemplazamos nombres, RUC, correos, teléfonos y documentos por marcadores como {{EMPRESA_NOMBRE}}. La respuesta vuelve a completarse aquí.",
    topic: "asistente-ia",
  },
  ia_cuota: {
    title: "Consultas de IA",
    text: "Cada plan incluye un número de consultas por mes calendario (hora de Lima): Básico 60, Pro 400. Al agotarse, el asistente sigue respondiendo en modo básico.",
    topic: "plan-y-pagos",
  },
  plan_pro: {
    title: "Plan Pro",
    text: "Incluye el Copiloto de solicitudes ARCO, el autocompletado de bancos, el evaluador de incidentes, el auditor de formularios y 400 consultas de IA al mes.",
    topic: "plan-y-pagos",
  },
  ruc: {
    title: "RUC",
    text: "DatosPrivados atiende empresas y personas con negocio constituidas en el Perú. El RUC se valida con SUNAT al registrarte; el SIPDP exige una empresa peruana para inscribir bancos.",
    topic: "empresa",
  },
  responsable_privacidad: {
    title: "Responsable de privacidad",
    text: "Es la persona que recibirá las consultas sobre datos personales y figurará en tus documentos. Puede ser el dueño. Si luego eres obligado a designar un Oficial de Datos Personales, será quien lo asuma o lo designe.",
    topic: "empresa",
  },
  exportar: {
    title: "Exportar tu expediente",
    text: "Descarga todo lo que registraste (empresa, bancos, solicitudes, incidentes, documentos, evidencias) en un archivo JSON. Úsalo como respaldo o para entregarlo a tu abogado.",
    topic: "cuenta-seguridad",
  },
} satisfies Record<string, HelpTip>;

export type TipKey = keyof typeof TIPS;
