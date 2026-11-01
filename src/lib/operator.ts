import "server-only";

import { notFound } from "next/navigation";
import { requireSession, type SessionContext } from "./auth";

/**
 * Operadores de DatosPrivados (quienes emiten comprobantes y confirman
 * transferencias). Son cuentas normales cuyo correo figura en OPERATOR_EMAILS
 * (separados por coma). Sin la variable, nadie es operador.
 */
export function isOperatorEmail(email: string, list = process.env.OPERATOR_EMAILS ?? "") {
  const allowed = list
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/** Sesión de operador. Quien no lo es recibe un 404, para no revelar que la ruta existe. */
export async function requireOperator(): Promise<SessionContext> {
  const session = await requireSession();
  if (!isOperatorEmail(session.user.email)) notFound();
  return session;
}
