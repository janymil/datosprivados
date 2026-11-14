import { COUNTRY_LABEL, usesAutomation } from "@/legal/shared";
import type { LegalContext } from "@/legal/types";
import type { DocumentKind } from "@/lib/db";
import { isAbroad } from "@/lib/provider-catalog";

/**
 * Reglas de cumplimiento (diseño §6): lo que todo documento generado debe contener
 * según la situación de la empresa. Se evalúan sobre todas las fixtures.
 */
export type Rule = {
  id: string;
  applies: (ctx: LegalContext) => boolean;
  /** null = cumple; texto = qué falta. */
  check: (docs: Record<DocumentKind, string>, ctx: LegalContext) => string | null;
};

const missing = (doc: string, needles: string[]) => needles.filter((needle) => !doc.includes(needle));
const report = (kind: string, list: string[]) => (list.length ? `${kind} sin: ${list.join(" · ")}` : null);

export const RULES: Rule[] = [
  {
    id: "politica-deber-informacion",
    applies: () => true,
    check: ({ politica }) =>
      report(
        "politica",
        missing(politica, [
          "Identidad y domicilio del responsable",
          "Bancos de datos personales, finalidades",
          "Carácter obligatorio o facultativo",
          "Base legal del tratamiento",
          "Plazo de conservación",
          "Destinatarios, encargados del tratamiento y transferencias",
          "Derechos ARCO",
          "Decisiones automatizadas",
        ])
      ),
  },
  {
    id: "sensibles-consentimiento-escrito",
    applies: ({ profile }) => profile.sensitive || profile.biometric,
    check: ({ consentimiento }) =>
      report("consentimiento", missing(consentimiento, ["AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS SENSIBLES", "por escrito"])),
  },
  {
    id: "menores-consentimiento-padres",
    applies: ({ profile }) => profile.minors,
    check: ({ consentimiento }) =>
      report("consentimiento", missing(consentimiento, ["AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS DE UN MENOR DE EDAD"])),
  },
  {
    id: "proveedor-extranjero-transferencia",
    applies: ({ providers }) => providers.some((p) => isAbroad(p.country)),
    check: ({ politica, encargo }, { providers }) => {
      const abroad = providers.filter((p) => isAbroad(p.country));
      return (
        report("politica", missing(politica, ["flujo transfronterizo", ...abroad.map((p) => COUNTRY_LABEL(p.country))])) ??
        report("encargo", missing(encargo, abroad.map((p) => p.name)))
      );
    },
  },
  {
    id: "cctv-plazo",
    applies: () => true,
    check: ({ clausulas }, { profile }) => {
      if (!clausulas.includes("treinta (30)")) return "clausulas sin el plazo de conservación de imágenes";
      if (profile.family === "educacion_menores" && (!clausulas.includes("como máximo") || clausulas.includes("sesenta"))) {
        return "clausulas: en educación de menores el plazo debe ser de 30 días como máximo";
      }
      return null;
    },
  },
  {
    id: "consumidor-libro-reclamaciones",
    applies: ({ profile }) => profile.consumer,
    check: ({ terminos }) => report("terminos", missing(terminos, ["Libro de Reclamaciones"])),
  },
  {
    id: "automatizado-aviso",
    applies: ({ profile, banks }) => usesAutomation(profile, banks),
    check: ({ politica }) => report("politica", missing(politica, ["utiliza tratamientos automatizados", "tratamiento objetivo (art. 87"])),
  },
  {
    id: "sin-marcadores-internos",
    applies: () => true,
    check: (docs) => {
      const bad = Object.entries(docs).filter(([, text]) => /\{\{|\bTODO\b/.test(text)).map(([kind]) => kind);
      return bad.length ? `marcadores internos en: ${bad.join(", ")}` : null;
    },
  },
];
