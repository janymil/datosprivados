import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { noindex } from "@/lib/site";

/**
 * Indexación (área 13). Un preview indexado sobrevive al lanzamiento: Google guarda la
 * copia con los textos legales en borrador y compite con el dominio real. Comprobado en
 * el servidor el 2026-11-03: el vhost del preview respondía `Allow: /`, sin
 * `X-Robots-Tag` y con un sitemap que anunciaba el dominio de preview.
 *
 * Dos mecanismos, uno por entorno:
 * - `NEXT_PUBLIC_NOINDEX=1` al compilar → robots.txt `Disallow: /` y `robots: noindex`
 *   en los metadatos (sirve para cualquier entorno, pero exige recompilar).
 * - `X-Robots-Tag: noindex` en nginx (deploy/nginx-preview-noindex.conf) → inmediato y
 *   solo para el vhost del preview, sin tocar la app.
 */

const repo = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(repo, file), "utf8");

describe("robots.txt", () => {
  it("en producción permite el contenido de marketing y cierra panel, pagos y páginas de clientes", () => {
    const rules = robots();
    expect(rules.rules).toMatchObject({ userAgent: "*", allow: "/" });
    const disallow = (rules.rules as { disallow: string[] }).disallow;
    for (const path of ["/app", "/pago", "/api", "/p/", "/solicitud/", "/operador"]) {
      expect(disallow, `falta ${path} en robots.txt`).toContain(path);
    }
    expect(rules.sitemap ?? "").toContain("/sitemap.xml");
  });

  it("con NEXT_PUBLIC_NOINDEX=1 cierra todo y no anuncia sitemap", () => {
    const previous = process.env.NEXT_PUBLIC_NOINDEX;
    process.env.NEXT_PUBLIC_NOINDEX = "1";
    try {
      expect(noindex()).toBe(true);
      const rules = robots();
      expect(rules.rules).toEqual({ userAgent: "*", disallow: "/" });
      expect(rules.sitemap).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_NOINDEX;
      else process.env.NEXT_PUBLIC_NOINDEX = previous;
    }
  });

  it("no se activa por accidente (solo con el valor «1»)", () => {
    const previous = process.env.NEXT_PUBLIC_NOINDEX;
    try {
      for (const value of ["", "0", "true", "yes"]) {
        process.env.NEXT_PUBLIC_NOINDEX = value;
        expect(noindex(), `«${value}» no debería activarlo`).toBe(false);
      }
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_NOINDEX;
      else process.env.NEXT_PUBLIC_NOINDEX = previous;
    }
  });
});

describe("piezas de despliegue para no indexar el preview", () => {
  it("el snippet del preview lleva el encabezado y el «always»", () => {
    const snippet = read("deploy/nginx-preview-noindex.conf");
    expect(snippet).toContain('X-Robots-Tag "noindex, nofollow"');
    expect(snippet).toMatch(/always;/); // también en respuestas que no son 2xx
  });

  it("la plantilla de PRODUCCIÓN no lleva noindex (nadie lo copia por error)", () => {
    const production = read("deploy/nginx-production.conf");
    expect(production).not.toMatch(/X-Robots-Tag/i);
    expect(production).not.toMatch(/noindex/i);
  });
});