/**
 * Arreglo de cobertura por pares (all-pairs), voraz y determinista.
 *
 * Cada par de valores de dos dimensiones distintas aparece en al menos una fila.
 * Mismo resultado en cada ejecución: las fixtures del motor legal dependen de él.
 */
export function pairwise<T extends Record<string, readonly unknown[]>>(
  dims: T
): Array<{ [K in keyof T]: T[K][number] }> {
  const keys = Object.keys(dims) as Array<keyof T & string>;
  const pairKey = (k1: string, i1: number, k2: string, i2: number) => `${k1}=${i1}|${k2}=${i2}`;

  const uncovered = new Set<string>();
  for (let a = 0; a < keys.length; a++)
    for (let b = a + 1; b < keys.length; b++)
      for (let i = 0; i < dims[keys[a]].length; i++)
        for (let j = 0; j < dims[keys[b]].length; j++) uncovered.add(pairKey(keys[a], i, keys[b], j));

  const rows: Array<Record<string, number>> = [];
  while (uncovered.size > 0) {
    // Arranca con el primer par aún sin cubrir.
    const [first] = uncovered;
    const [left, right] = first.split("|").map((part) => part.split("=")) as [string[], string[]];
    const row: Record<string, number> = { [left[0]]: Number(left[1]), [right[0]]: Number(right[1]) };

    // Completa el resto eligiendo el valor que cubre más pares nuevos con lo ya fijado.
    for (const key of keys) {
      if (key in row) continue;
      let best = 0;
      let bestGain = -1;
      for (let v = 0; v < dims[key].length; v++) {
        let gain = 0;
        for (const other of keys) {
          if (!(other in row)) continue;
          const [k1, i1, k2, i2] =
            keys.indexOf(other) < keys.indexOf(key) ? [other, row[other], key, v] : [key, v, other, row[other]];
          if (uncovered.has(pairKey(k1, i1, k2, i2))) gain++;
        }
        if (gain > bestGain) {
          best = v;
          bestGain = gain;
        }
      }
      row[key] = best;
    }

    for (let a = 0; a < keys.length; a++)
      for (let b = a + 1; b < keys.length; b++) uncovered.delete(pairKey(keys[a], row[keys[a]], keys[b], row[keys[b]]));
    rows.push(row);
  }

  return rows.map(
    (row) => Object.fromEntries(keys.map((key) => [key, dims[key][row[key]]])) as { [K in keyof T]: T[K][number] }
  );
}
