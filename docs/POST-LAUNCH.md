# Operación posterior al lanzamiento (Fase 7)

Calendario de revisiones recurrentes. Lo automático ya corre por cron (ver RUNBOOK.md); esto es lo que **una persona** revisa y con qué comando.
Anotar cada revisión (fecha, quién, hallazgos) en un registro propio; el simulacro de restauración y la revisión legal anual son evidencia ante la ANPD.

## Semanal (lunes, 30 min)

```bash
pnpm ops:weekly           # sale con código 2 si hay algo que atender; --json para archivarlo
```

Cubre: pagos de la semana por estado, cuentas activas con `paid_until` vencido, pagos pendientes de más de 7 días, webhooks fallidos,
correos agotados (`dead`), tareas fallidas, gasto estimado de IA vs `AI_MONTHLY_BUDGET_USD`, ARCO vencidos e incidentes con plazo de 48 h vencido.

A mano (el informe no los ve):
- [ ] Rastreador de errores (`SENTRY_DSN`; si aún no está, `pm2 logs datosprivados | grep request_error`).
- [ ] Contrastar el reporte de cobros con el panel de MercadoPago (aprobados, devoluciones, contracargos).
- [ ] Gasto real en la factura/panel del proveedor de IA vs la estimación del informe.
- [ ] Bandeja de soporte y buzón ARCO de la propia plataforma; responder dentro de plazo.
- [ ] `GET /api/cron/health` en 200 y la alerta del monitor externo sigue activa.

## Mensual (primer lunes, 1 h)

1. **Simulacro de restauración** (prueba que el respaldo sirve, no solo que existe):
   ```bash
   BACKUP_DIR=/var/backups/datosprivados pnpm ops:restore-drill
   ```
   Restaura el respaldo más reciente en un directorio temporal, verifica sha256 e `integrity_check`, exige que haya usuarios, cuenta filas y borra la copia. Falla con código 1.
   Una vez al trimestre, además, restaurar en staging y recorrer login → panel → un documento.
2. **Dependencias y seguridad:** `pnpm audit:prod`, `pnpm outdated`. Parches de Next.js: leer `node_modules/next/dist/docs/01-getting-started/18-upgrading.md`
   antes de subir; probar en staging con `pnpm test && pnpm test:e2e`, desplegar con `scripts/deploy.sh` (conserva las últimas 3 versiones para revertir).
3. **IA:** si el modelo (`ANTHROPIC_MODEL`/`OPENAI_MODEL`) cambió o el proveedor lo actualizó, repetir las evaluaciones de la Fase 3 y comparar con la base anterior.
4. **Sistema:** actualizaciones del SO, vencimiento del certificado TLS, espacio en disco (alerta ya en 80 %).
5. **Embudo** (cuando exista analítica): alta → pago → onboarding → primera política publicada.

## Anual / legal

| Cuándo | Qué |
|---|---|
| Octubre | Cargar el decreto de feriados del año siguiente (`holidays-check` avisa; ver RUNBOOK §Feriados). Los plazos ARCO ya creados no se recalculan. |
| Enero | Revisar normativa peruana: directivas de la ANPD, modificaciones al DS 016-2024-JUS, normas sectoriales (`AUDITORIA_DOCUMENTOS_LEGALES.md` §7). |
| Tras cualquier cambio de plantilla | Subir `TEMPLATE_VERSIONS` en `src/lib/document-freshness.ts`: marca como desactualizados los documentos guardados de todos los clientes; `document-staleness-notice` les avisa semanalmente. Probar con `pnpm test`. |
| Anual | Revisión de abogado de los documentos propios de la plataforma (`src/lib/platform-legal.ts`) y de la lista de subencargados (hosting, MercadoPago, correo, LLM, error tracker, respaldos). |
| Anual | Renovar/actualizar la inscripción del banco de datos propio de la plataforma ante la ANPD (SIPDP). |
| Anual | Rotar secretos: `CRON_SECRET`, `MERCADOPAGO_WEBHOOK_SECRET`, claves de correo e IA; ensayar el rollback del despliegue. |

## Backlog posterior (orden de valor)

1. Multiusuario y roles.
2. Adjuntos de evidencia (antivirus, límite de tamaño/tipo, fuera del directorio web, cifrados).
3. Notificaciones por WhatsApp.
4. Prueba gratuita/vista previa limitada (`AUDITORIA_PORTADA.md` §9) cuando haya datos del embudo.
5. Migración a Postgres si el crecimiento o la disponibilidad lo exigen.
6. Consola de administración (clientes, ajustes de cobro, uso de IA).
7. Canal de socios (contadores y abogados).
8. Otros países/idiomas: **fuera de alcance** por ahora.

Cada punto del backlog necesita su propia especificación y ronda de pruebas; no se implementan como parte de esta fase.
