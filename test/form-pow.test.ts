import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ store: new Map<string, string>(), ip: "198.51.100.7" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (ctx.store.has(name) ? { name, value: ctx.store.get(name)! } : undefined),
    set: (name: string, value: string) => void ctx.store.set(name, value),
    delete: (name: string) => void ctx.store.delete(name),
  }),
  headers: async () => new Headers({ "x-real-ip": ctx.ip }),
}));

import { getDb } from "@/lib/db";
import {
  consumeChallenge,
  createChallenge,
  formPowEnabled,
  leadingZeroBits,
  powDifficulty,
  powKey,
  solveChallenge,
  verifyChallenge,
} from "@/lib/form-pow";
import { createArcoRequestAction } from "@/app/actions/arco";
import { makeActiveCompany, makeBank } from "./helpers/db";

/**
 * Prueba de trabajo del formulario ARCO (área 8). Los límites por IP fallan detrás
 * de un NAT compartido; esto encarece cada envío automatizado sin pedirle nada
 * extra a una persona. Se activa con `FORM_POW=1`.
 */

const SECRET = "secreto-de-formulario-0123456789";
const previous = { ...process.env };

beforeEach(() => {
  ctx.store.clear();
  ctx.ip = `198.51.100.${Math.floor(Math.random() * 200)}`;
  process.env = { ...previous };
  process.env.CRON_SECRET = SECRET;
  process.env.FORM_POW = "1";
  process.env.FORM_POW_BITS = "8"; // rápido en pruebas; en producción 16
  getDb().exec("DELETE FROM pow_challenges");
});

afterEach(() => {
  process.env = { ...previous };
});

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const slugOf = (companyId: string) =>
  (getDb().prepare("SELECT slug FROM companies WHERE id = ?").get(companyId) as { slug: string }).slug;

describe("desafío de la prueba de trabajo", () => {
  it("está apagada salvo que se pida explícitamente y haya clave", () => {
    expect(formPowEnabled()).toBe(true);
    expect(formPowEnabled({ FORM_POW: "0", CRON_SECRET: SECRET })).toBe(false);
    expect(formPowEnabled({ FORM_POW: "1" })).toBe(false); // sin secreto no hay firma posible
    expect(formPowEnabled({ FORM_POW: "1", CRON_SECRET: "corta" })).toBe(false);
    expect(powKey({})).toBeNull();
  });

  it("acepta la solución correcta y rechaza la que no cumple la dificultad", () => {
    const challenge = createChallenge()!;
    const counter = solveChallenge(challenge.salt, challenge.difficulty)!;
    expect(verifyChallenge({ ...challenge, counter: String(counter) })).toEqual({ ok: true });

    // No sirve `counter + 1`: con dificultad 8 una de cada 256 soluciones vecinas
    // también cumple (el rojo intermitente que tuvo esta prueba). Se busca una que
    // no cumpla, que es lo que de verdad se quiere comprobar.
    const bitsOf = (value: number) => leadingZeroBits(crypto.createHash("sha256").update(`${challenge.salt}${value}`).digest());
    let failing = counter + 1;
    while (bitsOf(failing) >= challenge.difficulty) failing += 1;
    expect(verifyChallenge({ ...challenge, counter: String(failing) })).toEqual({ ok: false, reason: "dificultad" });
  });

  it("rechaza una firma alterada, un formato inválido y un desafío vencido", () => {
    const challenge = createChallenge()!;
    const counter = String(solveChallenge(challenge.salt, challenge.difficulty));

    expect(verifyChallenge({ ...challenge, signature: "0".repeat(64), counter })).toEqual({ ok: false, reason: "firma" });
    expect(verifyChallenge({ ...challenge, salt: "otro", counter })).toEqual({ ok: false, reason: "formato" });
    expect(verifyChallenge({ ...challenge, counter: "-1" })).toEqual({ ok: false, reason: "formato" });

    const later = new Date(Date.now() + 60 * 60_000);
    expect(verifyChallenge({ ...challenge, counter }, later)).toEqual({ ok: false, reason: "expirado" });
  });

  it("un desafío sirve una sola vez", () => {
    const challenge = createChallenge()!;
    expect(consumeChallenge(challenge.salt)).toBe(true);
    expect(consumeChallenge(challenge.salt)).toBe(false);
  });

  it("la dificultad es configurable para pruebas y 16 por defecto", () => {
    expect(powDifficulty({})).toBe(16);
    expect(powDifficulty({ FORM_POW_BITS: "8" })).toBe(8);
    expect(powDifficulty({ FORM_POW_BITS: "1" })).toBe(16); // fuera de rango: valor seguro
  });

  it("cuenta los bits en cero del hash", () => {
    expect(leadingZeroBits(Buffer.alloc(4))).toBe(32);
    expect(leadingZeroBits(Buffer.from([0x80, 0, 0, 0]))).toBe(0);
    expect(leadingZeroBits(Buffer.from([0x00, 0x40]))).toBe(9);
  });
});


describe("formulario ARCO con prueba de trabajo", () => {
  function publishedCompany() {
    const made = makeActiveCompany({ name: "Formulario S.A.C." });
    makeBank(made.companyId);
    return made;
  }

  const valid = (slug: string, extra: Record<string, string> = {}) =>
    form({
      slug,
      type: "acceso",
      requester_name: "Ana Torres",
      email: "ana@example.com",
      description: "Quiero saber qué datos míos tienen",
      ...extra,
    });

  const solved = () => {
    const challenge = createChallenge()!;
    return {
      challenge,
      fields: {
        pow_salt: challenge.salt,
        pow_signature: challenge.signature,
        pow_difficulty: String(challenge.difficulty),
        pow_expires: challenge.expires,
        pow_counter: String(solveChallenge(challenge.salt, challenge.difficulty)),
      },
    };
  };

  it("sin solución válida no se guarda la solicitud", async () => {
    const made = publishedCompany();
    const slug = slugOf(made.companyId);
    await expect(createArcoRequestAction(valid(slug))).rejects.toThrow(`/solicitud/${slug}?error=verificacion`);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ?").get(made.companyId)).toEqual({ n: 0 });
  });

  it("con la solución correcta entra una sola vez: la firma no se puede reutilizar", async () => {
    const made = publishedCompany();
    const slug = slugOf(made.companyId);
    const { fields } = solved();

    await expect(createArcoRequestAction(valid(slug, fields))).rejects.toThrow(`/solicitud/${slug}?ok=`);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ?").get(made.companyId)).toEqual({ n: 1 });

    // Repetir el mismo envío (misma solución) no crea otra solicitud.
    await expect(createArcoRequestAction(valid(slug, fields))).rejects.toThrow(`/solicitud/${slug}?error=verificacion`);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ?").get(made.companyId)).toEqual({ n: 1 });
  });

  it("un desafío vencido o manipulado se rechaza", async () => {
    const made = publishedCompany();
    const slug = slugOf(made.companyId);
    const { fields } = solved();
    await expect(
      createArcoRequestAction(valid(slug, { ...fields, pow_signature: "0".repeat(64) }))
    ).rejects.toThrow(`/solicitud/${slug}?error=verificacion`);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ?").get(made.companyId)).toEqual({ n: 0 });
  });

  it("con la prueba de trabajo apagada el formulario sigue funcionando igual", async () => {
    process.env.FORM_POW = "0";
    const made = publishedCompany();
    const slug = slugOf(made.companyId);
    await expect(createArcoRequestAction(valid(slug))).rejects.toThrow(`/solicitud/${slug}?ok=`);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM arco_requests WHERE company_id = ?").get(made.companyId)).toEqual({ n: 1 });
  });
});
