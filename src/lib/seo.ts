import type { Metadata } from "next";
import { siteUrl } from "./site";
import { COMPANY_HUB_ORG_ID, COMPANY_HUB_URL, PLATFORM_CONTACT_EMAIL, PLATFORM_ENTITY } from "./platform-entity";

/**
 * Metadatos de las páginas públicas de contenido (guías, sectores, glosario…).
 *
 * No toca `robots`: el layout raíz ya aplica `noindex` cuando el build es de
 * pruebas (NEXT_PUBLIC_NOINDEX=1) y las páginas hijas lo heredan.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, locale: "es_PE", type: "article", siteName: "DatosPrivados" },
  };
}

/** Serializa JSON-LD para un `<script>` sin permitir cerrar la etiqueta (guía JSON-LD de Next). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path}`;
}

/**
 * La organización DatosPrivados, con su operador. Un solo `@id` para la portada y /nosotros, y
 * `parentOrganization` apuntando al `@id` de la empresa en montaweb.pe/empresa.
 */
export function platformOrganizationLd() {
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: "DatosPrivados",
    url: absoluteUrl("/"),
    legalName: PLATFORM_ENTITY.legalName,
    taxID: PLATFORM_ENTITY.ruc,
    email: PLATFORM_CONTACT_EMAIL,
    telephone: PLATFORM_ENTITY.phoneHref.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: PLATFORM_ENTITY.streetAddress,
      addressLocality: PLATFORM_ENTITY.locality,
      addressRegion: PLATFORM_ENTITY.region,
      postalCode: PLATFORM_ENTITY.postalCode,
      addressCountry: "PE",
    },
    areaServed: "PE",
    parentOrganization: { "@id": COMPANY_HUB_ORG_ID, name: PLATFORM_ENTITY.shortName, url: COMPANY_HUB_URL },
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
