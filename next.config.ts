import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * CSP de observación (no bloquea nada: `Report-Only`).
 *
 * Permite medir qué rompería una política estricta antes de activarla. Aquí se
 * mantiene `'unsafe-inline'` en `script-src`/`style-src` porque Next inyecta
 * scripts y estilos en línea; quitarlo exige un `proxy.ts` con nonce por
 * petición, lo que vuelve dinámicas todas las páginas y cambia el rendimiento
 * medido en `docs/GO-NO-GO.md`. Esa es una decisión del propietario, registrada
 * en `docs/DECISIONS.md`; mientras tanto se recogen los avisos reales
 * (recursos externos, formularios a otros orígenes, `object`/`embed`, `base-uri`).
 */
const CSP_REPORT_PATH = "/api/csp-report";
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  `report-uri ${CSP_REPORT_PATH}`,
  "report-to csp",
].join("; ");

const reportingHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  { key: "Reporting-Endpoints", value: `csp="${CSP_REPORT_PATH}"` },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...reportingHeaders] },
      // Datos del expediente y del cliente: nunca en caché compartida.
      {
        source: "/app/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/pago/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      // Formulario ARCO: contiene datos personales y no debe indexarse.
      {
        source: "/solicitud/:slug*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/video/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
    ];
  },
};

export default nextConfig;
