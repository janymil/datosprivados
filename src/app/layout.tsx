import type { Metadata } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { noindex, siteUrl } from "@/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  // Sin `axes`: el sitio nunca usa font-variation-settings ni optical sizing, y
  // pedir SOFT/WONK/opsz solo engorda el archivo. Decisión en docs/DECISIONS.md.
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  // En un entorno de pruebas (NEXT_PUBLIC_NOINDEX=1) nada debe indexarse; en producción
  // no se define y los buscadores entran con normalidad.
  ...(noindex() ? { robots: { index: false, follow: false } } : {}),
  title: {
    default: "DatosPrivados — Software de cumplimiento de la Ley 29733 para empresas",
    template: "%s · DatosPrivados",
  },
  description:
    "Inscribe tus bancos de datos, genera tu política de privacidad y documento de seguridad, atiende solicitudes ARCO y documenta incidentes. Cumplimiento de la Ley 29733 para pequeñas y medianas empresas del Perú.",
  keywords: [
    "Ley 29733",
    "DS 016-2024-JUS",
    "protección de datos personales Perú",
    "ANPD",
    "inscribir banco de datos personales",
    "SIPDP",
    "derechos ARCO",
    "oficial de datos personales",
    "software de cumplimiento",
  ],
  openGraph: {
    title: "DatosPrivados — La Ley 29733, en orden",
    description:
      "El panel de cumplimiento para pequeñas y medianas empresas del Perú: bancos de datos, documentos, solicitudes ARCO e incidentes.",
    locale: "es_PE",
    type: "website",
    siteName: "DatosPrivados",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-PE"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${archivo.variable} ${fraunces.variable} ${plex.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
