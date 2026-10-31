import type { Company, DataBank, DocumentKind, DocumentRow, Provider } from "./db";
import { sectorLegalProfile } from "./sector-legal";

/**
 * Versionado de plantillas y detección de documentos desactualizados.
 *
 * Cada documento guardado recuerda con qué versión de plantilla se generó y de
 * qué datos salió (huella de empresa, rubro y bancos). Si cambia la plantilla o
 * cualquiera de esos datos, el documento figura como desactualizado y se puede
 * regenerar con un clic.
 *
 * REGLA PARA QUIEN EDITE `documents.ts`: si cambias el texto o la lógica de un
 * generador, sube aquí el número de esa plantilla. Es lo que hace que los
 * documentos ya guardados de todos los clientes se marquen para regenerar.
 */
export const TEMPLATE_VERSIONS: Record<DocumentKind, number> = {
  politica: 3,
  terminos: 3,
  cookies: 3,
  aviso: 2,
  reclamaciones: 3,
  consentimiento: 2,
  seguridad: 3,
  retencion: 2,
  encargo: 3,
  clausulas: 3,
  eipd: 3,
  trabajadores: 1,
  arco: 1,
  sectorial: 1,
};

export type StaleReason = "plantilla" | "empresa" | "rubro" | "bancos" | "herramientas";

export const STALE_REASON_LABELS: Record<StaleReason, string> = {
  plantilla: "Mejoramos la plantilla legal",
  empresa: "Cambiaron los datos de tu empresa",
  rubro: "Cambió tu rubro",
  bancos: "Cambiaron tus bancos de datos",
  herramientas: "Cambiaron tus herramientas o proveedores",
};

export type BuiltFrom = { company: string; sector: string; banks: string; providers: string };

/** Qué documentos incluyen el inventario de bancos en su texto. */
const USES_BANKS = new Set<DocumentKind>(["politica", "terminos", "seguridad", "retencion", "encargo", "eipd", "sectorial"]);

/** Qué documentos incluyen las herramientas y proveedores declarados. */
const USES_PROVIDERS = new Set<DocumentKind>(["politica", "cookies", "seguridad", "encargo", "eipd", "sectorial"]);

/** Campos de la empresa que solo afectan a algunos documentos. */
const EXTRA_COMPANY_FIELDS: Partial<Record<DocumentKind, Array<"complaints_url" | "sales_band">>> = {
  terminos: ["complaints_url"],
  reclamaciones: ["complaints_url"],
  clausulas: ["sales_band"],
};

const PROVIDER_FIELDS = ["category", "name", "country", "purpose", "cookies", "dpa_status", "transfer_status"] as const;

/** Campos de la empresa que aparecen en el texto de los documentos. */
const COMPANY_FIELDS = [
  "name",
  "ruc",
  "address",
  "email",
  "slug",
  "dpo_name",
  "dpo_email",
  "entity_type",
  "country",
  "representative_name",
  "representative_address",
] as const;

const BANK_FIELDS = [
  "name",
  "purpose",
  "data_categories",
  "legal_basis",
  "channel",
  "retention",
  "recipients",
  "transfers",
  "status",
  "sipdp_code",
] as const;

/** FNV-1a de 32 bits: suficiente para detectar cambios y sin dependencias de entorno. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function fingerprint(
  kind: DocumentKind,
  company: Company,
  banks: DataBank[],
  providers: Provider[] = []
): BuiltFrom {
  const fields = [...COMPANY_FIELDS, ...(EXTRA_COMPANY_FIELDS[kind] ?? [])];
  const companyPart = fields.map((field) => String(company[field] ?? "")).join("\u0001");
  const profile = sectorLegalProfile(company);
  const banksPart = USES_BANKS.has(kind)
    ? [...banks]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((bank) => BANK_FIELDS.map((field) => String(bank[field] ?? "")).join("\u0001"))
        .join("\u0002")
    : "";
  return {
    company: hash(companyPart),
    sector: hash(`${profile.family}|${profile.title}`),
    banks: USES_BANKS.has(kind) ? hash(banksPart) : "",
    providers: USES_PROVIDERS.has(kind)
      ? hash(
          [...providers]
            .sort((a, b) => `${a.category}${a.name}`.localeCompare(`${b.category}${b.name}`))
            .map((provider) => PROVIDER_FIELDS.map((field) => String(provider[field] ?? "")).join("\u0001"))
            .join("\u0002")
        )
      : "",
  };
}

export function serializeBuiltFrom(value: BuiltFrom): string {
  return JSON.stringify(value);
}

function parseBuiltFrom(value: string | null | undefined): BuiltFrom | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<BuiltFrom>;
    if (typeof parsed.company === "string" && typeof parsed.sector === "string") {
      return {
        company: parsed.company,
        sector: parsed.sector,
        banks: String(parsed.banks ?? ""),
        providers: String(parsed.providers ?? ""),
      };
    }
  } catch {
    // Huella ilegible: se trata como documento antiguo.
  }
  return null;
}

export type Freshness = { stale: boolean; reasons: StaleReason[] };

/** ¿El documento guardado sigue reflejando la plantilla vigente y los datos actuales? */
export function documentFreshness(
  doc: Pick<DocumentRow, "kind" | "template_version" | "built_from">,
  company: Company,
  banks: DataBank[],
  providers: Provider[] = []
): Freshness {
  const reasons: StaleReason[] = [];
  const current = TEMPLATE_VERSIONS[doc.kind];
  if (doc.template_version == null || doc.template_version < current) reasons.push("plantilla");

  const built = parseBuiltFrom(doc.built_from);
  if (built) {
    const now = fingerprint(doc.kind, company, banks, providers);
    if (built.company !== now.company) reasons.push("empresa");
    if (built.sector !== now.sector) reasons.push("rubro");
    if (built.banks !== now.banks) reasons.push("bancos");
    if (built.providers !== now.providers) reasons.push("herramientas");
  }
  return { stale: reasons.length > 0, reasons };
}
