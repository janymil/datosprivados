import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ store: new Map<string, string>(), ip: 1 }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.store.has(name) ? { name, value: jar.store.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.store.set(name, value),
    delete: (name: string) => void jar.store.delete(name),
  }),
  headers: async () => new Headers({ "cf-connecting-ip": `203.0.113.${jar.ip}` }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { getDb, nowIso } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { saveBankAction } from "@/app/actions/company";
import { createArcoRequestAction } from "@/app/actions/arco";
import { getCompanyById } from "@/lib/billing";
import { getOpenCredit } from "@/lib/credit";
import { confirmTransferPaid, requestCreditInvoice } from "@/lib/transfers";
import { makeCompany } from "./helpers/db";

const DAY = 24 * 60 * 60 * 1000;
const original = { ...process.env };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const count = (sql: string, ...p: string[]) => (getDb().prepare(sql).get(...p) as { n: number }).n;

/** Empresa con crédito pedido y factura emitida hace `daysAgo` días (vencimiento = emisión + 15). */
async function creditCompany(dueDaysAgo: number) {
  const { companyId, userId } = makeCompany({ ruc: "20601030013" });
  getDb().prepare("UPDATE companies SET ruc_verified_at = ? WHERE id = ?").run(nowIso(), companyId);
  expect(requestCreditInvoice(getCompanyById(companyId)!, "basico").ok).toBe(true);
  const credit = getOpenCredit(companyId)!;
  getDb().prepare("UPDATE payments SET due_at = ? WHERE id = ?").run(new Date(Date.now() - dueDaysAgo * DAY).toISOString(), credit.id);
  jar.store.clear();
  await createSession(userId);
  return { companyId, creditId: credit.id };
}

beforeEach(() => {
  jar.store.clear();
  jar.ip += 1;
  process.env.TRANSFER_BANK_DETAILS = "BCP · CCI 002";
});
afterEach(() => {
  process.env = { ...original };
});

describe("factura a crédito vencida: solo lectura", () => {
  it("vencida (vencimiento + 7 días): una acción que escribe redirige a /app?pago=vencido y no escribe", async () => {
    const { companyId } = await creditCompany(8);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow("REDIRECT:/app?pago=vencido");
    expect(count("SELECT COUNT(*) n FROM data_banks WHERE company_id = ?", companyId)).toBe(0);
  });

  it("antes de vencimiento + 7 días las acciones funcionan", async () => {
    await creditCompany(6);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.not.toThrow("REDIRECT:/app?pago=vencido");
  });

  it("vencida: el formulario ARCO público de la empresa sigue recibiendo solicitudes", async () => {
    const { companyId } = await creditCompany(30);
    const slug = (getDb().prepare("SELECT slug FROM companies WHERE id = ?").get(companyId) as { slug: string }).slug;
    jar.store.clear(); // quien envía es un tercero, sin sesión
    await expect(
      createArcoRequestAction(form({ slug, requester_name: "Persona", description: "Quiero mis datos", email: "p@example.com", type: "acceso" }))
    ).rejects.toThrow(/\?ok=ARCO-/);
    expect(count("SELECT COUNT(*) n FROM arco_requests WHERE company_id = ?", companyId)).toBe(1);
  });

  it("al confirmar el pago vuelve el acceso completo", async () => {
    const { companyId, creditId } = await creditCompany(30);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.toThrow("REDIRECT:/app?pago=vencido");
    expect(confirmTransferPaid(creditId, "OP-55").ok).toBe(true);
    await expect(saveBankAction(form({ name: "Clientes" }))).rejects.not.toThrow("REDIRECT:/app?pago=vencido");
    expect(getCompanyById(companyId)!.billing_status).toBe("active");
  });
});
