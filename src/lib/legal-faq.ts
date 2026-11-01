import "server-only";

import type { ArcoRequest, Company, DataBank, Incident } from "./db";
import { getBankPreset } from "./bank-presets";
import { detectSector, findSectorByLabel, type Sector } from "./sectors";
import { FAMILIES, SECTOR_FAMILY } from "./sector-legal";
import { helpAnswerWithoutLlm } from "./help-knowledge";

/**
 * Modo básico del asistente (sin modelo de lenguaje conectado). Reconoce la
 * intención de la pregunta y responde con textos breves y verificados. Solo
 * habla del expediente de la empresa cuando la pregunta es sobre su cuenta.
 */

type Context = {
  message: string;
  company: Company;
  banks: DataBank[];
  openRequests: ArcoRequest[];
  openIncidents: Incident[];
  complianceScore: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const has = (q: string, ...terms: string[]) => terms.some((term) => q.includes(term));

export function answerWithoutLlm(ctx: Context): string {
  const q = normalize(ctx.message);
  const mentioned = detectSector(ctx.message);
  const asksRequirements = has(
    q,
    "necesit", "debo ", "tengo que", "requier", "obligac", "que bancos", "que documentos", "que listas",
    "aplica", "como empiezo", "como empezar", "por donde empiezo"
  );
  const aboutOwnAccount = has(q, "mi expediente", "mi cuenta", "me falta", "diagnost", "mi avance", "mi puntaje", "estoy al dia");

  if (aboutOwnAccount) return accountStatus(ctx);

  // «¿Cómo uso la app?», «¿dónde publico…?»: se responde desde el Centro de ayuda.
  const aboutTheApp = has(
    q, "como uso", "como funciona", "como se usa", "paso a paso", "esta app", "esta aplicacion", "datosprivados",
    "donde esta", "donde hago", "donde publico", "donde veo", "que significa", "centro de ayuda", "ayuda", "tutorial", "menu"
  );
  if (aboutTheApp) {
    const help = helpAnswerWithoutLlm(ctx.message);
    if (help) return help;
  }
  if (mentioned && (asksRequirements || has(q, "soy ", "tengo un", "tengo una", "somos "))) {
    return requirementsFor(mentioned, false);
  }
  if (asksRequirements && has(q, "banco", "document", "lista")) {
    const own = findSectorByLabel(ctx.company.sector);
    if (own) return requirementsFor(own, true);
  }

  if (has(q, "redact", "borrador", "correo", "carta", "plantilla")) return DRAFTING;
  if (has(q, "incidente", "hack", "robo", "robaron", "filtr", "perdi", "brecha", "48 h", "48h", "copia oculta")) return INCIDENTS;
  if (has(q, "arco", "plazo", "responder", "borrar mis", "borren", "rectific", "cancelac", "oposic", "acceso a sus datos", "portabilidad")) return ARCO;
  if (has(q, "consentim", "whatsapp", "promoc", "publicidad", "marketing", "oferta", "newsletter", "sorteo", "permiso")) return CONSENT;
  if (has(q, "odp", "oficial de datos", "dpo")) return ODP;
  if (has(q, "multa", "sancion", "uit", "infraccion", "fiscaliz")) return FINES;
  if (has(q, "camara", "video", "cctv")) return CCTV;
  if (has(q, "sensible", "salud", "biometr", "huella", "menor", "nino")) return SENSITIVE;
  if (has(q, "transferencia", "extranjero", "nube", "google", "aws", "servidor", "cloud")) return TRANSFERS;
  if (has(q, "sipdp", "rnpdp", "inscrib", "registr", "banco")) return registration(ctx);
  if (has(q, "politica", "aviso de privacidad")) return POLICY;
  if (mentioned) return requirementsFor(mentioned, false);

  return helpAnswerWithoutLlm(ctx.message) ?? FALLBACK;
}

function requirementsFor(sector: Sector, own: boolean): string {
  const presets = ["trabajadores" as const, ...sector.banks]
    .map((id) => getBankPreset(id))
    .filter((preset) => preset !== undefined);
  const hasMarketing = sector.banks.includes("marketing");
  const hasCameras = sector.banks.includes("camaras");
  const sensitive = presets.some((preset) => preset.sensitive && preset.id !== "trabajadores");
  const legal = FAMILIES[SECTOR_FAMILY[sector.id] ?? "comercio"];

  return `### ${own ? "Para tu rubro" : "Para un negocio de"} «${sector.label}»

**Bancos de datos que normalmente debe declarar** (inscripción gratuita en el SIPDP):
${presets.map((preset) => `- **${preset.name}**: ${preset.example}${preset.id === "trabajadores" ? " (solo si tiene trabajadores o recibe CVs)" : ""}`).join("\n")}

**Documentos:**
1. **Política de Privacidad**: siempre, publicada en la web o redes.
2. **Textos de consentimiento**: ${hasMarketing ? "necesarios porque se suele enviar publicidad" : "solo si envía publicidad"}${sensitive ? "; además, **autorización por escrito** para los datos sensibles" : ""}.
3. **Documento de Seguridad**: siempre (interno, no se publica).
4. **Confidencialidad y encargo**: para trabajadores y proveedores con acceso a datos${hasCameras ? "; y el **cartel de videovigilancia**" : ""}.
5. **Procedimiento de derechos ARCO**: para responder en 8, 10 y 20 días hábiles.
6. **Aviso para trabajadores**: ${legal.staffHeavy ? "tu rubro suele tener bastante personal, así que es esencial" : "si tienes trabajadores, practicantes o recibes CVs"}.
${legal.consumer ? "7. **Libro de Reclamaciones**: atiendes consumidores finales, es obligatorio.\n" : ""}${legal.terms === "plataforma" ? "8. **Términos y condiciones y política de cookies**: tu servicio es digital.\n" : ""}${legal.minors ? "9. **Consentimiento de padres o tutores**: tratas datos de menores (de 14 a 17 pueden consentir por sí mismos; menores de 14, no).\n" : ""}${legal.imageUse ? "10. **Autorización de uso de imagen** si publicas fotos o videos de personas.\n" : ""}${sector.note ? `\n**Ojo:** ${sector.note}\n` : ""}
Cada caso real puede variar: declara solo las listas que de verdad tengas.`;
}

function accountStatus(ctx: Context): string {
  const registered = ctx.banks.filter((b) => b.status === "registrado").length;
  const lines = [
    `- **Nivel de cumplimiento:** ${ctx.complianceScore}/100.`,
    ctx.banks.length
      ? `- **Bancos de datos:** ${registered} de ${ctx.banks.length} inscritos en el SIPDP.`
      : "- **Bancos de datos:** aún no declaraste ninguno.",
    ctx.openRequests.length
      ? `- **Solicitudes ARCO pendientes:** ${ctx.openRequests.map((r) => `${r.ticket} (vence ${r.due_at})`).join(", ")}.`
      : "- **Solicitudes ARCO:** ninguna pendiente.",
    ctx.openIncidents.length
      ? `- **Incidentes abiertos:** ${ctx.openIncidents.length}. Revisa si debes notificar a la ANPD.`
      : "- **Incidentes:** ninguno abierto.",
  ];
  return `### Estado de ${ctx.company.name}

${lines.join("\n")}

El detalle paso a paso está en **Mi plan**.`;
}

function registration(ctx: Context): string {
  const registered = ctx.banks.filter((b) => b.status === "registrado").length;
  return `### Inscribir bancos de datos en el SIPDP

- **Qué es:** cada lista de personas que manejas (clientes, trabajadores, cámaras…) se declara en el Registro Nacional (RNPDP) mediante el portal **sipdp.minjus.gob.pe**.
- **Costo:** gratis y de aprobación automática desde el 31 de marzo de 2025.
- **Cómo:** en **Bancos de datos**, abre la *Ficha SIPDP* de cada banco, copia los campos en el portal y anota aquí el código que te den.
- **Si no lo haces:** es una infracción leve (0.5 a 5 UIT).

En tu cuenta: ${registered} de ${ctx.banks.length} bancos inscritos.`;
}

const ARCO = `### Plazos para responder solicitudes (días hábiles)

- **Información:** 8 días.
- **Rectificación, cancelación u oposición:** 10 días.
- **Revocación del consentimiento:** 10 días.
- **Acceso y portabilidad:** 20 días.


- Se cuentan desde el día siguiente de recibida la solicitud (art. 69 del DS 016-2024-JUS).
- Salvo información, puedes ampliar el plazo **una vez** por el mismo periodo, avisando antes de que venza (art. 71).
- Si cancelas datos, conserva **bloqueados** los que exige la ley (boletas: 5 años por SUNAT).
- Responder tarde es una infracción leve. En **Solicitudes ARCO** ves cada plazo y tienes plantillas de respuesta.`;

const CONSENT = `### Enviar publicidad legalmente

- Vender o atender a alguien **no** te autoriza a mandarle promociones: necesitas su **consentimiento previo, expreso e informado**.
- En formularios: una casilla de publicidad **separada, opcional y sin marcar**. Nunca condiciones la compra a aceptarla.
- Por WhatsApp: pide un «SÍ ACEPTO» antes de agregarlo a listas de difusión y guarda la evidencia (captura con fecha).
- Quien pida la baja debe salir de tus listas en máximo **10 días hábiles**.

Los textos listos están en **Documentos → Textos de consentimiento**.`;

const INCIDENTS = `### Ante un incidente de seguridad

1. **Contén:** cambia contraseñas, cierra sesiones y registra la hora de detección en **Incidentes**.
2. **Evalúa:** ¿cuántas personas?, ¿qué datos?, ¿hay datos sensibles o riesgo de fraude?
3. **Notifica a la ANPD en máximo 48 horas** si expone muchos datos, puede afectar a muchas personas, involucra datos sensibles o causa un daño evidente (art. 34). Si fue digital, también al CNSD.
4. **Avisa a los afectados** en lenguaje claro si el incidente los afecta.
5. **Documenta todo**, aunque no corresponda notificar (art. 35).`;

const ODP = `### ¿Necesitas un Oficial de Datos Personales (ODP)?

- Solo si tratas **grandes volúmenes de datos** o **datos sensibles** como parte de tu actividad, o si eres entidad pública (art. 37).
- Si te aplica, el plazo depende de tus ventas anuales: grandes (más de 2,300 UIT) desde nov. 2025; medianas desde nov. 2026; pequeñas desde nov. 2027; **microempresas desde el 30 de noviembre de 2028**.
- Mientras tanto basta con un responsable interno y un correo de privacidad (configúralos en **Empresa**).`;

const FINES = `### Multas de la ANPD (art. 39 de la Ley 29733)

- **Leve:** 0.5 a 5 UIT (S/ 2,750 a S/ 27,500).
- **Grave:** 5 a 50 UIT (hasta S/ 275,000).
- **Muy grave:** 50 a 100 UIT (hasta S/ 550,000).

Valores con la UIT 2026 (S/ 5,500).

Ejemplos de leves: no inscribir tus bancos de datos, responder tarde una solicitud ARCO o no notificar un incidente cuando corresponde.`;

const CCTV = `### Cámaras de seguridad

- Son un banco de datos: declara «Videovigilancia» en el SIPDP.
- Coloca un **cartel visible** en el ingreso (plantilla en **Documentos → Contratos y cartel**).
- Conserva las grabaciones **entre 30 y 60 días** y luego elimínalas, salvo pedido de una autoridad.
- No grabes zonas privadas (baños, vestidores) ni audio de conversaciones.`;

const SENSITIVE = `### Datos sensibles

- Son: salud, biometría (huella, rostro), ingresos económicos, origen racial, opiniones políticas, religión, afiliación sindical y vida sexual (art. 2.5 de la Ley 29733).
- Para tratarlos necesitas consentimiento **por escrito** (art. 13.6). Hay un formato listo en **Documentos → Textos de consentimiento**.
- Los datos de **menores de 14 años** requieren el consentimiento de sus padres o tutores.
- Exigen medidas de seguridad reforzadas; si se filtran, el incidente debe notificarse a la ANPD.`;

const TRANSFERS = `### Datos guardados fuera del Perú

- Usar Google, Microsoft, AWS, Shopify, Meta/WhatsApp, etc. implica **flujo transfronterizo**: es legal, pero debes declararlo.
- Márcalo en cada banco de datos («Transferencia internacional: Sí») y menciónalo en tu Política de Privacidad.
- Usa proveedores con garantías de seguridad y contratos que limiten el uso de los datos.`;

const POLICY = `### Política de Privacidad

- Debe informar quién eres, qué datos recoges, para qué, por cuánto tiempo, con quién los compartes y cómo ejercer los derechos ARCO (art. 18 de la Ley 29733).
- En **Documentos** se genera con tus bancos de datos; revísala, publícala y pega el enlace en tu web, Instagram o WhatsApp Business.
- Actualízala cada vez que agregues un banco de datos o un proveedor.`;

const DRAFTING = `### Borradores y cartas

En modo básico no redacto textos libres, pero tienes plantillas listas:
- **Respuestas ARCO:** abre la solicitud en **Solicitudes ARCO** y usa «Restaurar plantilla».
- **Consentimientos, confidencialidad, encargo a proveedores y cartel de cámaras:** en **Documentos**.
- **Aviso a la ANPD por un incidente:** el «Borrador para la ANPD» está dentro de cada incidente.`;

const FALLBACK = `No tengo una respuesta preparada para esa pregunta en el modo básico. Puedes buscarla en el [Centro de ayuda](/app/ayuda) o probar con temas como:
- «Tengo un gimnasio, ¿qué bancos y documentos necesito?»
- «¿Cuánto tiempo tengo para responder una solicitud ARCO?»
- «¿Cómo pido permiso para enviar promociones por WhatsApp?»
- «Perdí una laptop con datos de clientes, ¿qué hago?»
- «¿Qué me falta para estar al día?»`;
