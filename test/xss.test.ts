import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocBody } from "@/components/doc-body";
import { JsonLd } from "@/components/json-ld";
import { buildPrivacyPolicy, buildSecurityDocument } from "@/lib/documents";
import { getCompany, makeCompany } from "./helpers/db";

// Regresión de XSS (PRODUCTION_ROADMAP P5 §3): datos del cliente con HTML/script
// no deben salir como markup ejecutable en ningún documento renderizado.
const PAYLOAD = `<script>alert("x")</script><img src=x onerror=alert(1)>`;

function renderDoc(content: string) {
  return renderToStaticMarkup(createElement(DocBody, { content }));
}

describe("XSS en documentos generados", () => {
  const { companyId } = makeCompany({
    name: `Casa ${PAYLOAD}`,
    address: `Av. Falsa 123 ${PAYLOAD}`,
  });
  const company = getCompany(companyId);

  it("la política de privacidad escapa el nombre, la dirección y el DPO", () => {
    const html = renderDoc(buildPrivacyPolicy(company, []));
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<[a-z][^>]*\son[a-z]+=/i);
    expect(html).toContain("Casa &lt;script&gt;");
  });

  it("el documento de seguridad escapa el mismo contenido", () => {
    const html = renderDoc(buildSecurityDocument(company, []));
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/<[a-z][^>]*\son[a-z]+=/i);
  });
});

describe("guardas estáticas", () => {
  const SRC = path.resolve(import.meta.dirname, "../src");

  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [full] : [];
    });
  }

  // Única excepción: el componente de JSON-LD. Solo recibe objetos que arma el propio
  // código y escapa «<» para que nada pueda cerrar la etiqueta (ver la prueba de abajo).
  const JSON_LD = path.join(SRC, "components", "json-ld.tsx");

  it("no hay dangerouslySetInnerHTML ni eval en el código de la app", () => {
    const offenders = walk(SRC).filter((file) => {
      if (file === JSON_LD) return /\beval\(|new Function\(/.test(fs.readFileSync(file, "utf8"));
      const text = fs.readFileSync(file, "utf8");
      return /dangerouslySetInnerHTML|\beval\(|new Function\(/.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it("el JSON-LD no puede cerrar la etiqueta <script>", () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: { name: "</script><script>alert(1)</script>" } }));
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain("\\u003c/script>");
  });
});
