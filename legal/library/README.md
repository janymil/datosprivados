# Biblioteca de normas

Texto oficial de cada norma que citan los documentos de DatosPrivados, separado por
artículo. Es la base del lint de citas (`test/legal/citations.test.ts`) y de la
auditoría de corrección (diseño §4.1 y §7).

## Formato

```
legal/library/<id>/
  norm.json      # metadatos y procedencia (tipo Norm, src/legal/library/types.ts)
  articles.json  # [{ num, title, text, sha256 }] — vacío o ausente si no hay texto oficial
```

- `id` = nombre de la carpeta: `ds-016-2024-jus`, `ley-29733`, `ley-29571`…
- `num` es el número del artículo tal como lo escribe la norma: `"34"`, `"III"`.
- `aliases` son las formas exactas en que nuestros textos nombran la norma.
  El cargador las compara sin mayúsculas, con espacios simples y «N.°» uniforme.
  Un alias no puede repetirse entre normas.

## Reglas de procedencia

- **Solo fuentes oficiales** (El Peruano, gob.pe, congreso.gob.pe). Nada de blogs ni
  resúmenes de estudios: la auditoría de octubre de 2026 encontró errores en ellos.
- El PDF oficial **no se versiona** (pesa varios MB y el repositorio es público): se
  guarda en el servidor en `/var/lib/datosprivados/legal-sources/<id>/source.pdf`, y
  `norm.json` registra `officialUrl`, `sourceSha256` y `retrievedAt`.
- Una norma citada sin texto oficial disponible queda con `status: "no-verificada"`
  y sin artículos. Toda cita a ella aparece en `legal/known-failures.json` hasta que
  se agregue su texto.
- `consolidated: false` indica texto original: las modificaciones posteriores no
  están incorporadas y se listan en `amendedBy`.

## Agregar o actualizar una norma

```
node scripts/legal/ingest.mjs <id>     # usa scripts/legal/sources.json
```

Luego `pnpm vitest run test/legal` y revisar el diff de `articles.json`.
