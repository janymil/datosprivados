import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
const targets = ["privadope.db", "privadope.db-wal", "privadope.db-shm"];

for (const name of targets) {
  const file = path.join(dir, name);
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`eliminado ${path.relative(process.cwd(), file)}`);
  }
}

console.log("Base reiniciada. El próximo arranque vuelve a sembrar los datos de demo.");
