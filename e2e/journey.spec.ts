import fs from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { expect, test, type Page } from "@playwright/test";
import { E2E_DB } from "./paths";

const RUC = "20512345671";
const EMAIL = "dueno@e2e.example.com";
const PASSWORD = "clave-segura-e2e-1";
const NEW_PASSWORD = "clave-nueva-e2e-2026";

/** Edita la base temporal de la prueba (p. ej. para simular que venció el período pagado). */
function sql(statement: string, ...params: string[]) {
  const db = new DatabaseSync(E2E_DB);
  try {
    return db.prepare(statement).all(...params) as Array<Record<string, unknown>>;
  } finally {
    db.close();
  }
}

const APP = "http://localhost:3100";
const MOCK = "http://localhost:4010";
const CRON = { Authorization: "Bearer e2e-cron-secret-0123456789" };

/** Dispara la tarea que entrega la bandeja de salida, como haría el cron del servidor. */
async function flushMail() {
  const response = await fetch(`${APP}/api/cron/send-outbox`, { method: "POST", headers: CRON });
  expect(response.status).toBe(200);
}

async function sentMail(): Promise<Array<{ to: string; subject: string; text: string }>> {
  return (await fetch(`${MOCK}/_mail`)).json();
}

/** Primer enlace del correo, apuntado al servidor de la prueba (NEXT_PUBLIC_APP_URL queda fijado en el build). */
const linkIn = (text: string) => text.match(/https?:\/\/\S+/)![0].replace(/^https?:\/\/[^/]+/, APP);

const OWN = `company_id = (SELECT id FROM companies WHERE ruc = '${RUC}')`;

async function submit(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name }).click();
}

test("recorrido completo: de la suscripción al vencimiento", async ({ page, browser }) => {
  let slug = "";

  await test.step("registro con RUC verificado", async () => {
    await page.goto("/registro");
    await page.locator('input[name="company"]').fill("Empresa E2E");
    await page.locator('input[name="ruc"]').fill(RUC);
    await page.locator('input[name="name"]').fill("Dueño E2E");
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="accept_legal"]').check();
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL("**/pago**");
    expect(sql("SELECT document, context FROM legal_consents WHERE company_id = (SELECT id FROM companies WHERE ruc = ?) ORDER BY document", RUC)).toEqual([
      { document: "privacy", context: "signup" },
      { document: "terms", context: "signup" },
    ]);
    // La razón social sale de la SUNAT (servidor simulado), no de lo que escribió el usuario.
    expect(sql("SELECT name, billing_status FROM companies WHERE ruc = ?", RUC)[0]).toMatchObject({
      name: "EMPRESA E2E S.A.C.",
      billing_status: "pending",
    });
  });

  await test.step("sin pagar no se entra al panel", async () => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/pago/);
  });

  await test.step("pago con MercadoPago simulado", async () => {
    await page.goto("/pago");
    await page.getByRole("button", { name: /Suscribirme con MercadoPago/ }).click();
    // Pasa por el servidor simulado, que autoriza y devuelve a /pago/resultado.
    await page.waitForURL("**/pago/resultado**");
    await expect(page.getByRole("heading", { name: /Suscripción confirmada/ })).toBeVisible();
    expect(sql("SELECT billing_status, subscription_status FROM companies WHERE ruc = ?", RUC)[0]).toMatchObject({
      billing_status: "active",
      subscription_status: "authorized",
    });
  });

  await test.step("onboarding crea bancos y documentos iniciales", async () => {
    await page.goto("/bienvenida");
    await page.getByRole("button", { name: "Tienda online / e-commerce" }).click();
    await page.getByRole("button", { name: /Continuar|Siguiente/ }).first().click();
    await page.getByRole("button", { name: /Continuar|Siguiente/ }).first().click();
    await page.getByRole("button", { name: /Continuar|Siguiente/ }).first().click();
    await page.locator('input[name="address"]').fill("Av. Prueba 123, Lima");
    await page.locator('input[name="phone"]').fill("+51 987 654 321");
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    const [{ slug: createdSlug }] = sql("SELECT slug FROM companies WHERE ruc = ?", RUC) as Array<{ slug: string }>;
    slug = createdSlug;
    expect(sql(`SELECT COUNT(*) n FROM data_banks WHERE ${OWN}`)[0].n).toBeGreaterThan(0);
  });

  await test.step("crear un banco de datos y marcarlo como inscrito", async () => {
    await page.goto("/app/bancos/nuevo");
    await page.locator('input[name="name"]').fill("Clientes E2E");
    await page.locator('textarea[name="purpose"]').fill("Vender y entregar pedidos");
    await page.locator('textarea[name="data_categories"]').fill("nombre, correo, teléfono");
    await submit(page, /Guardar banco de datos/);
    await page.waitForURL(/\/app\/bancos\/[^/]+$/);
    await page.locator('input[name="sipdp_code"]').fill("RNPDP-E2E-0001");
    await submit(page, /marcar como inscrito/);
    await expect(page.getByText("RNPDP-E2E-0001").first()).toBeVisible();
    expect(sql(`SELECT status FROM data_banks WHERE name = 'Clientes E2E' AND ${OWN}`)[0].status).toBe("registrado");
  });

  await test.step("publicar la política y verla en la página pública", async () => {
    await page.goto("/app/documentos?tab=politica");
    await page.getByRole("button", { name: "Publicar enlace público" }).click();
    await expect(page.getByRole("button", { name: "Ocultar enlace público" })).toBeVisible();
    const anonymous = await browser.newContext();
    const publicPage = await anonymous.newPage();
    await publicPage.goto(`http://localhost:3100/p/${slug}`);
    await expect(publicPage.getByText("EMPRESA E2E S.A.C.").first()).toBeVisible();
    await anonymous.close();
  });

  await test.step("un titular envía una solicitud ARCO desde la página pública", async () => {
    const anonymous = await browser.newContext();
    const visitor = await anonymous.newPage();
    await visitor.goto(`http://localhost:3100/solicitud/${slug}`);
    await visitor.locator('select[name="type"]').selectOption("acceso");
    await visitor.locator('input[name="requester_name"]').fill("Rosa Díaz");
    await visitor.locator('input[name="doc_number"]').fill("45871236");
    await visitor.locator('input[name="email"]').fill("rosa@example.com");
    await visitor.locator('textarea[name="description"]').fill("Quiero una copia de mis datos personales.");
    await visitor.getByRole("checkbox").check();
    await visitor.getByRole("button", { name: "Enviar solicitud gratuita" }).click();
    await expect(visitor.getByText(/ARCO-\d{4}-\d+/).first()).toBeVisible();
    await anonymous.close();
    expect(sql(`SELECT COUNT(*) n FROM arco_requests WHERE ${OWN}`)[0].n).toBe(1);
  });

  await test.step("los correos salen por el proveedor: acuse al titular, aviso al responsable y verificación", async () => {
    await flushMail();
    await flushMail(); // repetir la tarea no reenvía
    const mails = await sentMail();
    const subjects = (to: string) => mails.filter((m) => m.to === to).map((m) => m.subject);
    expect(subjects("rosa@example.com")).toEqual([expect.stringMatching(/Recibimos tu solicitud ARCO-/)]);
    expect(subjects(EMAIL)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Confirma tu correo/), expect.stringMatching(/Nueva solicitud ARCO/), expect.stringMatching(/Bienvenido/)])
    );
    const ack = mails.find((m) => m.to === "rosa@example.com")!;
    expect(ack.text).toMatch(/plazo legal/);
    expect(mails.filter((m) => m.to === "rosa@example.com")).toHaveLength(1);
  });

  await test.step("la bandeja muestra la solicitud y se responde dentro del plazo", async () => {
    await page.goto("/app/arco");
    await expect(page.getByText("Rosa Díaz").first()).toBeAttached();
    const [{ id }] = sql(`SELECT id FROM arco_requests WHERE ${OWN}`) as Array<{ id: string }>;
    await page.goto(`/app/arco/${id}`);
    await page.locator('textarea[name="response"]').fill("Adjuntamos la copia de sus datos. Puede reclamar ante la ANPD.");
    await submit(page, /Marcar como respondida/);
    await expect(page).toHaveURL(/ok=1/);
    const [request] = sql(`SELECT status, responded_at, due_at FROM arco_requests WHERE ${OWN}`);
    expect(request.status).toBe("respondido");
    expect(request.responded_at).toBeTruthy();
  });

  await test.step("incidente con criterios del art. 34.1 → notificado", async () => {
    await page.goto("/app/incidentes/nuevo");
    await page.locator('input[name="title"]').fill("Correo enviado a destinatario equivocado");
    await page.locator('input[name="criteria"][value="datos_sensibles"]').check({ force: true });
    await submit(page, /Registrar/);
    await page.waitForURL(/\/app\/incidentes\/[^/]+$/);
    await submit(page, /notificad|Notifiqué|Marcar/i);
    const [incident] = sql(`SELECT status, notified_at, criteria FROM incidents WHERE ${OWN}`);
    expect(incident.criteria).toBe("datos_sensibles");
    expect(incident.status).toBe("notificado");
    expect(incident.notified_at).toBeTruthy();
  });

  await test.step("regenerar la política no cambia la versión pública hasta publicar de nuevo", async () => {
    await page.goto("/app/documentos?tab=politica");
    await page.getByRole("button", { name: "Actualizar con mis últimos datos" }).click();
    await page.waitForURL(/ok=1/);
    await expect(page.getByText(/Tu enlace público muestra la versión 1/)).toBeVisible();
    await page.getByRole("button", { name: /Publicar la versión 2/ }).click();
    await expect(page.getByText(/Tu enlace público muestra la versión/)).toHaveCount(0);
    expect(sql(`SELECT published_version FROM documents WHERE kind = 'politica' AND ${OWN}`)[0].published_version).toBe(2);
    await expect(page.getByText("Historial de versiones")).toBeVisible();
  });

  await test.step("exportar un documento descarga un archivo con el contenido", async () => {
    await page.goto("/app/documentos?tab=politica");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar" }).first().click()]);
    expect(download.suggestedFilename()).toMatch(/\.(txt|md)$/);
  });

  await test.step("cancelar la suscripción conserva el acceso hasta el fin del período", async () => {
    await page.goto("/app/ajustes");
    await submit(page, /Cancelar suscripción/);
    await expect(page).toHaveURL(/ok=cancel/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app$/);
  });

  await test.step("al vencer el período, el panel redirige a /pago", async () => {
    sql("UPDATE companies SET paid_until = ? WHERE ruc = ?", new Date(Date.now() - 86_400_000).toISOString(), RUC);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/pago/);
  });

  await test.step("con la cuenta vencida aún se pueden descargar todos los datos", async () => {
    await page.goto("/cuenta");
    await expect(page.getByRole("heading", { name: "Mis datos" })).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Descargar mis datos/ }).click()]);
    expect(download.suggestedFilename()).toBe(`expediente-${slug}.json`);
    const data = JSON.parse(await fs.readFile((await download.path())!, "utf8"));
    expect(data.company.ruc).toBe(RUC);
    expect(data.arco_requests).toHaveLength(1);
    expect(data.document_versions.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(data)).not.toContain("password_hash");
  });

  await test.step("olvidé mi contraseña: el enlace del correo permite elegir una nueva", async () => {
    const anonymous = await browser.newContext();
    const visitor = await anonymous.newPage();
    await visitor.goto(`${APP}/olvide`);
    await visitor.locator('input[name="email"]').fill(EMAIL);
    await visitor.getByRole("button", { name: "Enviarme el enlace" }).click();
    await expect(visitor.getByText(/Si existe una cuenta/)).toBeVisible();
    await flushMail();
    const reset = (await sentMail()).filter((m) => m.to === EMAIL && /Restablece/.test(m.subject)).at(-1)!;
    await visitor.goto(linkIn(reset.text));
    await visitor.locator('input[name="password"]').fill(NEW_PASSWORD);
    await visitor.getByRole("button", { name: "Guardar contraseña" }).click();
    await visitor.waitForURL(/\/login\?restablecida=1/);
    // El enlace es de un solo uso.
    await visitor.goto(linkIn(reset.text));
    await visitor.locator('input[name="password"]').fill("otra-clave-segura-99");
    await visitor.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(visitor.getByText(/no es válido o ya venció/)).toBeVisible();
    // La contraseña vieja ya no sirve; la nueva sí, y lleva a /pago por estar vencida.
    await visitor.goto(`${APP}/login`);
    await visitor.locator('input[name="email"]').fill(EMAIL);
    await visitor.locator('input[name="password"]').fill(PASSWORD);
    await visitor.getByRole("button", { name: "Entrar" }).click();
    await expect(visitor.getByText(/Correo o contraseña incorrectos/)).toBeVisible();
    // React vacía el formulario tras la acción: se vuelve a escribir todo.
    await visitor.locator('input[name="email"]').fill(EMAIL);
    await visitor.locator('input[name="password"]').fill(NEW_PASSWORD);
    await visitor.getByRole("button", { name: "Entrar" }).click();
    await visitor.waitForURL(/\/pago/);
    await anonymous.close();
  });

  await test.step("eliminar la cuenta borra los datos y apaga las páginas públicas", async () => {
    // Restablecer la contraseña cerró todas las sesiones, incluida la de esta pestaña.
    await page.goto("/cuenta");
    await expect(page).toHaveURL(/\/login/);
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/pago/);
    await page.goto("/cuenta");
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="confirm"]').fill("ELIMINAR");
    await page.getByRole("button", { name: /Eliminar mi cuenta y mis datos/ }).click();
    await expect(page.getByText(/no es correcta/)).toBeVisible();
    // El formulario se vacía tras la acción: se vuelve a escribir todo.
    await page.locator('input[name="confirm"]').fill("ELIMINAR");
    await page.locator('input[name="password"]').fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /Eliminar mi cuenta y mis datos/ }).click();
    await page.waitForURL(/\/\?cuenta=eliminada/);

    expect(sql(`SELECT COUNT(*) n FROM arco_requests WHERE ${OWN}`)[0].n).toBe(0);
    expect(sql(`SELECT COUNT(*) n FROM documents WHERE ${OWN}`)[0].n).toBe(0);
    expect(sql("SELECT COUNT(*) n FROM users WHERE email = ?", EMAIL)[0].n).toBe(0);
    expect(sql("SELECT billing_status, deleted_at FROM companies WHERE ruc = ?", RUC)[0]).toMatchObject({ billing_status: "deleted" });

    const anonymous = await browser.newContext();
    const visitor = await anonymous.newPage();
    expect((await visitor.goto(`${APP}/p/${slug}`))!.status()).toBe(404);
    expect((await visitor.goto(`${APP}/solicitud/${slug}`))!.status()).toBe(404);
    await anonymous.close();

    await flushMail();
    expect((await sentMail()).some((m) => m.to === EMAIL && /Eliminamos tu cuenta/.test(m.subject))).toBe(true);
  });
});
