import { jsonLd } from "@/lib/seo";

/**
 * Datos estructurados (schema.org) para buscadores. Es el único lugar del código con
 * `dangerouslySetInnerHTML` (lo permite test/xss.test.ts): solo recibe objetos que
 * arma el propio código y `jsonLd` escapa «<» para que nada cierre la etiqueta.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
