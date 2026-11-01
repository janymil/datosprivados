# DatosPrivados

MVP de un SaaS de cumplimiento de la **Ley 29733** (protección de datos personales, Perú) para
MYPE y negocios pequeños. No es un documento legal: es el expediente operativo.

> **Producto:** DatosPrivados · dominio **datosprivados.pe** (los enlaces públicos `/p/[slug]` y
> `/solicitud/[slug]` se arman con `NEXT_PUBLIC_APP_URL`). Los textos legales generados son
> borradores y deben ser validados por un abogado antes de publicarse.

## Qué incluye

- **Landing pública** en español con propuesta de valor, precios mensuales o anuales (S/ 19 / S/ 39
  al mes; S/ 190 / S/ 390 al año) y preguntas.
- **Registro / login** con contraseña (scrypt) y sesión en cookie httpOnly.
- **Suscripción mensual o anual** con MercadoPago (preapproval). El registro crea la cuenta en
  estado `pending`; la suscripción autorizada la activa y se renueva automáticamente. Se puede
  cancelar desde Ajustes.
- **Panel de cumplimiento** con puntaje, pendientes y vencimientos.
- **Bancos de datos**: inventario, declaración de finalidad, base legal, plazo, encargados y
  ficha imprimible y copiable para el SIPDP, numerada como el formulario del Estado
  (I a X, con la finalidad en el rubro V y el flujo transfronterizo en el VI). El onboarding
  sugiere los bancos del rubro; el rubro *Software, app o plataforma digital (SaaS)* propone
  los cuatro que casi nadie declara (usuarios, facturación, registros técnicos y contactos de
  terceros).
- **Solicitudes ARCO**: formulario público por empresa, ticket, plazo automático de **20 días
  hábiles** (feriados nacionales del Perú), plantillas de respuesta y archivo de evidencia.
- **Incidentes**: registro con los **criterios del art. 34.1** (muchas personas, datos
  sensibles, gran volumen, daño evidente) y los titulares afectados; el reloj de **48 horas**
  solo corre cuando el incidente cumple algún criterio, y si no, queda documentado (art. 35).
  Incluye borrador de notificación para la ANPD y evaluador con IA (Plan Pro).
- **Documentos** en dos grupos, armados con los datos de la empresa:
  - *Públicos*: política de privacidad (con publicación en `/p/[slug]`), términos y condiciones,
    política de cookies, avisos cortos (formularios, WhatsApp, checkout, boletas), libro de
    reclamaciones (aviso, hoja y procedimiento) y textos de consentimiento por canal.
  - *Internos*: documento de seguridad (con checklist de las medidas de los arts. 46 y 47 para
    marcar cuáles ya están implementadas), política de retención y eliminación, encargo de
    tratamiento con cláusula de flujo transfronterizo, confidencialidad y cartel CCTV, y
    evaluación de impacto (EIPD).
- **Alcance Perú:** solo empresas o personas con negocio constituidas en el Perú, con RUC. El
  SIPDP exige una empresa peruana para inscribir bancos de datos, así que no se atienden
  responsables constituidos en el extranjero.
- **Exportación** del expediente completo en JSON.
- **Centro de ayuda** (`/app/ayuda`): ruta de la A a la Z que se marca sola según el estado de la
  cuenta, buscador, «¿Qué necesita mi negocio?», mapa de la app, 18 artículos, glosario, preguntas
  frecuentes y tooltips contextuales (`HelpTip`). Todo el contenido vive en `src/lib/help-content.ts`
  y `src/lib/help-tips.ts`, y es **la misma fuente** que alimenta al asistente de IA
  (`src/lib/help-knowledge.ts`): al cambiar una pantalla se corrige ahí una sola vez.

## Arranque

Requisitos: Node.js 22+ (probado con 24), pnpm.

```bash
pnpm install
pnpm dev
```

Abre <http://localhost:3000>.

### Demo

- Botón **Probar la demo** en la landing → entra sin contraseña.
- Credenciales: `demo@datosprivados.pe` / `demo1234`.

La base se crea y se siembra sola en `data/datosprivados.db` con una empresa ficticia
(*Casa Verde Perú S.A.C.*), cuatro bancos de datos, solicitudes ARCO, un incidente cerrado y
documentos generados.

## Pagos (MercadoPago)

El registro crea la empresa en estado `pending`. Para activarla hay que crear una suscripción
mensual o anual con MercadoPago; la suscripción autorizada activa el período y se renueva
automáticamente. El usuario puede cancelarla desde Ajustes y mantiene el acceso hasta el final del
período pagado. El plan anual cobra 12 meses con 2 meses de ahorro.

1. Crea una aplicación en el panel de MercadoPago y copia el **Access Token** (`TEST-...` para
   sandbox).
2. En `.env` define:
   ```bash
   NEXT_PUBLIC_APP_URL=https://tu-dominio-o-tunel
   MERCADOPAGO_ACCESS_TOKEN=TEST-...
   MERCADOPAGO_WEBHOOK_SECRET=...
   ```
3. Configura el webhook en MercadoPago apuntando a
   `https://tu-dominio/api/mercadopago/webhook` y activa los eventos
   `subscription_preapproval` y `subscription_authorized_payment`.
4. Reinicia `pnpm dev`.

Sin `MERCADOPAGO_ACCESS_TOKEN`, desarrollo muestra un botón de **activación manual** en `/pago`
para probar el resto del flujo. En producción no existe ese botón: sin token, las cuentas quedan
pendientes y no se activan.

## Stack

| Pieza | Decisión |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| UI | Tailwind CSS v4, tipografías Fraunces / Archivo / IBM Plex Mono |
| Datos | SQLite vía `node:sqlite` (sin ORM) |
| Pagos | MercadoPago Suscripciones (preapproval, REST, sin SDK) |
| Auth | scrypt + sesiones en base + cookie httpOnly |
| Zona horaria | `America/Lima` para fechas y plazos |

`node:sqlite` mantiene el MVP sin base de datos externa; el único servicio externo obligatorio en
producción es MercadoPago. La capa de acceso está concentrada en `src/lib/db.ts` y `src/lib/data.ts`
para migrar a Postgres + Drizzle en producción sin reescribir las pantallas.

## Estructura

```
src/
  app/
    page.tsx                 landing
    (auth)/login|registro    acceso
    demo/route.ts            sesión de demostración
    app/                     panel privado
      bancos/                inventario + ficha SIPDP
      arco/                  bandeja y detalle de solicitudes
      incidentes/            registro y reloj de 48 h
      documentos/            generador y publicación
      empresa/ ajustes/
    solicitud/[slug]/         formulario público ARCO
    p/[slug]/                 política pública
    actions/                  server actions
  lib/
    db.ts                    esquema, seed y plazos hábiles
    documents.ts             plantillas legales
    compliance.ts            puntaje y estados
  components/                UI y piezas cliente
```

## Plazos y feriados

`addBusinessDays()` omite sábados, domingos y feriados nacionales del Perú (incluidos Jueves y
Viernes Santo, calculados a partir de Pascua). Los feriados regionales y las suspensiones de
último momento deben mantenerse a mano; el archivo está en `src/lib/db.ts`.

## Límites conocidos del MVP

- Un usuario por empresa; sin roles ni invitaciones.
- Solo empresas peruanas con RUC: el SIPDP no inscribe bancos de datos de empresas extranjeras.
- La suscripción se cobra con MercadoPago; no hay dunning propio ni portal de cliente para
  actualizar la tarjeta. La cancelación se hace desde Ajustes.
- No hay job de reconciliación diaria: los webhooks de MercadoPago son la fuente de verdad.
- Sin `MERCADOPAGO_ACCESS_TOKEN`, desarrollo muestra una activación manual de prueba; producción
  no permite activar cuentas sin pago. Configura las credenciales en `.env`.
- Sin envío real de correo ni WhatsApp: las notificaciones se muestran en el panel.
- El formulario ARCO público no tiene captcha ni rate limiting.
- Datos en SQLite local; producción requiere Postgres, respaldos y cifrado gestionado.
- Los documentos son borradores: falta revisión legal y textos de términos del servicio.

## Videos de la landing

Los masters viven en `Videos/` (ignorados por git por peso). La landing usa dos videos, cada uno
dentro de una sección que ya existía: no se agregaron secciones nuevas.

| Sección | Video | Formato servido | Peso |
| --- | --- | --- | --- |
| `#video` — «Entiéndelo en 1:42» | `datosprivados` — la ley en 5 escenas | VP9 + Opus, 720×1280 · H.264 Main + AAC, 720×1280 | ~5.6 / 8.4 MB |
| `#producto` — «Qué resuelve» | `why-datosprivados` — por qué el registro gratis no basta (1:49) | VP9 + Opus, 854×480 · H.264 + AAC, 854×480 | ~3.7 / 5.7 MB |

Los archivos servidos y sus posters están en `public/video/`:

| Archivo | Formato | Peso |
| --- | --- | --- |
| `datosprivados.webm` / `.mp4` / `-poster.jpg` | vertical 720×1280 | ~5.6 / 8.4 MB / 70 KB |
| `why-datosprivados.webm` / `.mp4` / `-poster.jpg` | horizontal 854×480 | ~3.7 / 5.7 MB / 40 KB |

[`PromoVideo`](src/components/promo-video.tsx) va en `#video`: reproduce en silencio al entrar en
pantalla, permite activar audio y respeta `prefers-reduced-motion` y `saveData`.
[`ProductVideo`](src/components/product-video.tsx) va en `#producto`: es click-to-play (no
autoplay), con controles propios, barra de avance y pantalla completa. Ambos usan WebM y caen al MP4
en navegadores antiguos.

Regenerar desde los masters:

```powershell
# Vertical (la ley)
powershell -ExecutionPolicy Bypass -File scripts/encode-video.ps1

# Horizontal (tour de producto): el master ya es H.264, así que el MP4 se remuxea sin recodificar
powershell -ExecutionPolicy Bypass -File scripts/encode-video.ps1 `
  -Source Videos/why-datosprivados.mp4 -Basename why-datosprivados `
  -Width 854 -Height 480 -PosterAt 2 -RemuxMp4
```

## Scripts

```bash
pnpm dev        # desarrollo
pnpm build      # build de producción
pnpm start      # servir el build
pnpm typecheck  # TypeScript
```

`node scripts/verify-video-claims.mjs` recorre con Playwright las funciones prometidas en el video
explicativo (ficha copiable, criterios del art. 34.1, reloj de 48 h, checklist de seguridad y panel
de multas ARCO) y deja capturas en `shots/audit/`.

## Nota de despliegue

En Windows, Turbopack necesita `nodeLinker: hoisted` (ver `pnpm-workspace.yaml`) para resolver
`next/package.json` dentro del proyecto.

---

© 2026 DatosPrivados. Herramienta de gestión; no sustituye asesoría legal.
