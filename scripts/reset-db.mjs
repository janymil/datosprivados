import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
const targets = ["datosprivados.db", "datosprivados.db-wal", "datosprivados.db-shm"];

for (const name of targets) {
  const file = path.join(dir, name);
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`eliminado ${path.relative(process.cwd(), file)}`);
  }
}

console.log("Base reiniciada. El próximo arranque vuelve a sembrar los datos de demo.");
