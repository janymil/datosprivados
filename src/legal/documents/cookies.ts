import { appUrl, categoryLabel } from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Política de cookies (antes `buildCookiePolicy`). */

const COOKIE_TYPE: Record<string, string> = { analitica: "Analítica", publicidad: "Publicitaria" };

function providerCookieRows({ providers }: LegalContext): string[][] {
  return providers
    .filter(
      (provider) =>
        provider.cookies ||
        provider.category === "analitica" ||
        provider.category === "publicidad" ||
        (provider.is_custom && ["login", "pagos", "web", "hosting"].includes(provider.category))
    )
    .map((provider) => [
      provider.cookies || "[cookies de este proveedor: revísalas en tu navegador]",
      provider.name,
      provider.purpose || categoryLabel(provider.category),
      "Según el proveedor",
      COOKIE_TYPE[provider.category] ?? "Técnica o de terceros",
    ]);
}

export const cookiesSpec: DocumentSpec = {
  kind: "cookies",
  join: "\n\n",
  clauses: [
    {
      id: "cookies.1.que-son",
      cites: [
        { norm: "ds-016-2024-jus", art: "2.4" },
        { norm: "ds-016-2024-jus", art: "5" },
        { norm: "ds-016-2024-jus", art: "6" },
      ],
      text: () => `## 1. Qué son las cookies y por qué las usamos

Una cookie es un archivo pequeño que el sitio guarda en tu navegador. Sirve para mantener tu sesión abierta, recordar tus preferencias y, solo si lo autorizas, medir cómo se usa el sitio. Cuando una cookie o identificador en línea permite identificarte, es un dato personal (art. 2.4 del DS N.° 016-2024-JUS) y su uso para analítica o publicidad requiere tu consentimiento previo, libre, informado e inequívoco (art. 5 y 6).`,
    },
    {
      id: "cookies.2.categorias",
      cites: [],
      text: () => `## 2. Categorías

| Categoría | Para qué sirve | ¿Requiere consentimiento? |
| --- | --- | --- |
| **Técnicas o esenciales** | Inicio de sesión, seguridad, prevención de fraude, balanceo de carga | No: son necesarias para prestar el servicio |
| **De preferencias** | Idioma, tema claro/oscuro, último panel usado | No, si solo guardan tu elección |
| **Analíticas** | Medir páginas vistas y uso de forma agregada | **Sí** |
| **Publicitarias** | Medir conversiones de campañas y mostrarte anuncios | **Sí** |`,
    },
    {
      id: "cookies.3.nada-antes",
      cites: [],
      text: () => `## 3. Nada se carga antes de que decidas

El sitio **no ejecuta** scripts de analítica ni de publicidad antes de que pulses «Aceptar» en el banner. Si rechazas las no esenciales, no se descarga ninguna etiqueta de terceros. Guardamos tu decisión para no volver a preguntarte en cada visita.`,
    },
    {
      id: "cookies.4.tabla",
      cites: [],
      text: (ctx) => {
        const { company, providers } = ctx;
        const rows = providerCookieRows(ctx);
        return `## 4. Cookies que usamos

${providers.length ? "*Las filas de proveedores salen de las herramientas que declaraste en DatosPrivados.* " : ""}*Esta tabla debe reflejar lo que **realmente** carga tu sitio: abre tu web con las herramientas de desarrollo del navegador (pestaña Aplicación → Cookies) y completa cada fila. Si declaras cookies que no usas, o callas las que usas, la política deja de ser veraz.*

| Cookie | Proveedor | Finalidad | Duración | Tipo |
| --- | --- | --- | --- | --- |
| [nombre de la cookie de sesión de tu web o plataforma] | ${company.name} | Mantener la sesión y la seguridad | Sesión | Técnica |
| [decisión del banner de cookies] | ${company.name} | Recordar tu elección | Hasta que la borres | Preferencias |
${rows.length ? rows.map((row) => `| ${row.join(" | ")} |`).join("\n") : "| [completar con cada cookie o etiqueta de terceros] | [proveedor] | [finalidad] | [duración] | [tipo] |"}

**Ejemplos habituales, para que los reconozcas (úsalos solo si tu sitio realmente los carga):** \`_ga\` y \`_ga_*\` (Google Analytics, analítica, hasta 2 años), \`_gcl_*\` (Google Ads, publicidad, hasta 90 días), \`_fbp\` (Meta Pixel, publicidad, hasta 90 días), \`__cf_bm\` (Cloudflare, técnica, 30 minutos).`;
      },
    },
    {
      id: "cookies.5.terceros",
      cites: [],
      text: ({ company }) => `## 5. Terceros

Algunos proveedores pueden instalar sus propias cookies cuando usas funciones concretas (por ejemplo, la pasarela de pagos en la pantalla de cobro). No controlamos esas cookies: revisa sus políticas. La lista de proveedores y transferencias está en la Política de Privacidad (${appUrl()}/p/${company.slug}).`,
    },
    {
      id: "cookies.6.revocar",
      cites: [],
      text: () => `## 6. Cómo revocar o cambiar tu decisión

1. Abre el enlace **«Preferencias de cookies»** del pie de página y cambia las categorías.
2. Borra las cookies del sitio desde la configuración de tu navegador.
3. Para analítica de Google, puedes instalar el complemento de inhabilitación de Google Analytics.

Revocar el consentimiento no afecta la licitud del tratamiento previo.`,
    },
    {
      id: "cookies.7.almacenamiento-local",
      cites: [],
      text: () => `## 7. Almacenamiento local

Además de cookies, usamos almacenamiento local del navegador para preferencias de interfaz (tema, idioma, decisión del banner). Esos datos se quedan en tu equipo y no viajan en cada solicitud.`,
    },
    {
      id: "cookies.8.vigencia",
      cites: [],
      text: ({ company, date }) => `## 8. Vigencia y contacto

Vigencia: **${date}**. Cambios relevantes se anuncian en esta página. Consultas: **${company.dpo_email || company.email}**.`,
    },
    {
      id: "cookies.nota.borrador",
      cites: [],
      nonLegal: "Nota de borrador",
      text: () => `---

*Borrador generado con DatosPrivados. Verifica la tabla de cookies con las herramientas de desarrollo del navegador antes de publicar.*`,
    },
  ],
};
