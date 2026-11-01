# Go / no-go — salida de la Fase 5

Estado al **2026-11-01**. Cada casilla se marca solo si la comprobación se ejecutó; entre paréntesis, cómo y dónde.
Las filas «Abierto» dicen quién o qué falta.

## Puerta de salida P5

| # | Criterio | Estado | Evidencia / qué falta |
|---|---|---|---|
| 1 | CI en verde | **Abierto** | El flujo `.github/workflows/ci.yml` nunca se ejecutó en GitHub (nada confirmado/subido). Local: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` en verde. |
| 2 | E2E en verde en staging | **Parcial** | Recorrido completo + pruebas de calidad en verde contra `next start` local con MercadoPago simulado (ver «Resultados»). No hay staging real (`docs/STAGING.md` lo describe). |
| 3 | Cero S1/S2 abiertos | **Sin verificar** | No hay lista de defectos viva; los de la sección 2 del roadmap tienen prueba de regresión según las fases 1–4. |
| 4 | Matriz de autorización sin fuga entre empresas | **Hecho** | `test/authz.test.ts`, `test/tenancy.test.ts` (parte de las 378 pruebas). |
| 5 | Restauración de respaldo (RPO ≤ 1 h, RTO ≤ 2 h) | **Parcial** | Simulacro local: respaldo 0,16 s + restauración 0,09 s, sha256 e integridad OK (`scripts/backup-db.mjs`, `restore-db.mjs`). Falta: caja nueva, solo con el RUNBOOK, y un cron de respaldos con frecuencia ≤ 1 h para cumplir el RPO. |
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
| nginx `server_tokens` | **Abierto:** sigue comentado en `/etc/nginx/nginx.conf` (servidor compartido; el cambio lo bloqueó el entorno). Pasos: descomentar `server_tokens off;`, `nginx -t`, `systemctl reload nginx`. |
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

## Pendiente del propietario (no se puede hacer desde el repositorio)

1. `server_tokens off;` en `/etc/nginx/nginx.conf` (+ `nginx -t` y `systemctl reload nginx`). Hay copia previa del archivo solo si lo haces tú.
2. No subir `docs/MERCADOPAGO-SANDBOX.md` con los tokens y contraseñas de prueba: redactarlos o rotarlos.
3. Crear staging real (dominio, base, certificado) con `docs/STAGING.md` y ejecutar ahí `scripts/deploy.sh` una vez.
4. Empresa operadora, abogado, dominio y correo (SPF/DKIM/DMARC): bloquean los textos legales finales y la entrega real de correos.
5. UAT con 3–5 dueños de MYPE; pen-test externo; SSL Labs; simulacro en caja nueva con RTO/RPO; cron de respaldos ≤ 1 h.
6. Firefox, Safari e iOS Safari (`pnpm exec playwright install firefox webkit` y añadir proyectos en `playwright.config.ts`).
7. Monitor externo, rastreo de errores y una alerta de prueba (P6-OBS).
8. Decidir la CSP (ver nota arriba).
