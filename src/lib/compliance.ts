import type { ArcoRequest, Company, DataBank, DocumentRow, Incident } from "./db";

export type ComplianceItem = {
  label: string;
  detail: string;
  weight: number;
  ok: boolean;
  href?: string;
  cta?: string;
  nextStep?: string;
};

export type Compliance = {
  score: number;
  level: "al_dia" | "en_progreso" | "en_riesgo";
  label: string;
  items: ComplianceItem[];
  pending: number;
};

export function computeCompliance(input: {
  company: Company;
  banks: DataBank[];
  requests: ArcoRequest[];
  incidents: Incident[];
  documents: DocumentRow[];
}): Compliance {
  const { company, banks, requests, incidents, documents } = input;
  const today = new Date().toISOString().slice(0, 10);

  const profileComplete = Boolean(
    company.ruc && company.sector && company.address && company.phone && company.name
  );
  const registered = banks.filter((b) => b.status === "registrado").length;
  const policy = documents.find((d) => d.kind === "politica");
  const security = documents.find((d) => d.kind === "seguridad");
  const openRequests = requests.filter((r) => r.status === "nuevo" || r.status === "en_proceso");
  const overdue = openRequests.filter((r) => r.due_at < today);
  const unNotified = incidents.filter(
    (i) => i.status !== "cerrado" && !i.notified_at && new Date(i.due_at) < new Date()
  );

  const items: ComplianceItem[] = [
    {
      label: "Perfil de la empresa",
      detail: profileComplete
        ? "RUC, sector y datos de contacto completos."
        : "Completa RUC, sector, dirección y teléfono.",
      weight: 10,
      ok: profileComplete,
      href: "/app/empresa",
      cta: "Completar perfil",
      nextStep: "Completa el perfil de tu empresa",
    },
    {
      label: "Bancos de datos registrados",
      detail:
        registered >= 2
          ? `${registered} bancos con código SIPDP.`
          : "Registra al menos tus bancos de clientes y colaboradores.",
      weight: 25,
      ok: registered >= 2,
      href: "/app/bancos",
      cta: "Ver bancos",
      nextStep: "Registra tus bancos de datos en el SIPDP",
    },
    {
      label: "Política de privacidad publicada",
      detail: policy?.published
        ? "Publicada y enlazada en tu web."
        : "Genera y publica tu política de privacidad.",
      weight: 20,
      ok: Boolean(policy?.published),
      href: "/app/documentos",
      cta: "Generar política",
      nextStep: "Publica tu política de privacidad",
    },
    {
      label: "Canal ARCO disponible",
      detail: "Formulario público activo para titulares de datos.",
      weight: 10,
      ok: true,
      href: `/solicitud/${company.slug}`,
      cta: "Ver formulario",
    },
    {
      label: "Solicitudes ARCO al día",
      detail: overdue.length
        ? `${overdue.length} ${overdue.length === 1 ? "solicitud pasó" : "solicitudes pasaron"} el plazo de 20 días hábiles.`
        : openRequests.length
          ? `${openRequests.length} ${openRequests.length === 1 ? "solicitud abierta" : "solicitudes abiertas"} dentro de plazo.`
          : "Sin solicitudes abiertas.",
      weight: 15,
      ok: overdue.length === 0,
      href: "/app/arco",
      cta: "Revisar ARCO",
      nextStep: "Ponte al día con las solicitudes ARCO",
    },
    {
      label: "Incidentes notificados a tiempo",
      detail: unNotified.length
        ? `${unNotified.length} ${unNotified.length === 1 ? "incidente superó" : "incidentes superaron"} las 48 horas sin notificar.`
        : "Sin incidentes fuera de plazo.",
      weight: 10,
      ok: unNotified.length === 0,
      href: "/app/incidentes",
      cta: "Ver incidentes",
      nextStep: "Notifica el incidente pendiente",
    },
    {
      label: "Documento de seguridad",
      detail: security ? "Documento base generado." : "Genera el documento de seguridad base.",
      weight: 10,
      ok: Boolean(security),
      href: "/app/documentos?tab=seguridad",
      cta: "Generar documento",
      nextStep: "Genera tu documento de seguridad",
    },
  ];

  const score = items.reduce((acc, item) => acc + (item.ok ? item.weight : 0), 0);
  const level: Compliance["level"] = score >= 80 ? "al_dia" : score >= 50 ? "en_progreso" : "en_riesgo";
  const label =
    level === "al_dia" ? "Al día" : level === "en_progreso" ? "En progreso" : "En riesgo";

  return {
    score,
    level,
    label,
    items,
    pending: items.filter((i) => !i.ok).length,
  };
}

export function dueTone(dueAt: string, status: string): "ok" | "warn" | "danger" | "muted" {
  if (status === "respondido" || status === "cerrado") return "muted";
  const today = new Date().toISOString().slice(0, 10);
  if (dueAt < today) return "danger";
  const days = Math.ceil((new Date(`${dueAt}T23:59:59-05:00`).getTime() - Date.now()) / 86_400_000);
  if (days <= 5) return "danger";
  if (days <= 10) return "warn";
  return "ok";
}
