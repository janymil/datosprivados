import "server-only";

import { notFound } from "next/navigation";
import { emailVerificationGate } from "./account";
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

/** El correo coincide con OPERATOR_EMAILS **y** está verificado. */
export function isOperatorUser(user: { id: string; email: string }, list = process.env.OPERATOR_EMAILS ?? "") {
  // Sin verificación, cualquiera que se registre con el correo del operador antes que él
  // (el registro no exige confirmar el correo) entraría a comprobantes y transferencias.
  return isOperatorEmail(user.email, list) && emailVerificationGate(user.id).ok;
}

/** Sesión de operador. Quien no lo es recibe un 404, para no revelar que la ruta existe. */
export async function requireOperator(): Promise<SessionContext> {
  const session = await requireSession();
  if (!isOperatorUser(session.user)) notFound();
  return session;
}
