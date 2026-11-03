import { siteUrl } from "./site";

/**
 * Plantillas de correo transaccional (texto + HTML, en español). Son funciones
 * puras: reciben el payload guardado en la bandeja de salida y devuelven el
 * mensaje. Todo valor que viene del usuario se escapa en el HTML.
 */

export const SUPPORT_EMAIL = "hola@datosprivados.pe";

export type MailTemplate =
  | "verify_email"
  | "password_reset"
  | "welcome"
  | "payment_receipt"
  | "payment_failed"
  | "invoice_issued"
  | "transfer_instructions"
  | "payment_refunded"
  | "renewal_soon"
  | "subscription_cancelled"
  | "subscription_expiring"
  | "arco_received_owner"
  | "arco_ack_requester"
  | "arco_due_soon"
  | "arco_overdue"
  | "incident_opened"
  | "incident_deadline"
  | "document_outdated"
  | "weekly_digest"
  | "lapsed_notice"
  | "email_changed"
  | "account_deleted"
  | "ops_alert";

export type MailPayload = Record<string, string | number>;

export type RenderedMail = { subject: string; text: string; html: string };

/** Plantillas que no se pueden desactivar: seguridad de la cuenta, cobro y plazos legales. */
const ESSENTIAL: Record<MailTemplate, boolean> = {
  verify_email: true,
  password_reset: true,
  welcome: true,
  payment_receipt: true,
  payment_failed: true,
  invoice_issued: true,
  transfer_instructions: true,
  payment_refunded: true,
  renewal_soon: true,
  subscription_cancelled: true,
  subscription_expiring: true,
  arco_received_owner: true,
  arco_ack_requester: true,
  arco_due_soon: true,
  arco_overdue: true,
  incident_opened: true,
  incident_deadline: true,
  document_outdated: false,
  weekly_digest: false,
  lapsed_notice: true,
  email_changed: true,
  account_deleted: true,
  ops_alert: true,
};

export function isEssential(template: MailTemplate): boolean {
  return ESSENTIAL[template];
}

export function isMailTemplate(value: string): value is MailTemplate {
  return value in ESSENTIAL;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Body = {
  subject: string;
  /** Párrafos en texto plano. */
  paragraphs: string[];
  /** Botón de acción: texto + ruta absoluta o relativa a la app. */
  action?: { label: string; url: string };
  /** Datos de la empresa destinataria, para la identidad del pie. */
  footerNote?: string;
};

function absolute(url: string) {
  return /^https?:\/\//.test(url) ? url : `${siteUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

function layout(body: Body, company: string): RenderedMail {
  const action = body.action ? { label: body.action.label, url: absolute(body.action.url) } : undefined;
  const identity = company
    ? `Enviado por DatosPrivados a ${company}. ¿Dudas? Escríbenos a ${SUPPORT_EMAIL}.`
    : `Enviado por DatosPrivados. ¿Dudas? Escríbenos a ${SUPPORT_EMAIL}.`;

  const text = [
    ...body.paragraphs,
    ...(action ? [`${action.label}: ${action.url}`] : []),
    ...(body.footerNote ? [body.footerNote] : []),
    "—",
    identity,
  ].join("\n\n");

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3ddd2;border-radius:8px">
<tr><td style="padding:24px 28px 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a1c2b">DatosPrivados</td></tr>
<tr><td style="padding:0 28px 8px;font-size:20px;font-weight:bold">${escapeHtml(body.subject)}</td></tr>
<tr><td style="padding:8px 28px;font-size:15px;line-height:1.55">${body.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("")}</td></tr>
${action ? `<tr><td style="padding:4px 28px 20px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#8a1c2b;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:15px">${escapeHtml(action.label)}</a></td></tr>` : ""}
${body.footerNote ? `<tr><td style="padding:0 28px 12px;font-size:13px;color:#555">${escapeHtml(body.footerNote)}</td></tr>` : ""}
<tr><td style="padding:14px 28px 22px;border-top:1px solid #e3ddd2;font-size:12px;color:#666">${escapeHtml(identity)}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: body.subject, text, html };
}

const s = (payload: MailPayload, key: string) => String(payload[key] ?? "");

const ARCO_LABEL: Record<string, string> = {
  acceso: "acceso",
  rectificacion: "rectificación",
  cancelacion: "cancelación",
  oposicion: "oposición",
};

/** Construye el mensaje de una plantilla. Lanza si falta un campo imprescindible. */
export function renderMail(template: MailTemplate, payload: MailPayload): RenderedMail {
  const company = s(payload, "company");
  const need = (...keys: string[]) => {
    for (const key of keys) {
      if (payload[key] === undefined || payload[key] === "") throw new Error(`Falta «${key}» para la plantilla ${template}.`);
    }
  };

  switch (template) {
    case "verify_email":
      need("name", "url");
      return layout(
        {
          subject: "Confirma tu correo en DatosPrivados",
          paragraphs: [`Hola ${s(payload, "name")}, confirma que este correo es tuyo para proteger tu cuenta.`, "El enlace vence en 48 horas."],
          action: { label: "Confirmar mi correo", url: s(payload, "url") },
          footerNote: "Si no creaste una cuenta, ignora este mensaje.",
        },
        company
      );
    case "password_reset":
      need("name", "url");
      return layout(
        {
          subject: "Restablece tu contraseña",
          paragraphs: [
            `Hola ${s(payload, "name")}, recibimos un pedido para cambiar tu contraseña.`,
            "El enlace vence en 1 hora y solo se puede usar una vez.",
          ],
          action: { label: "Elegir una contraseña nueva", url: s(payload, "url") },
          footerNote: "Si no lo pediste tú, ignora este mensaje: tu contraseña no cambia.",
        },
        company
      );
    case "welcome":
      need("name");
      return layout(
        {
          subject: "Bienvenido a DatosPrivados",
          paragraphs: [
            `Hola ${s(payload, "name")}, tu cuenta quedó activa. Empieza por registrar tus bancos de datos y publicar tu Política de Privacidad.`,
            "Los textos legales son borradores: revísalos con tu abogado. DatosPrivados no sustituye asesoría legal.",
          ],
          action: { label: "Ir a mi panel", url: "/app" },
        },
        company
      );
    case "payment_receipt":
      need("plan", "amount", "paidUntil");
      return layout(
        {
          subject: "Recibimos tu pago",
          paragraphs: [`Registramos tu pago de ${s(payload, "amount")} del Plan ${s(payload, "plan")}.`, `Tu plan está vigente hasta el ${s(payload, "paidUntil")}.`],
          action: { label: "Ver mi plan", url: "/app/ajustes" },
        },
        company
      );
    case "payment_failed":
      need("plan");
      return layout(
        {
          subject: "No pudimos cobrar tu suscripción",
          paragraphs: [
            `MercadoPago no pudo procesar el cobro del Plan ${s(payload, "plan")}.`,
            "Revisa tu medio de pago. Mientras tanto tu cuenta sigue activa hasta el fin del periodo pagado.",
          ],
          action: { label: "Revisar mi suscripción", url: "/pago" },
        },
        company
      );
    case "invoice_issued":
      need("number", "amount");
      return layout(
        {
          subject: `Tu factura electrónica ${s(payload, "number")}`,
          paragraphs: [
            `Emitimos la factura electrónica ${s(payload, "number")} por ${s(payload, "amount")} a nombre de ${s(payload, "company")}.`,
            ...(payload.dueNote ? [s(payload, "dueNote")] : []),
          ],
          ...(payload.pdfUrl ? { action: { label: "Ver la factura", url: s(payload, "pdfUrl") } } : {}),
        },
        company
      );
    case "transfer_instructions":
      need("plan", "amount", "reference", "bankDetails");
      return layout(
        {
          subject: "Cómo pagar por transferencia",
          paragraphs: [
            `Para activar el Plan ${s(payload, "plan")} paga ${s(payload, "amount")} (IGV incluido) por transferencia.`,
            s(payload, "bankDetails"),
            `Indica esta referencia en la transferencia: ${s(payload, "reference")}. Te enviaremos la factura electrónica a este correo y activaremos tu plan cuando recibamos el pago.`,
          ],
        },
        company
      );
    case "payment_refunded":
      need("plan", "amount");
      return layout(
        {
          subject: "Reembolsamos tu pago",
          paragraphs: [
            `Registramos el reembolso de ${s(payload, "amount")} del Plan ${s(payload, "plan")}.`,
            "El periodo cubierto por ese pago se descontó de tu plan. Si tienes dudas, escríbenos.",
          ],
          action: { label: "Ver mi plan", url: "/app/ajustes" },
        },
        company
      );
    case "renewal_soon":
      need("plan", "paidUntil");
      return layout(
        {
          subject: "Tu suscripción se renueva pronto",
          paragraphs: [`Tu Plan ${s(payload, "plan")} se renueva el ${s(payload, "paidUntil")}. No tienes que hacer nada.`],
          action: { label: "Ver mi plan", url: "/app/ajustes" },
        },
        company
      );
    case "subscription_cancelled":
      need("paidUntil");
      return layout(
        {
          subject: "Cancelaste tu suscripción",
          paragraphs: [
            `Tu suscripción quedó cancelada. Conservas el acceso hasta el ${s(payload, "paidUntil")}.`,
            "Antes de esa fecha puedes exportar todos tus datos desde Ajustes.",
          ],
          action: { label: "Exportar mis datos", url: "/app/ajustes" },
        },
        company
      );
    case "subscription_expiring":
      need("paidUntil");
      return layout(
        {
          subject: "Tu acceso a DatosPrivados vence pronto",
          paragraphs: [
            `Tu acceso vence el ${s(payload, "paidUntil")} y la suscripción no se renovará.`,
            "Si tu Política de Privacidad o tu canal ARCO están publicados, siguen visibles un tiempo después, pero no podrás gestionar solicitudes hasta reactivar.",
          ],
          action: { label: "Reactivar mi plan", url: "/pago" },
        },
        company
      );
    case "arco_received_owner":
      need("ticket", "type", "requester", "dueAt");
      return layout(
        {
          subject: `Nueva solicitud ARCO ${s(payload, "ticket")}`,
          paragraphs: [
            `${s(payload, "requester")} presentó una solicitud de ${ARCO_LABEL[s(payload, "type")] ?? s(payload, "type")}.`,
            `El plazo legal para responder vence el ${s(payload, "dueAt")} (días hábiles, hora de Lima).`,
          ],
          action: { label: "Abrir la solicitud", url: s(payload, "path") || "/app/arco" },
        },
        company
      );
    case "arco_ack_requester":
      need("ticket", "type", "dueAt", "company");
      return layout(
        {
          subject: `Recibimos tu solicitud ${s(payload, "ticket")}`,
          paragraphs: [
            `${company} recibió tu solicitud de ${ARCO_LABEL[s(payload, "type")] ?? s(payload, "type")} sobre tus datos personales.`,
            `Tu número de seguimiento es ${s(payload, "ticket")}. El plazo legal para responderte vence el ${s(payload, "dueAt")}.`,
            "Si no recibes respuesta en ese plazo, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.",
          ],
        },
        company
      );
    case "arco_due_soon":
      need("ticket", "dueAt", "days");
      return layout(
        {
          subject: `La solicitud ${s(payload, "ticket")} vence en ${s(payload, "days")} días hábiles`,
          paragraphs: [`Respóndela antes del ${s(payload, "dueAt")} para cumplir el plazo legal.`],
          action: { label: "Responder ahora", url: s(payload, "path") || "/app/arco" },
        },
        company
      );
    case "arco_overdue":
      need("ticket", "dueAt");
      return layout(
        {
          subject: `Solicitud ${s(payload, "ticket")} vencida`,
          paragraphs: [
            `El plazo legal de la solicitud ${s(payload, "ticket")} venció el ${s(payload, "dueAt")} y sigue sin respuesta.`,
            "Responde cuanto antes: el titular puede reclamar ante la ANPD.",
          ],
          action: { label: "Responder ahora", url: s(payload, "path") || "/app/arco" },
        },
        company
      );
    case "incident_opened":
      need("title", "dueAt");
      return layout(
        {
          subject: "Incidente registrado: corre el plazo de 48 horas",
          paragraphs: [
            `Registraste el incidente «${s(payload, "title")}».`,
            `Si cumple algún criterio del art. 34.1, debes notificar a la ANPD antes del ${s(payload, "dueAt")} (48 horas desde que lo supiste).`,
          ],
          action: { label: "Evaluar el incidente", url: s(payload, "path") || "/app/incidentes" },
        },
        company
      );
    case "incident_deadline":
      need("title", "dueAt", "hours");
      return layout(
        {
          subject: `Faltan ${s(payload, "hours")} horas para notificar el incidente`,
          paragraphs: [`«${s(payload, "title")}» aún no figura como notificado. El plazo de 48 horas vence el ${s(payload, "dueAt")}.`],
          action: { label: "Ir al incidente", url: s(payload, "path") || "/app/incidentes" },
        },
        company
      );
    case "document_outdated":
      need("count");
      return layout(
        {
          subject: "Tus documentos legales están desactualizados",
          paragraphs: [`${s(payload, "count")} de tus documentos ya no reflejan la plantilla vigente o los datos de tu empresa. Regénéralos para mantenerlos al día.`],
          action: { label: "Revisar documentos", url: "/app/documentos" },
          footerNote: "Puedes desactivar este tipo de aviso en Ajustes.",
        },
        company
      );
    case "weekly_digest": {
      // Resumen semanal: solo se envían los puntos con algo pendiente (el trabajo
      // decide no mandar nada si la cuenta está al día).
      need("pending");
      const pending = String(payload.pending)
        .split("|")
        .map((line) => line.trim())
        .filter(Boolean);
      return layout(
        {
          subject: pending.length === 1 ? "Tu resumen semanal: 1 punto pendiente" : `Tu resumen semanal: ${pending.length} puntos pendientes`,
          paragraphs: ["Esto es lo que quedó pendiente esta semana en tu expediente de protección de datos:", ...pending.map((line) => `• ${line}`)],
          action: { label: "Entrar al panel", url: "/app" },
          footerNote: "Recibes este resumen porque tu cuenta está activa. Puedes desactivarlo en Ajustes.",
        },
        company
      );
    }
    case "lapsed_notice":
      need("deleteOn", "stage");
      return layout(
        {
          subject: "Tus datos se borrarán si no reactivas tu cuenta",
          paragraphs: [
            `Tu suscripción terminó y tus datos se eliminarán el ${s(payload, "deleteOn")} si no la reactivas.`,
            "Puedes descargar una copia completa de tus datos ahora mismo, sin necesidad de reactivar.",
          ],
          action: { label: "Descargar mis datos", url: "/cuenta" },
        },
        company
      );
    case "email_changed":
      need("newEmail");
      return layout(
        {
          subject: "Cambiaron el correo de tu cuenta",
          paragraphs: [
            `El correo de acceso de tu cuenta ahora es ${s(payload, "newEmail")}.`,
            `Si no fuiste tú, escríbenos de inmediato a ${SUPPORT_EMAIL}.`,
          ],
        },
        company
      );
    case "ops_alert":
      need("subject", "message");
      return layout({ subject: s(payload, "subject"), paragraphs: [s(payload, "message")] }, "");
    case "account_deleted":
      return layout(
        {
          subject: "Eliminamos tu cuenta",
          paragraphs: [
            "Tu cuenta y sus datos fueron eliminados. Solo conservamos los registros de pago que la ley tributaria nos obliga a guardar.",
            "Cancelamos también tu suscripción en MercadoPago.",
          ],
        },
        company
      );
  }
}
