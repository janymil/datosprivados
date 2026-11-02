import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { businessDaysBetween, listHolidays, removeHoliday, setHoliday } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { HolidayDisclaimer, TemplateNotice } from "@/components/legal-notes";
import { addHolidayAction, removeHolidayAction } from "@/app/operador/feriados/actions";
import { jar } from "./helpers/next";
import { makeActiveCompany } from "./helpers/db";

/**
 * Plazos y avisos legales (área 7):
 * - los feriados que carga el operador mueven el cómputo en días hábiles;
 * - los avisos que el cliente y la persona deben ver existen y dicen qué son.
 */

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("feriados y días hábiles", () => {
  it("siembra los feriados nacionales calculados", () => {
    const holidays = listHolidays(2026);
    expect(holidays.length).toBeGreaterThanOrEqual(12);
    expect(holidays.map((h) => h.date)).toEqual([...holidays.map((h) => h.date)].sort());
    expect(holidays.every((h) => h.date.startsWith("2026-"))).toBe(true);
  });

  it("un día no laborable por decreto no cuenta como hábil", () => {
    // 2026-11-09 es lunes: sin decreto hay 2 días hábiles entre el viernes 6 y el martes 10.
    expect(businessDaysBetween("2026-11-06", "2026-11-10")).toBe(2);
    setHoliday("2026-11-09", "Día no laborable para el sector público", "decreto");
    try {
      expect(businessDaysBetween("2026-11-06", "2026-11-10")).toBe(1);
      expect(listHolidays(2026).find((h) => h.date === "2026-11-09")).toMatchObject({ source: "decreto" });
    } finally {
      removeHoliday("2026-11-09");
    }
    expect(businessDaysBetween("2026-11-06", "2026-11-10")).toBe(2);
  });

  it("corrige el nombre de un feriado ya cargado sin duplicarlo", () => {
    setHoliday("2026-12-25", "Navidad (corregido)", "decreto");
    try {
      const rows = listHolidays(2026).filter((h) => h.date === "2026-12-25");
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Navidad (corregido)");
    } finally {
      setHoliday("2026-12-25", "Navidad", "calculado");
    }
  });
});

describe("pantalla de feriados del operador", () => {
  const previous = process.env.OPERATOR_EMAILS;
  let operatorEmail = "";
  beforeEach(() => {
    jar.store.clear();
    // Correo único por prueba: `users.email` es UNIQUE y cada prueba crea su cuenta.
    operatorEmail = `operador-${Math.random().toString(36).slice(2, 10)}@datosprivados.pe`;
    process.env.OPERATOR_EMAILS = operatorEmail;
  });
  afterEach(() => {
    process.env.OPERATOR_EMAILS = previous;
  });

  async function loginAs(email: string) {
    const made = makeActiveCompany({ email });
    await createSession(made.userId);
  }

  it("un operador añade y quita un día no laborable", async () => {
    await loginAs(operatorEmail);
    await expect(addHolidayAction(form({ date: "2026-07-16", name: "Día no laborable por decreto" }))).rejects.toThrow(
      "REDIRECT:/operador/feriados?ok=2026-07-16"
    );
    expect(listHolidays(2026).find((h) => h.date === "2026-07-16")?.name).toBe("Día no laborable por decreto");

    await expect(removeHolidayAction(form({ date: "2026-07-16" }))).rejects.toThrow(
      "REDIRECT:/operador/feriados?ok=2026-07-16"
    );
    expect(listHolidays(2026).some((h) => h.date === "2026-07-16")).toBe(false);
  });

  it("rechaza una fecha o un nombre inválidos", async () => {
    await loginAs(operatorEmail);
    await expect(addHolidayAction(form({ date: "28/07/2026", name: "Día no laborable" }))).rejects.toThrow(
      "REDIRECT:/operador/feriados?error=fecha"
    );
    await expect(addHolidayAction(form({ date: "2026-07-17", name: "x" }))).rejects.toThrow(
      "REDIRECT:/operador/feriados?error=nombre"
    );
    expect(listHolidays(2026).some((h) => h.date === "2026-07-17")).toBe(false);
  });

  it("quien no es operador recibe 404", async () => {
    await loginAs(`cliente-${Math.random().toString(36).slice(2, 8)}@example.com`);
    await expect(addHolidayAction(form({ date: "2026-07-20", name: "Día no laborable" }))).rejects.toThrow("NOT_FOUND");
    expect(listHolidays(2026).some((h) => h.date === "2026-07-20")).toBe(false);
  });
});

describe("avisos legales en pantalla", () => {
  it("el aviso de plantillas dice que no es asesoría legal y enlaza a la ayuda", () => {
    const html = renderToStaticMarkup(TemplateNotice({}));
    expect(html).toContain("plantillas");
    expect(html).toContain("no asesoría legal");
    expect(html).toContain("/app/ayuda/documentos");
  });

  it("el aviso de feriados explica qué días no se cuentan", () => {
    const html = renderToStaticMarkup(HolidayDisclaimer({}));
    expect(html).toContain("días hábiles");
    expect(html).toContain("feriados regionales");
    expect(html).toContain("por decreto");
  });
});
