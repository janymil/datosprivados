import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel, pagos, API y páginas de clientes: no son contenido de marketing.
      disallow: ["/app", "/pago", "/api", "/demo", "/login", "/registro", "/bienvenida", "/cuenta", "/olvide", "/restablecer", "/verificar", "/solicitud/", "/p/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
