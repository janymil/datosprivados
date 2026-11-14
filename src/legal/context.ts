import type { Company, DataBank, Provider } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { sectorLegalProfile } from "@/lib/sector-legal";
import type { LegalContext } from "./types";

/** Contexto de redacción de una empresa: perfil del rubro y fecha del documento. */
export function legalContext(company: Company, banks: DataBank[], providers: Provider[]): LegalContext {
  return {
    company,
    banks,
    providers,
    profile: sectorLegalProfile(company),
    date: formatDate(new Date().toISOString(), "long"),
  };
}
