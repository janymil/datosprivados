import { describe, expect, it } from "vitest";
import { FACTS, fact } from "@/legal/facts";
import { arcoLegalBusinessDays } from "@/lib/db";
import { FINE_TIERS, UIT_2026 } from "@/lib/fines";
import { incidentDueAt } from "@/lib/incident-criteria";
import { SALES_BANDS } from "@/lib/sector-legal";

/** El código lee los hechos legales: un cambio de norma cambia el comportamiento y el texto a la vez. */
function withFact<T>(id: string, value: number | string, fn: () => T): T {
  const f = FACTS[id];
  const old = f.value;
  f.value = value;
  try {
    return fn();
  } finally {
    f.value = old;
  }
}

describe("el código lee los hechos legales", () => {
  it("los plazos ARCO salen de los hechos", () => {
    expect(arcoLegalBusinessDays("informacion")).toBe(8);
    expect(arcoLegalBusinessDays("acceso")).toBe(20);
    expect(arcoLegalBusinessDays("cancelacion")).toBe(10);
    expect(withFact("arco.plazo.acceso", 21, () => arcoLegalBusinessDays("acceso"))).toBe(21);
    expect(withFact("arco.plazo.informacion", 9, () => arcoLegalBusinessDays("informacion"))).toBe(9);
    expect(withFact("arco.plazo.otros", 11, () => arcoLegalBusinessDays("oposicion"))).toBe(11);
  });

  it("el vencimiento de un incidente sale del plazo de notificación", () => {
    const detected = new Date("2026-11-10T14:00:00.000Z");
    expect(incidentDueAt(detected).toISOString()).toBe("2026-11-12T14:00:00.000Z");
    expect(withFact("incidente.notificacion", 72, () => incidentDueAt(detected)).toISOString()).toBe("2026-11-13T14:00:00.000Z");
  });

  it("UIT y escala de multas son los hechos", () => {
    expect(UIT_2026).toBe(fact("uit.2026").value);
    expect(FINE_TIERS.leve).toMatchObject({ minUit: 0.5, maxUit: 5 });
    expect(FINE_TIERS.grave).toMatchObject({ minUit: 5, maxUit: 50 });
    expect(FINE_TIERS.muy_grave).toMatchObject({ minUit: 50, maxUit: 100 });
  });

  it("las fechas del Oficial de Datos por banda de ventas son los hechos", () => {
    const byBand = Object.fromEntries(SALES_BANDS.map((b) => [b.id, b.odpFrom]));
    expect(byBand).toEqual({
      micro: fact("odp.desde.micro").value,
      pequena: fact("odp.desde.pequena").value,
      mediana: fact("odp.desde.mediana").value,
      grande: fact("odp.desde.grande").value,
    });
  });
});
