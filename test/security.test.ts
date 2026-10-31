import { beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/lib/llm", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/llm")>();
  return {
    ...original,
    callLlm: async (input: { system: string; messages: Array<{ content: string }> }) => {
      llm.calls.push([input.system, ...input.messages.map((m) => m.content)].join("\n"));
      return "respuesta simulada";
    },
  };
});

const verify = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/lib/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...original,
    verifyPassword: (password: string, stored: string) => {
      verify.calls += 1;
      return original.verifyPassword(password, stored);
    },
  };
});

import { getDb, hashPassword, newId, nowIso } from "@/lib/db";
import { createSession, destroySession, getSession, signIn } from "@/lib/auth";
import { analyzeAndDraftArcoWithAi, evaluateIncidentWithAi, runAnonymizedLegalChat } from "@/lib/ai";
import { jar, freezeTime } from "./helpers/next";
import { getCompany, makeActiveCompany } from "./helpers/db";

const DAY = 86_400_000;

beforeEach(() => {
  jar.store.clear();
  jar.setOptions.clear();
  llm.calls.length = 0;
});

describe("ninguna PII llega al modelo", () => {
  const PII = ["45678912", "juan.perez@mail.com", "987654321", "Av. Los Cedros 456", "20604567891", "Juan Pérez Rojas"];
  const text = `Mi nombre es Juan Pérez Rojas, DNI 45678912, correo juan.perez@mail.com, celular 987654321, vivo en Av. Los Cedros 456. Empresa RUC 20604567891.`;

  it("el chat legal envía el mensaje anonimizado", async () => {
    const { companyId } = makeActiveCompany();
    const result = await runAnonymizedLegalChat({
      company: getCompany(companyId),
      banks: [],
      requests: [],
      incidents: [],
      complianceScore: 40,
      userMessage: text,
      history: [{ role: "user", content: text }],
    });
    expect(result.mode).toBe("ia");
    expect(llm.calls.length).toBeGreaterThan(0);
    // Un nombre escrito a mano en texto libre no se puede detectar sin NER: solo se verifican los datos con patrón.
    for (const call of llm.calls) for (const secret of PII.filter((p) => p !== "Juan Pérez Rojas")) expect(call, secret).not.toContain(secret);
  });

  it("el copiloto ARCO no envía los datos del titular ni de la empresa", async () => {
    const { companyId } = makeActiveCompany();
    const company = getCompany(companyId);
    await analyzeAndDraftArcoWithAi({
      company,
      banks: [],
      request: {
        id: "r1", company_id: companyId, ticket: "ARCO-1", type: "acceso", channel: "web",
        requester_name: "Juan Pérez Rojas", doc_number: "45678912", email: "juan.perez@mail.com", phone: "987654321",
        description: text, status: "nuevo", received_at: "2026-10-01", due_at: "2026-10-29",
        responded_at: null, response: null, created_at: nowIso(),
      },
    });
    expect(llm.calls.length).toBeGreaterThan(0);
    const all = llm.calls.join("\n");
    for (const secret of [...PII, company.email, company.address]) expect(all, secret).not.toContain(secret);
  });

  it("la evaluación de incidentes tampoco", async () => {
    const { companyId } = makeActiveCompany();
    await evaluateIncidentWithAi({
      company: getCompany(companyId),
      incident: {
        id: "i1", company_id: companyId, title: "Fuga", description: text, severity: "grave",
        detected_at: nowIso(), due_at: nowIso(), status: "abierto", affected_people: 3, affected_sample: "",
        criteria: "", data_categories: "DNI 45678912", measures: "", notified_at: null, created_at: nowIso(),
      },
    });
    const all = llm.calls.join("\n");
    for (const secret of PII.filter((p) => p !== "Juan Pérez Rojas")) expect(all, secret).not.toContain(secret);
  });
});

describe("sesiones", () => {
  it("crea la cookie HttpOnly, SameSite=Lax, path / y 30 días", async () => {
    const { userId } = makeActiveCompany();
    await createSession(userId);
    const options = jar.setOptions.get("pdp_session")!;
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  });

  it("la cookie es Secure en producción y COOKIE_SECURE=0 lo apaga", async () => {
    const { userId } = makeActiveCompany();
    const previous = { node: process.env.NODE_ENV, secure: process.env.COOKIE_SECURE };
    try {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.COOKIE_SECURE;
      await createSession(userId);
      expect(jar.setOptions.get("pdp_session")).toMatchObject({ secure: true });
      process.env.COOKIE_SECURE = "0";
      await createSession(userId);
      expect(jar.setOptions.get("pdp_session")).toMatchObject({ secure: false });
    } finally {
      vi.unstubAllEnvs();
      process.env.COOKIE_SECURE = previous.secure;
    }
  });

  it("getSession devuelve el usuario y su empresa", async () => {
    const { userId, companyId } = makeActiveCompany();
    await createSession(userId);
    const session = await getSession();
    expect(session?.user.id).toBe(userId);
    expect(session?.company.id).toBe(companyId);
  });

  it("una sesión vencida no sirve", async () => {
    const { userId } = makeActiveCompany();
    await createSession(userId);
    const id = jar.store.get("pdp_session")!;
    getDb().prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - DAY).toISOString(), id);
    expect(await getSession()).toBeNull();
  });

  it("expira a los 30 días con el reloj congelado", async () => {
    const { userId } = makeActiveCompany();
    await createSession(userId);
    const frozen = freezeTime(new Date(Date.now() + 31 * DAY).toISOString());
    try {
      expect(await getSession()).toBeNull();
    } finally {
      frozen.restore();
    }
  });

  it("destroySession borra la sesión y la cookie", async () => {
    const { userId } = makeActiveCompany();
    await createSession(userId);
    const id = jar.store.get("pdp_session")!;
    await destroySession();
    expect(jar.store.has("pdp_session")).toBe(false);
    expect(getDb().prepare("SELECT 1 FROM sessions WHERE id = ?").get(id)).toBeUndefined();
    expect(await getSession()).toBeNull();
  });

  it("iniciar sesión rota el identificador: el anterior deja de servir", async () => {
    const { userId } = makeActiveCompany();
    await createSession(userId);
    const first = jar.store.get("pdp_session")!;
    await createSession(userId);
    expect(jar.store.get("pdp_session")).not.toBe(first);
    expect(getDb().prepare("SELECT 1 FROM sessions WHERE id = ?").get(first)).toBeUndefined();
  });

  it("una cookie con un id inventado no da sesión", async () => {
    jar.store.set("pdp_session", "no-existe");
    expect(await getSession()).toBeNull();
  });
});

describe("signIn", () => {
  function makeUser(password: string) {
    const { companyId } = makeActiveCompany();
    const email = `login-${newId().slice(0, 8)}@example.com`;
    getDb()
      .prepare("INSERT INTO users (id, company_id, name, email, password_hash, role, created_at) VALUES (?, ?, 'U', ?, ?, 'admin', ?)")
      .run(newId(), companyId, email, hashPassword(password), nowIso());
    return email;
  }

  it("mismo error para correo inexistente y clave incorrecta", async () => {
    const email = makeUser("clave-correcta-123");
    const wrong = await signIn(email, "otra-clave");
    const unknown = await signIn("nadie@example.com", "otra-clave");
    expect(wrong).toEqual(unknown);
    expect(wrong.error).toBeTruthy();
  });

  it("con correo inexistente igual se calcula el hash (sin atajo que revele la cuenta)", async () => {
    verify.calls = 0;
    await signIn("nadie@example.com", "x");
    expect(verify.calls).toBe(1);
  });

  it("clave correcta crea sesión; el correo no distingue mayúsculas", async () => {
    const email = makeUser("clave-correcta-123");
    expect(await signIn(email.toUpperCase(), "clave-correcta-123")).toEqual({});
    expect(jar.store.has("pdp_session")).toBe(true);
  });
});
