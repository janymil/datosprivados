import type { DocumentKind } from "@/lib/db";
import { arcoSpec } from "./documents/arco";
import { avisoSpec } from "./documents/aviso";
import { clausulasSpec } from "./documents/clausulas";
import { consentimientoSpec } from "./documents/consentimiento";
import { cookiesSpec } from "./documents/cookies";
import { eipdSpec } from "./documents/eipd";
import { encargoSpec } from "./documents/encargo";
import { politicaSpec } from "./documents/politica";
import { reclamacionesSpec } from "./documents/reclamaciones";
import { retencionSpec } from "./documents/retencion";
import { sectorialSpec } from "./documents/sectorial";
import { seguridadSpec } from "./documents/seguridad";
import { terminosSpec } from "./documents/terminos";
import { trabajadoresSpec } from "./documents/trabajadores";
import type { Clause, DocumentSpec } from "./types";

/** Todas las especificaciones de documentos, por tipo. */
export const SPECS: Record<DocumentKind, DocumentSpec> = {
  politica: politicaSpec,
  terminos: terminosSpec,
  cookies: cookiesSpec,
  aviso: avisoSpec,
  reclamaciones: reclamacionesSpec,
  consentimiento: consentimientoSpec,
  seguridad: seguridadSpec,
  retencion: retencionSpec,
  encargo: encargoSpec,
  clausulas: clausulasSpec,
  eipd: eipdSpec,
  trabajadores: trabajadoresSpec,
  arco: arcoSpec,
  sectorial: sectorialSpec,
};

/** Todas las cláusulas de la biblioteca, en el orden de los documentos. */
export function allClauses(): Clause[] {
  return Object.values(SPECS).flatMap((spec) => spec.clauses);
}
