import { describe, expect, it } from "vitest";
import { renderMail, type MailPayload, type MailTemplate } from "@/lib/mail-templates";

/**
 * Accesibilidad y robustez del correo HTML (área 6).
 *
 * El correo no se puede "arreglar" con CSS del sitio: se revisa lo que de verdad
 * viaja — que exista la versión en texto plano, que no haya imágenes sin `alt`,
 * que los colores tengan contraste suficiente y que el HTML escape lo que venga de
 * los datos del cliente.
 */

/** Payloads representativos de lo que envía la app (según `notify.ts` y las acciones). */
const SAMPLES: Array<[MailTemplate, MailPayload]> = [
  ["verify_email", { name: "Ana", url: "/verificar?token=abc", company: "Bodega S.A.C." }],
  ["password_reset", { name: "Ana", url: "/restablecer?token=abc", company: "Bodega S.A.C." }],
  ["welcome", { name: "Ana", company: "Bodega S.A.C.", plan: "Básico" }],
  ["arco_received_owner", { ticket: "ARCO-1", type: "acceso", requester: "Luis", dueAt: "20/11/2026", path: "/app/arco/1", company: "Bodega S.A.C." }],
  ["arco_ack_requester", { ticket: "ARCO-1", type: "acceso", dueAt: "20/11/2026", company: "Bodega S.A.C." }],
  ["payment_receipt", { plan: "Básico", amount: "S/ 19.00", paidUntil: "04/12/2026", company: "Bodega S.A.C." }],
  ["invoice_issued", { number: "F001-123", amount: "S/ 19.00", company: "Bodega S.A.C.", pdfUrl: "https://x.pe/f.pdf" }],
  ["lapsed_notice", { stage: 1, deleteOn: "01/02/2027", company: "Bodega S.A.C." }],
  ["ops_alert", { subject: "Alerta operativa", message: "La tarea send-outbox no corre a tiempo." }],
];

const relativeLuminance = (hex: string) => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = parseInt(full.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

describe("correo transaccional", () => {
  it.each(SAMPLES)("%s: trae versión en texto plano y no deja huecos", (template, payload) => {
    const mail = renderMail(template, payload);
    expect(mail.subject.length).toBeGreaterThan(3);
    expect(mail.text.length).toBeGreaterThan(60);
    expect(mail.text).not.toMatch(/\bundefined\b|\bnull\b/);
    expect(mail.html).not.toMatch(/\bundefined\b|\bnull\b/);
    // Sin imágenes: no hay `alt` que se pueda olvidar.
    expect(mail.html).not.toContain("<img");
    // El idioma va declarado para el lector de pantalla.
    expect(mail.html).toContain('<html lang="es">');
    // Las tablas de maquetación no se anuncian como datos.
    expect(mail.html).toContain('role="presentation"');
  });

  it.each(SAMPLES)("%s: los colores del texto superan el contraste AA (4.5:1)", (template, payload) => {
    const { html } = renderMail(template, payload);
    const pairs: Array<[string, string]> = [];
    // Pares declarados en el mismo estilo: fondo y color de texto.
    for (const match of html.matchAll(/background:(#[0-9a-fA-F]{3,6})[^"]*?color:(#[0-9a-fA-F]{3,6})/g)) {
      pairs.push([match[2], match[1]]);
    }
    for (const match of html.matchAll(/color:(#[0-9a-fA-F]{3,6})[^"]*?background:(#[0-9a-fA-F]{3,6})/g)) {
      pairs.push([match[1], match[2]]);
    }
    // Los textos sueltos (pie, pie de nota) van sobre el fondo blanco de la tarjeta.
    for (const match of html.matchAll(/font-size:1[23]px;color:(#[0-9a-fA-F]{3,6})/g)) {
      pairs.push([match[1], "#ffffff"]);
    }
    expect(pairs.length).toBeGreaterThan(0);
    for (const [foreground, background] of pairs) {
      const ratio = contrast(foreground, background);
      expect(ratio, `${template}: ${foreground} sobre ${background} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("escapa lo que viene de los datos del cliente", () => {
    const { html, text } = renderMail("welcome", {
      name: '<script>alert("x")</script>',
      company: 'Bodega "Ñandú" <b>S.A.C.</b>',
      plan: "Básico",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>S.A.C.");
    // En texto plano no hay etiquetas que escapar: basta con no inyectar HTML.
    expect(text).toContain("Bodega \"Ñandú\"");
  });

  it("el enlace de acción se vuelve absoluto y se puede usar en texto plano", () => {
    const mail = renderMail("verify_email", { name: "Ana", url: "/verificar?token=abc", company: "Bodega S.A.C." });
    expect(mail.html).toMatch(/href="https?:\/\/[^"]+\/verificar\?token=abc"/);
    expect(mail.text).toContain("/verificar?token=abc");
    expect(mail.text).toContain("Confirmar mi correo:");
  });
});
