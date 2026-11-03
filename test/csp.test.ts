import { describe, expect, it } from "vitest";
import { cspEnforced, cspHeaders, cspPolicy } from "../next.config";

/**
 * CSP (área 15). Lo que importa probar no es la cadena de la política sino que el
 * modo por defecto no bloquee nada y que `CSP_ENFORCE=1` cambie exactamente ese
 * detalle: el nombre de la cabecera. Si alguien "arregla" la cabecera equivocada,
 * o activa el bloqueo sin querer, esto lo dice antes de desplegar.
 */

const PROD = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
const DEV = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

const header = (env: NodeJS.ProcessEnv, key: string) => cspHeaders(env).find((item) => item.key === key)?.value;

describe("CSP", () => {
  it("por defecto va en modo observación: no bloquea nada", () => {
    expect(cspEnforced(PROD)).toBe(false);
    expect(cspEnforced({ ...PROD, CSP_ENFORCE: "0" })).toBe(false);
    expect(cspEnforced({ ...PROD, CSP_ENFORCE: "true" })).toBe(false); // solo "1" activa
    expect(header(PROD, "Content-Security-Policy")).toBeUndefined();
    expect(header(PROD, "Content-Security-Policy-Report-Only")).toContain("default-src 'self'");
  });

  it("CSP_ENFORCE=1 cambia la cabecera a la bloqueante y deja de mandar la de observación", () => {
    const env = { ...PROD, CSP_ENFORCE: "1" };
    expect(cspEnforced(env)).toBe(true);
    expect(header(env, "Content-Security-Policy-Report-Only")).toBeUndefined();
    expect(header(env, "Content-Security-Policy")).toContain("default-src 'self'");
    // La política es la misma en los dos modos: lo único que cambia es si bloquea.
    expect(header(env, "Content-Security-Policy")).toBe(cspPolicy(env));
    expect(header(PROD, "Content-Security-Policy-Report-Only")).toBe(cspPolicy(PROD));
  });

  it("mantiene las directivas que sujetan el navegador, y el reporte a nuestro endpoint", () => {
    const policy = cspPolicy(PROD);
    for (const directive of [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "report-uri /api/csp-report",
      "report-to csp",
    ]) {
      expect(policy, `falta «${directive}»`).toContain(directive);
    }
    expect(header(PROD, "Reporting-Endpoints")).toBe('csp="/api/csp-report"');
  });

  it("en producción no permite eval (solo en desarrollo, por el HMR)", () => {
    expect(cspPolicy(PROD)).not.toContain("unsafe-eval");
    expect(cspPolicy(DEV)).toContain("'unsafe-eval'");
  });

  it("no abre orígenes externos: no hay comodines en script/style/connect", () => {
    const policy = cspPolicy(PROD);
    expect(policy).not.toMatch(/script-src[^;]*\*/);
    expect(policy).not.toMatch(/connect-src[^;]*\*/);
    expect(policy).not.toMatch(/default-src[^;]*\*/);
  });
});