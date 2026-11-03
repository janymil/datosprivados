import type { Company, DataBank } from "./db";
import { getBankPreset, type BankPresetId } from "./bank-presets";
import { appUrl, buildPrivacyPolicy } from "./documents";
import type { ChecklistSection } from "@/components/checklist-tool";

/**
 * Plantillas públicas. El modelo de política es el mismo generador que usa el panel,
 * alimentado con datos de ejemplo entre corchetes, para que el modelo gratuito y el
 * documento real nunca se contradigan.
 */

const PLACEHOLDER_SLUG = "tu-empresa";

const PLACEHOLDER_COMPANY: Company = {
  id: "plantilla",
  name: "[RAZÓN SOCIAL]",
  ruc: "[RUC]",
  sector: "Otro tipo de negocio",
  slug: PLACEHOLDER_SLUG,
  email: "[correo de privacidad]",
  phone: "",
  address: "[DOMICILIO LEGAL]",
  plan: "basico",
  billing_term: "monthly",
  billing_status: "demo",
  paid_until: null,
  last_payment_id: null,
  subscription_id: null,
  subscription_status: null,
  pending_subscription_id: null,
  pending_plan: null,
  pending_term: null,
  ruc_verified_at: null,
  ruc_status: null,
  ruc_condition: null,
  dpo_name: "",
  dpo_email: "",
  entity_type: "peruana",
  country: "Perú",
  representative_name: "",
  representative_address: "",
  onboarded_at: null,
  website: "",
  complaints_url: "",
  sales_band: "",
  tools_declared_at: null,
  ai_consent_at: null,
  mail_optout: 0,
  deleted_at: null,
  lapsed_notice: 0,
  created_at: "2026-01-01T00:00:00.000Z",
};

/** Bancos de ejemplo del modelo: los que casi toda empresa con personal y clientes tiene. */
const TEMPLATE_BANKS: BankPresetId[] = ["trabajadores", "clientes", "marketing", "camaras"];

function templateBanks(): DataBank[] {
  return TEMPLATE_BANKS.flatMap((id) => {
    const preset = getBankPreset(id);
    if (!preset) return [];
    return [
      {
        id: `plantilla-${id}`,
        company_id: PLACEHOLDER_COMPANY.id,
        name: preset.name,
        purpose: preset.purpose,
        data_categories: preset.data_categories,
        legal_basis: preset.legal_basis,
        retention: preset.retention,
        recipients: preset.recipients,
        transfers: preset.transfers,
        channel: preset.channel,
        status: "borrador" as const,
        sipdp_code: null,
        registered_at: null,
        created_at: PLACEHOLDER_COMPANY.created_at,
        updated_at: PLACEHOLDER_COMPANY.created_at,
      },
    ];
  });
}

/** Modelo de Política de Privacidad en markdown, con los datos de la empresa entre corchetes. */
export function policyTemplate(): string {
  return buildPrivacyPolicy(PLACEHOLDER_COMPANY, templateBanks())
    .replaceAll(`${appUrl()}/solicitud/${PLACEHOLDER_SLUG}`, "[ENLACE A TU FORMULARIO DE DERECHOS ARCO]")
    .replaceAll(`${appUrl()}/p/${PLACEHOLDER_SLUG}`, "[ENLACE DONDE PUBLICAS ESTA POLÍTICA]")
    .replace(/entra en vigencia el \*\*[^*]+\*\*/, "entra en vigencia el **[FECHA DE PUBLICACIÓN]**")
    .replace(/\n---\n\n\*Documento elaborado con DatosPrivados[^\n]*$/, "");
}

/** Texto plano para pegar en Word o Google Docs: sin marcas de markdown. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^## (.+)$/gm, (_, heading: string) => heading.toUpperCase())
    .replace(/^> ?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .trim();
}

export const POLICY_SECTIONS = [
  "Identidad y domicilio del responsable",
  "Bancos de datos, finalidades y categorías de datos",
  "Carácter obligatorio o facultativo de los datos",
  "Base legal del tratamiento",
  "Plazo de conservación y eliminación",
  "Destinatarios, encargados y transferencias internacionales",
  "Ejercicio de derechos ARCO, portabilidad y revocación",
  "Decisiones automatizadas y perfiles",
  "Medidas de seguridad e incidentes",
  "Datos sensibles, menores y normas de tu actividad",
  "Cookies, vigencia y modificaciones",
];

/* -------------------------------------------------------------------------- */
/*  Checklist de inscripción en el SIPDP                                      */
/* -------------------------------------------------------------------------- */

export const SIPDP_CHECKLIST: ChecklistSection[] = [
  {
    title: "Antes de entrar al portal",
    hint: "Se hace una sola vez y evita inscribir listas incompletas.",
    items: [
      "Ten a mano el RUC y los datos del representante de la empresa.",
      "Haz el inventario: anota cada conjunto de datos de personas que usa la empresa (Excel, ERP, CRM, carpetas, cámaras).",
      "Agrúpalos por finalidad: un banco por finalidad, no por archivo.",
      "Define quién será el responsable de privacidad (nombre y correo de contacto).",
      "Anota los proveedores que ven datos: estudio contable, nube, software de planillas, courier, seguridad.",
      "Marca cuáles de esas herramientas guardan datos fuera del Perú (transferencia internacional).",
    ],
  },
  {
    title: "Bancos que normalmente declara una empresa",
    hint: "Declara solo los que de verdad tienes.",
    items: [
      "Colaboradores y postulantes: contratos, planilla, legajos, CVs, descansos médicos.",
      "Clientes: datos para vender, facturar, entregar y dar posventa.",
      "Prospectos y marketing: listas para enviar ofertas (requieren consentimiento).",
      "Videovigilancia: grabaciones de las cámaras de seguridad.",
      "Proveedores: contactos de personas naturales y representantes.",
      "Libro de Reclamaciones, si atiendes a consumidores finales.",
      "Los propios de tu sector: pacientes, alumnos, huéspedes, socios, créditos, usuarios de la plataforma.",
    ],
  },
  {
    title: "Datos que pide la ficha de cada banco",
    hint: "Prepáralos antes de abrir el portal; son los mismos de tu política de privacidad.",
    items: [
      "Denominación del banco de datos.",
      "Categorías de datos personales (identificación, contacto, laborales, económicos, sensibles).",
      "Base legal del tratamiento (ejecución de contrato, obligación legal o consentimiento).",
      "Plazo de conservación.",
      "Finalidad y usos previstos.",
      "Flujo transfronterizo: si usas servidores o plataformas fuera del Perú.",
      "Destinatarios y encargados externos.",
      "Canal de obtención de los datos (formulario web, WhatsApp, presencial, portal de empleo).",
    ],
  },
  {
    title: "Después de inscribir",
    items: [
      "Guarda el código de inscripción de cada banco y la constancia con su fecha.",
      "Actualiza la Política de Privacidad para que mencione los mismos bancos, finalidades y destinatarios.",
      "Redacta el Documento de Seguridad interno.",
      "Entrega el aviso de privacidad a los trabajadores y firma confidencialidad.",
      "Si tienes cámaras, coloca el cartel de videovigilancia en los accesos.",
      "Define el canal de solicitudes ARCO y quién controla los plazos.",
      "Prepara el procedimiento de incidentes con el plazo de 48 horas.",
      "Vuelve a la ficha cada vez que cambie algo: proveedor nuevo, canal nuevo o nueva finalidad.",
    ],
  },
];

export function checklistText(): string {
  return [
    "CHECKLIST DE INSCRIPCIÓN DE BANCOS DE DATOS EN EL SIPDP",
    "Ley 29733 y DS 016-2024-JUS · sipdp.minjus.gob.pe",
    "",
    ...SIPDP_CHECKLIST.flatMap((section, index) => [
      `${index + 1}. ${section.title.toUpperCase()}`,
      ...(section.hint ? [section.hint] : []),
      ...section.items.map((item) => `[ ] ${item}`),
      "",
    ]),
    "La inscripción es gratuita y de aprobación automática desde el 31 de marzo de 2025.",
  ].join("\n");
}
