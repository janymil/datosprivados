import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicPolicyPage from "@/app/p/[slug]/page";
import PublicRequestPage from "@/app/solicitud/[slug]/page";
import { generateAndSaveDocument, getDocument, listBanks, publishDocument } from "@/lib/data";
import { getDb } from "@/lib/db";
import { getCompany, makeActiveCompany, makeBank } from "./helpers/db";

/**
 * Lo que ve un desconocido en `/p/[slug]` y `/solicitud/[slug]`: solo la versión
 * publicada, solo datos de la empresa dueña del enlace y ningún identificador
 * interno (ids de empresa, documento, usuario o solicitud) con el que tantear la
 * base.
 */

const params = (slug: string) => Promise.resolve({ slug });

const renderPolicy = async (slug: string) => renderToStaticMarkup(await PublicPolicyPage({ params: params(slug) }));
const renderRequest = async (slug: string, query: Record<string, string> = {}) =>
  renderToStaticMarkup(await PublicRequestPage({ params: params(slug), searchParams: Promise.resolve(query) }));

function publishedCompany(name = "Bodega Visible S.A.C.") {
  const made = makeActiveCompany({ address: "Av. Primera 111", name });
  makeBank(made.companyId);
  generateAndSaveDocument(getCompany(made.companyId), listBanks(made.companyId), "politica");
  publishDocument(made.companyId, "politica");
  return made;
}

describe("página pública de la política", () => {
  it("sirve la versión publicada, no el borrador generado después", async () => {
    const made = publishedCompany();
    // Tras publicar se cambian los datos y se regenera: la v2 queda sin publicar.
    getDb().prepare("UPDATE companies SET address = 'Calle Segunda 222' WHERE id = ?").run(made.companyId);
    generateAndSaveDocument(getCompany(made.companyId), listBanks(made.companyId), "politica");
    expect(getDocument(made.companyId, "politica")!.version).toBe(2);

    const html = await renderPolicy(getCompany(made.companyId).slug);
    expect(html).toContain("Versión 1");
    expect(html).toContain("Av. Primera 111");
    expect(html).not.toContain("Calle Segunda 222");
  });

  it("no expone identificadores internos ni datos de otra empresa", async () => {
    const visible = publishedCompany();
    const other = publishedCompany("Otra Empresa Secreta S.A.C.");
    const html = await renderPolicy(getCompany(visible.companyId).slug);

    const document = getDocument(visible.companyId, "politica")!;
    expect(html).not.toContain(visible.companyId);
    expect(html).not.toContain(visible.userId);
    expect(html).not.toContain(document.id);
    expect(html).not.toContain(getCompany(other.companyId).slug);
    expect(html).not.toContain("Otra Empresa Secreta");
    // Lo que sí debe estar: la identidad pública de la empresa.
    expect(html).toContain("Bodega Visible S.A.C.");
  });
});

describe("formulario ARCO público", () => {
  it("solo identifica a la empresa por su slug y no filtra ids internos", async () => {
    const made = publishedCompany("Atención Directa S.A.C.");
    const company = getCompany(made.companyId);
    const html = await renderRequest(company.slug);

    expect(html).toContain(`name="slug" value="${company.slug}"`);
    expect(html).toContain("Atención Directa S.A.C.");
    expect(html).not.toContain(company.id);
    expect(html).not.toContain("company_id");
    expect(html).not.toContain(made.userId);
  });

  it("solo muestra la constancia de un ticket que pertenece a esa empresa", async () => {
    const made = publishedCompany();
    const other = publishedCompany("Vecina S.A.C.");
    getDb()
      .prepare(
        "INSERT INTO arco_requests (id, company_id, ticket, type, requester_name, email, description, status, received_at, due_at, created_at) VALUES (?, ?, 'ARCO-PROPIO-1', 'acceso', 'Ana', 'ana@example.com', 'x', 'nuevo', '2026-10-01', '2026-10-29', '2026-10-01T10:00:00.000Z')"
      )
      .run("req-1", made.companyId);

    const own = await renderRequest(getCompany(made.companyId).slug, { ok: "ARCO-PROPIO-1" });
    expect(own).toContain("ARCO-PROPIO-1");
    expect(own).toContain("Recibimos tu solicitud");

    // El ticket de otra empresa no se confirma desde este enlace.
    const foreign = await renderRequest(getCompany(made.companyId).slug, { ok: "ARCO-AJENO-9" });
    expect(foreign).not.toContain("Recibimos tu solicitud");
    expect(foreign).toContain(`name="slug" value="${getCompany(made.companyId).slug}"`);
    expect(getCompany(other.companyId).slug).not.toBe(getCompany(made.companyId).slug);
  });
});

