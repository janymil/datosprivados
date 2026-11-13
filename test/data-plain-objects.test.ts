import { describe, expect, it } from "vitest";
import { getBank, listBanks } from "@/lib/data";
import { makeActiveCompany, makeBank } from "./helpers/db";

/**
 * `node:sqlite` devuelve filas con prototipo nulo y React se niega a pasarlas a un
 * componente cliente. La página «Editar banco» le pasa la fila a `BankForm` y fallaba
 * con «Algo salió mal» (encontrado en la auditoría del 2026-11-13).
 */
describe("las lecturas de data.ts devuelven objetos normales", () => {
  it("getBank y listBanks", () => {
    const { companyId } = makeActiveCompany();
    const id = makeBank(companyId, { name: "Clientes" });
    expect(Object.getPrototypeOf(getBank(companyId, id))).toBe(Object.prototype);
    for (const bank of listBanks(companyId)) expect(Object.getPrototypeOf(bank)).toBe(Object.prototype);
    expect(getBank(companyId, "no-existe")).toBeUndefined();
  });
});
