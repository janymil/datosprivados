import { describe, expect, it } from "vitest";
import { findUncitedObligations, obligationSentences } from "@/legal/audit/obligations";

const DS = { norm: "ds-016-2024-jus", art: "69" };

describe("obligaciones sin cita", () => {
  it("marca «El responsable debe responder en 10 días.» sin citas", () => {
    const found = findUncitedObligations([{ source: "arco.3.plazos", text: "El responsable debe responder en 10 días.", cites: [] }]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ check: "obligacion-sin-cita", rule: "obligation-uncited", severity: "revisar", source: "arco.3.plazos" });
    expect(found[0].detail).toBe("El responsable debe responder en 10 días.");
  });

  it("no la marca si el ítem cita un artículo", () => {
    expect(findUncitedObligations([{ source: "arco.3.plazos", text: "El responsable debe responder en 10 días.", cites: [DS] }])).toEqual([]);
  });

  it("la marca en una cláusula nonLegal", () => {
    const found = findUncitedObligations([{ source: "politica.0.titulo", text: "El titular deberá firmar.", cites: [DS], nonLegal: "título" }]);
    expect(found).toHaveLength(1);
  });

  it("una frase con «(art. 69 del DS N.° 016-2024-JUS)» no se marca", () => {
    const text = "La respuesta se entrega en un plazo de 20 días (art. 69 del DS N.° 016-2024-JUS).";
    expect(findUncitedObligations([{ source: "arco.3.plazos", text, cites: [] }])).toEqual([]);
  });

  it("«Esta política describe cómo tratamos sus datos.» no se marca", () => {
    expect(findUncitedObligations([{ source: "politica.1.intro", text: "Esta política describe cómo tratamos sus datos.", cites: [] }])).toEqual([]);
  });

  it("separa frases y limpia el markdown", () => {
    expect(obligationSentences("**Plazo.** Usted deberá responder; luego\n- es obligatorio avisar")).toEqual(["Usted deberá responder", "luego", "es obligatorio avisar"]);
  });

  it("mismas frases, mismos ids", () => {
    const items = [{ source: "a", text: "Debe conservar los registros 2 años. Debe informar.", cites: [] }];
    const ids = findUncitedObligations(items).map((f) => f.id);
    expect(ids).toHaveLength(2);
    expect(findUncitedObligations(items).map((f) => f.id)).toEqual(ids);
  });
});
