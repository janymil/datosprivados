import type { MetadataRoute } from "next";
import { noindex, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel, pagos, API y páginas de clientes: no son contenido de marketing.
      disallow: ["/app", "/pago", "/api", "/demo", "/login", "/registro", "/bienvenida", "/cuenta", "/olvide", "/restablecer", "/verificar", "/solicitud/", "/p/", "/operador"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };

  // Un entorno de pruebas no debe entrar en Google: si se indexa un preview con los
  // textos legales en borrador, el resultado sigue ahí cuando abra el dominio real.
  // Se activa con NEXT_PUBLIC_NOINDEX=1 al COMPILAR (ver docs/RUNBOOK.md).
  if (noindex()) return { rules: { userAgent: "*", disallow: "/" } };
  return base;
}
