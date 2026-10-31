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

Al arrancar en producción, `src/instrumentation.ts` valida la configuración y **no arranca** si `NEXT_PUBLIC_APP_URL` no es
https, si `COOKIE_SECURE=0`, si `PAYMENTS_DEV_BYPASS=1`, si `DATOSPRIVADOS_DB` no es ruta absoluta, o si hay token de
MercadoPago sin `MERCADOPAGO_WEBHOOK_SECRET`.

## Pruebas

```bash
pnpm typecheck
pnpm test          # Vitest; cada archivo usa su propia base SQLite en test/.tmp/
```

## Verificación del RUC (Decolecta)

- Variable: `DECOLECTA_API_TOKEN` (obligatoria en producción). Se genera en <https://decolecta.com/profile>.
- Endpoint usado: `GET https://api.decolecta.com/v1/sunat/ruc?numero=<RUC>` con `Authorization: Bearer <token>`; timeout de 8 s.
- Si los registros empiezan a fallar con «No pudimos verificar tu RUC»: mirar `pm2 logs datosprivados` y buscar `[ruc] Decolecta no disponible: HTTP 401`.
  Un 401 puede ser **token vencido o cuota agotada** (el servicio usa el mismo mensaje para ambos); revisar el panel de Decolecta.
- Cuota del plan: 1.000 consultas al mes. Al agotarse, Decolecta responde 401 y los registros nuevos quedan bloqueados hasta que se renueve o se amplíe el plan.
