import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PanelSkeleton } from "@/components/loading-skeleton";
import PanelLoading from "@/app/app/loading";

/**
 * Estados de carga (área 20): sin `loading.tsx` la navegación del panel se queda
 * en la pantalla anterior mientras el servidor arma el HTML. El esqueleto debe
 * anunciarse a los lectores de pantalla y existir junto al layout del panel.
 */
describe("estado de carga del panel", () => {
  it("el esqueleto anuncia que está cargando y no esconde contenido tras animación", () => {
    const html = renderToStaticMarkup(PanelSkeleton({ rows: 2 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cargando…");
    expect(html).toContain("sr-only");
    expect(html).toContain("animate-pulse"); // se desactiva con prefers-reduced-motion (globals.css)
    expect(html).toContain("bg-line");
  });

  it("la pantalla del panel tiene su loading.tsx", () => {
    const file = path.join(process.cwd(), "src", "app", "app", "loading.tsx");
    expect(fs.existsSync(file)).toBe(true);
    const html = renderToStaticMarkup(PanelLoading());
    expect(html).toContain('role="status"');
  });
});
