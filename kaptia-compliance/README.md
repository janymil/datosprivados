# Carpeta ajena al producto (Kaptia)

Esta carpeta **no forma parte de DatosPrivados** y su código no se importa desde
`src/`. Guarda un análisis de cumplimiento de otro producto (Kaptia,
`kaptia.app`, operado por NutriNova LLC), fechado el 2026-10-29, que se dejó aquí
como material de referencia: el marco legal peruano que describe (Ley 29733,
SIPDP, ARCO, plazos) es el mismo que aplica DatosPrivados.

Reglas para quien trabaje en el repositorio:

- No lo uses para justificar decisiones de producto: lo que rige es
  `docs/DECISIONS.md`, `docs/READINESS-BY-AREA.md` y lo que verifique el abogado
  (`P0-LEGAL`).
- No lo importes desde la aplicación, no lo incluyas en el build ni en el ZIP de
  exportación.
- No contiene datos de clientes de DatosPrivados ni secretos.

Si se decide sacarlo del repositorio, basta con borrar la carpeta entera; nada
del producto depende de ella.
