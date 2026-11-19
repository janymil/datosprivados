import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata } from "@/app/nosotros/page";
import { SiteFooter } from "@/components/site-chrome";
import { LEGAL_CONTENT } from "@/lib/platform-legal";
import { COMPANY_HUB_ORG_ID, COMPANY_HUB_URL, PLATFORM_ENTITY } from "@/lib/platform-entity";

/**
 * Quién está detrás de la app (Código de Protección al Consumidor: el proveedor debe ser
 * identificable). /nosotros, el pie de las páginas públicas y los textos legales nombran a
 * SEMANTIKA TECH E.I.R.L. con su RUC y domicilio, y la página enlaza a la empresa.
 */

const jsonLdBlocks = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe("/nosotros", () => {
  const html = renderToStaticMarkup(AboutPage());

  it("identifica al operador con razón social, RUC y domicilio completo", () => {
    expect(html).toContain("SEMANTIKA TECH E.I.R.L.");
    expect(html).toContain("20616806981");
    expect(html).toContain("Av. Javier Prado Este 560 Int. 1302, San Isidro, Lima 15040");
  });

  it("enlaza a la empresa, a los textos legales y al Libro de Reclamaciones", () => {
    expect(html).toContain(`href="${COMPANY_HUB_URL}"`);
    expect(html).toContain("Conoce la empresa");
    for (const href of ["/terminos", "/privacidad", "/cookies", "https://librodigital.pe/libro/semantikatech"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("publica la organización con su empresa matriz y canonical propio", () => {
    const organization = jsonLdBlocks(html).find((block) => block["@type"] === "Organization");
    expect(organization).toBeDefined();
    expect(organization.parentOrganization).toEqual({ "@id": COMPANY_HUB_ORG_ID, name: "SEMANTIKA TECH" });
    expect(organization["@id"]).toMatch(/\/#organization$/);
    expect(organization.taxID).toBe(PLATFORM_ENTITY.ruc);
    expect(organization.address.streetAddress).toBe("Av. Javier Prado Este 560 Int. 1302");
    expect(metadata.alternates?.canonical).toBe("/nosotros");
  });

  it("no inventa cifras ni testimonios", () => {
    const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/testimonio|clientes satisfechos|\+\s?\d+\s*(empresas|clientes)/i);
  });
});

describe("pie de las páginas públicas", () => {
  // React separa los textos interpolados con <!-- -->; se quitan para leer el enlace entero.
  const html = renderToStaticMarkup(SiteFooter()).replaceAll("<!-- -->", "");

  it("dice de quién es el producto y enlaza a /nosotros", () => {
    expect(html).toMatch(/<a [^>]*href="\/nosotros"[^>]*>Un producto de SEMANTIKA TECH E\.I\.R\.L\. · RUC 20616806981<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/nosotros"[^>]*>Nosotros<\/a>/);
  });
});

describe("textos legales de la plataforma", () => {
  it("términos, privacidad y cookies nombran al operador con RUC y domicilio", () => {
    for (const document of ["terms", "privacy", "cookies"] as const) {
      const text = JSON.stringify(LEGAL_CONTENT[document]);
      expect(text, document).toContain("SEMANTIKA TECH E.I.R.L., RUC 20616806981");
      expect(text, document).toContain("Int. 1302");
    }
  });
});
