# Runbook de operación

## Origen (obligatorio para que los límites de intentos funcionen)

Los límites de intentos (`src/lib/rate-limit.ts`) usan la IP de `CF-Connecting-IP` (Cloudflare) y, si falta, `X-Real-IP`.
Esas cabeceras solo son confiables si **el servidor de origen acepta tráfico únicamente desde Cloudflare**. Hoy el origen
(`194.163.157.221`) es público: quien llame directo a la IP puede inventar `CF-Connecting-IP` y esquivar los límites.

Pendiente (nginx o firewall): permitir 80/443 solo desde los rangos de Cloudflare
(<https://www.cloudflare.com/ips/>) y restaurar la IP real con `set_real_ip_from` + `real_ip_header CF-Connecting-IP`.

## Respaldos

```bash
# Respaldo consistente, con la app en marcha (usa VACUUM INTO y verifica integrity_check)
DATOSPRIVADOS_DB=/ruta/absoluta/datosprivados.db node scripts/backup-db.mjs /var/backups/datosprivados

# Restaurar en una ruta NUEVA (nunca sobrescribe) verificando sha256 e integridad
node scripts/restore-db.mjs /var/backups/datosprivados/datosprivados-AAAAMMDD-HHMMSS.db.gz /ruta/nueva/datosprivados.db
```

Cron sugerido (cada hora; **aún no instalado**): `0 * * * * cd /var/www/datosprivados && DATOSPRIVADOS_DB=... node scripts/backup-db.mjs /var/backups/datosprivados >> /var/log/datosprivados-backup.log 2>&1`

Falta para cumplir el objetivo de la Fase 1: copia **fuera del servidor y cifrada** (age/gpg + S3/B2/R2) y una alerta si el
último respaldo tiene más de 26 h. Hoy los respaldos solo quedan en el mismo disco.

Simulacro hecho (2026-10-31): respaldo de la base del preview → restauración en ruta nueva → mismas filas en companies, users,
data_banks, arco_requests, incidents, documents, sessions. Un archivo alterado se rechaza por sha256.

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

### Instalación (2026-11-01, este servidor)

Tres piezas, todas fuera del repositorio:

- `/usr/local/bin/datosprivados-cron <tarea>|health [--at HH:MM] [--dow 1-7]` — lee `CRON_SECRET` de `/etc/datosprivados.env`
  (600) o del `.env` del repo, hace la petición con `curl` y registra los fallos en syslog (`logger -t datosprivados-cron`).
  El cron de este servidor no tiene MTA (`No MTA installed, discarding output`): la salida por stdout se pierde, por eso los
  errores van a syslog.
- `/usr/local/bin/datosprivados-backup` — respaldo horario con `scripts/backup-db.mjs` en `/var/backups/datosprivados`, que es
  el `BACKUP_DIR` que vigila `GET /api/cron/health`.
- `/etc/cron.d/datosprivados` — la tabla. **No lleva el secreto**, porque `/etc/cron.d` es legible por todos.

**Horas: el cron de Ubuntu (3.0pl1) no soporta `CRON_TZ`.** Interpreta el horario en la zona del sistema —aquí `Europe/Berlin`,
con horario de verano— y su manual recomienda comprobar la hora dentro del script. Por eso las tareas diarias y semanales se
disparan **cada hora** y el wrapper decide en hora de Lima con `--at` (y `--dow 1..7` para las semanales, 1 = lunes). Lo que va
por intervalo (cada minuto, cada 30 min, cada hora) no depende de la zona horaria.

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

- `GET /api/health` (público, sin secretos): 200 si la base lee y escribe; 503 si no. Para el monitor externo.
- `GET /api/ready` (público): además, en producción exige correo, MercadoPago y `CRON_SECRET`.
- `GET /api/cron/health` (Bearer `CRON_SECRET`): tareas atrasadas, correos atascados > 1 h, ≥ `ALERT_WEBHOOK_FAILURES` webhooks fallidos en 24 h,
  respaldo de más de 26 h en `BACKUP_DIR`, disco > 80 %. Devuelve `alerts: [{code, message}]` y 503 si hay alguna.
- Errores de servidor: `pm2 logs datosprivados | grep request_error` (JSON con `digest`, ruta y método; sin cuerpos ni correos).
- Pase a producción: `docs/CUTOVER.md`. Plantilla de nginx: `deploy/nginx-production.conf`.

- Revisiones recurrentes (semanal, mensual, anual): `docs/POST-LAUNCH.md`; `pnpm ops:weekly`, `pnpm ops:restore-drill`.
