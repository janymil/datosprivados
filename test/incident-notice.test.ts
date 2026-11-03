import { describe, expect, it } from "vitest";
import { buildAuthorityNotice } from "@/lib/incident-notice";
import { getDb } from "@/lib/db";
import { getCompany, makeActiveCompany } from "./helpers/db";

/**
 * Borrador de notificación a la ANPD (área 9). Lo que se manda a la autoridad no
 * puede salir con huecos silenciosos: o trae el dato, o trae un `[...]` visible que
 * el responsable debe completar.
 */

const NOW = new Date("2026-11-04T17:00:00Z");

function incident(overrides: Partial<Parameters<typeof buildAuthorityNotice>[0]["incident"]> = {}) {
  return {
    title: "Fuga de base de clientes",
    description: "Un backup quedó en un bucket público durante 6 horas.",
    severity: "grave" as const,
    detected_at: "2026-11-04T10:00:00.000Z",
    due_at: "2026-11-06T10:00:00.000Z",
    data_categories: "nombre, DNI, correo, teléfono",
    affected_people: 850,
    affected_sample: "clientes de la campaña de julio",
    criteria: "muchas_personas,gran_volumen",
    measures: "Se cerró el acceso público, se rotaron las claves y se revisó el registro de accesos.",
    ...overrides,
  };
}

describe("borrador para la ANPD", () => {
  it("trae las siete secciones y las referencias legales", () => {
    const { companyId } = makeActiveCompany();
    const text = buildAuthorityNotice({ company: getCompany(companyId), incident: incident(), now: NOW });
    for (const heading of [
      "1. IDENTIFICACIÓN DEL RESPONSABLE DEL TRATAMIENTO",
      "2. CRONOLOGÍA DEL INCIDENTE",
      "3. NATURALEZA Y DESCRIPCIÓN DEL INCIDENTE",
      "4. CATEGORÍAS DE DATOS PERSONALES Y TITULARES AFECTADOS",
      "5. POSIBLES CONSECUENCIAS PARA LOS TITULARES",
      "6. MEDIDAS DE CONTENCIÓN Y CORRECCIÓN ADOPTADAS",
      "7. COMUNICACIÓN A LOS TITULARES AFECTADOS",
    ]) {
      expect(text, heading).toContain(heading);
    }
    expect(text).toContain("Ley N.° 29733");
    expect(text).toContain("016-2024-JUS");
    expect(text).toContain("ANPD");
    // Incidente digital: también hay que avisar al CNSD.
    expect(text).toContain("CNSD");
    expect(text).toContain("PLAZO 48 HORAS");
  });

  it("usa los datos reales de la empresa y del incidente", () => {
    const { companyId } = makeActiveCompany({
      name: "Bodega Ñandú S.A.C.",
      ruc: "20604567891",
      address: "Av. Los Cedros 456, Lima",
    });
    // El helper no expone todas las columnas: se completan como lo haría el usuario.
    getDb()
      .prepare("UPDATE companies SET dpo_name = ?, dpo_email = ?, phone = ? WHERE id = ?")
      .run("Lucía Rojas", "privacidad@nandu.pe", "+51 987 654 321", companyId);
    const text = buildAuthorityNotice({ company: getCompany(companyId), incident: incident(), now: NOW });

    expect(text).toContain("Razón Social / Nombre: Bodega Ñandú S.A.C.");
    expect(text).toContain("RUC N.°: 20604567891");
    expect(text).toContain("Av. Los Cedros 456, Lima");
    expect(text).toContain("Lucía Rojas");
    expect(text).toContain("privacidad@nandu.pe");
    expect(text).toContain("Título del evento: Fuga de base de clientes");
    expect(text).toContain("GRAVE");
    expect(text).toContain("850");
    expect(text).toContain("clientes de la campaña de julio");
    // Los criterios se leen en castellano, no como ids internos.
    expect(text).toContain("Afecta a muchas personas");
    expect(text).toContain("Gran volumen de datos");
    expect(text).not.toContain("muchas_personas");
    // Medidas y descripción tal como las escribió el responsable.
    expect(text).toContain("Se cerró el acceso público");
    expect(text).toContain("bucket público");
  });

  it("no deja huecos silenciosos: lo que falta está entre corchetes", () => {
    const { companyId } = makeActiveCompany({ address: "", dpo_name: "", phone: "" });
    const text = buildAuthorityNotice({
      company: getCompany(companyId),
      incident: incident({ description: "", data_categories: "", measures: "", affected_sample: "" }),
      now: NOW,
    });
    expect(text).not.toMatch(/\bundefined\b|\bnull\b|\bNaN\b/);
    expect(text).toContain("[por completar]");
    expect(text).toContain("[Por completar]");
    expect(text).toContain("[Por precisar]");
    expect(text).toContain("[Describir los posibles perjuicios para los titulares]");
    expect(text).toContain("[Explicar las razones o indicar \"No aplica\"]");
  });

  it("incluye las fechas de detección y del plazo de 48 horas", () => {
    const { companyId } = makeActiveCompany();
    const text = buildAuthorityNotice({ company: getCompany(companyId), incident: incident(), now: NOW });
    expect(text).toMatch(/Fecha y hora de detección: .+/);
    expect(text).toMatch(/Fecha y hora límite \(48 h\): .+/);
    expect(text).toContain("(Hora de Lima, UTC-5)");
    expect(text).toContain("Fecha de emisión de este reporte:");
  });

  it("una sociedad extranjera (compatibilidad) usa representante en vez de RUC", () => {
    const { companyId } = makeActiveCompany();
    getDb()
      .prepare("UPDATE companies SET entity_type = 'extranjera', country = 'Chile', representative_name = 'Ana Pérez' WHERE id = ?")
      .run(companyId);
    const text = buildAuthorityNotice({ company: getCompany(companyId), incident: incident(), now: NOW });
    expect(text).toContain("Sociedad constituida en: Chile");
    expect(text).toContain("Representante en el Perú: Ana Pérez");
    expect(text).not.toContain("RUC N.°");
  });
});
