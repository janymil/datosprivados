import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * CSP. Por defecto va en modo observación (`Report-Only`): no bloquea nada y
 * recoge en `/api/csp-report` qué se rompería con una política estricta.
 *
 * Con `CSP_ENFORCE=1` se emite la misma política como `Content-Security-Policy`
 * (bloqueante). Se mantiene `'unsafe-inline'` en `script-src`/`style-src` porque
 * Next inyecta scripts y estilos en línea; quitarlo exige un `proxy.ts` con nonce
 * por petición, que vuelve dinámicas todas las páginas (decisión del propietario,
 * en `docs/DECISIONS.md`). Aun con `'unsafe-inline'`, la política bloqueante
 * aporta: ningún script de otro origen, `object`/`embed` fuera, `base-uri`
 * secuestrable fuera, formularios solo al propio origen y `frame-ancestors 'none'`
 * como segunda barrera frente a `X-Frame-Options`.
 *
 * La bandera se lee en cada llamada a `headers()` (no al cargar el módulo) para
 * poder probar los dos modos con el mismo proceso.
 */
const CSP_REPORT_PATH = "/api/csp-report";

export function cspEnforced(env: NodeJS.ProcessEnv = process.env) {
  return env.CSP_ENFORCE === "1";
}

export function cspPolicy(env: NodeJS.ProcessEnv = process.env) {
  return [
    "default-src 'self'",
    // Next intercala scripts en línea; `unsafe-eval` solo hace falta en desarrollo (HMR).
    env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
}

export function cspHeaders(env: NodeJS.ProcessEnv = process.env) {
  const policy = cspPolicy(env);
  return [
    { key: cspEnforced(env) ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: policy },
    { key: "Reporting-Endpoints", value: `csp="${CSP_REPORT_PATH}"` },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...cspHeaders()] },
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
