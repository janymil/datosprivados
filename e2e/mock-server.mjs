// Servidor simulado para las pruebas E2E: hace de MercadoPago (preapproval), de
// Decolecta (consulta de RUC) y del proveedor de correo (POST /emails, GET /_mail)
// en un solo puerto. Sin dependencias.
import http from "node:http";

const port = Number(process.env.MOCK_PORT || 4010);
const appOrigin = process.env.APP_ORIGIN || "http://localhost:3100";
const preapprovals = new Map();
const mails = [];
let counter = 0;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });

    // Proveedor de correo (Resend): guarda lo recibido para que la prueba lo lea.
    if (req.method === "POST" && url.pathname === "/emails") {
      const body = await readBody(req);
      mails.push({ to: [].concat(body.to)[0], subject: body.subject, text: body.text, from: body.from });
      return json(res, 200, { id: `mail-${mails.length}` });
    }
    if (req.method === "GET" && url.pathname === "/_mail") return json(res, 200, mails);

    // Decolecta: todo RUC con formato válido existe y figura ACTIVO/HABIDO.
    if (req.method === "GET" && url.pathname === "/v1/sunat/ruc") {
      const numero = url.searchParams.get("numero") ?? "";
      return json(res, 200, {
        razon_social: "EMPRESA E2E S.A.C.",
        numero_documento: numero,
        estado: "ACTIVO",
        condicion: "HABIDO",
        direccion: "AV. PRUEBA 123 LIMA",
      });
    }

    if (req.method === "POST" && url.pathname === "/preapproval") {
      const body = await readBody(req);
      const id = `mock-preapproval-${++counter}`;
      preapprovals.set(id, { id, status: "pending", ...body });
      return json(res, 201, {
        id,
        status: "pending",
        init_point: `http://localhost:${port}/checkout/${id}`,
        sandbox_init_point: `http://localhost:${port}/checkout/${id}`,
      });
    }

    const match = url.pathname.match(/^\/preapproval\/([^/]+)$/);
    if (match) {
      const record = preapprovals.get(decodeURIComponent(match[1]));
      if (!record) return json(res, 404, { message: "not found" });
      if (req.method === "GET") return json(res, 200, record);
      if (req.method === "PUT") {
        const body = await readBody(req);
        Object.assign(record, body);
        return json(res, 200, record);
      }
    }

    // Pantalla de pago simulada: autoriza y vuelve a la aplicación.
    const checkout = url.pathname.match(/^\/checkout\/([^/]+)$/);
    if (req.method === "GET" && checkout) {
      const record = preapprovals.get(checkout[1]);
      if (!record) return json(res, 404, { message: "not found" });
      record.status = "authorized";
      res.writeHead(302, { Location: `${appOrigin}/pago/resultado?preapproval_id=${record.id}` });
      return res.end();
    }

    return json(res, 404, { message: "not found" });
  } catch (error) {
    return json(res, 500, { message: String(error) });
  }
});

server.listen(port, () => console.log(`[mock] escuchando en :${port}`));
