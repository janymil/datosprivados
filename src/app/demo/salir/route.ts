import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Las precargas de <Link> no deben cerrar la sesión.
  if (request.headers.get("next-router-prefetch")) return new Response(null, { status: 204 });

  await destroySession();
  const to = new URL(request.url).searchParams.get("to");
  redirect(to === "registro" ? "/registro" : to === "login" ? "/login" : "/");
}
