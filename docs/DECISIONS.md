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

## Cuándo se pasa a Postgres (disparador escrito)

La base es SQLite endurecida y un solo proceso (Fase 1). No hay fecha: hay tres
disparadores medibles. Al cruzar cualquiera de ellos, se migra; antes, no.

| Disparador | Cómo se mide | Por qué obliga |
|---|---|---|
| **Más de una instancia** de la app | PM2/cluster con `instances > 1`, o un segundo servidor | SQLite admite un escritor y el archivo no se comparte por red sin corromperse. Los límites de intentos y las sesiones viven en la misma base: con dos procesos, cada uno tendría su cupo. |
| **Contención de escritura sostenida** | `SQLITE_BUSY` en `job_runs`/`webhook_events` (el `busy_timeout` es de 5 s) o latencia de escritura creciente en `/api/health` | Un escritor bloquea a los demás; con la cola de correo y los webhooks escribiendo a la vez, el tiempo de espera se nota en las pantallas. |
| **Tamaño o crecimiento** | La base supera ~2 GB o el respaldo horario deja de caber en la ventana de una hora | El respaldo es una copia completa; el tiempo de copia y el de restauración (RTO ≤ 2 h) crecen con el archivo. |

**Qué cuesta el cambio.** `db.ts` y `data.ts` son **síncronos** (`prepare().get()/.all()/.run()`),
y desde ahí los usan todas las pantallas y acciones: pasar a un cliente asíncrono
obliga a volver `async` ambos módulos y a propagar `await` por cada llamador
(las acciones ya son `async`, las páginas de servidor también, pero no todos los
helpers). Además hay que traducir:

- `migrate()` con `PRAGMA table_info` → migraciones versionadas reales (hoy `SCHEMA_VERSION` en `db.ts`);
- índices parciales (`uq_payments_payment_id`, `uq_invoices_number`) y `INSERT OR IGNORE` → equivalentes en Postgres;
- el candado de `job_runs`, `rate_limits` y el «claim» atómico de `email_outbox` → `SELECT … FOR UPDATE SKIP LOCKED` o equivalentes;
- el respaldo (`scripts/backup-db.mjs`, `VACUUM INTO` + gzip + sha256) → `pg_dump` y un plan de restauración nuevo.

Pruebas que hoy dependen de SQLite y habría que adaptar: `test/db-migrations.test.ts`,
`test/db-indexes.test.ts` (planes de consulta) y los helpers de `test/helpers/db.ts`.
Por eso el disparador se escribe **antes** de necesitarlo: mientras no se cruce,
el trabajo rinde más en otras áreas.

## Verificación del esquema y de los índices

`SCHEMA_VERSION` en `src/lib/db.ts` sube con cada migración. `test/db-migrations.test.ts`
comprueba que abrir la base dos veces no la cambie, que una base de la versión
anterior llegue al esquema actual sin perder datos y que reejecutar las
migraciones sobre una conexión abierta no rompa nada. `test/db-indexes.test.ts`
fija con `EXPLAIN QUERY PLAN` que las consultas calientes usen índice y que
ninguna tabla con `company_id` quede sin índice por empresa.

## Verificación de correo: qué bloquea (y qué no)

El correo se confirma con el enlace que se envía al registrarse (`auth_tokens`, 48 h,
un solo uso). Hasta confirmarlo **no se puede publicar la Política de Privacidad**
en `/p/[slug]`; todo lo demás —entrar, generar y editar documentos, descargar,
pagar, registrar bancos, responder ARCO— sigue disponible.

| Pregunta | Decisión | Motivo |
|---|---|---|
| ¿Por qué publicar y no otra cosa? | Es el único acto que expone la empresa en una URL abierta y activa el formulario ARCO público | Las solicitudes ARCO se avisan al correo de la cuenta y el plazo de 10 días hábiles corre igual: publicar con un correo que nadie lee crea un incumplimiento silencioso |
| ¿Por qué no bloquear la respuesta a una solicitud ARCO? | No se bloquea | Frenar una respuesta legal por un correo sin confirmar es peor que el riesgo que evita |
| ¿Y la exportación, el pago o la eliminación? | No se bloquean | Son derechos del titular de la cuenta (acceso, supresión) y el pago no depende del correo |
| ¿Qué pasa si el enlace no llega? | Ajustes → «Reenviar el enlace» (3 por hora y por usuario, 10 por IP y hora) | No se puede depender de un correo que quizá no llegue: el usuario ve el estado y puede reintentar |
| Implementación | `emailVerificationGate()` en `src/lib/account.ts`, aplicado en `togglePublishAction` (`src/app/actions/documents.ts`) | Único punto de entrada de la publicación; la base no decide políticas |
| Efecto en la demo | Ninguno: la demo no escribe ni publica | Ya es de solo lectura |

Las cuentas que se crearon antes de existir la verificación (desarrollo, y las
pruebas) no se marcan como verificadas: la base de producción se estrena con esta
versión, así que no hay clientes en esa situación. Si algún día hubiera que
perdonar la verificación a una cuenta concreta: `UPDATE users SET email_verified_at = ... WHERE id = ...`.

## CSP: observación primero, bloqueo después

| Pregunta | Decisión | Motivo |
|---|---|---|
| ¿Se activa una CSP que bloquee? | **No todavía.** Hoy va una `Content-Security-Policy-Report-Only` | Bloquear sin datos rompe funciones en producción (Next inyecta scripts y estilos en línea). Primero se recogen los avisos reales |
| ¿Qué política se observa? | `default-src 'self'` con `script-src`/`style-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`, `connect-src 'self'`, `img-src 'self' data: blob:` | Detecta recursos externos, formularios a otros orígenes, `embed`/`object` y `base` secuestrado **sin** generar ruido por los scripts en línea de Next. Definida en `next.config.ts` |
| ¿A dónde llegan los avisos? | `POST /api/csp-report` (tope 8 KB, 30 por minuto e IP) que registra **solo** directiva, origen bloqueado recortado y la ruta del documento | `docs/GO-NO-GO.md` exige poder operar; el endpoint es público por diseño y no debe poder llenar el disco ni guardar datos personales |
| ¿Qué hace falta para bloquear? | `proxy.ts` con nonce por petición (guía de Next: `01-app/02-guides/content-security-policy.md`), quitar `'unsafe-inline'` y volver a medir LCP/E2E | Un nonce por petición vuelve dinámicas todas las páginas: cambia el rendimiento medido y puede tumbar la caché de Cloudflare. **Decisión del propietario, pendiente** |
| ¿Y `X-Frame-Options`? | Se mantiene además de `frame-ancestors` | Navegadores antiguos no entienden CSP |

## IP del cliente: qué encabezado se cree

`clientIp()` (`src/lib/client-ip.ts`) alimenta los límites de intentos. Orden:
`X-Real-IP` (lo escribe nginx, el cliente no puede fijarlo) → `CF-Connecting-IP` (solo
cuando no hay nginx delante) → `X-Forwarded-For` (primer valor) → `"desconocida"`.
Un valor que no sea una IP se descarta.

Para que `X-Real-IP` sea la IP real detrás de Cloudflare, nginx necesita
`set_real_ip_from` (rangos del borde) + `real_ip_header CF-Connecting-IP`; aplicado en
el preview el 2026-11-02 y descrito en `deploy/nginx-production.conf`, que además cierra
el origen con `geo $realip_remote_addr` (el par **antes** de la reescritura) y
`if ($from_cloudflare = 0) { return 403; }`. Sin esa última línea, quien llegue directo
a la IP del servidor puede inventar `CF-Connecting-IP` y estrenar cupo en cada intento.

## Formulario ARCO público: prueba de trabajo en vez de captcha

| Pregunta | Decisión | Motivo |
|---|---|---|
| ¿Captcha o prueba de trabajo? | **Prueba de trabajo** (hashcash) hoy; Turnstile cuando existan claves y se acepte el tercero | Los límites por IP (`5` por IP cada 10 min) son débiles tras un NAT compartido y gratis para un bot con muchas IPs. Turnstile es mejor, pero exige cuenta, claves y declararlo como sub-encargado (P0-ENTITY/LEGAL). La prueba de trabajo no necesita a nadie y ya está implementada |
| ¿Cómo funciona? | El servidor firma `salt|dificultad|expira` (HMAC con `FORM_POW_SECRET` o, si falta, `CRON_SECRET`) y lo muestra en el formulario; el navegador busca un contador cuyo `sha256(salt+contador)` tenga N bits en cero (~0,1 s con 16 bits) y lo devuelve; el servidor comprueba firma, vigencia (30 min), dificultad y que el `salt` no se haya usado (tabla `pow_challenges`, consumo atómico) | Sin estado en el cliente, sin dependencias, sin terceros. Un `salt` vale una sola vez: una solución no se reutiliza |
| ¿Por qué **apagada por defecto** (`FORM_POW=1` la activa)? | El formulario ARCO es la vía legal de una persona para ejercer sus derechos: no puede depender de que JavaScript funcione. Se activa en staging, se prueba en un móvil real y recién entonces en producción; `checkEnvironment` avisa en el arranque mientras siga apagada | Un fallo de PoW dejaría a gente sin poder presentar una solicitud, que es peor que el spam |
| ¿Qué pasa si el navegador no puede resolverlo? | El componente muestra un aviso con la salida alternativa (escribir al correo de contacto de la empresa) y el servidor responde con un mensaje claro (`?error=verificacion`), nunca con un error técnico | La persona tiene que poder ejercer su derecho incluso con un dispositivo lento |
| Adjuntos de prueba de identidad | **Fuera de alcance en v1**: la identidad se declara (nombre + DNI) y se responde al correo o teléfono consignado | Recibir adjuntos añade almacenamiento, antivirus, cifrado y retención de documentos de identidad (dato sensible); primero hay que decidir la política de retención (P0-SUPPORT) |

## Decididas en la Fase 3 (provisionales hasta cerrar la Fase 0)

| Decisión | Elegida | Motivo | Si cambia |
|---|---|---|---|
| Proveedor de correo | **Resend** por API HTTP, sin dependencias nuevas | Es el que menos código y menos configuración pide; la interfaz (`MailTransport`) es una función, cambiar a Postmark/SES es reescribir ~25 líneas. **Provisional:** el roadmap exige registrarlo como sub-encargado en la política de la plataforma; eso depende de P0-ENTITY. | Cambiar `resendTransport` en `src/lib/mail.ts` y el webhook de rebotes. |
| Entrega de correo | Bandeja en la base (`email_outbox`) + tarea `send-outbox`; nunca dentro de la petición | Una caída del proveedor no pierde ni bloquea nada. | — |
| Planificador | `POST /api/cron/<tarea>` con bearer `CRON_SECRET`, disparado por el cron del sistema | Un solo proceso, sin dependencias. | Con varias instancias, el candado de `job_runs` ya evita ejecuciones simultáneas en la misma base. |
| IA: consentimiento | **Opt-in por empresa**, con fecha, en Ajustes. Sin él, modo básico | El texto sale a un proveedor en el extranjero y el anonimizador no es infalible. **Cambio de comportamiento:** las empresas Pro existentes pierden la IA hasta aceptar. | Quitar la condición en `aiBlockReason`. |
| IA: cuotas | Básico 60 y Pro 400 consultas por mes calendario (Lima); 6 por minuto por empresa | Valores iniciales sin base de costos real. | `aiMonthlyQuota` en `plans.ts`, `PER_MINUTE_LIMIT` en `ai-guard.ts`. |
| IA: modelo de OpenAI | **Sin modelo por defecto**: exige `OPENAI_MODEL` | El id `gpt-6-luna` del código no estaba verificado. | — |
| Documentos públicos | La página pública sirve la **versión publicada** (instantánea en `document_versions`), no el borrador. Regenerar no cambia lo público hasta volver a publicar | Antes, regenerar sobrescribía lo que veía el público sin dejar rastro. **Cambio de comportamiento.** | — |
| Publicar | Se bloquea si el texto tiene campos `[entre corchetes]` sin completar | Una política pública con «[completar domicilio]» no es creíble. | `publishBlockers` en `document-publish.ts`. |
| Cuenta vencida | Sin panel, **con** `/cuenta` (descargar y eliminar). Política y formulario ARCO públicos siguen vivos hasta el borrado | Apagar el canal ARCO de un cliente sería un incumplimiento suyo. Resuelve la decisión que P3-ACCOUNT dejaba abierta. | — |
| Retención | Borrado a los **90 días** del vencimiento, solo con el último aviso enviado; altas sin pago, a los 30 días | Valor propuesto; **P0-SUPPORT lo fija**. | `LAPSED_RETENTION_DAYS` (mínimo 45). |
| Eliminar cuenta | Borra todo y deja una fila mínima + pagos (sin la respuesta cruda del proveedor) | Obligación tributaria de conservar comprobantes. Pide contraseña y escribir ELIMINAR; si MercadoPago no confirma la cancelación, no se borra. | — |
| Feriados | Tabla `holidays` editable, sembrada por regla | Un decreto no puede requerir un despliegue. No hay pantalla de administración: se edita por SQL (ver RUNBOOK). | Agregar una pantalla cuando exista el rol de administrador de plataforma. |

**Límites conocidos de la Fase 3**
- El anonimizador no detecta un nombre escrito en texto libre sin título ni dato asociado (hay una prueba que lo documenta). Se
  mejoraron DNI con espacios o guiones y direcciones sin «Av.» con punto.
- No hay evaluación con modelo real (`test/ai-evals/` corre en modo básico y, con `AI_EVAL_LIVE=1`, contra el proveedor).
- SPF/DKIM/DMARC y la entregabilidad real no se pudieron probar (sin dominio ni cuenta del proveedor).
- El gasto de IA es una estimación a partir de tokens; no lee la factura del proveedor.
- Exportación: solo JSON (sin PDF/ZIP por documento).
- Los avisos de plazos se calculan al correr la tarea, no al instante: un incidente creado con menos de 12 h de plazo recibe el aviso en la siguiente corrida (≤30 min).

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
