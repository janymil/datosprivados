import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";
import {
  cancelBankRegistrationAction,
  deleteDraftBankAction,
  markBankRegisteredAction,
  reopenBankAction,
  saveBankAction,
} from "@/app/actions/company";
import { generateAndSaveDocument, getDocument, getStats, listBanks, listCancelledBanks } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
import { jar } from "./helpers/next";
import { getCompany, makeActiveCompany, makeBank } from "./helpers/db";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

async function loginAs(userId: string) {
  jar.store.clear();
  await createSession(userId);
}

type BankState = { status: string; cancelled_at: string | null; cancel_reference: string | null; name: string };
const bankRow = (id: string) =>
  getDb().prepare("SELECT status, cancelled_at, cancel_reference, name FROM data_banks WHERE id = ?").get(id) as BankState;

function registeredBank(companyId: string, name = "Clientes") {
  const id = makeBank(companyId, { name, status: "registrado" });
  getDb().prepare("UPDATE data_banks SET sipdp_code = 'RNPDP-1', registered_at = '2026-01-15' WHERE id = ?").run(id);
  return id;
}

beforeEach(() => jar.store.clear());

describe("cancelar la inscripción de un banco ante la ANPD", () => {
  it("cancela un banco inscrito propio con fecha y referencia", async () => {
    const a = makeActiveCompany();
    const bank = registeredBank(a.companyId);
    await loginAs(a.userId);

    await expect(
      cancelBankRegistrationAction(form({ id: bank, cancelled_at: "2026-03-01", cancel_reference: "Res. 12-2026" }))
    ).rejects.toThrow(`REDIRECT:/app/bancos/${bank}?cancelado=1`);
    expect(bankRow(bank)).toMatchObject({ status: "cancelado", cancelled_at: "2026-03-01", cancel_reference: "Res. 12-2026" });
  });

  it("no cancela un borrador, el banco de otra empresa ni con fecha inválida", async () => {
    const a = makeActiveCompany();
    const b = makeActiveCompany();
    const draft = makeBank(a.companyId);
    const own = registeredBank(a.companyId);
    const other = registeredBank(b.companyId);
    await loginAs(a.userId);

    await expect(cancelBankRegistrationAction(form({ id: draft, cancelled_at: "2026-03-01" }))).rejects.toThrow("REDIRECT:");
    expect(bankRow(draft).status).toBe("borrador");
    await expect(cancelBankRegistrationAction(form({ id: other, cancelled_at: "2026-03-01" }))).rejects.toThrow("REDIRECT:");
    expect(bankRow(other).status).toBe("registrado");

    for (const cancelled_at of ["", "ayer", "2099-01-01", "2025-12-31"]) {
      await expect(cancelBankRegistrationAction(form({ id: own, cancelled_at }))).rejects.toThrow("?error=fecha");
      expect(bankRow(own).status).toBe("registrado");
    }
  });

  it("es definitivo: no se edita, no vuelve a borrador, no se reinscribe ni se elimina", async () => {
    const a = makeActiveCompany();
    const bank = registeredBank(a.companyId, "Original");
    await loginAs(a.userId);
    await expect(cancelBankRegistrationAction(form({ id: bank, cancelled_at: "2026-03-01" }))).rejects.toThrow("REDIRECT:");

    await expect(saveBankAction(form({ id: bank, name: "Cambiado" }))).rejects.toThrow("REDIRECT:");
    await expect(reopenBankAction(form({ id: bank }))).rejects.toThrow("REDIRECT:");
    await expect(markBankRegisteredAction(form({ id: bank, sipdp_code: "X" }))).rejects.toThrow("REDIRECT:");
    await expect(deleteDraftBankAction(form({ id: bank }))).rejects.toThrow("REDIRECT:");
    expect(bankRow(bank)).toMatchObject({ status: "cancelado", name: "Original" });
  });

  it("sale de la política, del puntaje y de los conteos, pero queda en el historial", async () => {
    const a = makeActiveCompany();
    registeredBank(a.companyId, "Clientes vigentes");
    const gone = registeredBank(a.companyId, "Concurso 2025");
    await loginAs(a.userId);
    await expect(cancelBankRegistrationAction(form({ id: gone, cancelled_at: "2026-03-01" }))).rejects.toThrow("REDIRECT:");

    const company = getCompany(a.companyId);
    const banks = listBanks(a.companyId);
    expect(banks.map((bank) => bank.name)).toEqual(["Clientes vigentes"]);
    expect(listCancelledBanks(a.companyId).map((bank) => bank.id)).toEqual([gone]);
    expect(getStats(a.companyId)).toMatchObject({ banks: 1, banksRegistered: 1 });

    generateAndSaveDocument(company, banks, "politica");
    const policy = getDocument(a.companyId, "politica")!.content;
    expect(policy).toContain("Clientes vigentes");
    expect(policy).not.toContain("Concurso 2025");

    // El único banco vigente está inscrito: el paso SIPDP cuenta como hecho.
    const compliance = computeCompliance({ company, banks, requests: [], incidents: [], documents: [] });
    expect(compliance.items.find((item) => item.key === "sipdp")?.ok).toBe(true);
  });
});
