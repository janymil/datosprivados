# Runbook de operación

## Origen (obligatorio para que los límites de intentos funcionen)

Los límites de intentos (`src/lib/rate-limit.ts`) se calculan sobre la IP de
`src/lib/client-ip.ts`, que cree primero a `X-Real-IP` (lo escribe nginx en cada
petición) y solo después a `CF-Connecting-IP`.

Para que `X-Real-IP` sea la IP del cliente y no la del borde de Cloudflare, nginx
necesita `set_real_ip_from` + `real_ip_header CF-Connecting-IP`. **Hecho**:

- preview `datosprivados.registio.app` (2026-11-02): aplicado en
  `/etc/nginx/sites-enabled/datosprivados.registio.app`; el `access_log` ya registra
  la IP real del cliente en lugar de la del borde. Copia previa del archivo en
  `/root/datosprivados-nginx-preview-*.bak`.
- producción: está en `deploy/nginx-production.conf` junto con el cierre del origen
  (`geo $realip_remote_addr` + `if ($from_cloudflare = 0) { return 403; }`).

Pendiente en producción: aplicar esa plantilla (bloquea IPs fuera de Cloudflare y de
`127.0.0.1`) y mantener actualizados los rangos con <https://www.cloudflare.com/ips/>.
Si se aplica el cierre del origen, comprobar antes que ningún monitor ni webhook entra
por la IP directa.

## Que un entorno de pruebas no entre en Google

Comprobado el 2026-11-03: el preview respondía `Allow: /` en `robots.txt`, **no** mandaba
`X-Robots-Tag` y su `sitemap.xml` anunciaba el dominio de preview — es decir, era
indexable. Un preview indexado sobrevive al lanzamiento: Google conserva la copia con los
textos legales en borrador y compite con el dominio real.

Dos formas de cerrarlo, y conviene usar las dos:

1. **Inmediato, solo para ese vhost** (no requiere recompilar): pegar
   `deploy/nginx-preview-noindex.conf` dentro del bloque `server { }` del preview
   (`add_header X-Robots-Tag "noindex, nofollow" always;`), `nginx -t` y recargar.
   Aplicado al preview el 2026-11-03; copia previa del vhost en
   `/root/datosprivados-vhost.bak-*`. Comprobación:
   `curl -sI https://<preview>/ | grep -i x-robots-tag`.
2. **En el build**: `NEXT_PUBLIC_NOINDEX=1 pnpm build` hace que `robots.txt` responda
   `Disallow: /` (sin sitemap) y que todas las páginas lleven `robots: noindex`. Sirve
   para cualquier entorno, pero exige recompilar, así que se aplica en el próximo
   despliegue del preview.

Producción **no** lleva ninguna de las dos: `deploy/nginx-production.conf` no tiene el
encabezado y una prueba (`test/seo-indexing.test.ts`) falla si alguien se lo copia.

## Estado verificado del preview (2026-11-03)

Comprobado en la máquina, no deducido de la documentación:

| Qué | Resultado |
|---|---|
| `datosprivados-cron health; echo $?` | **0** (`healthy: true`, ninguna tarea atrasada, `outboxStuck: 0`) — tras corregir las horas del cron (ver `DEFECTS.md`) |
| Respaldo más reciente | del mismo día, hace < 1 h (RPO cumplido); con `.sha256` al lado |
| Simulacro de restauración (`node scripts/restore-drill.mjs /var/backups/datosprivados`) | `ok: true`, respaldo restaurado y verificado en < 1 s, `companies/users/payments/arco_requests` presentes |
| Informe semanal (`node scripts/weekly-report.mjs`) | funciona con datos reales; señaló correctamente una solicitud **ARCO vencida** (`ARCO-2026-0011`, plazo 2026-10-12) y 2 webhooks fallidos **de las pruebas de sandbox del 2026-11-01** (IDs falsos `999999999`/`123456789` → 404 de MercadoPago; comportamiento correcto, caen fuera de la ventana de 7 días) |
| Feriados en la base | 2025–2032, 16 por año (el `holidays-check` ausente no había causado daño todavía) |
| PM2 | `datosprivados` online, 0 reinicios; disco al 32 % |
| Cabeceras públicas (`curl -I https://datosprivados.registio.app`) | 200, `nosniff`, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`, `Permissions-Policy`, **`X-Robots-Tag: noindex, nofollow`** (añadido el 2026-11-03); `server_tokens off` está en `/etc/nginx/nginx.conf` (global), no en el vhost; `/login` responde `private, no-cache, no-store`; `cf-cache-status: DYNAMIC` (Cloudflare no cachea HTML, así que un despliegue no sirve HTML viejo) |
| `logrotate` | instalado en `/etc/logrotate.d/datosprivados`, `--debug` sin errores |

**El build desplegado es anterior a HEAD.** Consecuencias, para que nadie las atribuya a un
fallo del código:

- no envía la cabecera CSP (existe desde `8513bb2`, después del build que corre);
- `/api/cron/ops-alert` y `/api/cron/demo-reset` devolverían **404**; por eso sus líneas quedan
  comentadas en `deploy/cron.d-datosprivados`;
- no están las correcciones de contraste, el gate de verificación de correo ni el resumen semanal.

Para cerrar la deriva: `bash scripts/deploy.sh --check` → `bash scripts/deploy.sh`, y después
descomentar las dos líneas (`ops-alert`, `demo-reset`) e instalar el archivo de cron. Es una acción
del propietario: el despliegue no se ha ejecutado nunca en este servidor.

## Caché de los vídeos en Cloudflare

Los vídeos de la portada pesan ~23 MB y **no cambian nunca**: `next.config.ts` ya los
sirve con `Cache-Control: public, max-age=31536000, immutable` y `Accept-Ranges: bytes`.
Falta que el borde de Cloudflare los cachee, porque si no cada visitante los pide al
origen (una sola instancia PM2).

Crear una **Cache Rule** (Caching → Cache Rules) con estos valores, en este orden:

| Campo | Valor |
|---|---|
| Si | `starts_with(http.request.uri.path, "/video/")` |
| Caché elegible | Sí |
| Edge TTL | *Ignore cache-control* → 1 año |
| Browser TTL | *Respect origin* (ya manda `immutable`) |
| Cache Key | por defecto (la URL) |

Después del cambio, comprobar con dos peticiones seguidas:

```bash
curl -sI https://<dominio>/video/<archivo>.mp4 | grep -i 'cf-cache-status\|cache-control'
# primera vez: cf-cache-status: MISS (o REVALIDATED)
# segunda vez: cf-cache-status: HIT
```

Los `.mp4` deben ser servidos con `Content-Type: video/mp4`; si el borde devuelve
`application/octet-stream` es que la regla está cacheando la ruta de la app en lugar del
archivo estático. Nota: los `.mp4` no se sirven con range requests desde Cloudflare
cuando están cacheados de borde a menos que el origen los soporte; aquí el origen los
soporta (`Accept-Ranges`), así que la reproducción con salto sigue funcionando.

## CSP: encender y apagar el bloqueo

La política vive en `next.config.ts` y sale de dos maneras:

- **Por defecto** (sin `CSP_ENFORCE`): `Content-Security-Policy-Report-Only`. No bloquea;
  las violaciones llegan a `POST /api/csp-report` y quedan en el log como `csp_violation`.
- **Con `CSP_ENFORCE=1`**: `Content-Security-Policy`. La misma política, pero bloquea.

**Importante:** `headers()` se evalúa al **compilar**, no al arrancar. Las cabeceras
quedan en `.next/routes-manifest.json`. Encender o apagar la bandera exige recompilar:

```bash
# encender (staging primero)
CSP_ENFORCE=1 pnpm build && pm2 reload datosprivados

# comprobar que la cabecera cambió
curl -sI https://<dominio>/ | grep -i 'content-security-policy'
#   con bloqueo:      Content-Security-Policy: default-src 'self'; ...
#   en observación:   Content-Security-Policy-Report-Only: default-src 'self'; ...

# apagar (revertir): volver a compilar sin la variable
pnpm build && pm2 reload datosprivados
```

Qué mirar después de encenderla: en la consola del navegador (`Refused to ...`) o en
`journalctl -u datosprivados | grep csp_violation`. Si aparece un bloqueo legítimo
—algo que la app necesita— lo correcto es ampliar la directiva concreta, no apagar la
CSP entera.

La suite E2E corre siempre con `CSP_ENFORCE=1` (`pnpm test:e2e` y el job de CI): si una
pantalla dependiera de un recurso que la política corta, el recorrido falla antes de
llegar a producción.

## Respaldos

```bash
# Respaldo consistente, con la app en marcha (usa VACUUM INTO y verifica integrity_check)
DATOSPRIVADOS_DB=/ruta/absoluta/datosprivados.db node scripts/backup-db.mjs /var/backups/datosprivados

# Restaurar en una ruta NUEVA (nunca sobrescribe) verificando sha256 e integridad
node scripts/restore-db.mjs /var/backups/datosprivados/datosprivados-AAAAMMDD-HHMMSS.db.gz /ruta/nueva/datosprivados.db
```

Cron instalado (2026-10-31, corregido el 2026-11-02): `/etc/cron.d/datosprivados` llama a
`/usr/local/bin/datosprivados-backup` cada hora. El envoltorio convierte la hora a Lima porque el cron de
Ubuntu no admite `CRON_TZ`, y guarda el archivo con marca de tiempo en `/var/backups/datosprivados`
(rotación por `BACKUP_RETENTION_DAYS`, 7 días por defecto). Comprobación: el archivo más nuevo debe tener
menos de una hora y `GET /api/cron/health` alerta si el último pasa de 26 h (`BACKUP_DIR`).

Equivalente manual (para una prueba o para otra máquina):

```bash
0 * * * * cd /var/www/datosprivados && DATOSPRIVADOS_DB=... node scripts/backup-db.mjs /var/backups/datosprivados >> /var/log/datosprivados-backup.log 2>&1
```

Falta para cumplir el objetivo de la Fase 1: copia **fuera del servidor y cifrada** (age/gpg + S3/B2/R2) y un
simulacro en una máquina nueva. Hoy los respaldos solo quedan en el mismo disco.

Simulacro hecho (2026-10-31): respaldo de la base del preview → restauración en ruta nueva → mismas filas en companies, users,
data_banks, arco_requests, incidents, documents, sessions. Un archivo alterado se rechaza por sha256.

### Cifrado en reposo (2026-11-02)

El respaldo contiene datos personales de clientes y de quienes ejercieron derechos
ARCO: una copia filtrada es una brecha notificable. Con `BACKUP_ENCRYPTION_KEY`
(32 bytes, `openssl rand -base64 32`) el archivo sale como `*.db.gz.enc`:

```bash
# Activar (una vez): añade la clave a /etc/datosprivados.env (permisos 600) o al .env
printf 'BACKUP_ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32)" >> /etc/datosprivados.env

# Restaurar un respaldo cifrado: el sha256 se verifica antes de descifrar
BACKUP_ENCRYPTION_KEY=... node scripts/restore-db.mjs /var/backups/datosprivados/xxx.db.gz.enc /ruta/nueva.db
```

- Formato: `PDPENC01` + IV (12 B) + etiqueta GCM (16 B) + ciphertext del `.gz`. GCM
  autentica: si alguien toca un byte, el descifrado falla en vez de devolver una base
  corrupta. Pruebas: `test/backup-crypto.test.ts`.
- **Custodia de la clave:** fuera del servidor de respaldos y de esta caja (gestor de
  contraseñas del propietario). Si se pierde, las copias cifradas no se abren. No se
  activó por defecto para no dejar respaldos irrecuperables antes de que exista esa copia.
- **Retención y datos personales:** `BACKUP_RETENTION_DAYS=7` es también el plazo máximo
  en que sobreviven los datos de una cuenta eliminada. Hoy no se reconstruyen los
  respaldos al borrar una cuenta: eso queda declarado en la política de retención
  (P0-SUPPORT) y en la respuesta a la solicitud de cancelación.
- **Secretos aparte:** el respaldo es solo la base; nunca incluye `.env`. Los secretos
  viven en `/etc/datosprivados.env` (600) y su copia de seguridad va al gestor de
  contraseñas, no a `/var/backups`. Si se rota uno, se rota allí y se reinicia PM2.

## Tareas programadas

El cron del sistema dispara `POST /api/cron/<tarea>` con el bearer de `CRON_SECRET`
(envoltorio `/usr/local/bin/datosprivados-cron`; tabla `/etc/cron.d/datosprivados`).
Cada ejecución queda en `job_runs` (con `id`, detalle, error y duración) y se registra
en una línea JSON (`job_ok` / `job_failed`) con ese mismo `id`.

### Auto-monitorización (`ops-alert`)

No hay monitor externo todavía, y el host del cron no tiene MTA (su salida solo va a
syslog). Para no depender de que alguien mire: la tarea `ops-alert` revisa lo mismo que
`GET /api/cron/health` —tareas atrasadas, correos atascados, webhooks fallidos, respaldo
viejo, disco lleno— y manda **un correo por hora** a `ALERT_EMAIL` con todas las alertas
juntas. Además, cualquier tarea que lance una excepción encola un aviso inmediato
(`ops_alert`, uno por tarea y hora) sin esperar a la siguiente pasada.

- **Activación en el servidor** (una vez, después de desplegar una versión que incluya la
  tarea): en `/etc/cron.d/datosprivados`, quitar el `#` de la línea
  `# */15 * * * *  root /usr/local/bin/datosprivados-cron ops-alert`.
  Se deja comentada a propósito: un build anterior responde 404 a una tarea que no conoce.
- Requiere `ALERT_EMAIL` en `/etc/datosprivados.env`. Sin destinatario, la tarea deja el
  aviso en el registro estructurado y responde `falta: "ALERT_EMAIL"`.
- Comprobación manual: `datosprivados-cron ops-alert` (y `datosprivados-cron health`).

### La cuenta de demostración

`/demo` entra sin contraseña a la empresa `casa-verde`, que es de **solo lectura** y
comparte la base con los clientes reales. No escribe, no publica, no contrata, no usa IA
y su formulario ARCO público no guarda solicitudes. Para que siga así aunque un fallo
deje residuos, la tarea **`demo-reset`** (domingos 03:30 Lima) reafirma el estado
(`billing_status=demo`, sin consentimiento de IA, `mail_optout=1`), borra correos y uso
de IA a su nombre y vuelve a sembrar sus documentos de ejemplo. Si apareciera un **pago**
de la demo, no lo borra: lo informa en el detalle de la ejecución para que lo revise una
persona (borrarlo rompería la contabilidad).

### Registros y rotación

Los eventos van a stdout como una línea JSON (`src/lib/log.ts`), sin cuerpos de petición
ni datos personales (los correos se sustituyen por `[correo]`). PM2 los escribe en
`/root/.pm2/logs/`; copia `deploy/logrotate-datosprivados.conf` a `/etc/logrotate.d/`
para rotarlos (semanal, 8 copias, comprimido).

### Base local: reiniciar (solo desarrollo)

```bash
node scripts/reset-db.mjs --dry-run   # dice qué borraría
node scripts/reset-db.mjs --yes       # borra; el próximo arranque vuelve a sembrar la demo
```

Desde 2026-11-03 el script **no borra sin `--yes`**, se niega con `NODE_ENV=production`
(aunque lleves `--yes`: en producción se restaura un respaldo), respeta
`DATOSPRIVADOS_DB` en lugar de borrar `./data/...` por costumbre, y no toca nada fuera
del directorio del proyecto salvo con `--force`. Antes borraba el archivo por defecto
sin preguntar: en un servidor con la base en la ruta por defecto, un comando borraba
producción. Cubierto por `test/ops-scripts.test.ts`.

### Despliegue: comprobar antes de desplegar

`scripts/deploy.sh` instala, respalda, compila en una copia, intercambia `.next`, reinicia
PM2 y hace prueba de humo con reversión automática. Como nunca se ha ejecutado en un
servidor real, antes de cada despliegue conviene pasar el modo de comprobación:

```bash
bash scripts/deploy.sh --check   # no cambia nada; sale 0 si todo está en su sitio
```

Comprueba que estén `node`, `pnpm`, `rsync`, `curl` y `pm2`, que exista el
`package.json` en el directorio esperado, que el directorio de respaldos sea escribible,
que haya al menos 2 GB libres y que la app `$PM2_APP` exista en PM2. Sale 1 enumerando
lo que falta, y un despliegue real **se detiene antes de tocar nada** si esa lista no
está completa. Cubierto por `test/deploy-script.test.ts`.

### Rendimiento bajo carga (antes de cada release)

`pnpm ops:loadtest` (`scripts/loadtest.mjs`, sin dependencias) habla con un servidor ya
levantado. Receta contra staging o un `next start` local con datos de ejemplo:

```bash
node scripts/perf-seed.mjs                      # base de pruebas con volumen realista
pnpm build && pnpm start &                      # o el proceso de staging
pnpm ops:loadtest http://127.0.0.1:3000/app -c 50 -d 20 -H "Cookie: pdp_session=<id>"
```

Los números de referencia están en `docs/GO-NO-GO.md` sección «Rendimiento» (p95 y
capacidad). Se corre antes de cada release y en staging, no en CI: necesita un servidor
vivo y una base sembrada, y los tiempos de un runner compartido no son comparables.

## Calendario de plazos (feriados)

Los plazos legales (ARCO: 10 y 20 días hábiles) se cuentan con `businessDaysBetween`, que
descuenta fines de semana y las fechas de la tabla `holidays` (sembrada 2025–2032 con los
feriados nacionales calculados).

- **Se edita en la app**: `/operador/feriados` (solo `OPERATOR_EMAILS`). Añade los días no
  laborables que declare un decreto supremo y corrige lo que cambie; cada fila muestra si es
  `calculado` o `decreto`.
- El cambio afecta a los plazos **que se calculen desde ese momento**. Una solicitud ARCO ya
  recibida conserva la fecha límite con la que entró: no se recalcula hacia atrás.
- Si un año nuevo no aparece, basta con abrir la base una vez (`migrate()` siembra los años que
  falten) o cargar las fechas a mano desde la pantalla.
- Los feriados regionales y los días no laborables locales **no** se descuentan solos; la app
  avisa de eso junto a cada plazo.

## Despliegue

El preview corre con PM2 (`datosprivados`) sobre `next start -p 3000 -H 127.0.0.1`. `next build` escribe en `.next/`, que es
lo que sirve el proceso en marcha: **construir en el mismo directorio mientras corre puede romper el preview**. Construye en una
copia o detén el proceso antes. Tras un build nuevo: `pm2 restart datosprivados`.

Despliegue recomendado: `scripts/deploy.sh`. Hace typecheck y pruebas, respaldo de la base, compila en `.deploy/build`
(el proceso en marcha sigue sirviendo), intercambia `.next`, reinicia con PM2 y prueba `/` y `/demo`. Si la prueba de humo
falla, vuelve sola a la compilación anterior (`.next.prev`). En fork mode el reinicio corta el servicio unos segundos.

Al arrancar en producción, `src/instrumentation.ts` valida la configuración y **no arranca** si `NEXT_PUBLIC_APP_URL` no es
https, si `COOKIE_SECURE=0`, si `PAYMENTS_DEV_BYPASS=1`, si `DATOSPRIVADOS_DB` no es ruta absoluta, o si hay token de
MercadoPago sin `MERCADOPAGO_WEBHOOK_SECRET`.

## Pruebas

```bash
pnpm typecheck
pnpm test          # Vitest; cada archivo usa su propia base SQLite en test/.tmp/
```

**Pago de punta a punta en sandbox:** `docs/MERCADOPAGO-SANDBOX.md` — cuentas de prueba (vendedor y comprador), app de
sandbox con sus tokens, tarjetas de prueba y el procedimiento que ya funcionó (pago de S/ 19 aprobado el 2026-11-01).

## Verificación del RUC (Decolecta)

- Variable: `DECOLECTA_API_TOKEN` (obligatoria en producción). Se genera en <https://decolecta.com/profile>.
- Endpoint usado: `GET https://api.decolecta.com/v1/sunat/ruc?numero=<RUC>` con `Authorization: Bearer <token>`; timeout de 8 s.
- Si los registros empiezan a fallar con «No pudimos verificar tu RUC»: mirar `pm2 logs datosprivados` y buscar `[ruc] Decolecta no disponible: HTTP 401`.
  Un 401 puede ser **token vencido o cuota agotada** (el servicio usa el mismo mensaje para ambos); revisar el panel de Decolecta.
- Cuota del plan: 1.000 consultas al mes. Al agotarse, Decolecta responde 401 y los registros nuevos quedan bloqueados hasta que se renueve o se amplíe el plan.

## Tareas programadas (cron)

La app no tiene planificador propio: un cron del sistema llama a `POST /api/cron/<tarea>` con `Authorization: Bearer $CRON_SECRET`.
Cada tarea es idempotente y lleva candado (`job_runs`): dispararla dos veces no duplica correos. Un candado de más de 15 min se
considera de un proceso muerto.

| Tarea | Frecuencia sugerida | Qué hace |
|---|---|---|
| `send-outbox` | cada minuto | Entrega `email_outbox` (reintentos con espera creciente, 6 intentos). |
| `incident-deadline-reminders` | cada 30 min | Incidentes con criterios del art. 34.1 sin notificar: aviso a 12 h y a 2 h del plazo de 48 h. |
| `arco-deadline-reminders` | diario 08:00 Lima | Solicitudes ARCO a ≤3 días hábiles del plazo y vencidas. |
| `billing-reconcile` | diario 06:00 Lima | Marca vencidas las cuentas con `paid_until` pasado; avisos de renovación / vencimiento (3 días). |
| `lapsed-account-notices` | diario | Avisos de borrado de cuentas vencidas (30 y 60 días, y 7 días antes). |
| `purge-old-data` | diario 03:00 Lima | Borra cuentas vencidas ≥ `LAPSED_RETENTION_DAYS` **que recibieron el último aviso**, altas sin pago de >30 días, correos enviados >90 días, `job_runs` >180 días, `ai_usage` >400 días. |
| `document-staleness-notice` | semanal | Un aviso por empresa con documentos desactualizados (opcional para la empresa). |
| `expire-sessions` | diario | Sesiones, tokens y límites de intentos vencidos. |
| `holidays-check` | semanal | Asegura feriados de este año y el siguiente; informa los años aún sin decreto confirmado. |
| `weekly-digest` | semanal (opcional) | Resumen por empresa con lo que quedó pendiente (ARCO sin responder, incidentes abiertos, documentos desactualizados, bancos sin inscribir). **Apagado por defecto**: solo hace algo con `WEEKLY_DIGEST=1`, y mientras esté apagado no se le exige a `/api/health`. Una cuenta al día no recibe correo. |

### Instalación (este servidor; versionado en `deploy/` desde 2026-11-03)

Las piezas de fuera del repositorio, ahora **también en el repo** (antes solo existían en
esta máquina: si se perdía, había que reescribirlas de memoria):

- `deploy/datosprivados-cron.sh` → `/usr/local/bin/datosprivados-cron` (755). Lee `CRON_SECRET` de
  `/etc/datosprivados.env` (600) o del `.env` del repo, hace la petición con `curl` y registra los
  fallos en syslog **y** en stderr.
- `deploy/cron.d-datosprivados` → `/etc/cron.d/datosprivados` (644). **No lleva el secreto**, porque
  `/etc/cron.d` es legible por todos.
- `/usr/local/bin/datosprivados-backup` — respaldo horario con `scripts/backup-db.mjs` en
  `/var/backups/datosprivados`, que es el `BACKUP_DIR` que vigila `GET /api/cron/health`.

```bash
install -m 755 deploy/datosprivados-cron.sh /usr/local/bin/datosprivados-cron
install -m 644 deploy/cron.d-datosprivados  /etc/cron.d/datosprivados
install -m 644 deploy/logrotate-datosprivados.conf /etc/logrotate.d/datosprivados
logrotate --debug /etc/logrotate.d/datosprivados   # sin líneas «error:»
datosprivados-cron health; echo $?     # 0 = HTTP 200 y todas las tareas a tiempo
```

`test/deploy-artifacts.test.ts` compara estas copias con las instaladas cuando existen (en CI se
salta), así que una edición a mano en el servidor se detecta como deriva.

**Horas: el cron de Ubuntu (3.0pl1) no soporta `CRON_TZ`.** Interpreta el horario en la zona del
sistema —aquí `Europe/Berlin`, con horario de verano— y su manual recomienda comprobar la hora
dentro del script. Por eso las tareas diarias y semanales se disparan **cada hora** y el wrapper
decide en hora de Lima con `--at` (y `--dow 1..7` para las semanales, 1 = lunes). Lo que va por
intervalo (cada minuto, cada 30 min, cada hora) no depende de la zona horaria.

> **`--at` solo admite `HH:00`.** El cron dispara en el minuto 0, así que `--at 06:15` no se cumple
> nunca: el 2026-11-03 se descubrió que cuatro tareas (`billing-sync` 06:15, `lapsed-account-notices`
> 06:30, `holidays-check` 05:30, `demo-reset` 03:30) **no se habían ejecutado jamás** y el health
> llevaba días en rojo. Ahora el wrapper rechaza esas horas con exit 4 y un test falla si alguien
> vuelve a escribirlas.

Agregar una tarea nueva: (1) la tarea en `src/lib/jobs.ts`, (2) su edad máxima en
`JOB_MAX_AGE_HOURS`, (3) la línea en `deploy/cron.d-datosprivados` con `--at HH:00`, (4) instalar el
archivo. El test de `deploy/` falla si el nombre no existe en el código o si una tarea obligatoria
se queda sin línea.

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# por intervalo
* * * * *       root /usr/local/bin/datosprivados-cron send-outbox
*/30 * * * *    root /usr/local/bin/datosprivados-cron incident-deadline-reminders
0 * * * *       root /usr/local/bin/datosprivados-backup

# diarias (hora de Lima; el wrapper filtra)
0 * * * *       root /usr/local/bin/datosprivados-cron purge-old-data            --at 03:00
0 * * * *       root /usr/local/bin/datosprivados-cron expire-sessions           --at 04:00
0 * * * *       root /usr/local/bin/datosprivados-cron billing-reconcile         --at 06:00
0 * * * *       root /usr/local/bin/datosprivados-cron billing-sync              --at 06:15
0 * * * *       root /usr/local/bin/datosprivados-cron lapsed-account-notices    --at 06:30
0 * * * *       root /usr/local/bin/datosprivados-cron arco-deadline-reminders   --at 08:00

# semanales (lunes, hora de Lima)
0 * * * *       root /usr/local/bin/datosprivados-cron document-staleness-notice --at 05:00 --dow 1
0 * * * *       root /usr/local/bin/datosprivados-cron holidays-check            --at 05:30 --dow 1

# resumen semanal: solo si WEEKLY_DIGEST=1 en el entorno del servicio. La línea de
# cron puede estar puesta con la bandera apagada (la tarea no hace nada y no falla).
0 * * * *       root /usr/local/bin/datosprivados-cron weekly-digest             --at 06:00 --dow 1
```

Dos trampas al escribir la tabla: los `%` deben escaparse (`\%`) o el cron los convierte en saltos de línea, y `$CRON_SECRET`
**no** se expande —el cron no hereda el entorno del shell—, así que un `curl -H "Authorization: Bearer $CRON_SECRET"` en la tabla
enviaría un bearer vacío y recibiría 401. De ahí el wrapper.

Comprobación: `datosprivados-cron health; echo $?` (0 = HTTP 200) y `grep datosprivados /var/log/syslog`.

**Alerta de tareas atrasadas:** `GET /api/cron/health` (mismo bearer) devuelve 200 si cada tarea tuvo una ejecución correcta dentro de su
plazo y no hay correos con más de 1 h sin salir; si no, 503 con el detalle. Apuntar un monitor externo (UptimeRobot, Better Stack) y
verificar la alerta apagando el cron una vez. **Estado:** cron instalado y verificado el 2026-11-01 (`healthy: true`, 200, respaldo
horario incluido); **pendiente:** el monitor externo y la prueba de la alerta en un monitor real.

## Correo

Proveedor elegido provisionalmente: **Resend** (ver DECISIONS.md). Variables: `MAIL_PROVIDER=resend`, `MAIL_API_KEY`, `MAIL_FROM`,
`MAIL_WEBHOOK_SECRET`. En Resend, apuntar el webhook a `https://<host>/api/mail/webhook` con los eventos `email.bounced` y
`email.complained`; las direcciones que reboten o se quejen quedan en `email_suppressions` y no reciben más correo.

**Pendiente (requiere acceso al DNS de `datosprivados.pe`, que aún no existe):** SPF, DKIM y DMARC, y la prueba de entregabilidad
(mail-tester ≥ 9/10) con un correo real de cada plantilla. Hasta entonces los correos no son entregables de forma fiable.

Diagnóstico: `SELECT status, COUNT(*) FROM email_outbox GROUP BY status;` — `dead` = agotó los reintentos (ver columna `error`);
`pending` con `attempts > 0` = proveedor caído, reintentando.

## IA

`AI_DISABLED=1` apaga la IA al instante (todas las funciones caen al modo básico). `AI_MONTHLY_BUDGET_USD` la apaga sola al
llegar al gasto estimado del mes (tokens registrados en `ai_usage` × precio por millón configurable) y manda un correo a
`ALERT_EMAIL`. El gasto real hay que contrastarlo con la factura del proveedor: es una estimación.

```sql
-- Consumo del mes por empresa y función
SELECT company_id, feature, COUNT(*) calls, SUM(input_tokens) in_tok, SUM(output_tokens) out_tok
FROM ai_usage WHERE created_at >= strftime('%Y-%m-01', 'now') GROUP BY 1, 2 ORDER BY out_tok DESC;
```

El circuito se abre tras 5 fallos seguidos del proveedor y se prueba de nuevo a los 60 s (estado en memoria del proceso).

## Cuentas: vencimiento y borrado

- Cuenta vencida: no entra al panel (va a `/pago`), pero `/cuenta` sigue disponible para **descargar todos los datos** y **eliminar la cuenta**.
- La Política de Privacidad publicada y el formulario ARCO público **siguen funcionando** mientras exista la cuenta, para no apagar
  un canal que la empresa declaró ante sus clientes. Las solicitudes que lleguen quedan guardadas y el titular de la cuenta recibe el aviso.
- A los 30 y 60 días del vencimiento, y 7 días antes del borrado, se envía un aviso. A los `LAPSED_RETENTION_DAYS` (90) se borra, **solo
  si el último aviso se envió**.
- El borrado deja una fila mínima de la empresa (razón social reemplazada, sin contacto ni dirección pública) y sus pagos, sin la
  respuesta cruda del proveedor, por la obligación tributaria de conservar comprobantes. Todo lo demás se elimina.

## Feriados

Los feriados viven en la tabla `holidays` (sembrada 2025–2032 por regla: fijos + Semana Santa). Un decreto que declare un día no
laborable se carga desde una consola de Node o SQL:

```sql
INSERT INTO holidays (date, name, source) VALUES ('2026-11-23', 'Feriado por decreto', 'decreto')
  ON CONFLICT(date) DO UPDATE SET name = excluded.name, source = excluded.source;
```

Los plazos ARCO ya calculados **no se recalculan** al cargar un feriado; solo cambia lo que se cree después. `holidays-check` informa
los años cuyos feriados siguen siendo `calculado` (sin decreto confirmado): en octubre, cargar el decreto del año siguiente.

## Salud y alertas (Fase 6)

**Qué vigilar y qué no.** Hay dos endpoints y se parecen lo suficiente como para
confundirlos:

| Endpoint | Para qué | Qué devuelve |
|---|---|---|
| `GET /api/health` | **el monitor externo (uptime)** | 200 si la base lee y escribe, 503 si no. Solo `ok`, `checks.db` y `uptime_s`. Ni secretos ni datos, y **tampoco** qué integraciones están configuradas (antes lo publicaba: le decía a cualquiera que el correo estaba apagado) |
| `GET /api/ready` | **puerta de pre-lanzamiento** | además, en producción exige correo, MercadoPago y `CRON_SECRET`. Devuelve `checks.config` como un booleano agregado, sin decir cuál falta |
| `GET /api/cron/health` (Bearer `CRON_SECRET`) | **el detalle para el operador** | tareas atrasadas, correos atascados > 1 h, ≥ `ALERT_WEBHOOK_FAILURES` webhooks fallidos en 24 h, respaldo de más de 26 h en `BACKUP_DIR`, disco > 80 %; `alerts: [{code, message}]` y 503 si hay alguna |

> **No apuntes el monitor a `/api/ready`.** Como exige el correo configurado, hoy
> responde **503** en el preview (comprobado el 2026-11-03) y seguirá en 503 en producción
> hasta que Resend esté configurado: un monitor ahí pitaría sin parar y taparía las caídas
> de verdad. `/api/ready` es una lista de comprobación antes de abrir al público, no un
> latido.

- Errores de servidor: `pm2 logs datosprivados | grep request_error` (JSON con `digest`, ruta y método; sin cuerpos ni correos).
- Pase a producción: `docs/CUTOVER.md`. Plantilla de nginx: `deploy/nginx-production.conf`.

- Revisiones recurrentes (semanal, mensual, anual): `docs/POST-LAUNCH.md`; `pnpm ops:weekly`, `pnpm ops:restore-drill`.
