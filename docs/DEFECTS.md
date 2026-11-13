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
| **Acceso SSH con contraseña** | **Decisión del propietario (2026-11-03)**: es su forma de entrar al servidor, y se revirtió el endurecimiento a solo claves. **Fuerza bruta mitigada** con `fail2ban` (sshd aggressive + recidive, con su IP en `ignoreip`). Ojo: la configuración lo esconde —`50-cloud-init.conf` gana por ser el primer valor— así que solo `sshd -T` dice la verdad | `docs/DECISIONS.md` («Acceso SSH»), `docs/RUNBOOK.md`, `docs/INCIDENTE-INTERNO-2026-11-03.md` |
| Entrega de correo sin dominio/SPF/DKIM/DMARC | bloquea P0-DOMAIN (área 6) | `docs/READINESS-BY-AREA.md` §6 |
| Facturación SUNAT manual (sin PSE/OSE) | decisión pendiente P0-SUNAT (área 5) | `docs/DECISIONS.md` |
| Textos legales en borrador, con `noindex` | entidad ya identificada (2026-11-13); falta abogado (P0-LEGAL) | áreas 7, 12, 14 |
| CSP en modo observación (no bloquea) | decisión del propietario (área 15) | `docs/DECISIONS.md` |
| Respaldos solo en el mismo servidor | falta copia fuera (área 17) | `docs/RUNBOOK.md` |
| Verificación de RUC acredita existencia, no titularidad | limitación conocida | `docs/DECISIONS.md` |

## Cerrados

| Fecha | Sev | Qué | Arreglo |
|---|---|---|---|
| 2026-11-13 | S1 | **Dos volcados completos de la base legibles por cualquier usuario de la máquina, en una segunda ubicación**: `backups/` del repositorio (la usa `deploy.sh` para el respaldo previo al despliegue) estaba en 755 y los dos volcados del 2026-11-01 en 644 (`sudo -u nobody test -r` → acceso). El arreglo del 2026-11-03 cubrió `data/` y `/var/backups/datosprivados`, pero no esta carpeta. Se suma al registro de `docs/INCIDENTE-INTERNO-2026-11-03.md` (misma ventana, misma combinación con SSH por contraseña) | `backups/` a 700 y sus archivos a 600 (verificado con `sudo -u nobody`); `backup-db.mjs` ahora deja la carpeta destino en 700 aunque ya existiera, y `test/backup-crypto.test.ts` lo comprueba |
| 2026-11-13 | S2 | **CI en rojo sobre `master` desde el 2026-11-04** (corrida `41746373922` sobre `215c4e6`; el E2E ni se ejecutó): `test/deploy-artifacts.test.ts` hace `logrotate --debug` y la config lleva `su root root`, que como usuario normal (runner uid 1001) da «error switching euid». En el servidor (root) pasaba, por eso nadie lo vio | la prueba se salta sin root (solo tiene sentido en la máquina que rota los logs). Diagnóstico con las anotaciones públicas del check-run |
| 2026-11-13 | S2 | **Prueba con fecha de caducidad y trabajos que ignoraban su reloj**: `isCompanyActive()` comparaba con `Date.now()` y no con el `now` del trabajo, así que `billing-reconcile`, `lapsed-account-notices`, `purge-old-data` y demás filtraban las empresas activas con la hora del sistema. `test/jobs.test.ts` (fijado al 2026-11-04) empezó a fallar solo el 2026-11-06, y `deploy.sh` (que corre las pruebas) habría bloqueado cualquier despliegue | `isCompanyActive(company, now = new Date())` y los trabajos pasan su `now`; comportamiento en producción igual, trabajos reproducibles. Comprobado fijando el reloj al 2026-11-04 y al 2026-11-13: 673/673 en ambos |
| 2026-11-03 | S1 | **La base viva era legible por cualquier usuario de la máquina** (reclasificado de S3 a S1 el 2026-11-13: encaja en la definición de S1, «exposición de datos personales», aunque no se haya encontrado evidencia de acceso; la evaluación jurídica está en `docs/INCIDENTE-INTERNO-2026-11-03.md`): `data/` estaba en 755 y `datosprivados.db` en 644. Son los datos personales de todos los clientes. Los 130 respaldos también estaban en 644, aunque dentro de un directorio 700 que los salvaba por ahora | `data/` a 700 y la base (con `-wal`/`-shm`) a 600; los 130 respaldos a 600; y `backup-db.mjs` ahora hace `chmod 600` de cada respaldo y su `.sha256` al escribirlos, para que no vuelva a depender del directorio. Test en `test/backup-crypto.test.ts`. Verificado después: `health: 200` (la app sigue leyendo) y `sudo -u nobody` ya no accede |
| 2026-11-03 | S3 | El **preview era indexable**: `robots.txt` con `Allow: /`, sin `X-Robots-Tag` y `sitemap.xml` anunciando el dominio de preview. Un preview indexado sobrevive al lanzamiento (Google conserva la copia con los textos legales en borrador) y compite con el dominio real | `X-Robots-Tag: noindex, nofollow` en el vhost del preview (`deploy/nginx-preview-noindex.conf`, aplicado y verificado con `curl -I`), más la bandera `NEXT_PUBLIC_NOINDEX=1` para que `robots.txt` responda `Disallow: /` y los metadatos lleven `robots: noindex` desde el próximo build. `test/seo-indexing.test.ts` fija ambos modos y que la plantilla de producción **no** lleve noindex |
| 2026-11-03 | S3 | `configPresence().llm` decía «hay IA» con solo existir una clave: `Boolean(ANTHROPIC_API_KEY \|\| OPENAI_API_KEY)`. El preview tenía `OPENAI_API_KEY` **sin** `OPENAI_MODEL`, así que la app estaba en modo básico y `/api/health` publicaba `llm: true` igualmente: una señal de operación que mentía (y la usaba el propio monitor) | `llm: isLlmConfigured()` — proveedor realmente usable (clave **y** modelo), con el interruptor `AI_DISABLED` y el circuito respetados. Test en `test/ops.test.ts`; se descubrió al comprobar la fila 8 de `GO-NO-GO` contra el servidor |
| 2026-11-03 | S3 | `deploy/logrotate-datosprivados.conf` nunca se instaló (no existía `/etc/logrotate.d/datosprivados`) mientras la lista de readiness afirmaba que los logs rotaban semanalmente; además su segunda sección no tenía `su` y habría fallado con «parent directory has insecure permissions» cada semana | Instalado en `/etc/logrotate.d/datosprivados` (644) con `su root root` añadido; `logrotate --debug` sin errores; `test/deploy-artifacts.test.ts` ejecuta esa prueba en seco y compara la copia instalada con la del repo |
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
