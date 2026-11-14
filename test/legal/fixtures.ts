import { getBankPreset, type BankPresetId } from "@/lib/bank-presets";
import type { Company, DataBank, Provider } from "@/lib/db";
import { sectorFamilyOf } from "@/lib/sector-legal";
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

/**
 * Valores fijos (no derivados de catálogos vivos), para que agregar una banda de
 * ventas o un rubro no reordene todas las filas y cambie todas las huellas.
 */
export const COMPANY_DIMENSIONS = {
  entity: ["peruana", "extranjera"],
  name: ["Comercial Andina S.A.C.", "Pérez & Hijos | «Ñandú» *Express* E.I.R.L."],
  web: ["", "https://ejemplo.pe"],
  complaints: ["", "   ", "https://ejemplo.pe/reclamos"],
  dpo: ["none", "filled"],
  salesBand: ["", "micro", "pequena", "mediana", "grande"],
  address: ["Av. Principal 100, Lima", ""],
  ruc: ["20601234567", ""],
  /** Solo afecta a la sociedad extranjera: país y representante completos o vacíos. */
  rep: ["filled", "empty"],
  banks: ["sector", "mixed", "registered", "none"],
  providers: ["none", "peru", "foreign", "custom", "single-foreign"],
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
      sipdp_code: mode === "registered" ? `RNPDP-PJP-${String(index + 1).padStart(4, "0")}` : null,
      registered_at: mode === "registered" ? "2026-10-01" : null,
    });
  });
  if (mode === "sector" || mode === "registered") return fromPresets;
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
  if (mode === "custom")
    // Herramienta propia en el Perú, sin datos declarados y sin contrato que aplique.
    return [
      provider(fixtureId, 0, {
        category: "pagos",
        name: "Pasarela propia",
        country: "Perú",
        is_custom: 1,
        dpa_status: "no_aplica",
      }),
    ];
  if (mode === "single-foreign")
    return [
      provider(fixtureId, 0, {
        category: "hosting",
        name: "Servidor en la nube",
        country: "Estados Unidos",
        purpose: "Alojamiento de la web",
        data: "Datos de clientes",
        dpa_status: "firmado",
        transfer_status: "comunicado",
      }),
    ];
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
    ruc: row.ruc,
    sector: sectorLabel,
    slug: fixtureId.replace(/_/g, "-"),
    email: "contacto@ejemplo.pe",
    phone: "+51 987 654 321",
    address: row.address,
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
    country: row.entity === "peruana" ? "Perú" : row.rep === "filled" ? "Chile" : "",
    representative_name: row.entity === "extranjera" && row.rep === "filled" ? "Luis Rojas" : "",
    representative_address: row.entity === "extranjera" && row.rep === "filled" ? "Jr. Lima 200, Lima" : "",
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

type SectorLike = { id: string; label: string; banks: BankPresetId[] };

function buildFixture(sector: SectorLike, row: Row, id: string): LegalFixture {
  return {
    id,
    company: company(id, sector.label, row),
    banks: banksFor(id, sector.banks, row.banks),
    providers: providersFor(id, row.providers),
  };
}

let cache: LegalFixture[] | undefined;

export function legalFixtures(): LegalFixture[] {
  if (cache) return cache;
  const rows = pairwise(COMPANY_DIMENSIONS);
  const sectors: SectorLike[] = [...SECTORS.map((s) => ({ id: s.id, label: s.label, banks: s.banks })), UNKNOWN_SECTOR];
  cache = deepFreeze(sectors.flatMap((sector) => rows.map((row, index) => buildFixture(sector, row, `${sector.id}__${index}`))));
  return cache;
}

/** Congela fixtures (y sus empresas, bancos y proveedores): una prueba no puede alterar las de otra. */
function deepFreeze(fixtures: LegalFixture[]): LegalFixture[] {
  for (const f of fixtures) {
    Object.freeze(f.company);
    f.banks.forEach((bank) => Object.freeze(bank));
    f.providers.forEach((provider) => Object.freeze(provider));
    Object.freeze(f.banks);
    Object.freeze(f.providers);
    Object.freeze(f);
  }
  return Object.freeze(fixtures) as unknown as LegalFixture[];
}

/** Fila más completa: activa casi todas las ramas de los documentos. */
const RICH_ROW: Row = {
  entity: "peruana",
  name: COMPANY_DIMENSIONS.name[1],
  web: "https://ejemplo.pe",
  complaints: "https://ejemplo.pe/reclamos",
  dpo: "filled",
  salesBand: "pequena",
  address: "Av. Principal 100, Lima",
  ruc: "20601234567",
  rep: "filled",
  banks: "mixed",
  providers: "foreign",
};

/** Un fixture por familia legal (el primer rubro de cada familia), con la fila más completa. */
export function representativeFixtures(): LegalFixture[] {
  const seen = new Set<string>();
  const out: LegalFixture[] = [];
  for (const sector of SECTORS) {
    const family = sectorFamilyOf(sector.id);
    if (!family || seen.has(family)) continue;
    seen.add(family);
    out.push(buildFixture({ id: sector.id, label: sector.label, banks: sector.banks }, RICH_ROW, `${sector.id}__rep`));
  }
  return out;
}

/**
 * Instantáneas legibles fuera de las familias: el rubro que no está en el catálogo
 * (cae en el perfil base) y una sociedad extranjera sin país ni representante.
 */
export function extraRepresentatives(): Array<{ dir: string; fixture: LegalFixture }> {
  const ecommerce = SECTORS.find((s) => s.id === "ecommerce")!;
  return [
    { dir: "unknown", fixture: buildFixture(UNKNOWN_SECTOR, RICH_ROW, "unknown__rep") },
    {
      dir: "extranjera",
      fixture: buildFixture(
        { id: ecommerce.id, label: ecommerce.label, banks: ecommerce.banks },
        { ...RICH_ROW, entity: "extranjera", rep: "empty" },
        "ecommerce__extranjera"
      ),
    },
  ];
}
