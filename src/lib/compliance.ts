import type { ArcoRequest, Company, DataBank, DocumentRow, Incident } from "./db";
import { limaToday } from "./format";

export type ComplianceItem = {
  label: string;
  detail: string;
  weight: number;
  ok: boolean;
  href?: string;
  cta?: string;
};

export type ComplianceAlert = {
  tone: "danger" | "warn";
  message: string;
  href: string;
  cta: string;
};

export type Compliance = {
  score: number;
  level: "al_dia" | "en_progreso" | "en_riesgo";
  label: string;
  /** Pasos de configuración en el orden en que conviene hacerlos. */
  items: ComplianceItem[];
  /** Obligaciones recurrentes que hoy requieren atención (ARCO, incidentes). */
  alerts: ComplianceAlert[];
  pending: number;
};

/** Puntos que se descuentan por cada tipo de obligación recurrente incumplida. */
const ALERT_PENALTY = 15;

export function computeCompliance(input: {
  company: Company;
  banks: DataBank[];
  requests: ArcoRequest[];
  incidents: Incident[];
  documents: DocumentRow[];
}): Compliance {
  const { company, banks, requests, incidents, documents } = input;
  const today = limaToday();

  const profileComplete = Boolean(company.name && company.ruc && company.address && company.phone && company.email);
  const registered = banks.filter((b) => b.status === "registrado").length;
  const allRegistered = banks.length > 0 && registered === banks.length;
  const doc = (kind: DocumentRow["kind"]) => documents.find((d) => d.kind === kind);
  const policy = doc("politica");
  const lastBankChange = banks.reduce((latest, b) => (b.updated_at > latest ? b.updated_at : latest), "");
  const policyOutdated = Boolean(policy && lastBankChange && lastBankChange > policy.updated_at);
  const policyOk = Boolean(policy?.published) && !policyOutdated;

  const items: ComplianceItem[] = [
    {
      label: "Completa los datos de tu empresa",
      detail: profileComplete
        ? "Razón social, RUC, dirección y contacto listos para tus documentos."
        : "Tu dirección legal, teléfono y correo deben figurar en tu Política de Privacidad.",
      weight: 10,
      ok: profileComplete,
      href: "/app/empresa",
      cta: "Completar datos",
    },
    {
      label: "Declara tus bancos de datos",
      detail: banks.length
        ? `${banks.length} ${banks.length === 1 ? "lista declarada" : "listas declaradas"} (clientes, trabajadores, etc.).`
        : "Indica qué listas de personas manejas: clientes, trabajadores, cámaras, etc.",
      weight: 15,
      ok: banks.length > 0,
      href: "/app/bancos",
      cta: "Declarar listas",
    },
    {
      label: "Inscríbelos gratis en el SIPDP",
      detail: allRegistered
        ? `${registered} de ${banks.length} inscritos con código oficial.`
        : `${registered} de ${banks.length} inscritos. Te damos la ficha lista para copiar en el portal del Estado; es gratis y de aprobación automática.`,
      weight: 25,
      ok: allRegistered,
      href: "/app/bancos",
      cta: "Inscribir",
    },
    {
      label: "Publica tu Política de Privacidad",
      detail: policyOutdated
        ? "Cambiaste tus bancos de datos después de generar la política: actualízala y vuelve a publicarla."
        : policy?.published
          ? "Publicada con enlace para tu web, Instagram o WhatsApp."
          : "Revisa el borrador y publícalo para obtener tu enlace público.",
      weight: 20,
      ok: policyOk,
      href: "/app/documentos",
      cta: policyOutdated ? "Actualizar política" : "Revisar y publicar",
    },
    {
      label: "Usa textos de consentimiento",
      detail: doc("consentimiento")
        ? "Textos listos para formularios, WhatsApp y correos."
        : "Frases para pedir permiso antes de enviar publicidad.",
      weight: 10,
      ok: Boolean(doc("consentimiento")),
      href: "/app/documentos?tab=consentimiento",
      cta: "Generar textos",
    },
    {
      label: "Genera tu Documento de Seguridad",
      detail: doc("seguridad")
        ? "Manual interno de medidas de seguridad generado."
        : "Manual interno con tus medidas de seguridad. No se publica; se guarda firmado por si te fiscalizan.",
      weight: 10,
      ok: Boolean(doc("seguridad")),
      href: "/app/documentos?tab=seguridad",
      cta: "Generar documento",
    },
    {
      label: "Firma compromisos de confidencialidad",
      detail: doc("clausulas")
        ? "Formatos de confidencialidad, encargo a proveedores y cartel de cámaras listos."
        : "Formatos para que firmen tus trabajadores y proveedores (art. 17 de la Ley 29733).",
      weight: 10,
      ok: Boolean(doc("clausulas")),
      href: "/app/documentos?tab=clausulas",
      cta: "Generar formatos",
    },
  ];

  const openRequests = requests.filter((r) => r.status === "nuevo" || r.status === "en_proceso");
  const overdue = openRequests.filter((r) => r.due_at < today);
  const lateIncidents = incidents.filter(
    (i) => i.status !== "cerrado" && !i.notified_at && new Date(i.due_at) < new Date()
  );
  const activeIncidents = incidents.filter((i) => i.status !== "cerrado" && !lateIncidents.includes(i));

  const alerts: ComplianceAlert[] = [];
  if (overdue.length) {
    alerts.push({
      tone: "danger",
      message: `${overdue.length} ${overdue.length === 1 ? "solicitud ARCO venció" : "solicitudes ARCO vencieron"} sin respuesta. Responder fuera de plazo es una infracción.`,
      href: "/app/arco",
      cta: "Responder ahora",
    });
  } else if (openRequests.length) {
    alerts.push({
      tone: "warn",
      message: `${openRequests.length} ${openRequests.length === 1 ? "solicitud ARCO espera" : "solicitudes ARCO esperan"} respuesta dentro del plazo legal.`,
      href: "/app/arco",
      cta: "Ver solicitudes",
    });
  }
  if (lateIncidents.length) {
    alerts.push({
      tone: "danger",
      message: `${lateIncidents.length} ${lateIncidents.length === 1 ? "incidente superó" : "incidentes superaron"} las 48 horas sin notificación registrada.`,
      href: "/app/incidentes",
      cta: "Ver incidentes",
    });
  } else if (activeIncidents.length) {
    alerts.push({
      tone: "warn",
      message: `${activeIncidents.length} ${activeIncidents.length === 1 ? "incidente abierto" : "incidentes abiertos"}: evalúa si debes notificar a la ANPD.`,
      href: "/app/incidentes",
      cta: "Ver incidentes",
    });
  }

  const setupScore = items.reduce((acc, item) => acc + (item.ok ? item.weight : 0), 0);
  const failing = alerts.filter((a) => a.tone === "danger").length;
  const score = Math.max(0, setupScore - failing * ALERT_PENALTY);
  const level: Compliance["level"] =
    failing > 0 || score < 50 ? "en_riesgo" : score >= 90 ? "al_dia" : "en_progreso";
  const label = level === "al_dia" ? "Al día" : level === "en_progreso" ? "En progreso" : "En riesgo";

  return {
    score,
    level,
    label,
    items,
    alerts,
    pending: items.filter((i) => !i.ok).length,
  };
}

export function dueTone(dueAt: string, status: string): "ok" | "warn" | "danger" | "muted" {
  if (status === "respondido" || status === "cerrado") return "muted";
  const today = limaToday();
  if (dueAt < today) return "danger";
  const days = Math.ceil((new Date(`${dueAt}T23:59:59-05:00`).getTime() - Date.now()) / 86_400_000);
  if (days <= 5) return "danger";
  if (days <= 10) return "warn";
  return "ok";
}
