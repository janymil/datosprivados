# PrivadoPE

MVP de un SaaS de cumplimiento de la **Ley 29733** (protección de datos personales, Perú) para
MYPE y negocios pequeños. No es un documento legal: es el expediente operativo.

> **Nombre de trabajo:** PrivadoPE. Los textos legales generados son borradores y deben ser
> validados por un abogado antes de publicarse.

## Qué incluye

- **Landing pública** en español con propuesta de valor, precios (S/ 19 y S/ 39) y preguntas.
- **Registro / login** con contraseña (scrypt) y sesión en cookie httpOnly.
- **Panel de cumplimiento** con puntaje, pendientes y vencimientos.
- **Bancos de datos**: inventario, declaración de finalidad, base legal, plazo, encargados y
  ficha imprimible para el SIPDP.
- **Solicitudes ARCO**: formulario público por empresa, ticket, plazo automático de **20 días
  hábiles** (feriados nacionales del Perú), plantillas de respuesta y archivo de evidencia.
- **Incidentes**: registro, contador de **48 horas** y borrador de notificación para la ANPD.
- **Documentos**: política de privacidad, consentimientos por canal y documento de seguridad,
  generados con los datos de la empresa; publicación en `/p/[slug]`.
- **Exportación** del expediente completo en JSON.

## Arranque

Requisitos: Node.js 22+ (probado con 24), pnpm.

```bash
pnpm install
pnpm dev
```

Abre <http://localhost:3000>.

### Demo

- Botón **Probar la demo** en la landing → entra sin contraseña.
- Credenciales: `demo@privadope.pe` / `demo1234`.

La base se crea y se siembra sola en `data/privadope.db` con una empresa ficticia
(*Casa Verde Perú S.A.C.*), cuatro bancos de datos, solicitudes ARCO, un incidente cerrado y
documentos generados.

## Stack

| Pieza | Decisión |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| UI | Tailwind CSS v4, tipografías Fraunces / Archivo / IBM Plex Mono |
| Datos | SQLite vía `node:sqlite` (sin ORM) |
| Auth | scrypt + sesiones en base + cookie httpOnly |
| Zona horaria | `America/Lima` para fechas y plazos |

`node:sqlite` mantiene el MVP sin servicios externos. La capa de acceso está concentrada en
`src/lib/db.ts` y `src/lib/data.ts` para migrar a Postgres + Drizzle en producción sin reescribir
las pantallas.

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
- Pagos simulados (Culqi / Niubiz pendiente).
- Sin envío real de correo ni WhatsApp: las notificaciones se muestran en el panel.
- El formulario ARCO público no tiene captcha ni rate limiting.
- Datos en SQLite local; producción requiere Postgres, respaldos y cifrado gestionado.
- Los documentos son borradores: falta revisión legal y textos de términos del servicio.

## Scripts

```bash
pnpm dev        # desarrollo
pnpm build      # build de producción
pnpm start      # servir el build
pnpm typecheck  # TypeScript
```

## Nota de despliegue

En Windows, Turbopack necesita `nodeLinker: hoisted` (ver `pnpm-workspace.yaml`) para resolver
`next/package.json` dentro del proyecto.

---

© 2026 PrivadoPE. Herramienta de gestión; no sustituye asesoría legal.
