import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contraste de los colores de texto (área 20).
 *
 * axe encuentra estos fallos, pero solo en las pantallas que recorre y solo en E2E.
 * Esta prueba los encuentra en un segundo, sobre los propios tokens: si alguien
 * oscurece el papel o aclara un color de texto hasta bajar de AA, el build falla
 * antes de que llegue a un navegador.
 *
 * Referencia: WCAG 2.1, 1.4.3 (texto normal ≥ 4,5:1) y 1.4.11 (elementos no
 * textuales ≥ 3:1).
 */

const CSS = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

/** Lee un token de `:root` (p. ej. `--ochre-dark: #7d5713;`). */
function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`No encuentro el token --${name} en globals.css`);
  return match[1];
}

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground: string, background: string) {
  const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const BACKGROUNDS = ["paper", "paper-2"];

describe("contraste de los tokens de texto", () => {
  // Todos se usan como color de texto sobre papel o papel-2.
  for (const name of ["ink", "ink-soft", "sage", "crimson", "crimson-dark", "ochre-dark"]) {
    it(`--${name} cumple AA sobre el papel`, () => {
      for (const background of BACKGROUNDS) {
        const value = ratio(token(name), token(background));
        expect(value, `--${name} sobre --${background} = ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("el ocre de marca queda para rellenos: no llega a AA como texto", () => {
    // Documenta por qué existe --ochre-dark. Si algún día el ocre de marca sube de
    // contraste, esta prueba avisa de que la duplicación ya no hace falta.
    expect(ratio(token("ochre"), token("paper"))).toBeLessThan(4.5);
  });

  it("los colores de línea cumplen el mínimo de elementos no textuales (3:1)", () => {
    // `.input` y `.btn-ghost` se identifican solo por el borde: WCAG 1.4.11 pide 3:1
    // contra el papel y contra el relleno del campo (#fffdf8, el más claro de los dos).
    const backgrounds: Array<[string, string]> = [
      ...BACKGROUNDS.map((name): [string, string] => [`--${name}`, token(name)]),
      ["relleno del campo", "#fffdf8"],
    ];
    for (const [label, hex] of backgrounds) {
      const value = ratio(token("line-strong"), hex);
      expect(value, `--line-strong sobre ${label} (${hex}) = ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it("ninguna clase `text-ochre` (sin -dark) se cuela en el código", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name)) {
          const content = fs.readFileSync(full, "utf8");
          // `text-ochre` seguido de algo que no sea `-dark` (evita falsos positivos en comentarios).
          if (/text-ochre(?!-dark)/.test(content)) offenders.push(path.relative(process.cwd(), full));
        }
      }
    };
    walk(path.join(process.cwd(), "src"));
    expect(offenders, `usa text-ochre-dark: ${offenders.join(", ")}`).toEqual([]);
  });
});
