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
  metadataBase: new URL("https://datosprivados.pe"),
  title: {
    default: "DatosPrivados — Ley 29733 para MYPE, consultorios y profesionales del Perú",
    template: "%s · DatosPrivados",
  },
  description:
    "Registra tus bancos de datos, publica tu política, atiende solicitudes ARCO y documenta incidentes. Cumplimiento de la Ley 29733 para MYPE, consultorios y profesionales en Perú.",
  keywords: [
    "Ley 29733",
    "protección de datos personales Perú",
    "ANPD",
    "bancos de datos",
    "ARCO",
    "MYPE",
    "consultorio",
    "clínica",
    "compliance",
  ],
  openGraph: {
    title: "DatosPrivados — La Ley 29733, en orden",
    description:
      "El panel de cumplimiento para MYPE, consultorios y profesionales del Perú: bancos de datos, ARCO, incidentes y documentos.",
    locale: "es_PE",
    type: "website",
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
