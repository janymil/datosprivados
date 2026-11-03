# Defectos abiertos (lista viva)

`docs/GO-NO-GO.md` fila 3 exige «cero S1/S2 abiertos». Esa afirmación solo se puede
verificar si hay una lista que mantener, y hasta ahora no existía: esto es la lista.

**Cómo se usa.** Cada defecto entra con fecha, severidad, dónde se vio y cómo se
reproduce. Se cierra con la prueba que lo cubre o con el commit que lo arregla. Nada se
borra: se marca como cerrado con su referencia. Antes de cada release se revisa que no
haya S1/S2 abiertos.

**Severidades**

| Sev | Qué significa | Plazo de arreglo |
|---|---|---|
| **S1** | Pérdida o exposición de datos personales, cobro incorrecto, sitio caído, plazo legal incumplido de forma sistémica | se detiene todo hasta arreglarlo |
| **S2** | Función principal rota o insegura sin pérdida de datos (p. ej. no se puede publicar, un aviso no llega) | antes del siguiente release |
| **S3** | Molestia con solución alternativa (texto confuso, formato, lentitud puntual) | siguiente ventana de trabajo |
| **S4** | Cosmético o idea de mejora | cuando se pueda |

## Abiertos

| # | Sev | Qué | Dónde | Reproducir | Notas |
|---|---|---|---|---|---|
| — | — | **Sin defectos abiertos** al 2026-11-03 | — | — | Los dos últimos (D-1 cobertura de cobro, D-2 panel sin axe) se cerraron ese día; ver el registro de abajo. |

## Conocidos por diseño (no son defectos, pero condicionan el lanzamiento)

| Tema | Estado | Referencia |
|---|---|---|
| Entrega de correo sin dominio/SPF/DKIM/DMARC | bloquea P0-DOMAIN (área 6) | `docs/READINESS-BY-AREA.md` §6 |
| Facturación SUNAT manual (sin PSE/OSE) | decisión pendiente P0-SUNAT (área 5) | `docs/DECISIONS.md` |
| Textos legales en borrador, con `noindex` | falta abogado y entidad (P0-LEGAL, P0-ENTITY) | áreas 7, 12, 14 |
| CSP en modo observación (no bloquea) | decisión del propietario (área 15) | `docs/DECISIONS.md` |
| Respaldos solo en el mismo servidor | falta copia fuera (área 17) | `docs/RUNBOOK.md` |
| Verificación de RUC acredita existencia, no titularidad | limitación conocida | `docs/DECISIONS.md` |

## Cerrados

| Fecha | Sev | Qué | Arreglo |
|---|---|---|---|
| 2026-11-03 | S1 | **Cuatro tareas programadas no se ejecutaron nunca**: el cron dispara cada hora en punto (`0 * * * *`) y el wrapper comparaba `date +%H:%M` contra `--at` exacto, así que `06:15`, `06:30`, `05:30` y `03:30` no se cumplían jamás. Afectaba a `billing-sync` (cobros cuyo webhook se perdió y nunca se conciliaron), `lapsed-account-notices` (los avisos de borrado a 30/60/7 días, que son un plazo legal), `holidays-check` (feriados del año siguiente → plazos ARCO mal calculados) y `demo-reset`. El health del preview llevaba días en `healthy: false` con dos de ellas marcadas `overdue`; nadie lo miraba porque el propio `ops-alert` seguía comentado en el cron | Horas corregidas a `HH:00` y repartidas (§`deploy/cron.d-datosprivados`), el wrapper **rechaza con exit 4** cualquier `--at` inalcanzable en lugar de saltarse la tarea en silencio, los errores van a syslog **y** a stderr, y todo quedó versionado en `deploy/`. `test/deploy-artifacts.test.ts` (8 tests) falla si una hora no es alcanzable, si una tarea del cron no existe en `JOB_NAMES`, si una tarea obligatoria no está programada, si dos diarias comparten hora, o si lo instalado en el servidor difiere del repo. Verificado en la caja: `billing-sync` y `lapsed-account-notices` ejecutados a mano → **`healthy: true`**, sin tareas atrasadas |
| 2026-11-03 | S2 | `scripts/reset-db.mjs` borraba `data/datosprivados.db` **sin pedir confirmación, ignorando `DATOSPRIVADOS_DB` y sin mirar `NODE_ENV`**: en un servidor con la base en la ruta por defecto (`/var/www/datosprivados/data/...`, que es el valor por defecto de la app) un solo comando borraba producción, y si la base estaba en otra ruta el script decía «no hay nada» dejando creer que había reiniciado | Ahora exige `--yes`, se niega con `NODE_ENV=production` aunque lo lleve, respeta `DATOSPRIVADOS_DB`, no borra fuera del proyecto sin `--force`, tiene `--dry-run` y argumentos desconocidos son exit 2. `test/ops-scripts.test.ts` fija cada freno |
| 2026-11-03 | S3 | Bordes de campos a 2,0:1: `.input` y `.btn-ghost` se identifican solo por `--line-strong` (#b8aa90), y WCAG 1.4.11 pide 3:1 | `--line-strong: #97855f` (3,2:1 sobre papel y 3,5:1 sobre el relleno del campo); lo detectó `test/color-contrast.test.ts` |
| 2026-11-03 | S3 | Distintivos de aviso en ocre a 3,2:1 (`text-ochre` sobre `bg-ochre/10`) en 8 componentes | token `--ochre-dark: #7d5713` (5,8:1) y `text-ochre` → `text-ochre-dark`; el ocre de marca queda para rellenos y bordes |
| 2026-11-03 | S3 | Etiquetas de grupo del menú lateral a 3,7:1 (`text-ink-soft/70`, 11 px) | `text-ink-soft` sólido (7,2:1); también en el estado inactivo de criterios de incidente y en el placeholder del buscador de ayuda |
| 2026-11-03 | S3 | `mercadopago.ts` era el archivo con menos cobertura (56 % sentencias, 38 % funciones): los modos de fallo del cobro no se probaban | `test/mercadopago.test.ts` contra un servidor HTTP real: 4xx/5xx con detalle recortado, token ausente, respuesta sin URL de pago, cancelación con `cancelled`→`canceled`, id codificado y red caída. Ahora 96 % sentencias / 100 % funciones y líneas |
| 2026-11-03 | S3 | El panel no estaba cubierto por axe (D-2) | `e2e/axe.spec.ts` entra con la cuenta demo y audita 11 pantallas del panel: al hacerlo encontró los tres fallos de contraste de arriba. 19/19 en el proyecto `axe` |
| 2026-11-03 | S3 | `test/form-pow.test.ts` fallaba una de cada 256 ejecuciones: asumía que `counter + 1` no cumple la dificultad | la prueba ahora busca un contador que de verdad no la cumpla |
| 2026-11-03 | S3 | Contraste AA en la portada: los distintivos `bg-sage/15 text-sage` quedaban en 4,4:1 | `text-ink` sobre el mismo fondo (en portada, `consent-ai-auditor` y `business-doc-advisor`); detectado por `e2e/axe.spec.ts` |
| 2026-11-03 | S3 | Pie del correo transaccional en `#777` sobre blanco = 4,48:1 (por debajo de AA) | `#666` (5,6:1); detectado por `test/mail-a11y.test.ts` |
| 2026-11-02 | S1 | `clientIp()` confiaba en `CF-Connecting-IP` antes que en `X-Real-IP`: quien llegaba directo al origen podía falsificarlo y estrenar cupo de límites en cada intento | orden invertido, validación de IP, `set_real_ip_from` en nginx y `test/client-ip.test.ts` |
| 2026-10-31 | S2 | CI fallaba en `pnpm test` en un clon limpio (`test/.tmp` no existía) | `test/helpers/setup.ts` crea la carpeta |
