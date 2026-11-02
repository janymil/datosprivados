import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardia de sesión, ruta por ruta.
 *
 * `requireSession()` en una página no protege las Server Actions ni los
 * manejadores de ruta: son endpoints HTTP públicos. Estas pruebas recorren el
 * árbol de `src/app` y fallan si una ruta nueva queda sin guardia, salvo que
 * esté en la lista pública de abajo (con su motivo).
 *
 * Una página también cuenta como protegida si un `layout.tsx` ancestro llama a
 * la guardia: así funciona `/app/ayuda/[slug]` bajo `app/app/layout.tsx`.
 */

const APP_ROOT = path.join(process.cwd(), "src", "app");
const GUARD = /requireSession|requireActiveSession|requireOperator|getSession|authorized\(/;

/** Rutas públicas por diseño. Si alguna desaparece, la prueba también falla. */
const PUBLIC_FILES: Record<string, string> = {
  "page.tsx": "portada",
  "layout.tsx": "layout raíz: solo envuelve",
  "privacidad/page.tsx": "política de privacidad de la plataforma",
  "terminos/page.tsx": "términos de la plataforma",
  "cookies/page.tsx": "política de cookies",
  "p/[slug]/page.tsx": "política publicada de un cliente (solo lectura)",
  "solicitud/[slug]/page.tsx": "formulario ARCO público",
  "(auth)/layout.tsx": "layout del acceso",
  "(auth)/login/page.tsx": "ingreso",
  "(auth)/registro/page.tsx": "registro",
  "(auth)/olvide/page.tsx": "pedir restablecimiento",
  "(auth)/restablecer/page.tsx": "elegir contraseña nueva (token)",
  "(auth)/verificar/page.tsx": "confirmar correo (token)",
  "demo/route.ts": "entrar a la demo (solo lectura)",
  "demo/salir/route.ts": "salir de la demo",
  "api/health/route.ts": "monitor externo: solo booleanos",
  "api/ready/route.ts": "monitor externo: solo booleanos",
  "api/cron/[job]/route.ts": "bearer CRON_SECRET (ver authorized())",
  "api/mail/webhook/route.ts": "webhook firmado del proveedor de correo",
  "api/mercadopago/webhook/route.ts": "webhook con firma de MercadoPago",
};

/** Acciones públicas por diseño (no hay sesión cuando se llaman). */
const PUBLIC_ACTIONS: Record<string, string> = {
  loginAction: "ingreso",
  signupAction: "registro",
  logoutAction: "cerrar sesión: idempotente sin sesión",
  requestPasswordResetAction: "sin sesión por definición",
  resetPasswordAction: "se autentica con el token del correo",
  verifyEmailAction: "se autentica con el token del correo",
  createArcoRequestAction: "formulario ARCO público: la empresa sale del slug y hay límite por IP y por empresa",
};

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const relative = (file: string) => path.relative(APP_ROOT, file).split(path.sep).join("/");

function guardedByLayout(file: string): boolean {
  let dir = path.dirname(file);
  for (;;) {
    const layout = path.join(dir, "layout.tsx");
    if (fs.existsSync(layout) && GUARD.test(fs.readFileSync(layout, "utf8"))) return true;
    if (path.resolve(dir) === path.resolve(APP_ROOT)) return false;
    dir = path.dirname(dir);
  }
}

/** Exportaciones `function`/`const` de un archivo, con el cuerpo de cada una. */
function exportedFunctions(source: string): Array<{ name: string; body: string }> {
  const marks = [...source.matchAll(/export (?:async )?function (\w+)/g)];
  return marks.map((mark, index) => ({
    name: mark[1],
    body: source.slice(mark.index, index + 1 < marks.length ? marks[index + 1].index : source.length),
  }));
}


describe("guardias de sesión", () => {
  const routes = files(APP_ROOT).filter((file) => !relative(file).includes("actions/"));

  it("encuentra las rutas del proyecto", () => {
    expect(routes.filter((file) => file.endsWith("page.tsx")).length).toBeGreaterThan(25);
    expect(routes.filter((file) => file.endsWith("route.ts")).length).toBeGreaterThan(4);
  });

  it("cada página y cada manejador de ruta tiene guardia o está en la lista pública", () => {
    const without: string[] = [];
    // Los layouts no se evalúan aquí: envuelven páginas y no reciben datos propios.
    // Cuentan como guardia de una página cuando son ancestros (`guardedByLayout`).
    for (const file of routes) {
      if (!/page\.tsx$|route\.ts$/.test(file)) continue;
      const key = relative(file);
      if (PUBLIC_FILES[key]) continue;
      const source = fs.readFileSync(file, "utf8");
      if (GUARD.test(source) || guardedByLayout(file)) continue;
      without.push(key);
    }
    expect(without).toEqual([]);
  });

  it("el layout del panel exige sesión (protege las páginas que no la piden)", () => {
    const layout = fs.readFileSync(path.join(APP_ROOT, "app", "layout.tsx"), "utf8");
    expect(GUARD.test(layout)).toBe(true);
    expect(layout).toContain("requireSession");
  });

  it("la lista pública no tiene entradas muertas", () => {
    for (const key of Object.keys(PUBLIC_FILES)) {
      expect(fs.existsSync(path.join(APP_ROOT, key)), `${key} ya no existe: quítalo de la lista`).toBe(true);
    }
  });

  it("toda Server Action llama a una guardia, salvo las públicas", () => {
    const actionDir = path.join(APP_ROOT, "actions");
    const unguarded: string[] = [];
    let checked = 0;
    for (const file of files(actionDir)) {
      for (const fn of exportedFunctions(fs.readFileSync(file, "utf8"))) {
        checked += 1;
        if (PUBLIC_ACTIONS[fn.name]) continue;
        if (!GUARD.test(fn.body)) unguarded.push(`${relative(file)}: ${fn.name}`);
      }
    }
    expect(unguarded).toEqual([]);
    expect(checked).toBeGreaterThan(30);
  });

  it("las acciones públicas de la lista siguen existiendo con ese nombre", () => {
    const actionDir = path.join(APP_ROOT, "actions");
    const names = files(actionDir).flatMap((file) => exportedFunctions(fs.readFileSync(file, "utf8")).map((fn) => fn.name));
    for (const [name, reason] of Object.entries(PUBLIC_ACTIONS)) {
      expect(names.includes(name), `${name} (${reason}) ya no existe: ajusta la lista`).toBe(true);
    }
  });
});
