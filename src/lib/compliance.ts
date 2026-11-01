import type { ArcoRequest, Company, DataBank, DocumentRow, EvidenceRow, Incident, Provider } from "./db";
import { isAbroad } from "./provider-catalog";
import { isSensitiveBank, odpDeadline, sectorLegalProfile } from "./sector-legal";
import { limaToday } from "./format";
import { requiresAnpdNotification } from "./incident-criteria";
import { STALE_REASON_LABELS, documentFreshness } from "./document-freshness";

export type ComplianceItem = {
  /** Identificador estable del paso (lo usa la ruta de Ayuda para marcar avances). */
  key: "perfil" | "bancos" | "sipdp" | "herramientas" | "politica" | "consentimiento" | "seguridad" | "clausulas";
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
  /** Puntos ganados con los pasos de configuración, antes de descontar alertas. */
  setupScore: number;
  /** Puntos descontados por obligaciones recurrentes vencidas (ARCO, incidentes). */
  penalty: number;
};

/** Puntos que se descuentan por cada tipo de obligación recurrente incumplida. */
const ALERT_PENALTY = 15;

export function computeCompliance(input: {
  company: Company;
  banks: DataBank[];
  requests: ArcoRequest[];
  incidents: Incident[];
  documents: DocumentRow[];
  providers?: Provider[];
  evidence?: EvidenceRow[];
}): Compliance {
  const { company, banks, requests, incidents, documents } = input;
  const providers = input.providers ?? [];
  const evidence = input.evidence ?? [];
  const today = limaToday();

  const profileComplete = Boolean(company.name && company.ruc && company.address && company.phone && company.email);
  const registered = banks.filter((b) => b.status === "registrado").length;
  const allRegistered = banks.length > 0 && registered === banks.length;
  const doc = (kind: DocumentRow["kind"]) => documents.find((d) => d.kind === kind);
  const policy = doc("politica");
  const policyFreshness = policy ? documentFreshness(policy, company, banks, providers) : undefined;
  const policyOutdated = Boolean(policyFreshness?.stale);
  const policyOk = Boolean(policy?.published) && !policyOutdated;

  const abroadProviders = providers.filter((provider) => isAbroad(provider.country));

  const items: ComplianceItem[] = [
    {
      key: "perfil",
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
      key: "bancos",
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
      key: "sipdp",
      label: "Inscríbelos gratis en el SIPDP",
      detail: allRegistered
        ? `${registered} de ${banks.length} inscritos con código oficial.`
        : `${registered} de ${banks.length} inscritos. Te damos la ficha lista para copiar en el portal del Estado; es gratis y de aprobación automática.`,
      weight: 20,
      ok: allRegistered,
      href: "/app/bancos",
      cta: "Inscribir",
    },
    {
      key: "herramientas",
      label: "Declara las herramientas que usas",
      detail: company.tools_declared_at
        ? providers.length
          ? `${providers.length} ${providers.length === 1 ? "herramienta declarada" : "herramientas declaradas"}; ${abroadProviders.length} ${abroadProviders.length === 1 ? "trata" : "tratan"} datos fuera del Perú.`
          : "Declaraste que no usas herramientas externas."
        : "Web, correo, WhatsApp, pagos, publicidad, nube: indica dónde se guardan los datos para que tus documentos y tus transferencias sean correctos.",
      weight: 10,
      ok: Boolean(company.tools_declared_at),
      href: "/app/herramientas",
      cta: "Declarar herramientas",
    },
    {
      key: "politica",
      label: "Publica tu Política de Privacidad",
      detail: policyOutdated
        ? `Tu política quedó desactualizada (${policyFreshness!.reasons.map((r) => STALE_REASON_LABELS[r].toLowerCase()).join("; ")}): actualízala; seguirá publicada.`
        : policy?.published
          ? "Publicada con enlace para tu web, Instagram o WhatsApp."
          : "Revisa el borrador y publícalo para obtener tu enlace público.",
      weight: 15,
      ok: policyOk,
      href: "/app/documentos?tab=politica",
      cta: policyOutdated ? "Actualizar política" : "Revisar y publicar",
    },
    {
      key: "consentimiento",
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
      key: "seguridad",
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
      key: "clausulas",
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
  // Solo corre el plazo de 48 h si el incidente cumple algún criterio del
  // art. 34.1; el resto se documenta (art. 35) pero no genera vencimiento.
  const lateIncidents = incidents.filter(
    (i) =>
      i.status !== "cerrado" &&
      requiresAnpdNotification(i.criteria) &&
      !i.notified_at &&
      new Date(i.due_at) < new Date()
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

  // Avisos que no restan puntos pero sí piden acción: coherencia de transferencias,
  // contratos, actualización de la ficha SIPDP, ODP y evidencias periódicas.
  const pendingTransfers = abroadProviders.filter(
    (provider) => provider.transfer_status === "pendiente" || provider.dpa_status === "pendiente"
  );
  if (pendingTransfers.length) {
    alerts.push({
      tone: "warn",
      message: `${pendingTransfers.length} ${pendingTransfers.length === 1 ? "herramienta trata" : "herramientas tratan"} datos fuera del Perú (o en un país por verificar) y falta el contrato de encargo o la comunicación a la ANPD (art. 20 y 21.2).`,
      href: "/app/herramientas",
      cta: "Ver herramientas",
    });
  }
  const banksSayNoTransfer = banks.filter((bank) => bank.transfers !== "si");
  if (abroadProviders.length && banksSayNoTransfer.length) {
    alerts.push({
      tone: "warn",
      message: `Declaraste herramientas en el exterior, pero ${banksSayNoTransfer.length} ${banksSayNoTransfer.length === 1 ? "banco dice" : "bancos dicen"} «sin transferencia internacional». Revisa que coincidan.`,
      href: "/app/bancos",
      cta: "Revisar bancos",
    });
  }
  const registeredBanks = banks.filter((bank) => bank.status === "registrado" && bank.registered_at);
  if (registeredBanks.length) {
    const lastRegistration = registeredBanks.reduce((latest, bank) => (bank.registered_at! > latest ? bank.registered_at! : latest), "");
    const day = (value: string) => value.slice(0, 10);
    const changedAfter =
      registeredBanks.some((bank) => day(bank.updated_at) > day(bank.registered_at!)) ||
      providers.some((provider) => day(provider.updated_at) > day(lastRegistration));
    if (changedAfter) {
      alerts.push({
        tone: "warn",
        message: "Cambiaste bancos o herramientas después de inscribirlos en el SIPDP. La inscripción debe mantenerse actualizada (art. 44): actualiza la ficha.",
        href: "/app/bancos",
        cta: "Actualizar fichas",
      });
    }
  }
  const sensitiveActivity = sectorLegalProfile(company).sensitive || banks.some(isSensitiveBank);
  const odp = odpDeadline(company);
  if (odp && sensitiveActivity) {
    const daysLeft = Math.ceil((new Date(`${odp.from}T00:00:00-05:00`).getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= 120) {
      alerts.push({
        tone: "warn",
        message:
          daysLeft <= 0
            ? "El Oficial de Datos Personales ya es obligatorio para tu empresa: designa a una persona, publica su contacto y comunícalo a la ANPD dentro de 15 días (art. 37)."
            : `El Oficial de Datos Personales será obligatorio para tu empresa en ${daysLeft} días (${odp.from}). Prepara la designación (art. 37).`,
        href: "/app/documentos?tab=clausulas",
        cta: "Ver acta de designación",
      });
    }
  }
  if (doc("seguridad")) {
    const sixMonthsAgo = new Date(Date.now() - 183 * 86_400_000).toISOString().slice(0, 10);
    const lastReview = evidence.filter((e) => e.type === "revision_accesos").map((e) => e.occurred_on).sort().pop();
    if (!lastReview || lastReview < sixMonthsAgo) {
      alerts.push({
        tone: "warn",
        message: lastReview
          ? "Pasaron más de seis meses desde tu última revisión de accesos. El Reglamento pide verificar privilegios como mínimo cada semestre (art. 46.1.c)."
          : "Aún no registraste ninguna revisión de accesos. Debe hacerse como mínimo cada seis meses y dejar constancia (art. 46.1.c).",
        href: "/app/evidencias",
        cta: "Registrar revisión",
      });
    }
  }

  const setupScore = items.reduce((acc, item) => acc + (item.ok ? item.weight : 0), 0);
  const failing = alerts.filter((a) => a.tone === "danger").length;
  const penalty = Math.min(setupScore, failing * ALERT_PENALTY);
  const score = setupScore - penalty;
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
    setupScore,
    penalty,
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
