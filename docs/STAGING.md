# Staging

Réplica de producción para probar antes de cada despliegue (Fase 5 de `PRODUCTION_ROADMAP.md`). Misma compilación, mismo
proceso, **otra** base, **otro** dominio, credenciales de prueba.

## Qué debe ser distinto de producción

| Elemento | Staging |
|---|---|
| Dominio | `staging.<dominio>` (registro A/CNAME propio; detrás de Cloudflare con acceso restringido o Basic Auth en nginx) |
| Base | `/var/lib/datosprivados-staging/datosprivados.db` (nunca la de producción) |
| MercadoPago | Credenciales **TEST-** de la app de pruebas; webhook `https://staging.<dominio>/api/mercadopago/webhook` con su propio `MERCADOPAGO_WEBHOOK_SECRET`. Ver `docs/MERCADOPAGO-SANDBOX.md` |
| IA | Clave con presupuesto bajo y `AI_MONTHLY_BUDGET_USD` pequeño |
| Correo | `MAIL_PROVIDER` con dominio de prueba o bandeja que capture todo; nunca correos a clientes reales |
| RUC | `DECOLECTA_API_TOKEN` propio o el mismo de producción (consume cuota) |
| `CRON_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET` | Valores distintos a los de producción |
| `OPERATOR_EMAILS` | Correos del equipo para probar `/operador` |

`NEXT_PUBLIC_APP_URL` debe ser https (la app no arranca en producción si no lo es).

## Montaje

```bash
# 1. Código en un directorio propio
git clone <repo> /var/www/datosprivados-staging && cd /var/www/datosprivados-staging
pnpm install --frozen-lockfile
cp /ruta/segura/.env.staging .env       # nunca desde el repo
mkdir -p /var/lib/datosprivados-staging

# 2. Compilar y arrancar
pnpm build
pm2 start ecosystem.staging.config.cjs && pm2 save

# 3. nginx (plantilla abajo) + certificado
certbot --nginx -d staging.<dominio>
```

### Plantilla nginx

```nginx
server {
  server_name staging.<dominio>;
  client_max_body_size 25m;
  server_tokens off;
  auth_basic "staging";
  auth_basic_user_file /etc/nginx/staging.htpasswd;   # el webhook de MP no pasa por aquí: ver nota
  location /api/mercadopago/webhook { auth_basic off; proxy_pass http://127.0.0.1:3200; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
  location /api/cron/ { auth_basic off; proxy_pass http://127.0.0.1:3200; proxy_set_header Host $host; }
  location / { proxy_pass http://127.0.0.1:3200; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Real-IP $remote_addr; }
}
```

Nota: MercadoPago y el cron no pueden enviar Basic Auth, por eso esas dos rutas la desactivan; ya se protegen con firma y
bearer. Si hay Cloudflare delante, restringir el origen a sus IP (ver RUNBOOK, «Origen»).

### Cron en staging

Mismo cron que producción (ver RUNBOOK) apuntando a `https://staging.<dominio>/api/cron/<tarea>` con el `CRON_SECRET` de staging.

## Despliegue y reversión

`scripts/deploy.sh` con `PM2_APP=datosprivados-staging PORT=3200` (compila en copia, intercambia `.next`, prueba de humo,
reversión automática). Para staging con otra ruta, ejecutarlo desde el directorio de staging.

## Pruebas que se corren aquí antes de producción

1. `pnpm exec playwright test` contra la compilación de staging (recorrido completo, con MP simulado).
2. Ciclo de suscripción real en sandbox (`docs/MERCADOPAGO-SANDBOX.md`): crear, autorizar, cobrar, renovar, rechazar, pausar, cancelar.
3. Recordatorios de plazos adelantando el reloj (`test/jobs.test.ts` los cubre; en staging, ajustar fechas por SQL y correr `/api/cron/arco-deadline-reminders`).
4. `scripts/perf-check.sh` y la lista de seguridad de `docs/GO-NO-GO.md`.
