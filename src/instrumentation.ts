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
