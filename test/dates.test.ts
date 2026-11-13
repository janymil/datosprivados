import { describe, expect, it } from "vitest";
import { addBusinessDays, arcoLegalBusinessDays, businessDaysBetween } from "@/lib/db";
import { limaDateTimeLocal, limaToday } from "@/lib/format";

describe("días hábiles", () => {
  it("10 días para rectificación/cancelación/oposición y 20 para acceso", () => {
    expect(arcoLegalBusinessDays("informacion")).toBe(8);
    expect(arcoLegalBusinessDays("acceso")).toBe(20);
    for (const type of ["rectificacion", "cancelacion", "oposicion"]) expect(arcoLegalBusinessDays(type)).toBe(10);
  });

  it("salta fines de semana", () => {
    // lunes 2026-10-05 + 5 hábiles = lunes 2026-10-12... pero 08-oct es feriado (Angamos): martes 13
    expect(addBusinessDays("2026-10-05", 4)).toBe("2026-10-12"); // jue 8 feriado: 6,7,9,12
    expect(addBusinessDays("2026-09-04", 1)).toBe("2026-09-07"); // viernes → lunes
    expect(addBusinessDays("2026-09-05", 1)).toBe("2026-09-07"); // sábado → lunes
  });

  it("Jueves y Viernes Santo 2026–2030 no son hábiles", () => {
    const holyDays: Record<number, [string, string]> = {
      2026: ["2026-04-02", "2026-04-03"],
      2027: ["2027-03-25", "2027-03-26"],
      2028: ["2028-04-13", "2028-04-14"],
      2029: ["2029-03-29", "2029-03-30"],
      2030: ["2030-04-18", "2030-04-19"],
    };
    for (const [year, [thursday, friday]] of Object.entries(holyDays)) {
      const dayBefore = new Date(`${thursday}T12:00:00Z`);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const start = dayBefore.toISOString().slice(0, 10);
      // Miércoles Santo + 1 hábil salta jueves, viernes, sábado y domingo → lunes.
      const monday = new Date(`${friday}T12:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() + 3);
      expect(addBusinessDays(start, 1), `Semana Santa ${year}`).toBe(monday.toISOString().slice(0, 10));
    }
  });

  it("cruza el fin de año respetando Año Nuevo y Navidad", () => {
    // 2026-12-24 (jue) +1 → 25 es feriado, 26-27 fin de semana → lunes 28
    expect(addBusinessDays("2026-12-24", 1)).toBe("2026-12-28");
    // 2026-12-31 (jue) +1 → 1 ene (vie) feriado, 2-3 ene fin de semana → lunes 4 ene
    expect(addBusinessDays("2026-12-31", 1)).toBe("2027-01-04");
  });

  it("si el vencimiento cae en feriado, pasa al siguiente día hábil", () => {
    // 2026-07-28 y 29 son feriados; 2026-07-27 (lun) +1 → miércoles 30 (martes 28 y mié 29 feriados)
    expect(addBusinessDays("2026-07-27", 1)).toBe("2026-07-30");
  });

  it("un plazo de 10 y de 20 días hábiles es coherente con businessDaysBetween", () => {
    for (const days of [10, 20]) {
      const due = addBusinessDays("2026-10-01", days);
      expect(businessDaysBetween("2026-10-01", due)).toBe(days);
    }
  });

  it("businessDaysBetween es 0 si el rango es nulo o inverso", () => {
    expect(businessDaysBetween("2026-10-05", "2026-10-05")).toBe(0);
    expect(businessDaysBetween("2026-10-09", "2026-10-05")).toBe(0);
  });
});

describe("hora de Lima", () => {
  it("23:30 en Lima sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    const instant = new Date("2026-10-15T04:30:00Z"); // 23:30 del 14 en Lima
    expect(limaToday(instant)).toBe("2026-10-14");
    expect(limaDateTimeLocal(instant)).toBe("2026-10-14T23:30");
  });

  it("00:30 en Lima ya es el día siguiente", () => {
    expect(limaToday(new Date("2026-10-15T05:30:00Z"))).toBe("2026-10-15");
  });

  it("el plazo ARCO usa la fecha de Lima, no la del servidor", () => {
    // Recibida el 14 a las 23:30 Lima (15 04:30 UTC) → el día de recepción es 14.
    const received = limaToday(new Date("2026-10-15T04:30:00Z"));
    expect(addBusinessDays(received, 1)).toBe("2026-10-15");
  });
});
