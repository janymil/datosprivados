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
| D-1 | S3 | `src/lib/mercadopago.ts` es el archivo con menos cobertura del núcleo (56 % sentencias, 38 % funciones): la firma del webhook y los reintentos se prueban por el camino feliz, no en todos los modos de fallo | cobertura de `pnpm test:coverage` | mirar la tabla de cobertura | El suelo agregado (80/80/80/70) sí se cumple; este archivo lo baja. Cerrar con pruebas de firma inválida, timeout y 5xx |

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
| 2026-11-02 | S1 | `clientIp()` confiaba en `CF-Connecting-IP` antes que en `X-Real-IP`: quien llegaba directo al origen podía falsificarlo y estrenar cupo de límites en cada intento | orden invertido, validación de IP, `set_real_ip_from` en nginx y `test/client-ip.test.ts` |
| 2026-10-31 | S2 | CI fallaba en `pnpm test` en un clon limpio (`test/.tmp` no existía) | `test/helpers/setup.ts` crea la carpeta |
