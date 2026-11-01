import { suppressEmail, verifyMailWebhook } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

type MailEvent = { type?: string; data?: { to?: string[] | string; email_id?: string } };

/** Rebotes y quejas del proveedor: la dirección deja de recibir correo. */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

  const valid = verifyMailWebhook({
    body,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  });
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let event: MailEvent = {};
  try {
    event = JSON.parse(body) as MailEvent;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const reason = event.type === "email.bounced" ? "rebote" : event.type === "email.complained" ? "queja" : null;
  if (!reason) return Response.json({ ok: true, ignored: true });

  const recipients = Array.isArray(event.data?.to) ? event.data.to : event.data?.to ? [event.data.to] : [];
  for (const email of recipients) suppressEmail(email, reason);
  return Response.json({ ok: true, suppressed: recipients.length });
}
