export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnvironment } = await import("./lib/env");
  const { errors, warnings } = checkEnvironment();
  for (const warning of warnings) console.warn(`[config] ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`[config] ${error}`);
    throw new Error(`Configuración inválida: ${errors.join(" ")}`);
  }
}

/** Errores de render, rutas y Server Actions: una línea JSON con el digest, sin cuerpo ni cabeceras. */
export async function onRequestError(error: unknown, request: { path: string; method: string }, context: { routerKind: string; routeType: string; routePath: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logEvent } = await import("./lib/log");
  const err = error as { message?: string; digest?: string; name?: string };
  logEvent("error", "request_error", {
    message: err?.message ?? String(error),
    digest: err?.digest,
    kind: err?.name,
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    route_type: context.routeType,
  });
}
