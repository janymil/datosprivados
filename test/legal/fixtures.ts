import { getBankPreset, type BankPresetId } from "@/lib/bank-presets";
import type { Company, DataBank, Provider } from "@/lib/db";
import { SALES_BANDS } from "@/lib/sector-legal";
import { SECTORS } from "@/lib/sectors";
import { pairwise } from "./pairwise";

/**
 * Empresas de prueba del motor legal: los 63 rubros (más un rubro que no está en
 * el catálogo, como el «software» de datos reales) cruzados con todas las
 * combinaciones por pares de la situación de la empresa.
 */

export const FIXED_NOW = "2026-11-13T15:00:00.000Z";
export const FIXED_APP_URL = "https://datosprivados.pe";

export type LegalFixture = { id: string; company: Company; banks: DataBank[]; providers: Provider[] };

export const COMPANY_DIMENSIONS = {
  entity: ["peruana", "extranjera"],
  name: ["Comercial Andina S.A.C.", "Pérez & Hijos | «Ñandú» *Express* E.I.R.L."],
  web: ["", "https://ejemplo.pe"],
  complaints: ["", "   ", "https://ejemplo.pe/reclamos"],
  dpo: ["none", "filled"],
  salesBand: ["", ...SALES_BANDS.map((band) => band.id)],
  banks: ["sector", "mixed", "none"],
  providers: ["none", "peru", "foreign"],
} as const;

type Row = ReturnType<typeof pairwise<typeof COMPANY_DIMENSIONS>>[number];

const UNKNOWN_SECTOR = { id: "unknown", label: "software", banks: [] as BankPresetId[] };

function bank(fixtureId: string, index: number, fields: Partial<DataBank> & Pick<DataBank, "name">): DataBank {
  return {
    id: `${fixtureId}-bank-${index}`,
    company_id: fixtureId,
    purpose: "",
    data_categories: "",
    legal_basis: "consentimiento",
    retention: "",
    recipients: "",
    transfers: "",
    channel: "",
    status: "registrado",
    sipdp_code: null,
    registered_at: null,
    cancelled_at: null,
    cancel_reference: null,
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    ...fields,
  };
}

function banksFor(fixtureId: string, presets: BankPresetId[], mode: Row["banks"]): DataBank[] {
  if (mode === "none") return [];
  const fromPresets = presets.map((id, index) => {
    const preset = getBankPreset(id)!;
    return bank(fixtureId, index, {
      name: preset.name,
      purpose: preset.purpose,
      data_categories: preset.data_categories,
      legal_basis: preset.legal_basis,
      retention: preset.retention,
      recipients: preset.recipients,
      transfers: preset.transfers,
      channel: preset.channel,
      status: mode === "mixed" && index === 0 ? "cancelado" : "registrado",
    });
  });
  if (mode === "sector") return fromPresets;
  return [
    ...fromPresets,
    bank(fixtureId, fromPresets.length, {
      name: "Grabaciones de voz analizadas con IA",
      purpose: "Atención telefónica con transcripción automática",
      data_categories: "Voz, nombre, teléfono",
      retention: "6 meses",
      channel: "Central telefónica",
      status: "borrador",
    }),
  ];
}

function provider(fixtureId: string, index: number, fields: Partial<Provider> & Pick<Provider, "category" | "name" | "country">): Provider {
  return {
    id: `${fixtureId}-prov-${index}`,
    company_id: fixtureId,
    is_custom: 0,
    purpose: "",
    data: "",
    cookies: "",
    dpa_status: "pendiente",
    transfer_status: "no_aplica",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    ...fields,
  };
}

function providersFor(fixtureId: string, mode: Row["providers"]): Provider[] {
  if (mode === "none") return [];
  const peru = provider(fixtureId, 0, {
    category: "servicios",
    name: "Estudio contable externo",
    country: "Perú",
    purpose: "Contabilidad, planilla y declaraciones tributarias",
    data: "Datos de trabajadores y comprobantes",
    dpa_status: "firmado",
  });
  if (mode === "peru") return [peru];
  return [
    peru,
    provider(fixtureId, 1, {
      category: "correo",
      name: "Google Workspace",
      country: "Estados Unidos",
      purpose: "Correo electrónico del negocio",
      data: "Nombre y correo de clientes",
      transfer_status: "pendiente",
    }),
    provider(fixtureId, 2, {
      category: "analitica",
      name: "Herramienta de analítica",
      country: "No sé",
      purpose: "Medir visitas de la web",
      data: "Identificadores en línea",
      cookies: "_ga (2 años)",
      transfer_status: "pendiente",
    }),
  ];
}

function company(fixtureId: string, sectorLabel: string, row: Row): Company {
  return {
    id: fixtureId,
    name: row.name,
    ruc: "20601234567",
    sector: sectorLabel,
    slug: fixtureId.replace(/_/g, "-"),
    email: "contacto@ejemplo.pe",
    phone: "+51 987 654 321",
    address: "Av. Principal 100, Lima",
    plan: "pro",
    billing_term: "yearly",
    billing_status: "active",
    paid_until: null,
    last_payment_id: null,
    subscription_id: null,
    subscription_status: null,
    pending_subscription_id: null,
    pending_plan: null,
    pending_term: null,
    pending_amount: null,
    subscription_amount: null,
    pending_intro: 0,
    subscription_intro: 0,
    ruc_verified_at: null,
    ruc_status: null,
    ruc_condition: null,
    dpo_name: row.dpo === "filled" ? "Ana Torres" : "",
    dpo_email: row.dpo === "filled" ? "privacidad@ejemplo.pe" : "",
    entity_type: row.entity,
    country: row.entity === "peruana" ? "Perú" : "Chile",
    representative_name: row.entity === "peruana" ? "" : "Luis Rojas",
    representative_address: row.entity === "peruana" ? "" : "Jr. Lima 200, Lima",
    onboarded_at: FIXED_NOW,
    website: row.web,
    complaints_url: row.complaints,
    sales_band: row.salesBand,
    tools_declared_at: null,
    ai_consent_at: null,
    mail_optout: 0,
    deleted_at: null,
    lapsed_notice: 0,
    created_at: FIXED_NOW,
  };
}

let cache: LegalFixture[] | undefined;

export function legalFixtures(): LegalFixture[] {
  if (cache) return cache;
  const rows = pairwise(COMPANY_DIMENSIONS);
  const sectors = [...SECTORS.map((s) => ({ id: s.id, label: s.label, banks: s.banks })), UNKNOWN_SECTOR];
  cache = sectors.flatMap((sector) =>
    rows.map((row, index) => {
      const id = `${sector.id}__${index}`;
      return {
        id,
        company: company(id, sector.label, row),
        banks: banksFor(id, sector.banks, row.banks),
        providers: providersFor(id, row.providers),
      };
    })
  );
  return cache;
}
