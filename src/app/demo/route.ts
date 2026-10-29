import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Las precargas de <Link> no deben iniciar sesión en la cuenta demo.
  if (request.headers.get("next-router-prefetch")) return new Response(null, { status: 204 });

  const db = getDb();
  const demo = db
    .prepare("SELECT u.id FROM users u JOIN companies c ON c.id = u.company_id WHERE c.id = 'casa-verde' LIMIT 1")
    .get() as { id: string } | undefined;

  if (!demo) redirect("/login");
  await createSession(demo.id);
  redirect("/app");
}
