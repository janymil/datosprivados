import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, describe, expect, it } from "vitest";

/**
 * MercadoPago (defecto D-1): lo que hay que probar no es el camino feliz sino los
 * modos de fallo, que es donde se pierde dinero o se queda una cuenta sin activar.
 *
 * El servidor falso escucha de verdad en un puerto efímero, así que `mpFetch`
 * recorre su código real: cabeceras, cuerpo recortado a 400 caracteres, 4xx/5xx,
 * token ausente, respuesta sin URL de pago, cancelación con las dos variantes de
 * MercadoPago y la red caída.
 */

type Recorded = { method: string; path: string; authorization?: string; body: unknown };
type Reply = { status: number; body?: unknown; text?: string };

const state = {
  fallback: { status: 200, body: {} } as Reply,
  queue: [] as Reply[],
  recorded: [] as Recorded[],
};

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  state.recorded.push({
    method: req.method ?? "",
    path: req.url ?? "",
    authorization: req.headers.authorization,
    body: raw ? JSON.parse(raw) : undefined,
  });
  const reply = state.queue.shift() ?? state.fallback;
  res.writeHead(reply.status, { "Content-Type": "application/json" });
  res.end(reply.text ?? JSON.stringify(reply.body ?? {}));
});

let listening = false;
let port = 0;

const listen = async (onPort = 0) => {
  await new Promise<void>((resolve) => server.listen(onPort, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
  listening = true;
};

const unlisten = async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  listening = false;
};

// La base de la API se lee al cargar el módulo: hay que escuchar antes de importarlo.
await listen();
process.env.MERCADOPAGO_API_BASE = `http://127.0.0.1:${port}`;
process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token-mercadopago";
delete process.env.MERCADOPAGO_SANDBOX;

const {
  cancelPreapproval,
  createSubscriptionPreapproval,
  getAuthorizedPayment,
  getPreapproval,
  isMercadoPagoConfigured,
  isMercadoPagoSandbox,
  REASON_MAX_LENGTH,
} = await import("@/lib/mercadopago");

const subscription = {
  companyId: "company-1",
  payerEmail: "dueno@example.com",
  planName: "Negocio",
  amount: 49,
  term: "yearly" as const,
  baseUrl: "https://app.example.com",
};

afterEach(() => {
  state.queue = [];
  state.recorded = [];
  state.fallback = { status: 200, body: {} };
  process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token-mercadopago";
  delete process.env.MERCADOPAGO_SANDBOX;
});

afterAll(async () => {
  if (listening) await unlisten();
});

describe("crear la suscripción", () => {
  it("manda el cuerpo que MercadoPago espera y usa la URL de sandbox cuando el token es de prueba", async () => {
    state.fallback = {
      status: 201,
      body: { id: "pre-1", status: "pending", init_point: "https://mp/init", sandbox_init_point: "https://mp/sandbox" },
    };

    const checkout = await createSubscriptionPreapproval(subscription);

    expect(checkout).toEqual({ id: "pre-1", initPoint: "https://mp/sandbox" });
    const [request] = state.recorded;
    expect(request.method).toBe("POST");
    expect(request.path).toBe("/preapproval");
    expect(request.authorization).toBe("Bearer TEST-token-mercadopago");
    expect(request.body).toMatchObject({
      external_reference: "company-1",
      payer_email: "dueno@example.com",
      status: "pending",
      back_url: "https://app.example.com/pago/resultado",
      auto_recurring: { frequency: 12, frequency_type: "months", transaction_amount: 49, currency_id: "PEN" },
    });
    expect((request.body as { reason: string }).reason.length).toBeLessThanOrEqual(REASON_MAX_LENGTH);
  });

  it("con un token de producción usa init_point, aunque venga también la de sandbox", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-token-real";
    expect(isMercadoPagoSandbox()).toBe(false);
    state.fallback = {
      status: 201,
      body: { id: "pre-2", init_point: "https://mp/init", sandbox_init_point: "https://mp/sandbox" },
    };

    await expect(createSubscriptionPreapproval(subscription)).resolves.toEqual({ id: "pre-2", initPoint: "https://mp/init" });

    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token-mercadopago";
    expect(isMercadoPagoSandbox()).toBe(true); // el prefijo TEST- ya es sandbox
    process.env.MERCADOPAGO_SANDBOX = "1";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-token-real";
    expect(isMercadoPagoSandbox()).toBe(true);
  });

  it("sin URL de pago en la respuesta falla en vez de devolver un checkout vacío", async () => {
    state.fallback = { status: 201, body: { id: "pre-3" } };
    await expect(createSubscriptionPreapproval(subscription)).rejects.toThrow(/no devolvió una URL/);

    state.fallback = { status: 201, body: { init_point: "https://mp/init" } };
    await expect(createSubscriptionPreapproval(subscription)).rejects.toThrow(/no devolvió una URL/);
  });

  it("sin token configurado no llama a nadie y lo dice", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(isMercadoPagoConfigured()).toBe(false);
    await expect(createSubscriptionPreapproval(subscription)).rejects.toThrow(/no está configurado/);
    expect(state.recorded).toHaveLength(0);
  });
});
describe("errores de la API", () => {
  it("un 400 incluye el estado y recorta el detalle a 400 caracteres", async () => {
    state.fallback = { status: 400, text: "x".repeat(2_000) };
    const error = await createSubscriptionPreapproval(subscription).catch((reason: Error) => reason);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^MercadoPago 400: x+$/);
    expect((error as Error).message.length).toBe("MercadoPago 400: ".length + 400);
  });

  it("un 500 y un 429 también son error, no un objeto vacío", async () => {
    state.fallback = { status: 500, body: { message: "boom" } };
    await expect(getPreapproval("pre-1")).rejects.toThrow(/MercadoPago 500/);

    state.fallback = { status: 429, body: {} };
    await expect(getAuthorizedPayment("42")).rejects.toThrow(/MercadoPago 429/);
  });

  it("con la red caída el error sube tal cual: la capa de arriba decide reintentar", async () => {
    await unlisten();
    await expect(getPreapproval("pre-1")).rejects.toBeInstanceOf(Error);
    await listen(port);
  });
});

describe("cancelar la suscripción", () => {
  it("si MercadoPago rechaza «cancelled» reintenta con «canceled»", async () => {
    state.queue = [
      { status: 400, body: { message: "invalid status" } },
      { status: 200, body: { id: "pre-1", status: "canceled" } },
    ];

    const result = await cancelPreapproval("pre-1");

    expect(result.status).toBe("canceled");
    expect(state.recorded.map((request) => (request.body as { status: string }).status)).toEqual(["cancelled", "canceled"]);
    expect(state.recorded.every((request) => request.method === "PUT")).toBe(true);
  });

  it("si fallan las dos variantes el error no se traga", async () => {
    state.queue = [
      { status: 400, body: { message: "invalid status" } },
      { status: 400, body: { message: "invalid status" } },
    ];
    await expect(cancelPreapproval("pre-1")).rejects.toThrow(/MercadoPago 400/);
  });
});

describe("identificadores", () => {
  it("codifica el id en la ruta (no se puede inyectar una ruta con ../)", async () => {
    state.fallback = { status: 200, body: { id: "x" } };

    await getPreapproval("../preapproval/otro?x=1");
    await getAuthorizedPayment("a/b c");

    expect(state.recorded.map((request) => request.path)).toEqual([
      "/preapproval/..%2Fpreapproval%2Fotro%3Fx%3D1",
      "/authorized_payments/a%2Fb%20c",
    ]);
  });
});

