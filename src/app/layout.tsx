import type { Metadata } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://privadope.pe"),
  title: {
    default: "PrivadoPE — Cumplimiento de la Ley 29733 para MYPE peruanas",
    template: "%s · PrivadoPE",
  },
  description:
    "Registra tus bancos de datos, atiende solicitudes ARCO y documenta incidentes. Cumplimiento de protección de datos personales en Perú, desde S/ 19 al mes.",
  keywords: [
    "Ley 29733",
    "protección de datos personales Perú",
    "ANPD",
    "bancos de datos",
    "ARCO",
    "MYPE",
    "compliance",
  ],
  openGraph: {
    title: "PrivadoPE — La Ley 29733, en orden",
    description:
      "El panel de cumplimiento para MYPE peruanas: bancos de datos, ARCO, incidentes y documentos.",
    locale: "es_PE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-PE"
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${fraunces.variable} ${plex.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
