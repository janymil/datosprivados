# Sandbox de MercadoPago — cómo probar un pago de punta a punta

Estado: **probado y funcionando el 2026-11-01** (pago de S/ 19 aprobado con tarjeta de prueba).
Este documento existe para que el próximo agente no repita la caminata: incluye la regla que rompe todo,
el procedimiento paso a paso y los errores ya vistos.

> ⚠️ **Todo lo de aquí es de PRUEBA.** No usar estos tokens en producción y no mezclarlos con la app real.
>
> 🔒 **Este repositorio es público: las credenciales no se versionan.** Tokens, llaves, contraseñas y códigos de
> las cuentas de prueba aparecen aquí como `<...>`; se copian del panel de MercadoPago
> (`https://www.mercadopago.com.pe/developers/panel/app/<APP_ID>/credentials`) y se pasan por variables de
> entorno o por `/etc/datosprivados.env` (modo 600), nunca por el repositorio. Si alguna credencial de prueba
> llegó a un commit, a un chat o a un log, se rota desde *Cuentas de prueba → regenerar contraseña* y
> *Credenciales → renovar*.

## 1. La regla que rompe todo

MercadoPago exige que **pagador y cobrador sean del mismo tipo**: los dos reales o los dos de prueba.
El **cobrador lo define el access token** que crea la suscripción, no el `payer_email`.

| Combinación | Resultado |
|---|---|
| token de app **real** + pagador **de prueba** | `400 Both payer and collector must be real or test users` |
| token de app **real** + pagador **real** (el correo del titular) | funciona, pero MP envía correos reales al titular |
| token de app **de prueba** + pagador **de prueba** | ✅ **funciona** (esto es lo que hay que usar) |

Mensajes textuales que verás y qué significan:

| Mensaje | Causa |
|---|---|
| `400 User bad request` | el `payer_email` no es un usuario de prueba válido (formato equivocado) |
| `400 Both payer and collector must be real or test users` | mezcla prueba/real |
| checkout: «Tu e-mail no coincide con el de la suscripción» | compraste como invitado con un correo distinto al `payer_email` |
| checkout: «Una de las partes con la que intentas hacer el pago es de prueba» | mezcla prueba/real (el caso típico: token real + comprador de prueba) |
| checkout: «Tu tarjeta rechazó el pago» sin registro de pago | el pagador no está logueado como su cuenta de prueba |
| `400 reason has more than 60 characters` | el campo `reason` de la suscripción tiene un tope de 60 |

## 2. Cuentas de prueba (site `MPE`)

| Rol | Usuario (login) | Contraseña | Código de verificación | User ID | Correo del usuario de prueba |
|---|---|---|---|---|---|
| **Vendedor** | `TESTUSER…` (usuario de prueba) | `<contraseña>` | `<últimos 6 dígitos del User ID>` | `3789173769` | `test_user_<dígitos del nickname>@testuser.com` |
| **Comprador** | `TESTUSER…` (usuario de prueba) | `<contraseña>` | `<últimos 6 dígitos del User ID>` | `3770366950` | `test_user_<dígitos del nickname>@testuser.com` |

Notas:

- El **código de verificación son los últimos 6 dígitos del User ID** (`3789173769` → `173769`, aquí enmascarado).
- Se entra con el **usuario** (`TESTUSER…`), no con el correo, en el campo «E-mail o teléfono».
- El `payer_email` de la API **no** es el correo con el User ID: es `test_user_<dígitos del nickname>@testuser.com`.
  Con la variante del User ID (`test_user_3770366950@…`) la preapproval se crea (201) pero **no** es un pagador de prueba válido
  y el cobro falla. Con `@testuser.com.pe` tampoco: el dominio correcto para MPE es `@testuser.com`.

## 3. App de sandbox (creada dentro de la cuenta del vendedor de prueba)

| Dato | Valor |
|---|---|
| Nombre | `App-Suscripciones-20261101-550b64456f` |
| App ID | `5481905782596403` |
| Access Token (prueba) | `<TEST-…>` — se copia del panel, no se versiona |
| Public Key (prueba) | `<TEST-…>` — se copia del panel, no se versiona |
| Access Token «producción» de esa cuenta | `<APP_USR-…>` — se copia del panel, no se versiona |
| Panel | `https://www.mercadopago.com.pe/developers/panel/app/5481905782596403` |

Ojo: para una **cuenta de prueba**, MercadoPago dice que se usan «las credenciales de producción de la cuenta de prueba»;
la pestaña *Credenciales de prueba* puede devolver «Algo salió mal». Abre directamente
`https://www.mercadopago.com.pe/developers/panel/app/<APP_ID>/credentials/production` y copia el token `TEST-…`.


## 4. Procedimiento completo (lo que funcionó)

### 4.1 Entrar al panel como vendedor de prueba

Sin esto no hay app de sandbox: el panel del **titular real** no sirve para crear un cobrador de prueba.

1. `https://www.mercadopago.com.pe/developers/panel/app` → redirige al login.
2. Campo `input[name="identifier"]` → **usuario** de prueba del vendedor (`TESTUSER…`) → *Continuar*.
3. Aparece «Elige un método de verificación»: hay que hacer click en el **`<li>` que contiene «Contraseña»**
   (no en el texto suelto: el `<span>` está interceptado por el `<a>` de la tarjeta).
4. Campo `input[type="password"]` → contraseña de esa cuenta de prueba → Enter.
5. Si pide código: los últimos 6 dígitos del User ID del vendedor.

> El login de MercadoPago tiene **reCAPTCHA**. Funciona con un navegador real bajo Xvfb
> (`xvfb-run -a node script.mjs` con `headless: false` y `launchPersistentContext`), no con `headless: true`.

### 4.2 Crear la aplicación (una sola vez; ya está creada)

1. `https://www.mercadopago.com.pe/developers/panel/app/create-app`
2. Solución: **Suscripciones** (no Checkout Pro: el producto usa preapproval).
3. Nombre: `datosprivados-suscripciones` (o cualquiera) → marcar el consentimiento → **Crear aplicación**.
4. Si el botón no responde al click normal, hacer click por **coordenadas reales** (`boundingBox` + `page.mouse.click`);
   el click con Playwright a veces resetea el asistente.
5. Al crearse, la URL pasa a `/developers/panel/app/<APP_ID>` y muestra el **User ID de la cuenta de prueba**.

### 4.3 Crear la suscripción (API)

```js
POST https://api.mercadopago.com/preapproval
Authorization: Bearer TEST-5481905782596403-…
{
  "reason": "DatosPrivados Básico — suscripción mensual",   // ≤ 60 caracteres
  "external_reference": "<id de la empresa>",
  "payer_email": "test_user_1661363617922294651@testuser.com",
  "auto_recurring": { "frequency": 1, "frequency_type": "months", "transaction_amount": 19, "currency_id": "PEN" },
  "back_url": "https://datosprivados.registio.app/pago/resultado",
  "status": "pending"
}
```

La respuesta debe traer `collector_id: 3789173769` (vendedor de prueba) y `application_id: 5481905782596403`.
Si trae el collector real (`359456108`), estás usando el token equivocado.

### 4.4 Pagar en el checkout

1. Abrir `init_point`.
2. **Ingresar con mi cuenta** → usuario de prueba del comprador (`TESTUSER…`) → `<li>Contraseña</li>` →
   contraseña de esa cuenta → (los últimos 6 dígitos de su User ID si pide código).
3. Volverás al checkout con «Dinero disponible … S/ 2,000» (saldo ficticio de la cuenta de prueba).
4. **Tarjeta** → `5031 7557 3453 0604` · `123` · `11/30` · titular `APRO` · documento `123456789`.
5. **Continuar** → **Confirmar**.

Resultado esperado: pantalla «**Pagaste S/ 19**» y URL `…/checkout/congrats?collection_id=…&collection_status=approved`.

> Los campos de tarjeta viven en iframes de `secure-fields.mercadopago.com` (`input[name="cardNumber"]`,
> `expirationDate`, `securityCode`). Un overlay intercepta los clicks: hay que usar `focus()` + `page.keyboard.type()`
> (o `fill(valor, { force: true })`), nunca `click()` sobre el input.

### 4.5 Verificar

```js
GET /preapproval/{id}                            → status: "authorized", summarized.charged_amount: 19, semaphore: "green"
GET /authorized_payments/search?preapproval_id=… → 1 resultado: status "processed", payment.status "approved"
```

## 5. Prueba de referencia (2026-11-01)

| Dato | Valor |
|---|---|
| Preapproval | `1ef40d72637f4036ab046b33f65d3520` — `authorized` |
| Cobrador / pagador | `3789173769` (vendedor de prueba) / `3770366950` (comprador de prueba) |
| Monto | S/ 19 · PEN · 1 mes · `master` |
| Próximo cobro | `2026-11-30` |
| Authorized payment | `7033448209` — `processed` |
| Payment | `186118673805` — `approved` |
| Pantalla final | «Pagaste S/ 19 · Mastercard **** 0604 · Próximos cobros: 1 de diciembre» |

## 6. Tarjetas de prueba (`MPE`)

| Tipo | Bandera | Número | CVV | Vence |
|---|---|---|---|---|
| Crédito | Mastercard | `5031 7557 3453 0604` | 123 | 11/30 |
| Crédito | Visa | `4009 1753 3280 6176` | 123 | 11/30 |
| Crédito | Amex | `3711 803032 57522` | 1234 | 11/30 |
| Débito | Mastercard | `5178 7816 2220 2455` | 123 | 11/30 |

El **nombre y documento del titular** deciden el resultado: `APRO` + `123456789` → aprobado;
`OTHE` → rechazado; `CONT` → pendiente; `CALL`, `FUND`, `SECU`, `EXPI`, `FORM`, `CARD`, `DUPL`, `LOCK`, `TEST` → rechazos tipificados.

## 7. MCP server de MercadoPago (ayuda, pero no hace el pago)

`https://mcp.mercadopago.com/mcp` acepta el **access token** como `Authorization: Bearer …` y habla MCP (JSON-RPC sobre SSE).
Herramientas útiles: `application_list`, `create_test_user`, `save_webhook`, `notifications_history`,
`quality_evaluation` (pide un pago de prueba reciente), `search_documentation` (fuente de las tablas de tarjetas por país).
`get_credentials` y `create_application` **solo funcionan por OAuth**; el registro dinámico de cliente que publica su
`.well-known` está deshabilitado (`MCP name not found or invalid`), así que no sirve para sacar credenciales.
Ojo: el MCP actúa con la cuenta del token que le pases — con el token de la app real, `application_list` devuelve
la app real (por eso conviene usar el token de la app de sandbox al consultar).

## 8. Lo que falta: webhook del lado de la app

La app de sandbox (`5481905782596403`) **no tiene webhook configurado**, así que el pago aprobado no llegó a
`/api/mercadopago/webhook` y la empresa no se activó. Para completar el ciclo:

1. En el panel de esa app: `Webhooks` → URL `https://datosprivados.registio.app/api/mercadopago/webhook`
   (o `save_webhook` del MCP con el token de sandbox), y copiar el **secreto**.
2. Levantar la app con ese token y ese secreto:
   `MERCADOPAGO_ACCESS_TOKEN=TEST-5481905782596403-… MERCADOPAGO_WEBHOOK_SECRET=<secreto> DATOSPRIVADOS_DB=<copia> next start -p 3100`
   (los valores de `.env` no pisan las variables de entorno del proceso, así que se puede probar sin tocar `.env`).
3. Repetir 4.3–4.4 con `external_reference` = id de una empresa de **esa** base.
4. Verificar: `webhook_events` con `outcome = 200`, `companies.billing_status = 'active'`, `paid_until`,
   y `invoices` con el comprobante pendiente.

> El `.env` del repo apunta a la app **datosprivados** (`3074648001982681`) con sus credenciales de prueba; no lo cambies
> para probar. Usa variables de entorno o una copia del `.env`, y vuelve a dejarlo como estaba.

## 9. Buenas prácticas / trampas ya pagadas

- **No canceles** una preapproval cuyo `payer_email` sea el correo del titular real: MercadoPago le manda un correo
  por cada cancelación (pasó: 12 correos). Las de pagador de prueba no generan correos al titular.
- Cada intento deja objetos en la cuenta: anota el `id` y cancélalos al final.
- El token de la app real sirve para cobrar de verdad; **el sandbox se hace siempre con el token de la app de prueba**.
- Un pago rechazado no crea `payment`: si `/v1/payments/search` da 0, el problema fue de pagador/tarjeta, no de la app.
- El `reason` de la preapproval tiene tope de 60 caracteres (en el código: `subscriptionReason`).
- La pantalla de login de MP no avanza en modo headless ni con `form.requestSubmit()`: hace falta navegador real (Xvfb)
  y, si el botón no responde, click por coordenadas.

## 10. Referencias

- `docs/BILLING.md` — comportamiento de cobro, estados y facturación.
- `docs/RUNBOOK.md` — operación, cron y respaldos.
- Documentación MP: *Cuentas de prueba*, *Tarjetas de prueba*, *Suscripciones* (`mercadopago.com.pe/developers`).
- MCP Server: `https://mcp.mercadopago.com` · `https://mcp.mercadopago.com/mcp`.

