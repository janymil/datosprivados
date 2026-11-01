# Pase a producción (P6-CUTOVER)

Ejecutar en orden. Cada paso con ☐ se marca con fecha y quien lo hizo en el registro al final. Lo que depende de
dominio, DNS, Cloudflare o la empresa operadora es del propietario; el resto lo cubre el repositorio.

## 0. Prerrequisitos (bloquean el pase)

☐ Empresa operadora, dominio y abogado (`docs/DECISIONS.md`, P0-ENTITY/P0-LEGAL); textos legales sin el aviso de borrador.
☐ Correo: dominio verificado en Resend con SPF/DKIM/DMARC; un correo real llega a Gmail y Outlook.
☐ Servidor **dedicado** (no el del preview, que comparte `micita` y `deepseek-harness`): usuario sin privilegios para la app,
  PM2 con `--max-memory-restart 600M` y `pm2 install pm2-logrotate`, `ufw` solo 22 (llave) / 80 / 443, `unattended-upgrades`, `fail2ban`.
☐ nginx desde `deploy/nginx-production.conf` (`nginx -t`); origen aceptando 80/443 solo desde rangos de Cloudflare.
☐ Cloudflare: proxy, SSL «Full (strict)», WAF gestionado, Bot Fight Mode, caché para `/_next/static/*` y `/video/*`, **bypass** de `/app*`, `/api*`, `/solicitud*`, `/pago*`.
☐ Secretos en `/etc/datosprivados.env` (modo 600, dueño root); rotar todo token que haya pasado por chats o logs (incluye los de `docs/MERCADOPAGO-SANDBOX.md`).
☐ Monitor externo (UptimeRobot/Better Stack) sobre: `/`, `/api/health`, `/api/ready`, `/solicitud/<slug-publico>`; alerta por correo + SMS.
☐ Un segundo monitor con cabecera `Authorization: Bearer $CRON_SECRET` sobre `GET /api/cron/health` (alertas de negocio: webhooks, correos atascados, tareas atrasadas, respaldo > 26 h, disco > 80 %). Requiere `BACKUP_DIR`.
☐ Cron de respaldos cada hora (RUNBOOK) y copia cifrada fuera del servidor; cron que dispara cada tarea de `/api/cron/<tarea>`.
☐ Rastreo de errores: hoy `onRequestError` escribe `request_error` en JSON por la salida estándar; enviar esos logs fuera de la caja (journald → Better Stack/Loki) o añadir Sentry con `SENTRY_DSN` y depuración de PII.

## 1. Congelar y etiquetar

```bash
git switch master && git pull --ff-only
pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm audit --prod
git tag -a v1.0.0 -m "Primer lanzamiento" && git push origin v1.0.0     # CI debe estar en verde sobre el tag
```

## 2. DNS

☐ 24 h antes: TTL a 300 s. ☐ Registros de correo verificados (`dig TXT` de SPF, DKIM, DMARC).

## 3. Base nueva y arranque

☐ **Sin datos de demostración:** la base de producción nace vacía (`DATOSPRIVADOS_DB` absoluta, p. ej. `/var/lib/datosprivados/datosprivados.db`); verificar que `companies` no tiene filas demo.
☐ Variables de `.env.example` completas (`NEXT_PUBLIC_APP_URL` https, `DECOLECTA_API_TOKEN`, `MERCADOPAGO_*` de **producción**, `MAIL_*`, `CRON_SECRET` ≥ 16, `OPERATOR_EMAILS`, `TRANSFER_BANK_DETAILS`, clave de IA y `AI_MONTHLY_BUDGET_USD`, `BACKUP_DIR`).
☐ `pnpm build` y `pm2 start` con `next start -p 3000 -H 127.0.0.1`. El arranque falla solo si la configuración es insegura (`src/lib/env.ts`); leer las advertencias `[config]`.
☐ Crear la primera cuenta y poner su correo en `OPERATOR_EMAILS`.
☐ `curl -s https://EXAMPLE.PE/api/ready` → 200 y `ok:true`.

## 4. Pruebas de humo en la URL real

☐ Portada, `/terminos`, `/privacidad`, `/cookies`, `robots.txt`, `sitemap.xml`
☐ Registro con RUC real y pago **real de S/ 19** (luego reembolsar desde MercadoPago)
☐ Onboarding, publicar una política, enviar una solicitud ARCO pública, ver el correo de acuse en una bandeja real
☐ Recibo/comprobante emitido en `/operador`
☐ Cabeceras: `curl -sI` muestra `server: cloudflare`, HSTS, sin `X-Powered-By`

## 5. MercadoPago

☐ Cambiar la URL del webhook a `https://EXAMPLE.PE/api/mercadopago/webhook` y poner su secreto en el entorno.
☐ Confirmar que llega **un evento real**, se verifica la firma y queda en `webhook_events` con `outcome` 200.

## 6. Monitoreo

☐ Provocar una alerta de prueba (p. ej. detener la app 2 min o `BACKUP_DIR` vacío) y confirmar que llega el SMS/correo.
☐ Confirmar la restauración de un respaldo reciente en una ruta nueva (`scripts/restore-db.mjs`).

## 7. Anuncio

☐ Lanzamiento suave a una cohorte limitada (invitaciones). Mantener staging para ensayar hotfixes.

## 8. Plan de reversión

- **Antes del pase:** `node scripts/backup-db.mjs` y anotar el nombre del archivo; conservar la carpeta del release anterior (`.next.prev`) y las 3 últimas.
- **Revertir si:** el pago real falla dos veces seguidas por causa nuestra · `/api/health` en 503 más de 5 min · pérdida o fuga de datos entre empresas · el webhook no verifica firmas · errores 5xx > 5 % durante 10 min.
- **Cómo:** `scripts/deploy.sh` revierte solo si falla la prueba de humo; a mano: `mv .next .next.failed && mv .next.prev .next && pm2 restart datosprivados`. Si hubo cambios de datos incompatibles: restaurar el respaldo previo en ruta nueva, apuntar `DATOSPRIVADOS_DB` y reiniciar.
- **Ensayo:** hacerlo una vez en staging antes del pase (criterio 8 de «production-ready»).

## Registro de ejecución

| Paso | Fecha | Quién | Nota |
|---|---|---|---|
|  |  |  |  |
