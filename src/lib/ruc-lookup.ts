import "server-only";

/**
 * Verificación del RUC contra la SUNAT mediante Decolecta
 * (GET /v1/sunat/ruc?numero=<RUC>, token Bearer; https://decolecta.gitbook.io/docs).
 *
 * La documentación solo define el 422 «ruc no valido» y el 400 genérico.
 * Comportamiento observado con el servicio real (2026-10-31):
 * - RUC existente → 200 con razon_social, estado, condicion, direccion.
 * - RUC con formato válido que no existe → 404 {"message":"not found"}.
 * - Token inválido, ausente o cuota agotada → 401 {"error":"Apikey Required / Limit Exceeded"}
 *   (el mismo mensaje para las tres causas).
 * Solo 404 y 422 significan «el RUC no existe». Todo lo demás (401, 429, 5xx,
 * red, tiempo) es «servicio no disponible»: nunca se rechaza a un cliente real
 * por una caída, una clave vencida o una cuota agotada del proveedor.
 */

/** Se puede apuntar a un servidor simulado (pruebas E2E) con DECOLECTA_API_BASE. */
const ENDPOINT = `${(process.env.DECOLECTA_API_BASE || "https://api.decolecta.com").replace(/\/$/, "")}/v1/sunat/ruc`;
const TIMEOUT_MS = 8_000;

export type RucLookup =
  | { status: "found"; razonSocial: string; estado: string; condicion: string; direccion: string }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string }
  | { status: "skipped" };

export function isRucLookupConfigured() {
  return Boolean(process.env.DECOLECTA_API_TOKEN?.trim());
}

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function lookupRuc(ruc: string): Promise<RucLookup> {
  const token = process.env.DECOLECTA_API_TOKEN?.trim();
  if (!token) return { status: "skipped" };

  try {
    const response = await fetch(`${ENDPOINT}?numero=${encodeURIComponent(ruc)}`, {
      // El token va en el encabezado (no en la URL) para que no quede en registros.
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (response.status === 422 || response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "unavailable", reason: `HTTP ${response.status}` };

    const data = (await response.json()) as Record<string, unknown>;
    const razonSocial = clean(data.razon_social);
    const estado = clean(data.estado).toUpperCase();
    // Defensa: la respuesta debe corresponder al RUC consultado.
    if (!razonSocial || !estado || clean(data.numero_documento) !== ruc) {
      return { status: "unavailable", reason: "Respuesta inesperada" };
    }

    return {
      status: "found",
      razonSocial,
      estado,
      condicion: clean(data.condicion).toUpperCase(),
      direccion: clean(data.direccion),
    };
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.name : "Error de red" };
  }
}

export type RucCheck =
  | { ok: true; verified: boolean; razonSocial: string; estado: string; condicion: string; direccion: string }
  | { ok: false; code: "no_existe" | "inactivo" | "no_disponible"; message: string };

/**
 * Decide si un RUC puede registrarse: debe existir y figurar ACTIVO en la SUNAT.
 * Sin token (solo desarrollo) no se verifica; en producción eso se rechaza.
 */
export async function checkCompanyRuc(ruc: string): Promise<RucCheck> {
  const lookup = await lookupRuc(ruc);

  if (lookup.status === "skipped") {
    if (process.env.NODE_ENV === "production") {
      console.error("[ruc] DECOLECTA_API_TOKEN no configurado; no se puede verificar el RUC.");
      return {
        ok: false,
        code: "no_disponible",
        message: "No pudimos verificar tu RUC con la SUNAT en este momento. Inténtalo de nuevo en unos minutos.",
      };
    }
    return { ok: true, verified: false, razonSocial: "", estado: "", condicion: "", direccion: "" };
  }

  if (lookup.status === "unavailable") {
    console.error(`[ruc] Decolecta no disponible: ${lookup.reason}`);
    return {
      ok: false,
      code: "no_disponible",
      message: "No pudimos verificar tu RUC con la SUNAT en este momento. Inténtalo de nuevo en unos minutos.",
    };
  }

  if (lookup.status === "not_found") {
    return {
      ok: false,
      code: "no_existe",
      message: "No encontramos ese RUC en la SUNAT. Revísalo e inténtalo de nuevo.",
    };
  }

  if (lookup.estado !== "ACTIVO") {
    return {
      ok: false,
      code: "inactivo",
      message: `Ese RUC figura como «${lookup.estado}» en la SUNAT. Solo atendemos contribuyentes con RUC ACTIVO.`,
    };
  }

  return { ok: true, verified: true, ...lookup };
}
