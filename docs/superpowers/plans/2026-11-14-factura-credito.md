# Pago con factura a crédito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A business with a verified RUC 20 can choose "Pagar con factura a 15 días" for the annual plan and gets access at once. The founder issues the factura manually in SUNAT and records it in `/operador`; the due date starts then. The customer gets reminders before, on and after the due date. Seven days after the due date the account becomes read-only until the founder confirms the payment.

**Architecture:** This extends the existing "transferencia con factura" flow (`src/lib/transfers.ts`, `src/lib/invoicing.ts`). A credit payment is a `transfer` payment with `credit = 1`. It activates the plan when requested, not when confirmed, and gets `due_at` when its invoice is marked issued. An overdue credit makes the account read-only, using the same mechanism as the demo company: pages are viewable, server actions redirect. A daily job sends the reminders.

**Tech Stack:** Next.js 16, TypeScript, `node:sqlite`, vitest, Playwright, pnpm.

**Spec (agreed with the founder in chat, 14.11.2026):**
- Payment before access stays. Credit is an exception for businesses that are used to paying invoices on terms.
- Eligibility: RUC starting with `20`, verified with SUNAT (`ruc_verified_at` set), annual plan only, not the demo, no other open credit, and no unpaid overdue credit.
- The founder keeps issuing the factura manually in SUNAT (SEE-SOL) and records series, number and PDF link in `/operador`, as today. The factura's payment term is "Crédito", one instalment, due in 15 days.
- Access is immediate when the customer chooses credit. The due date is the invoice issue date + 15 days. While the invoice is not issued, there is no due date and the account can't become overdue. The existing `billing-sync` alert already covers invoices not issued after 3 days.
- Reminders by email: 3 days before the due date, on it, 3 days after, and when the account becomes read-only (due + 7 days).
- At due + 7 days the account becomes read-only: viewable, nothing editable, and the customer's public pages (privacy policy, ARCO form) keep working. Data subjects must not lose their channel because of a billing dispute.
- When the founder confirms the transfer in `/operador`, full access returns at once.
- Reminders need an email provider. Production has none yet (`MAIL_PROVIDER` unset), so emails queue until it is configured. That is an activity on the board, not part of this plan.

## Global Constraints

- All user-facing text is in Spanish (Peru). Amounts are shown with `formatSol`; prices include IGV.
- No new dependencies. Schema changes go through `migrate()` with `SCHEMA_VERSION` raised from 17 to 18.
- Every server action that writes data uses `requireActiveSession`. The read-only state must be enforced there, not only in the UI.
- Money and access logic stays covered by the coverage floor (`src/lib/billing.ts`, `src/lib/jobs.ts`, `src/lib/mail.ts` are measured). New files `src/lib/credit.ts` and `src/lib/transfers.ts` get tests to the same level.
- `CREDIT_DAYS = 15`, `CREDIT_GRACE_DAYS = 7`, `CREDIT_REMINDER_DAYS = [-3, 0, 3]` (relative to `due_at`), eligible terms: `["yearly"]`.
- The credit option is only offered when `TRANSFER_BANK_DETAILS` is set, because the customer needs to know where to pay.
- Update `docs/BILLING.md` (payment methods table, events table) and `docs/RUNBOOK.md` (cron line).

## Review Focus

1. **The founder records the invoice late.** The customer had access since the request, and `due_at` counts from the issue date. They must never be read-only before the invoice exists.
2. **Confirming a credit transfer.** It must not extend `paid_until` a second time: the period was granted when the credit was requested.
3. **A customer with an overdue credit asks for another credit or another plan.** Refuse it with a clear message, and don't let them escape read-only by starting a new credit.
4. **Read-only must not break the customer's public pages** (`/p/[slug]`, the ARCO form) or the operator's view of the account.
5. **Reminders run twice in a day** (job retry). Exactly one email per stage per payment, using a dedupe key with the payment id and stage.

---

### Task 1: Schema and the credit rules

**Files:**
- Modify: `src/lib/db.ts`: `SCHEMA_VERSION = 18`; `migrate()` adds `payments.credit INTEGER NOT NULL DEFAULT 0` and `payments.due_at TEXT`; `PaymentRow` type in `src/lib/billing.ts` gains `credit: number; due_at: string | null`.
- Create: `src/lib/credit.ts`
- Test: `test/credit.test.ts`

**Interfaces (produces):**
- `CREDIT_DAYS`, `CREDIT_GRACE_DAYS`, `CREDIT_REMINDER_DAYS`, `CREDIT_TERMS: BillingTerm[] = ["yearly"]`
- `type CreditEligibility = { ok: true } | { ok: false; reason: string }`
- `creditEligibility(company: Company, now?: Date): CreditEligibility`. Reasons, in this order:
  1. «El pago con factura a crédito no está disponible.»: transfer not configured.
  2. «La cuenta de demostración no puede pagar.»
  3. «El pago a crédito es solo para empresas con RUC 20 verificado en la SUNAT.»
  4. «Ya tienes una factura a crédito pendiente de pago.»: any pending credit payment.
  5. «Tu cuenta ya tiene una suscripción con tarjeta. Cancélala antes de pagar por transferencia.»
- `creditDueAt(issuedAt: string): string`: issue date + `CREDIT_DAYS` days, ISO.
- `getOpenCredit(companyId: string): PaymentRow | undefined`: pending payment with `credit = 1`.
- `isCreditOverdue(companyId: string, now?: Date): boolean`: true only when an open credit has `due_at` and `now >= due_at + CREDIT_GRACE_DAYS`.

- [ ] **Step 1: Failing tests** in `test/credit.test.ts`:
  - `"elegible: RUC 20 verificado, transferencia configurada"`
  - `"no elegible: RUC 10, RUC sin verificar, demo, suscripción con tarjeta autorizada, crédito ya abierto"`: each with its exact reason.
  - `"creditDueAt suma 15 días"`: `creditDueAt("2026-11-14T15:00:00.000Z") === "2026-11-29T15:00:00.000Z"`.
  - `"sin factura emitida (due_at null) nunca está vencida"`
  - `"vencida solo desde due_at + 7 días"`: false at due + 6 d 23 h, true at due + 7 d.
  - `"la migración agrega credit y due_at con valores por defecto"`: an existing payment row gets `credit = 0`, `due_at = null`.
- [ ] **Step 2:** `npx vitest run test/credit.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement the schema change and `src/lib/credit.ts` (queries with `getDb()`; eligibility uses `isTransferConfigured()`).
- [ ] **Step 4:** Same command → PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(cobro): reglas y esquema del pago con factura a crédito`.

### Task 2: Requesting credit, issuing the invoice, confirming the payment

**Files:**
- Modify: `src/lib/transfers.ts` (new `requestCreditInvoice`; `confirmTransferPaid` handles credit); `src/lib/invoicing.ts` (`markInvoiceIssued` sets `due_at` on a credit payment); `src/lib/mail-templates.ts` (template `credit_invoice_requested`, essential: plan, amount, reference, bankDetails, days)
- Test: `test/credit-flow.test.ts`; `test/mail.test.ts` (template count + sample)

**Interfaces:**
- Consumes: Task 1.
- Produces: `requestCreditInvoice(company: Company, plan: PlanId): TransferRequestResult`:
  - checks `creditEligibility`;
  - inserts a payment with `provider = 'transfer'`, `credit = 1`, `status = 'pending'`, term `yearly`, amount `checkoutCharge(company.id, plan).amount`, reference `DP-XXXXXX` (same format as transfers);
  - calls `createInvoiceForPayment`;
  - activates the company at once: `billing_status = 'active'`, `paid_until = nextPaidUntil(company.paid_until, now, 12)`, plan, `billing_term = 'yearly'`;
  - logs the activity;
  - sends `credit_invoice_requested`.
- `markInvoiceIssued` on a credit payment also sets `payments.due_at = creditDueAt(issued_at)`, and adds `dueDate` to the `invoice_issued` email payload (template shows «Vence el …» when present).
- `confirmTransferPaid` on a credit payment approves it but does **not** change `paid_until` or `plan`, and sends `payment_receipt` with the existing `paid_until`.

- [ ] **Step 1: Failing tests** in `test/credit-flow.test.ts`:
  - `"pedir crédito activa la cuenta al instante por 12 meses y deja la factura pendiente"`
  - `"no elegible: no crea pago ni activa"` (RUC 10)
  - `"registrar la factura fija el vencimiento a 15 días de la emisión"`
  - `"confirmar el pago de un crédito no extiende paid_until"`: `paid_until` is unchanged and the payment becomes `approved`.
  - `"confirmar dos veces no aplica dos veces"`: the existing idempotence holds for credit.
  - `"no se puede pedir un segundo crédito con uno abierto"`
  - `test/mail.test.ts`: the template count goes up by one, and the sample renders the amount and reference.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS, plus `npx vitest run test/billing*.test.ts test/transfers*.test.ts` stays green.
- [ ] **Step 5: Commit** `feat(cobro): pedir factura a crédito activa al instante; el vencimiento corre desde la emisión`.

### Task 3: Read-only while overdue

**Files:**
- Modify: `src/lib/auth.ts`. In `requireActiveSession`, after the demo check: `if (isCreditOverdue(session.company.id)) redirect("/app?pago=vencido")`. Viewing pages is not affected, because `src/app/app/layout.tsx` only checks `isCompanyActive`.
- Modify: `src/app/app/layout.tsx`: a banner when `isCreditOverdue`: «Tu factura a crédito venció el {fecha}. Tu cuenta queda en solo lectura hasta registrar el pago. Tus páginas públicas siguen activas.» with a link to `/pago`.
- Test: `test/credit-readonly.test.ts`

**Interfaces:** Consumes `isCreditOverdue`, `getOpenCredit` (Task 1).

- [ ] **Step 1: Failing tests:**
  - `"vencida: una acción que escribe redirige a /app?pago=vencido"`: call a real action, for example `createBankAction`, with the company in an overdue credit; expect `REDIRECT:/app?pago=vencido` and no row written.
  - `"vencida: la página pública /p/[slug] y el formulario ARCO siguen funcionando"`: the public ARCO submission still creates the request.
  - `"antes de due_at + 7 días las acciones funcionan"`
  - `"al confirmar el pago vuelve el acceso completo"`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `npx vitest run test/route-guards.test.ts` green.
- [ ] **Step 5: Commit** `feat(cobro): factura a crédito vencida deja la cuenta en solo lectura`.

### Task 4: Payment page and operator panel

**Files:**
- Modify: `src/app/pago/actions.ts`: new `requestCreditAction(formData)`. It follows the same steps as the transfer action (cancel a pending MercadoPago subscription first), then calls `requestCreditInvoice`, then redirects to `/app?credito=ok`, or to `/pago?error=credit&detail=…` on failure.
- Modify: `src/app/pago/page.tsx`: when `creditEligibility(company).ok` and the chosen term is annual, show a third option «Pagar con factura a 15 días (empresas)» with one line: «Acceso inmediato. Te enviamos la factura por correo; tienes 15 días desde su emisión para transferir.»
- Modify: `src/app/operador/page.tsx`: the pending transfers list marks credit rows («Crédito») with the due date, or «sin emitir» when there is none, and «VENCIDA» in red once overdue.
- Test: `test/credit-pages.test.ts` (render the pages as in `test/legal-changes-pages.test.ts`); `e2e/journey.spec.ts` stays green.

- [ ] **Step 1: Failing tests:**
  - `"/pago muestra la opción de crédito solo a RUC 20 verificado y plan anual"`
  - `"requestCreditAction activa y lleva a /app?credito=ok"`
  - `"el operador ve el crédito con su vencimiento y VENCIDA cuando corresponde"`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; on the server, `CI=true pnpm test:e2e --project=chromium` green.
- [ ] **Step 5: Commit** `feat(cobro): opción de factura a crédito en /pago y seguimiento en /operador`.

### Task 5: Reminders job

**Files:**
- Modify: `src/lib/jobs.ts`: job `credit-reminders` (daily) and `JOB_MAX_AGE_HOURS["credit-reminders"] = 26`.
- Modify: `src/lib/mail-templates.ts`: templates `credit_due_soon`, `credit_due_today`, `credit_overdue`, `credit_readonly`, all essential, with fields `amount`, `invoice` (series-number), `dueDate`, `path: "/pago"`.
- Modify: `deploy/cron.d-datosprivados`: `0 * * * * root /usr/local/bin/datosprivados-cron credit-reminders --at 09:00`. Keep `test/deploy-artifacts.test.ts` green, and reinstall the cron file on the server at deploy.
- Modify: `docs/BILLING.md`, `docs/RUNBOOK.md`.
- Test: `test/credit-reminders.test.ts`; `test/mail.test.ts`

**Interfaces:** Consumes Tasks 1–2. For each open credit with `due_at`, the stage for `now` is:

| When | Stage |
|---|---|
| `due − 3 d` | `soon` |
| `due` | `today` |
| `due + 3 d` | `overdue` |
| `due + 7 d` | `readonly` |

Within a stage's day window it sends one email, with dedupe key `credit:<paymentId>:<stage>`.

- [ ] **Step 1: Failing tests:**
  - `"envía cada etapa una vez y en su día"`: simulate dates from `due − 4 d` to `due + 8 d`; exactly 4 emails in total, one per stage.
  - `"correr dos veces el mismo día no duplica"`
  - `"sin factura emitida no envía nada"`
  - `"un crédito pagado no recibe recordatorios"`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; full suite green.
- [ ] **Step 5: Commit** `feat(cobro): recordatorios de factura a crédito`.

### Task 6: Ship

- [ ] Run `pnpm typecheck && pnpm lint && npx vitest run` and the chromium E2E on the server, all green.
- [ ] Push `feat/factura-credito`, open the PR, merge without waiting for GitHub (the founder's pre-launch rule), deploy, and reinstall `/etc/cron.d/datosprivados`.
- [ ] Smoke test in production with the founder's own RUC 20 account. Request credit; the account is active. Record a test invoice in `/operador`; the due date is shown. Then confirm the payment.
- [ ] Tell the founder: reminders queue until the email provider is set up.
