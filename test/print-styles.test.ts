import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Estilos de impresión (áreas 7 y 20): el cliente imprime o guarda en PDF la
 * política publicada y la ficha del banco de datos. Si alguien reescribe el CSS o
 * la cabecera de esas pantallas y se pierde `.print-page`/`.no-print`, el PDF sale
 * con menús y bordes; esto lo detecta sin abrir un navegador.
 */

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

describe("estilos de impresión", () => {
  const css = read("src", "app", "globals.css");

  it("define las reglas de impresión", () => {
    expect(css).toMatch(/@media print \{/);
    expect(css).toMatch(/\.no-print \{\s*display: none !important;/);
    expect(css).toMatch(/\.print-page \{[\s\S]{0,200}box-shadow: none !important;/);
  });

  it("la política publicada y la ficha del banco se imprimen limpias", () => {
    const policy = read("src", "app", "p", "[slug]", "page.tsx");
    expect(policy).toContain("print-page");
    expect(policy).toContain("PrintButton");
    expect(policy).toContain("no-print");

    const sheet = read("src", "app", "app", "bancos", "[id]", "ficha", "page.tsx");
    expect(sheet).toContain("print-page");
    expect(sheet).toContain("PrintButton");
    expect(sheet).toContain("no-print");
  });

  it("el botón de imprimir llama a window.print y se puede bloquear en la demo", () => {
    const button = read("src", "components", "print-button.tsx");
    expect(button).toContain("window.print()");
    expect(button).toContain("locked");
    expect(button).toContain("no-print");
  });
});
