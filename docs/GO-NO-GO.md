# Go / no-go — salida de la Fase 5

Estado al **2026-11-01**. Cada casilla se marca solo si la comprobación se ejecutó; entre paréntesis, cómo y dónde.
Las filas «Abierto» dicen quién o qué falta.

## Puerta de salida P5

| # | Criterio | Estado | Evidencia / qué falta |
|---|---|---|---|
| 1 | CI en verde | **Hecho (2026-11-01)** | El flujo **sí se había ejecutado** antes: las corridas `41256959484` (`0351293`) y `41271540554` (`f686f26`) fallaron en el paso `pnpm test` (no en la instalación, el tipado ni el lint). Causa: `test/helpers/setup.ts` apuntaba `DATOSPRIVADOS_DB` a `test/.tmp/`, carpeta que existe en esta máquina pero no en un clon limpio (`getDb()` solo crea `data/`), así que SQLite devolvía `unable to open database file` (294 de 375 pruebas). **Corregido** con `fs.mkdirSync(dir, { recursive: true })`; corrida verde `41272543343` (`6c805d0`): auditoría, typecheck/lint/pruebas/build y E2E (Playwright **31/31**) en verde. |
| 2 | E2E en verde en staging | **Parcial** | Recorrido completo + pruebas de calidad en verde contra `next start` local con MercadoPago simulado (ver «Resultados»). No hay staging real (`docs/STAGING.md` lo describe). |
| 3 | Cero S1/S2 abiertos | **Hecho, con la lista a la vista (2026-11-03)** | Existe lista viva: `docs/DEFECTS.md`, con severidades, cómo reproducir y registro de cerrados. **0 S1/S2 abiertos** al 2026-11-03 (la tabla «Abiertos» no tiene filas). Los dos S1/S2 que aparecieron en la auditoría están cerrados con prueba de regresión: `clientIp()` falsificable (S1) y CI roto en un clon limpio (S2). Lo que la lista no puede afirmar es que no existan defectos aún no descubiertos: la puerta se apoya en la lista, no en la ausencia de fallos. |
| 4 | Matriz de autorización sin fuga entre empresas | **Hecho** | `test/authz.test.ts`, `test/tenancy.test.ts` (parte de las 378 pruebas). |
| 5 | Restauración de respaldo (RPO ≤ 1 h, RTO ≤ 2 h) | **Parcial** | Simulacro local: respaldo 0,16 s + restauración 0,09 s, sha256 e integridad OK (`scripts/backup-db.mjs`, `restore-db.mjs`). **Corrección (2026-11-02):** el cron horario **sí está instalado** (`/etc/cron.d/datosprivados` → `/usr/local/bin/datosprivados-backup`, archivo más nuevo del 2026-11-02), así que el RPO ≤ 1 h se cumple en esta máquina; `GET /api/cron/health` ahora también hace `PRAGMA quick_check` + checkpoint del WAL. Falta: caja nueva solo con el RUNBOOK, copia fuera del servidor y cifrada. |
| 6 | Ciclo de cobro completo en sandbox + conciliación | **Hecho (a confirmar)** | Pago de S/ 19 aprobado en sandbox (2026-11-01, `docs/MERCADOPAGO-SANDBOX.md`); trabajo `billing-sync` y pruebas de la máquina de estados. Falta repasar rechazo → pausa → cancelación con eventos reales. |
| 7 | Correos entregados a bandejas reales; recordatorios con reloj simulado | **Abierto** | Recordatorios: cubiertos con reloj simulado en `test/jobs.test.ts`. Entrega real: sin dominio ni SPF/DKIM/DMARC. |
| 8 | IA con clave real, cuotas y anonimización | **Abierto** | Cuotas y anonimización probadas con simulacro (`test/ai-controls.test.ts`, `test/security.test.ts`). No hay clave de Anthropic; la de OpenAI no se probó de punta a punta. |
| 9 | Textos legales publicados y aprobados; SIPDP de los bancos propios | **Abierto** | Páginas `/terminos`, `/privacidad`, `/cookies` y registro de aceptaciones (versión, fecha, IP) implementados como **borrador** con aviso y `noindex`. Faltan la empresa operadora (P0-ENTITY) y el abogado (P0-LEGAL). |
| 10 | Monitoreo y alertas (P6-OBS) | **Abierto** | Existe `GET /api/cron/health`; falta monitor externo, rastreo de errores y una alerta disparada de prueba. |

## Tareas 1–7 de la Fase 5

| Tarea | Estado | Detalle |
|---|---|---|
| 1 Staging + `deploy.sh` | **Parcial** | `scripts/deploy.sh`, `ecosystem.staging.config.cjs`, `docs/STAGING.md`. No se creó dominio, base ni proceso de staging real (DNS/nginx/certificado son del propietario). `deploy.sh` no se ejecutó (reiniciaría el preview). |
| 2 Rendimiento | **Hecho en local** | Ver «Rendimiento». Lighthouse no está instalado; se midió LCP con Chromium móvil y 4G simulado (`scripts/lcp-check.mjs`). Cloudflare no se tocó. |
| 3 Seguridad | **Parcial** | Ver «Seguridad». |
| 4 Accesibilidad y navegadores | **Parcial** | Pruebas básicas de accesibilidad en Chrome de escritorio y Android Chrome (Pixel 7). Firefox, Safari y iOS no están instalados en esta máquina. |
| 5 UAT con 3–5 dueños | **Abierto** | Requiere personas. |
| 6 Aceptación legal | **Parcial** | Mecanismo hecho; contenido y firma del abogado, abiertos. |
| 7 Simulacro de desastre | **Parcial** | Ver puerta #5. |

## Rendimiento (staging local, `next start`, 4 vCPU compartida con otras apps, cliente en la misma máquina)

Una conexión (latencia por petición): landing p95 9 ms · login 19 ms · formulario ARCO 18 ms · panel `/app` 33 ms · `/app/documentos` 28 ms.

Carga continua sin pausas (más dura que usuarios reales):

| Ruta | 10 conexiones p95 | 50 conexiones p95 | Capacidad (req/s) |
|---|---|---|---|
| landing | — | 231 ms | ≈ 250 |
| login (scrypt) | — | 629 ms | ≈ 110 |
| formulario ARCO | — | 506 ms | ≈ 113 |
| panel `/app` | 194 ms | 868 ms | ≈ 70 |
| webhook (firma inválida → 401) | — | 189 ms | ≈ 340 |

Lectura: un proceso Node llega a ≈ 70 renders de panel por segundo; con 50 conexiones sin pausa la latencia sube por **cola**, no por
consultas lentas (15 ms por petición). Con 10 usuarios concurrentes continuos el p95 del panel es 194 ms (< 300 ms): **no se
añadió caché**. Reabrir si el panel pasa de 300 ms de p95 con la carga real o si se necesita más de ≈ 70 req/s.

LCP móvil 4G simulado (CPU 4× más lenta), landing: **3,0–3,4 s → 1,8–2,1 s** (3 mediciones en la compilación nueva; CLS 0,061) al quitar la animación de entrada (`rise`) del `<h1>`
del héroe, que retrasaba el primer pintado del elemento más grande. Login y textos legales: ≈ 1,2 s. **Ningún video se descarga al cargar**
(`preload="none"`); la landing transfiere ≈ 244 KB. Pendiente: la fuente Fraunces pesa 118 KB por sus ejes `SOFT`/`WONK`/`opsz`
(decisión de diseño; no se tocó) y las reglas de caché de Cloudflare para `/video/*` (la app ya envía `immutable`).

## Seguridad

| Comprobación | Resultado |
|---|---|
| XSS en documentos | `test/xss.test.ts`: `<script>` y `<img onerror>` en nombre y dirección salen escapados; no hay `dangerouslySetInnerHTML`, `eval(` ni `new Function(` en `src/`. |
| Cabeceras | nosniff, X-Frame-Options DENY, HSTS, Referrer-Policy, Permissions-Policy, sin `X-Powered-By` (`e2e/quality.spec.ts`). **No hay Content-Security-Policy**: pendiente (ver nota). |
| Cookies | `pdp_session`: HttpOnly, SameSite=Lax, Secure según `COOKIE_SECURE` (`test/security.test.ts`). |
| Dependencias | `pnpm audit --prod`: sin vulnerabilidades conocidas. |
| Secretos | Búsqueda por patrones en el árbol de trabajo y en todo el historial de git: sin claves. **Excepción:** `docs/MERCADOPAGO-SANDBOX.md` (sin seguir en git) contiene tokens de la app de prueba y contraseñas de las cuentas de prueba. **No subirlo tal cual** (el remoto `origin` está en GitHub): redactar los valores o rotarlos antes. No se usó `gitleaks` (no instalado). |
| nginx `server_tokens` | **Hecho (2026-11-01, servidor del preview):** `server_tokens off;` descomentado en `/etc/nginx/nginx.conf:21` (copia previa en `/etc/nginx/nginx.conf.bak-20261101-050815`), `nginx -t` OK y `systemctl reload nginx`. Verificado: la respuesta directa pasa de `Server: nginx/1.24.0 (Ubuntu)` a `Server: nginx`; por Cloudflare se anuncia igual `server: cloudflare`. |
| CSRF de Server Actions | Next verifica `Origin` contra `Host`. Detrás de Cloudflare/nginx con `Host` reenviado igual no hace falta `allowedOrigins`; probar en staging con el dominio real. |
| SSRF | Solo URLs fijas de proveedores (MercadoPago, Decolecta, correo, LLM). |
| TLS (SSL Labs A) y pen-test externo | **Abierto:** requieren el dominio público / un tercero. |

**Nota CSP:** añadir CSP en Next 16 requiere un `proxy.ts` con nonce por petición (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
y fuerza render dinámico en todas las páginas. Es un cambio de arquitectura de rendimiento; se deja como decisión del propietario antes del lanzamiento.

## Resultados de las pruebas de esta ronda

Ejecutadas el 2026-11-01 sobre una compilación limpia de la versión actual (`.deploy/build`, webpack):

| Comprobación | Resultado |
|---|---|
| `pnpm typecheck` | Sin errores |
| `pnpm lint` | 0 advertencias |
| `pnpm test` | **378/378** (18 archivos) |
| `playwright test` | **31/31**: recorrido completo (1) + calidad en Chrome de escritorio (15) y Android Chrome/Pixel 7 (15) |
| `pnpm audit --prod` | Sin vulnerabilidades conocidas |

**Defecto encontrado y corregido por las pruebas de calidad:** los campos de login, registro y el resto de formularios no tenían etiqueta
asociada (la etiqueta era un `div`). `Field` (`src/components/ui.tsx`) ahora usa `<label htmlFor>` y `aria-describedby` para la ayuda
cuando el hijo es un solo control; los grupos de controles no cambian.

### CI en GitHub (2026-11-01)

Las dos corridas que existían sobre `master` fallaron y la causa no era el código de la app sino el entorno de pruebas:

- `41271540554` (`f686f26`): `pnpm install`, `typecheck` y `lint` en verde; **`pnpm test` falló a los 3 s**; `build` y E2E quedaron saltados. `41256959484` (`0351293`) igual. `audit` en verde en ambas.
- Motivo: `test/helpers/setup.ts` escribía en `test/.tmp/`, que **existe en la máquina de desarrollo** (está en `.gitignore`) pero no en un clon limpio. `getDb()` solo crea la carpeta de la base por defecto (`data/`), así que `new DatabaseSync()` devolvía `unable to open database file` en 17 de 18 archivos (294 de 375 pruebas). En local nunca se vio porque la carpeta ya estaba creada.
- Arreglo: `fs.mkdirSync(dir, { recursive: true })` en el `setupFiles` de Vitest.
- Comprobación: clon limpio (`git worktree` de `f686f26`) **sin `.env` y sin `test/.tmp`**: `typecheck` y `lint` en verde, **378/378** pruebas, `build` en verde (con `NEXT_PUBLIC_APP_URL=https://ci.example.com`, como en CI) y E2E **31/31** sobre esa misma compilación. Sirve también de prueba de que el pipeline completo pasa en las condiciones de GitHub.
- Corrida verde tras el arreglo: `41272543343` (`6c805d0`), 3 de 3 trabajos en verde (auditoría 9 s, typecheck/lint/pruebas/build 60 s, E2E 46 s) y `🎭 Playwright Run Summary: 31 passed`.
- Avisos del ejecutor que no cambian el resultado y quedan como mantenimiento: los `uses:` de v4 se fuerzan a Node 24 porque Node 20 está deprecado en Actions (hay PR de Dependabot abiertos para subirlos) y `ubuntu-latest` migra a Ubuntu 26 desde el 2026-10-19.

## Pendiente del propietario (no se puede hacer desde el repositorio)

1. ~~`server_tokens off;` en `/etc/nginx/nginx.conf`~~ **Hecho el 2026-11-01** (ver «Seguridad»). Queda del bloque nginx de P6-INFRA solo lo que toca al cortafuegos/edge: gzip/brotli, `limit_req` en `/login`, `/registro`, `/solicitud/` y `/api/`, y `set_real_ip_from` con los rangos de Cloudflare.
2. No subir `docs/MERCADOPAGO-SANDBOX.md` con los tokens y contraseñas de prueba: redactarlos o rotarlos.
3. Crear staging real (dominio, base, certificado) con `docs/STAGING.md` y ejecutar ahí `scripts/deploy.sh` una vez.
4. Empresa operadora, abogado, dominio y correo (SPF/DKIM/DMARC): bloquean los textos legales finales y la entrega real de correos.
5. UAT con 3–5 dueños de MYPE; pen-test externo; SSL Labs; simulacro en caja nueva con RTO/RPO; cron de respaldos ≤ 1 h.
6. Firefox, Safari e iOS Safari (`pnpm exec playwright install firefox webkit` y añadir proyectos en `playwright.config.ts`).
7. Monitor externo, rastreo de errores y una alerta de prueba (P6-OBS).
8. Decidir la CSP (ver nota arriba).
