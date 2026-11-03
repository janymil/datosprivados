import type { Metadata } from "next";
import { siteUrl } from "./site";

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
