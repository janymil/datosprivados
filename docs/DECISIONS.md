# Decisiones de producto y de ingeniería

Registro de decisiones que condicionan el trabajo siguiente. Cada una indica quién decidió y qué cambia si se revierte.

## Pendientes (Fase 0 de `PRODUCTION_ROADMAP.md`)

La empresa operadora (razón social y RUC) está en proceso de constitución. Hasta que exista, no se puede cerrar:
`P0-ENTITY`, `P0-SUNAT`, `P0-LEGAL` (términos de la plataforma y revisión de abogado), `P0-OWN-BANKS`, `P0-DOMAIN`,
`P0-PRICING`, `P0-SUPPORT`, `P0-AI-VENDOR`.

Qué NO se puede hacer sin ellos: publicar los textos legales de la plataforma, emitir comprobantes electrónicos,
usar credenciales de MercadoPago de producción y fijar el dominio definitivo.

## Decididas en la Fase 1

| Decisión | Elegida | Motivo | Si cambia |
|---|---|---|---|
| Base de datos para el lanzamiento | **SQLite endurecida** (opción A de P1-DATA) | Un solo proceso, sin servicios externos, suficiente para las primeras cuentas. | Pasar a Postgres exige volver asíncrono `db.ts` y `data.ts` (todas las acciones los usan de forma síncrona). Obligatorio si se quiere más de una instancia. |
| Instancias de la app | **Una** (PM2 `fork`, sin cluster) | SQLite admite un escritor; los límites de intentos viven en la misma base. | Con varias instancias, mover límites y sesiones a un almacén compartido. |
| Límite de intentos | Tabla `rate_limits` en SQLite, ventana fija | Cero dependencias nuevas. | Redis/Cloudflare Rules si hay varias instancias. |
| Contraseña mínima | 10 caracteres | Acordado en el roadmap (antes 8). Las cuentas existentes no se tocan. | — |
| Cambio de plan | La suscripción nueva queda **pendiente**; el plan solo cambia cuando MercadoPago la autoriza y recién entonces se cancela la anterior | Evita regalar el plan Pro y perder el cobro si el usuario abandona. | — |
| Periodo inicial | Se concede una vez por suscripción, solo si no hay pagos aprobados de ella ni periodo vigente | Evita que re-autorizar una suscripción vencida regale un mes. | — |
| Cuenta demo (sin prueba gratuita) | **Solo lectura.** Los documentos se muestran como vista previa recortada **en el servidor** (≈900 caracteres + títulos de las secciones); copiar, descargar, imprimir y exportar están bloqueados; no escribe, no publica, no contrata, no usa IA y su formulario ARCO público no guarda solicitudes | No hay prueba de 14 días porque se podían copiar los documentos y cancelar. Quien se registra puede crear usuario y empresa, pero para generar documentos debe pagar. La demo no debe regalar el texto. | Si se quisiera una demo interactiva con escritura, usar una base separada y seguir sin entregar el texto completo. |

## Verificación del RUC (Decolecta → SUNAT)

Implementada el 2026-10-31 en el registro y al cambiar el RUC en Empresa (`src/lib/ruc-lookup.ts`).

| Decisión | Elegida | Motivo |
|---|---|---|
| Qué se exige | El RUC debe **existir y figurar ACTIVO** en la SUNAT. La condición (HABIDO / NO HABIDO) se guarda pero **no bloquea** | **Confirmado por el propietario (2026-10-31):** la condición del contribuyente es obligación del usuario; quien la quiera, paga. El estado distinto de ACTIVO (baja, suspensión) sí se rechaza: si hay que permitirlo también, es un cambio de una línea en `checkCompanyRuc`. |
| Razón social y domicilio | Con el RUC verificado, `companies.name` y `companies.address` se toman de la SUNAT (el nombre escrito en el formulario se descarta). **El nombre sigue editable** en «Empresa»; el usuario es responsable de que sea correcto | **Confirmado por el propietario (2026-10-31).** Los documentos llevan la razón social y el domicilio fiscal de la SUNAT por defecto. |
| Si el proveedor falla | **Falla cerrado**: no se crea la cuenta y se pide reintentar. Solo 404/422 significan «no existe»; 401, 429, 5xx, red y tiempo agotado son «no disponible» | Comportamiento real observado: RUC inexistente → 404 `{"message":"not found"}`; token inválido/ausente/cuota agotada → 401 `"Apikey Required / Limit Exceeded"` (un solo mensaje para las tres causas). |
| Token ausente | Desarrollo: no verifica. **Producción: el servidor no arranca** sin `DECOLECTA_API_TOKEN` | Evita registrar sin verificar por un olvido de configuración. |
| RUC repetido | Se bloquea solo si ya existe una cuenta **activa o demo** con ese RUC; las pendientes de pago no bloquean | Evita que alguien reserve el RUC de otra empresa sin pagar. |
| Cambiar el RUC después | Se vuelve a verificar y a comprobar duplicados | Si no, la verificación del registro se esquivaría editando la empresa. |

**Límites conocidos:**
- La consulta prueba que el RUC **existe y está activo, no que quien se registra sea su titular**. Cualquiera puede escribir un RUC ajeno y público. Lo mitiga que activar el plan exige pagar y que los documentos se generan con los datos de la SUNAT; no lo resuelve. Si se quiere probar titularidad, hace falta otra señal (por ejemplo, correo del dominio de la empresa o un documento).
- **Cuota: 1.000 consultas al mes** (confirmado por el propietario; suficiente). Cada intento de registro con un RUC nuevo consume una; el límite de 5 registros por hora y por IP lo acota, pero muchas IPs podrían agotarla. Si la cuota se agota, los registros fallan cerrados («No pudimos verificar tu RUC») hasta el mes siguiente: vigilar el consumo en el panel de Decolecta.
- Las cuentas creadas antes de este cambio quedan con `ruc_verified_at = NULL` (no se re-verifican).

## Desviaciones respecto al roadmap (a confirmar)

1. ~~Demo no es de solo lectura~~ **Resuelto (2026-10-31).** Sigue pendiente decidir si la demo vive en una base aparte: hoy comparte la base de producción y se siembra en cada arranque.
2. **Las credenciales de la demo siguen visibles** en `src/app/(auth)/login/page.tsx`. Se mantienen porque el botón «Probar la demo»
   ya entra sin contraseña; conviene quitarlas. La demo ya es de solo lectura, así que el riesgo es bajo.
3. **Verificación de correo, restablecer contraseña, cambiar correo/contraseña y turnstile/captcha** quedan para la Fase 3
   (necesitan transporte de correo) o para cuando existan las claves de Cloudflare Turnstile.
4. **Migraciones numeradas** (P1-DATA-1) no se hicieron: el esquema sigue evolucionando con `migrate()` en `src/lib/db.ts`
   (versión 10). Es deuda deliberada para no reescribir 1.000 líneas sin pruebas de esquema.
5. **CSP** no se activó: requiere probar la landing con nonces/hashes en un navegador. Se añadieron el resto de las cabeceras.
