# Cobro y facturación

Fuente de verdad del comportamiento de cobro. El código vive en `src/lib/{billing,subscriptions,transfers,invoicing,mercadopago}.ts`.

## Medios de pago

| Medio | Para quién | Cómo se activa el plan |
|---|---|---|
| **Tarjeta (suscripción MercadoPago)** | Mensual o anual, cobro automático | Webhook `subscription_preapproval` autorizado → periodo inicial; cada `subscription_authorized_payment` aprobado → registra el cobro |
| **Transferencia con factura** | Clientes que no pagan con tarjeta (sobre todo anual) | `/pago` → «Pagar por transferencia» → el operador emite la factura y, al llegar el dinero, confirma en `/operador` |
| Yape / Plin | **No se ofrecen**: son billeteras personales, sin cobro recurrente | — |

Los precios del catálogo **incluyen IGV (18 %)**. La factura desglosa base e IGV (`splitIgv`).

## Periodos

- Mensual = 1 mes de calendario; anual = 12 meses de calendario (`addMonths`, 31 ene + 1 mes = fin de febrero). No se usan días fijos: MercadoPago renueva por meses.
- `paid_until` solo avanza con un cobro aprobado o una transferencia confirmada. Un cobro repetido (mismo `payment_id`) no extiende otra vez; la base lo impide con un índice único.
- Un reembolso o contracargo resta el periodo que cubría ese cobro: si el periodo ya se consumió, `paid_until` queda en el pasado y la cuenta pasa a vencida en la siguiente pasada de `billing-reconcile`.

## Eventos y efectos

| Evento | Efecto en la cuenta | Comprobante | Correo |
|---|---|---|---|
| Suscripción autorizada (nueva) | activa; periodo inicial una sola vez | — | `welcome` |
| Primer cobro aprobado tras autorizar | registra el pago; **no** extiende (ya cubierto) | factura pendiente | `payment_receipt` |
| Cobro aprobado (renovación) | `paid_until` + 1 o 12 meses | factura pendiente | `payment_receipt` |
| Cobro rechazado | sin cambio; sigue activo hasta `paid_until` | — | `payment_failed` |
| Suscripción pausada / cancelada | estado de suscripción; acceso hasta `paid_until` | — | `subscription_cancelled` |
| Cobro reembolsado / contracargado | `paid_until` − periodo del cobro; pago `refunded` | pendiente → anulada; emitida → **nota de crédito manual** (queda en actividad) | `payment_refunded` |
| Transferencia pedida | pago `pending`, sin activar | factura pendiente | `transfer_instructions` |
| Factura registrada | — | `issued` con serie y número | `invoice_issued` |
| Transferencia confirmada | activa/renueva; `paid_until` + periodo | — | `payment_receipt` |
| `paid_until` vencido | `billing_status = expired` (tarea `billing-reconcile`) | — | `subscription_expiring` / `lapsed_notice` |

Los webhooks se registran en `webhook_events` (tipo, id, resultado y error; se purgan a los 180 días). Un fallo
transitorio devuelve 500 para que MercadoPago reintente; un rechazo definitivo (suscripción de otra empresa, monto
que no coincide) se responde 200 y queda en el registro. Lo que se pierda lo cubre la tarea `billing-sync` (cada
6 h): corrige cancelaciones o pausas sin webhook y **activa** las suscripciones que MercadoPago ya autorizó pero
cuya notificación nunca llegó (si no, el cliente pagaría y seguiría sin acceso).

## Facturación (SUNAT)

- Todo pago crea un comprobante `pending` con RUC, razón social y domicilio fiscal de la empresa.
- **Hoy se emite a mano**: el operador (correos en `OPERATOR_EMAILS`) abre `/operador`, emite la factura en la SUNAT (SEE-SOL) o en un PSE, y registra serie, número y enlace https al PDF. El cliente la recibe por correo y la ve en Ajustes.
- La Clave SOL **nunca** entra a la aplicación.
- Una factura emitida no se reemite; serie+número son únicos, y la base lo garantiza con el índice `uq_invoices_number`
  (dos operadores no pueden registrar el mismo comprobante a la vez).
- **Los comprobantes se conservan al eliminar la cuenta** (obligación tributaria): la empresa queda anonimizada, pero la
  factura mantiene RUC, razón social, monto y desglose de IGV. Aparecen en la exportación de datos y en la política de
  retención; no entran en el borrado de datos personales.
- MercadoPago rechaza con 400 un `reason` de más de 60 caracteres; `subscriptionReason` lo recorta.
- Para automatizar: un proveedor con API (PSE/OSE) solo reemplaza el paso manual de `pending → issued` (`markInvoiceIssued`).
- La tarea `billing-sync` avisa por `ALERT_EMAIL` si hay facturas sin emitir con más de 3 días.

## Pendiente

- Periodo de gracia y recordatorios de cobro fallido: hoy solo hay un aviso (`payment_failed`) y el acceso sigue hasta `paid_until`.
- Notas de crédito: manuales.
- **Sandbox: ya se puede probar un pago completo.** Ver `docs/MERCADOPAGO-SANDBOX.md` (cuentas de prueba, app de sandbox con
  sus tokens, procedimiento y errores conocidos). Resumen de la regla: pagador y cobrador deben ser **los dos de prueba** o
  **los dos reales**; el cobrador lo define el token, así que para probar con el comprador de prueba hay que usar el token de la
  **app creada en la cuenta del vendedor de prueba**, no el de la app real.
  - Probado el 2026-11-01: preapproval `1ef40d72…` **authorized**, cobro `7033448209` **processed**, pago `186118673805`
    **approved**, S/ 19 PEN, tarjeta de prueba `5031 7557 3453 0604`.
  - En producción el comprador **no necesita cuenta de MercadoPago**: el checkout permite «continuar sin cuenta» y pagar con
    tarjeta, Yape o dinero en cuenta. Lo que sí exige MercadoPago es una **cuenta de vendedor** (la del negocio).
  - Falta del lado de la app: el webhook de la app de sandbox (ver §8 del documento de sandbox) para ver la empresa activarse
    y el comprobante crearse con un pago real de sandbox.
  - MercadoPago rechaza con 400 «reason has more than 60 characters» si el `reason` pasa de 60; `subscriptionReason` lo recorta.
- Firma `x-signature`: el formato coincide con la documentación; se agregó la regla de minúsculas para ids alfanuméricos. Falta confirmarla con un evento real del sandbox.
- Prueba en vivo: un cobro real de S/ 19 con reembolso, y verificar la factura.
