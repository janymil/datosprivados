#!/usr/bin/env node
// Reinicia la base LOCAL de desarrollo (borra el archivo para que el próximo arranque
// vuelva a sembrar la demo).
//
// Uso:
//   node scripts/reset-db.mjs             muestra qué borraría y sale 1 (falta confirmar)
//   node scripts/reset-db.mjs --dry-run   igual, pero sale 0
//   node scripts/reset-db.mjs --yes       borra
//
// Salvaguardas, porque un borrado sin preguntar no tiene vuelta atrás:
// - Nunca en producción: con NODE_ENV=production se niega aunque lleve --yes. Un
//   reinicio de producción se hace restaurando un respaldo, no con este script.
// - Respeta DATOSPRIVADOS_DB (antes lo ignoraba y borraba ./data/... aunque la base
//   real estuviera en otra ruta: el borrado "no pasaba nada" o pasaba lo peor).
// - No borra fuera del directorio del proyecto salvo con --force.
// - Sin --yes solo informa.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const known = new Set(["--yes", "--dry-run", "--force"]);
const unknown = args.filter((arg) => !known.has(arg));
if (unknown.length) {
  console.error(`Argumento desconocido: ${unknown.join(" ")}\n\nUso: node scripts/reset-db.mjs [--dry-run | --yes] [--force]`);
  process.exit(2);
}

const yes = args.includes("--yes");
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

if (process.env.NODE_ENV === "production") {
  console.error("Reinicio cancelado: NODE_ENV=production. Restaura un respaldo (docs/RUNBOOK.md); este script es para desarrollo.");
  process.exit(1);
}

const root = process.cwd();
const target = process.env.DATOSPRIVADOS_DB?.trim() || path.join(root, "data", "datosprivados.db");
const absolute = path.resolve(root, target);

if (!force && !absolute.startsWith(root + path.sep)) {
  console.error(
    `Reinicio cancelado: ${absolute} está fuera de ${root}.\n` +
      "Si de verdad quieres borrar esa base, pásale --force (y comprueba antes que no es producción)."
  );
  process.exit(1);
}

const files = [absolute, `${absolute}-wal`, `${absolute}-shm`].filter((file) => fs.existsSync(file));

if (!files.length) {
  console.log(`No hay nada que borrar en ${absolute}.`);
  process.exit(0);
}

console.log(`Base: ${absolute}`);
for (const file of files) console.log(`  ${dryRun || !yes ? "borraría" : "eliminado"} ${path.relative(root, file) || file}`);

if (dryRun) {
  console.log("Simulacro: no se ha borrado nada.");
  process.exit(0);
}

if (!yes) {
  console.error("No se ha borrado nada. Añade --yes si es lo que quieres.");
  process.exit(1);
}

for (const file of files) fs.rmSync(file);
console.log("Base reiniciada. El próximo arranque vuelve a sembrar los datos de demo.");

