# DatosPrivados — Stage assessment and dev → production roadmap

**Audience:** AI coding agents (and humans) who will continue developing this app.
**Written:** 2026-10-31, from a read of the code at commit `3194e47` plus a look at the live preview host.
**Read first:** [AGENTS.md](AGENTS.md) — this is Next.js **16.4.3** (React 19.2). Before touching any Next API, read the matching guide in `node_modules/next/dist/docs/01-app/`. Notably: `middleware` is now **`proxy.ts`** (`01-getting-started/16-proxy.md`), CSP is in `02-guides/content-security-policy.md`, robots/sitemap are in `03-api-reference/03-file-conventions/01-metadata/`.

How to use this file: work **phase by phase, in order**. Every task has an ID, the files involved, what "done" means, and how to verify. Do not start a phase until the previous phase's **exit gate** passes. Tick the box only when the acceptance check was actually run.

---

## 0. Where the app stands

### 0.1 One-paragraph verdict

**Feature-complete MVP, running as a private preview. Not production-ready.** The product surface (landing, signup, panel, banks, ARCO, incidents, documents, tools, evidence, AI assistant, billing UI) is built and typechecks cleanly. But: there are **zero automated tests**, **no backups**, **no outgoing email**, **payments and AI are not connected to real credentials**, there are **known authorization/billing gaps** (section 2), the platform has **no legal pages of its own**, and the only data in the database is the demo company. No real customer and no real payment has ever gone through the system.

### 0.2 Facts verified on 2026-10-31

| Item | Finding |
|---|---|
| Stack | Next 16.4.3, React 19.2, Tailwind 4, TypeScript 5.9, **`node:sqlite`** (no ORM), Node 22.23, pnpm. Only runtime dependencies: `next`, `react`, `react-dom`. |
| `pnpm typecheck` | **Passes**, no errors. |
| Tests | **None.** No test runner, no test files, no CI (`.github/` absent). `scripts/*.mjs` are Playwright screenshot/video helpers, not tests. |
| Hosting (preview) | `https://datosprivados.registio.app` → Cloudflare → nginx (TLS via Let's Encrypt, `client_max_body_size 25m`) → `next start -p 3000 -H 127.0.0.1` under **PM2** (fork mode, 1 instance, 5 restarts). Shares the box with other apps (`deepseek-harness`, `micita`). |
| Database | One SQLite file `data/datosprivados.db` (WAL). **1 company (the demo), 1 user, 0 payments.** No backup job found (no cron, nothing in `/var/backups`). |
| `.env` (preview) | `NEXT_PUBLIC_APP_URL` set to the registio.app host (https); `COOKIE_SECURE` set; **MercadoPago sandbox (`TEST-`) token, public key and webhook secret are set; an `OPENAI_API_KEY` is set** (no Anthropic key). *Correction (2026-10-31): the first version of this file said these were empty — that was wrong.* The billing flow and the LLM calls are configured but had never been exercised end to end. `.env` is git-ignored (good). |
| HTTP | `/robots.txt` → 404, `/sitemap.xml` → 404. Response sends `X-Powered-By: Next.js` and **no** security headers (HSTS/CSP/X-Frame-Options/etc.) from the app. `error.tsx` / `global-error.tsx` / `loading.tsx` do not exist. |
| Brand/domain | Code hardcodes `https://datosprivados.pe` in `src/app/layout.tsx:26` (`metadataBase`) and `src/lib/ai.ts:753` fallback; the preview runs on `registio.app`. Production domain is not wired yet. |
| Docs in repo | `README.md`, `AUDITORIA_*.md`, `DOCUMENTOS_LEGALES_PERU.md`, `COMPARACION_VIDEO.md`. `kaptia-compliance/` is a dossier about a **different product** (Kaptia); do not treat it as this app's spec. |

### 0.3 Feature maturity matrix

Legend: ✅ works as designed · 🟡 works but has gaps · 🔴 broken/missing for production · ⬜ not built

| Area | Routes / files | State | Notes |
|---|---|---|---|
| Landing + videos | `src/app/page.tsx`, `components/landing-interactive.tsx`, `public/video/*` (23 MB committed) | ✅ | Needs real legal links, SEO files, performance pass. |
| Signup / login / logout | `(auth)/*`, `actions/auth.ts`, `lib/auth.ts` | 🟡 | scrypt + DB sessions + httpOnly cookie are fine. **No** rate limit, **no** email verification, **no** password reset, **no** RUC validation beyond "11 digits", no password change. |
| Demo | `/demo`, `/demo/salir` | 🟡 | One shared mutable demo company (`casa-verde`) with **public credentials** (`demo@datosprivados.pe` / `demo1234`) seeded into the same DB as real customers, plan `pro` → anyone can use Pro AI features. |
| Billing (MercadoPago preapproval) | `lib/billing.ts`, `lib/mercadopago.ts`, `lib/subscriptions.ts`, `app/pago/*`, `api/mercadopago/webhook` | 🟡 | Logic hardened and unit-tested in Phase 1 (see below); **never exercised against the real MercadoPago sandbox**. Several logic/security gaps — see 2.x. No invoices (SUNAT), no dunning, no reconciliation. |
| Onboarding | `bienvenida`, `actions/onboarding.ts` | ✅ | Sector, tools, banks presets, first policy. |
| Company profile | `app/app/empresa` | 🟡 | RUC not validated (`updateCompanyAction` accepts any string). |
| Data banks + SIPDP sheet | `app/app/bancos/*`, `lib/bank-sheet.ts` | ✅ | Manual SIPDP registration by the user (by design). |
| ARCO (public form + inbox) | `solicitud/[slug]`, `app/app/arco/*`, `actions/arco.ts` | 🟡 | Deadlines (10/20 business days) correct per code; **owner is never notified** (no email); requester gets no email; honeypot only, no rate limit/captcha; holidays hardcoded. |
| Incidents (48 h) | `app/app/incidentes/*`, `actions/incidents.ts` | 🟡 | No alerting before the 48 h deadline (panel-only). |
| Documents (14 kinds) | `lib/documents.ts` (1.5k lines), `sector-legal.ts`, `document-freshness.ts`, `/p/[slug]` | 🟡 | Rich, versioned, staleness detection. **Drafts only, never lawyer-reviewed** (see `AUDITORIA_DOCUMENTOS_LEGALES.md` §7). No version history (overwrites in place). |
| Tools/providers + evidence | `herramientas`, `evidencias` | 🟡 | Evidence is free text + reference; **no file upload** although nginx allows 25 MB. |
| Compliance score | `lib/compliance.ts` | ✅ | Weights sum to 100. Needs unit tests. |
| AI (chat + 5 Pro copilots) | `lib/ai.ts` (1.2k), `llm.ts`, `anonymizer.ts`, `actions/ai.ts` | 🔴 | Anonymizer is regex-based and good in intent; **no rate limit/budget**, **no usage log**, Pro gating only by `company.plan`, not by payment status. An OpenAI key is configured on the preview but the calls were never exercised from here; the demo account no longer reaches the model. |
| Settings / export / cancel | `app/app/ajustes` | 🟡 | JSON export omits `providers` and `evidence`. No account deletion. No email/password change. |
| Roles / multi-user | — | ⬜ | One user per company, role always `admin`. |
| Email / WhatsApp notifications | — | ⬜ | Nothing is sent. README says so. |
| Platform's own Terms / Privacy / Cookies | — | ⬜ | **Most important trust/legal gap** (also flagged in `AUDITORIA_PORTADA.md` §8.4). |
| Observability | — | ⬜ | `console.error` only. No health check, no error tracker, no uptime monitor. |
| Admin / support tooling | — | ⬜ | No way to look up a customer, fix a billing state, or see AI usage. |

---

## 1. Operating principles for the agent

1. **Don't change product scope** while hardening. Production-readiness first; new features after the gates.
2. **Every behavior fix gets a test** (Phase 2 creates the harness; before it exists, write the failing test as part of the harness task).
3. **Multi-tenancy invariant:** every query that touches tenant data must filter by `company_id`. Existing code does this consistently; keep it so and add a test that proves it.
4. **Server Actions are public HTTP endpoints.** Authorization must be inside the action, never only in a layout/page.
5. **Spanish UI copy, es-PE, `America/Lima` dates.** Keep `limaToday()` / `Intl` usage; never use server-local time for legal deadlines.
6. **Legal text is a draft.** Never remove the "no sustituye asesoría legal" disclaimers. Do not invent article numbers; the audit files list which citations were verified and which were not.
7. Don't commit secrets. `.env` is ignored; add new variables to `.env.example` with a comment.
8. Keep `pnpm typecheck` and (once added) `pnpm test` and `pnpm build` green at every commit.

---

## 2. Known defects to fix (found in this review)

Each is verified against the code. Severity: **S1** = blocks launch (money/security/legal), **S2** = must fix before real customers, **S3** = polish.

### S1

**D-01 · Payment gate is enforced only in the layout, not in Server Actions.**
`isCompanyActive()` is checked in `src/app/app/layout.tsx:20` and `bienvenida/page.tsx:17` only. `requireSession()` (`src/lib/auth.ts:77`) does not check billing. A user who signed up and never paid (`billing_status='pending'`) — or whose plan expired — can still POST directly to any action (create banks/ARCO/incidents, generate documents, publish the policy, and **call the AI actions**). Because signup stores the *chosen* plan (`plan='pro'`) immediately, an unpaid account can use Pro AI features.
*Fix:* add `requireActiveSession()` (session + `isCompanyActive`) and use it in every action under `src/app/actions/*` and in `pago/actions.ts` where access should be paid. Pro gating must use `planFromCompany` **and** active status. Keep `requireSession()` for `/pago`, `/ajustes` (read), logout.
*Verify:* test that a `pending` company calling each action is rejected/redirected and that nothing is written.

**D-02 · Plan upgrade grants the new plan before payment.**
`setSubscriptionPending()` (`src/lib/billing.ts:106-130`) runs `UPDATE companies SET ... plan = ?` immediately; if the account is still active (`keepActive`), a Básico user who clicks "upgrade to Pro" gets Pro features at once even if they abandon the MercadoPago page. Also `startSubscriptionAction` cancels the *old* preapproval before the new one is created/authorized (`pago/actions.ts:54-62`) — if the user abandons checkout they silently lose renewal.
*Fix:* store the requested plan/term in `pending_plan`/`pending_term` columns (migration) and apply them only when the webhook/return page sees `authorized`. Cancel the old preapproval only **after** the new one is authorized (webhook), or use MP's update-amount API if available for the same payer.
*Verify:* test: upgrade click → `plan` unchanged; authorized event → `plan` changes, old subscription cancelled.

**D-03 · Webhook signature is optional (fail-open).**
`validateMercadoPagoSignature()` (`src/lib/mercadopago.ts:157-164`) returns `true` when `MERCADOPAGO_WEBHOOK_SECRET` is empty. The README says "in production conviene configurarlo". In production it must be mandatory.
*Fix:* if `NODE_ENV==='production'` and no secret → reject (401) and log loudly; add a startup check (see P1-ENV).
*Verify:* test with/without secret, bad ts/v1, wrong `x-request-id`.

**D-04 · Return page activates a subscription it doesn't prove belongs to the user.**
`pago/resultado/page.tsx:20` uses `company.subscription_id ?? params.preapproval_id` — if the company has no stored subscription it trusts a **query-string** id, fetches it from MP and calls `activateSubscription()`. Nothing checks `preapproval.external_reference === company.id` (webhook route has the same weakness: it trusts `external_reference` from MP, which is fine, but `activateSubscription` never verifies the amount/plan matches).
*Fix:* never accept the id from the URL; require `preapproval.external_reference === company.id`, `status==='authorized'`, and `auto_recurring.transaction_amount/frequency` equal to the expected plan/term before activating. Do the same check in the webhook.
*Verify:* tests with a foreign `external_reference`, wrong amount, wrong frequency.

**D-05 · Re-authorization after expiry grants a free full period.**
`activateSubscription()` (`billing.ts:136-183`) sets `paid_until = now + term` whenever the stored `paid_until` is in the past, even when the event is just a *status* webhook (`subscription_preapproval` → authorized, e.g. pause→resume) with no payment. Duplicate/replayed webhooks after expiry therefore extend access without a charge.
*Fix:* extend `paid_until` only from an approved authorized-payment (invoice) event; make "authorized" only set `subscription_status`. If you keep the "first period on authorization" behavior, restrict it to the *first* authorization (no prior `last_payment_id`) and make it idempotent.
*Verify:* replay tests: same event twice, resume after expiry, yearly vs monthly.

**D-06 · No authentication hardening.**
`loginAction`/`signupAction` have no rate limit or lockout; the public `/demo` route creates sessions on every GET; sessions are never purged (`sessions` table grows; `expires_at` checked but rows kept); no session id rotation; passwords have only a length check; no email verification, no password reset, no password/email change (`ajustes` tells users to "write us").
*Fix:* see tasks P1-AUTH-*.

**D-07 · Platform has no Terms of Service / Privacy Policy / Cookie notice of its own, and no DPA with its customers.**
DatosPrivados stores personal data of its customers *and of the people who file ARCO requests on their behalf* (name, DNI, email, phone, free text) — it is an **encargado de tratamiento** for them and a **titular del banco de datos** for its own users. A compliance product launching without its own compliance is a credibility and legal risk. See P0-LEGAL.

### S2

**D-08 · ARCO and incident workflows depend on someone noticing the panel.** No email to the owner when a request arrives, none to the requester ("constancia"), no reminder before the 10/20-day or 48 h deadline. A missed legal deadline is the core failure mode the product claims to prevent. See P3-NOTIFY.

**D-09 · Public ARCO form is unprotected.** Honeypot only; unlimited submissions; any slug incl. the demo's. Also `solicitud/[slug]/page.tsx` loads **all** requests of the company to check a ticket (`listRequests(...).some(...)`) — replace with an indexed lookup. See P1-ABUSE.

**D-10 · AI has no budget controls.** Any active (or, per D-01, any) session can call `callLlm` repeatedly; the shared demo session is Pro. No per-company quota, no usage table, no timeouts beyond 45 s, no retries/backoff, no model-output validation beyond what `ai.ts` does. See P3-AI.

**D-11 · Demo data lives in the production database.** `seedIfEmpty()` (`db.ts:687`) creates the demo company/user **on every boot** and rewrites its documents; `/demo` signs anyone in with it. In production the demo should be isolated (read-only or separate DB) and the public credentials removed from `login/page.tsx:40`.

**D-12 · Data layer risks.** `node:sqlite` is still flagged *Experimental* on Node 22 (see PM2 error log: "SQLite is an experimental feature"). Single file, single process, no backups, no migration framework (ad-hoc `PRAGMA table_info` blocks in `migrate()`; the `SCHEMA_VERSION` constant is only compared with a `globalThis` cache, not persisted in the DB), no `PRAGMA busy_timeout`. Decision required — see P1-DATA.

**D-13 · Config drift.** `metadataBase` and the AI fallback URL hardcode `datosprivados.pe`; `NEXT_PUBLIC_APP_URL` is build-time. No `poweredByHeader:false`, no security headers, no `robots`/`sitemap`, no `error.tsx`/`not-found` coverage per segment, no `loading.tsx`.

**D-14 · RUC not validated.** Only `^\d{11}$` at signup (`actions/auth.ts:52`) and nothing at all in `updateCompanyAction`. The ARCO/policy documents print this RUC. Validate prefix (10/15/16/17/20) + modulo-11 check digit.

**D-15 · Export is incomplete.** `ajustes/page.tsx` builds the JSON from company, banks, ARCO, incidents, documents, activity — **missing providers, evidence, security checks, payments**. For a data-portability promise this must be complete (and stay free of `password_hash`).

**D-16 · Stale copy.** `pago/resultado/page.tsx` says "mensual" even for yearly subscriptions; `anonymizer.ts` comments hardcode "GPT-6 Luna" though Anthropic is the first-choice provider (`llm.ts`) — and the **privacy policy of the platform must name the real AI sub-processor(s)**.

### S3

- D-17: `peruHolidays()` is a hardcoded list; "feriados puente"/ad-hoc decrees (frequently published as DS) are not handled. Needs an editable table + yearly review process.
- D-18: Documents overwrite in place (`upsertDocument`) — keep history of published versions (evidence for the ANPD).
- D-19: `data.ts` `listRequests` etc. load full tables per page; fine for MVP, add pagination before large tenants.
- D-20: `public/video` (23 MB) is in git; move to object storage/CDN when repo size matters.

---

## 3. Roadmap

Phases are sequential. **Exit gates** are hard.

```
Phase 0  Decisions & legal foundation        (people/paperwork, can run in parallel with Phase 1)
Phase 1  Security, data & infra hardening    (blocks everything)
Phase 2  Test harness + CI                   (blocks Phase 3+ merges)
Phase 3  Core product completion             (notifications, AI controls, documents, UX)
Phase 4  Billing end-to-end on real MercadoPago + invoicing
Phase 5  Staging soak, load & acceptance     (full E2E, pen-test checklist)
Phase 6  Production cutover & launch
Phase 7  Post-launch operations
```

### Estado de las fases al 2026-11-03

Esta es la foto del día; las notas «Status» dentro de cada fase son el registro de
cuando se escribieron y no se reescriben.

| Fase | Estado | Evidencia / qué falta |
|---|---|---|
| 0 · Decisiones y base legal | **Abierta** | Depende del propietario: entidad operadora, abogado, dominio, banco propio en SIPDP. Los borradores que se pudieron preparar están en `docs/DECISIONS.md`, `kaptia-compliance/` y `docs/NOTIFICACION-ANPD.md`. |
| 1 · Seguridad, datos e infraestructura | **Hecha y commiteada** | `pnpm test` 583/583, typecheck y lint limpios, `next build` correcto; migraciones, índices, tenencia y cabeceras cubiertos por pruebas. Sin desplegar a producción (no hay staging real). |
| 2 · Arnés de pruebas y CI | **Hecha y commiteada** | `.github/workflows/ci.yml` con audit, typecheck/lint/test, build y E2E (chromium, firefox, webkit, axe: 99/99 en local). Cobertura con suelo 80/80/80/70. |
| 3 · Producto completo | **Hecha y commiteada** | Documentos con versiones, avisos ARCO/incidentes, controles de IA, ayuda con búsqueda, exportación JSON + ZIP. Lo que falta es contenido revisado por el abogado, no código. |
| 4 · Cobro y facturación | **Parcial** | Circuito de cobro con webhooks firmados, idempotencia y conciliación probados con servidor simulado; **falta el sandbox real con eventos reales** y el PSE/OSE de SUNAT (bloqueado por Fase 0). |
| 5 · Staging, carga y aceptación | **Abierta** | No hay staging con dominio real ni monitor externo; el UAT con MYPE no se ha hecho. Hay prueba de carga (`pnpm ops:loadtest`) y simulacro de restauración en local. |
| 6 · Cutover y lanzamiento | **Abierta** | Depende de 0, 4 y 5. `docs/CUTOVER.md` está escrito pero nunca ejecutado. |
| 7 · Operación posterior | **Abierta** | Depende de 6. |

El detalle fino, área por área y casilla por casilla, está en
`docs/READINESS-BY-AREA.md` (esa es la fuente de verdad, no esta tabla).

---

### PHASE 0 — Decisions and legal foundation (owner: the human; agent prepares drafts)

The agent cannot decide these. Surface them to the owner and **record answers in `docs/DECISIONS.md`** (create it).

| ID | Decision / task | Why it blocks |
|---|---|---|
| P0-ENTITY | Which legal entity operates DatosPrivados (razón social, **RUC in Peru?**, address)? | Needed for Terms, Privacy Policy, SUNAT invoicing, MercadoPago merchant account, ANPD obligations. The README says the *product* serves only Peruvian companies; the *operator's* own entity is not stated anywhere in the repo. |
| P0-SUNAT | How are subscription payments invoiced (boleta/factura electrónica via a PSE/OSE, or the invoicing tool the entity already uses)? IGV treatment of S/ 19/39/190/390 (are prices IGV-inclusive?). | Selling to Peruvian companies requires comprobantes; `payments` table stores amounts only. |
| P0-LEGAL | Hire a Peruvian data-protection lawyer to review: (a) the 14 document templates, especially health/education/minors/sensitive data and the claims on the landing; (b) the platform's own Terms, Privacy Policy, DPA, cookie notice, refund/cancellation policy (Código del Consumidor: auto-renewal disclosure, Libro de Reclamaciones). | `AUDITORIA_DOCUMENTOS_LEGALES.md` §7 lists what was **not** verified against primary sources. |
| P0-OWN-BANKS | Register DatosPrivados' own data banks in the SIPDP (users, billing, technical logs, ARCO requesters' data held as encargado) and appoint the platform's own ODP/contact. | The product tells customers to do exactly this. |
| P0-DOMAIN | Production domain `datosprivados.pe`: DNS, Cloudflare zone, canonical host, `hola@` mailbox, SPF/DKIM/DMARC. | Webhooks, cookies, emails, canonical URLs. |
| P0-PRICING | Confirm plans/limits. `AUDITORIA_PORTADA.md` §8.3 notes that old limits ("2 bancos / 30 ARCO") were removed because unenforced. Decide whether to enforce any, and the free-trial policy (§9 recommends paid-first + demo). | Affects billing logic and landing copy. |
| P0-SUPPORT | Support channel(s) and SLA; refund policy; data-retention policy for lapsed/cancelled accounts (how long do you keep a cancelled customer's data? what do you do with ARCO requesters' data?). | Needed before Terms are final and before building account deletion. |
| P0-AI-VENDOR | Which LLM vendor(s) and region/contract (Anthropic and/or OpenAI), with DPA and no-training terms. | Must be disclosed as sub-processors and transfer abroad. |

**Agent deliverables in this phase (drafts for lawyer review, in `docs/legal/`):**
- `terminos-de-uso.md`, `politica-de-privacidad-plataforma.md`, `politica-de-cookies-plataforma.md`, `contrato-de-encargo-clientes.md` (DPA), `politica-de-cancelacion-y-reembolsos.md`. Base them on the app's real data flows (sections 4.1 and the table in `lib/provider-catalog.ts`). Mark every unverified legal citation `[VERIFICAR CON ABOGADO]`.

**Exit gate P0:** entity + RUC + domain decided and written in `docs/DECISIONS.md`; lawyer engaged; legal drafts exist.

---

### PHASE 1 — Security, data and infrastructure hardening

> **Status (2026-10-31): implemented in the working tree, NOT yet committed, NOT yet deployed to the PM2 preview.**
> Verified by: `pnpm typecheck` clean · `pnpm test` 32/32 (Vitest, added early from Phase 2 to verify billing/authz) · mutation checks (re-introducing D-01 and D-05 makes tests fail) · `next build` in an isolated copy · production server on :3100 with a throwaway DB (headers, robots/sitemap, webhook fail-closed, boot refusal on unsafe config) · Playwright browser run 12/12 equivalent checks (signup validation, cookie flags, pending-account gate, URL-supplied subscription id ignored, login and ARCO throttling, demo entry).
>
> | Task | State |
> |---|---|
> | P1-AUTHZ (D-01) | **Done.** `requireActiveSession()` in every mutating action; unpaid/expired accounts redirected to `/pago` with nothing written. Tested per action group. |
> | Billing S1 (D-02, D-03, D-04, D-05) | **Done in code + unit tests.** Pending plan change (`pending_*` columns), activation only through `lib/subscriptions.ts` (verifies company, amount, currency, frequency), webhook signature mandatory in production, events for replaced subscriptions ignored, initial period granted once. **Not run against the MercadoPago sandbox yet — that is Phase 4.** |
> | P1-AUTH (D-06, D-14) | **Partly.** Done: rate limits (login, signup, ARCO, demo), 10-char passwords, RUC check digit, session rotation + purge, timing-equal login. **Not done:** email verification, password reset, change email/password, idle timeout (need the mail transport, Phase 3). |
> | RUC verification with SUNAT (added 2026-10-31) | **Done and verified against the real Decolecta API.** Signup and RUC change require an existing, ACTIVE RUC; legal name and fiscal address come from SUNAT; fails closed; token mandatory in production. Proves existence, **not ownership** — see `docs/DECISIONS.md`. 21 new tests + a 9-check browser run with the live API. |
> | P1-HEADERS (D-13) | **Mostly.** Done: security headers, `poweredByHeader:false`, `no-store` on `/app` `/pago` `/solicitud`, noindex, `robots.ts`, `sitemap.ts`, `error.tsx`, `global-error.tsx`, `siteUrl()` single source. **Not done: CSP** (needs browser testing with nonces/hashes), OG image/favicon/manifest. |
> | P1-ENV | **Done.** `src/instrumentation.ts` + `src/lib/env.ts` refuse to boot in production on unsafe config; `.env.example` completed; Secure cookie is the production default. The current preview `.env` passes the check. |
> | P1-DATA (D-12) | **Partly.** Done: `busy_timeout`, `synchronous=NORMAL`, indexes, backup/restore scripts with integrity + sha256 and a successful restore drill. **Not done:** numbered migrations, off-box encrypted copy, backup schedule and stale-backup alert, `node:sqlite` experimental status (decision recorded in `docs/DECISIONS.md`). |
> | P1-DEMO (D-11) | **Mostly done.** Read-only demo enforced in `requireActiveSession()`; document text truncated **server-side** (`lib/demo.ts`: the full text never reaches the browser — verified in the HTML and RSC payload of all 14 document tabs and of `/p/casa-verde`); copy/download/print/JSON export locked; no AI, no checkout/cancel, public ARCO form of the demo company stores nothing; `/demo` rate-limited. Tests: `test/demo.test.ts` + 15 browser checks. **Not done:** separate demo DB, removing the credentials hint. Known limit: a visitor can still screenshot the preview, and `/p/casa-verde` stays public by design (preview only). |
> | P1-ABUSE (D-09) | **Partly.** Done: ARCO form throttled per IP and per company, indexed ticket lookup, no-store/noindex, webhook body limit. **Not done:** Turnstile/proof-of-work, DNI/email format validation, origin locked to Cloudflare (`docs/RUNBOOK.md`). |
>
> **Open risks created or revealed by Phase 1 work:** the origin IP is public, so `CF-Connecting-IP` can be spoofed until the origin is restricted to Cloudflare; the first-period-on-authorization rule still gives one free period to a *new* subscription whose first charge later fails; mid-period plan changes keep the old `paid_until` and the first charge of the new subscription then extends it (define the intended rule in `docs/BILLING.md`, Phase 4).

#### P1-AUTHZ — Authorization and billing gate (fixes D-01, part of D-02)
1. Add `requireActiveSession()` in `src/lib/auth.ts` (session → `isCompanyActive` else `redirect("/pago")`). Keep demo (`billing_status==='demo'`) allowed but see P1-DEMO.
2. Replace `requireSession()` with `requireActiveSession()` in all of: `actions/{ai,arco(manual+respond+status),company,documents,incidents,onboarding,tools}.ts`. Leave `createArcoRequestAction` public (it is the public form).
3. Create `src/lib/plan-guard.ts` with `requirePro(company)` used by every Pro-only action in `actions/ai.ts` (currently inline `company.plan !== "pro"`). Server components that hide UI by plan must call the same helper.
4. Add the same guard to server components that do work on render (e.g. the `asistente` page) — layout redirect is not enough for data fetched in other segments.
**Acceptance:** automated test matrix (Phase 2) "every exported action × {no session, pending, expired, active-basico, active-pro, demo}" gives the expected result. Manual: a pending account cannot reach any data mutation.

#### P1-AUTH — Account security (D-06, D-14)
1. **Rate limiting:** implement a small SQLite-backed limiter (`rate_limits(key, window_start, count)`) and apply to: login (per IP+email), signup (per IP), public ARCO form (per IP + per company), password reset request, AI calls (per company), `/demo` (per IP). Take the client IP only from `X-Forwarded-For`'s first hop **set by nginx/Cloudflare** (`CF-Connecting-IP` when behind Cloudflare); never trust a client-supplied header directly — document the trust chain.
2. **Email verification + password reset** (depends on P3-EMAIL transport; build the token tables now): `email_tokens(id, user_id, kind, token_hash, expires_at, used_at)`. Store only hashes; 1 h expiry; single use; invalidate all sessions on reset.
3. **Change password / email** in Ajustes (requires current password; re-auth for email; notify old address).
4. **Session hygiene:** delete expired sessions (cron or opportunistic on login); rotate session id on login; store `created_at`, `last_seen`, `ip`, `user_agent` hash; "sign out of all devices"; absolute (30 d) + idle timeout (e.g. 7 d).
5. **Password policy:** min 10 chars, check against a small top-passwords list; keep scrypt but set explicit cost params (`N=2^15` or use `crypto.scrypt` async with `maxmem`), and store the params in the hash string so they can be upgraded; rehash on login if params are old.
6. **RUC validation** helper `lib/ruc.ts` (11 digits, prefix ∈ {10,15,16,17,20}, modulo-11 check digit) used in signup and `updateCompanyAction`. Add unit tests with valid/invalid RUCs.
7. Uniform login error and constant-time path for unknown email (avoid user enumeration via timing: run a dummy `scrypt` when the user doesn't exist). Signup currently reveals "Ya existe una cuenta con ese correo" — acceptable but throttle it.
**Acceptance:** tests for each item; manual abuse run (script 50 bad logins → 429/lockout; 50 ARCO posts → throttled).

#### P1-HEADERS — HTTP hardening, error pages, SEO plumbing (D-13)
Read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` and `02-guides/content-security-policy.md` first.
1. `next.config.ts`: `poweredByHeader:false`; `headers()` for all routes: `Strict-Transport-Security` (only on the prod host), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Permissions-Policy` (camera/mic/geolocation off).
2. **CSP** via `src/proxy.ts` with per-request nonce (needs dynamic rendering — check which pages are currently static, e.g. the landing is prerendered `s-maxage=31536000`; decide: CSP with hashes/`'unsafe-inline'` for styles on static pages, nonce on dynamic ones). Allow only: self, MercadoPago checkout origins (redirect only — no embed needed), `media-src 'self'` for videos, and the Google Fonts are already self-hosted by `next/font`. Ship **report-only first**, then enforce.
3. Add `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/app/error.tsx`, `src/app/app/loading.tsx` (read `.../file-conventions/error.md`, `loading.md`). Errors must not leak stack traces; show a Spanish message + request id.
4. Add `src/app/robots.ts` and `src/app/sitemap.ts` (landing + legal pages only; **disallow** `/app`, `/pago`, `/api`, `/demo`, and **noindex** `/solicitud/*` and `/p/*` of customers unless the customer opts in — these are customers' pages, not marketing). Add `metadata.robots` accordingly.
5. Replace hardcoded host with a single `src/lib/site.ts` (`siteUrl()` from `NEXT_PUBLIC_APP_URL`), used by `metadataBase`, `ai.ts`, emails, MP back_url. Add OG image + favicon/manifest (`app-icons.md`, `opengraph-image.md`).
**Acceptance:** `curl -I` on `/`, `/login`, `/app` shows the headers; securityheaders.com ≥ A; CSP report-only shows no violations on the main flows; robots/sitemap return 200.

#### P1-ENV — Fail-fast configuration
1. Add `src/lib/env.ts` that validates required variables at boot (`instrumentation.ts`, see `file-conventions/instrumentation.md`): in production require `NEXT_PUBLIC_APP_URL` (https), `COOKIE_SECURE=1`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `DATOSPRIVADOS_DB` (absolute path outside the repo), mail credentials, one LLM key (or an explicit `AI_DISABLED=1`). Refuse to start otherwise.
2. Make `COOKIE_SECURE` default to on when `NODE_ENV==='production'` (today it is opt-in, easy to forget).
3. Update `.env.example` with every variable (including `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_*`, `PAYMENTS_DEV_BYPASS`, mail, error tracker DSN, `CRON_SECRET`).
**Acceptance:** starting with a missing required var exits with a clear message; `.env.example` lists everything referenced by `process.env.*` (grep to prove it).

#### P1-DATA — Database durability (D-12)
**Decision first (record in `docs/DECISIONS.md`):**
- **Option A (recommended for launch speed):** keep SQLite, harden it: single writer process (PM2 `instances:1` is already the case — do **not** scale to cluster), `PRAGMA busy_timeout=5000`, `synchronous=NORMAL` (WAL), DB file on a dedicated path (`/var/lib/datosprivados/`), nightly + hourly backups (below), disk-encryption at rest (LUKS/provider) since it holds ARCO data and DNIs. Accept `node:sqlite` experimental status **or** swap the driver to `better-sqlite3` behind the same `getDb()` facade. Pin Node exactly (`.nvmrc`/`engines`) so a Node upgrade can't change SQLite behavior unnoticed.
- **Option B:** migrate to Postgres (+Drizzle) before launch. Needed if you want >1 app instance, managed backups/PITR, or zero-downtime deploys. `README.md` already plans this. It is a larger change: `db.ts` (1k lines) and `data.ts` expose sync calls that every action uses, so a migration means making them async everywhere.
Whichever option: 
1. Replace the ad-hoc `migrate()` with **numbered, transactional migrations** stored in `migrations/NNN_name.sql` and a `schema_migrations` table; each runs once inside `BEGIN IMMEDIATE`. Convert the current v1–v9 logic into the baseline `001`. Remove the `globalThis` version hack.
2. **Backups:** `scripts/backup.sh` using `sqlite3 .backup` (or `VACUUM INTO`) → compress → encrypt (age/gpg) → upload off-box (S3/B2/R2) + local 7-day retention; systemd timer or cron hourly + daily; **log success/failure and alert on failure**. Write `docs/RUNBOOK.md` restore procedure and **perform and time a restore drill** into a scratch dir (acceptance).
3. Add `scripts/check-integrity.mjs` (`PRAGMA integrity_check`, `foreign_key_check`) run in the backup job.
4. Add missing indexes: `arco_requests(company_id,status,due_at)`, `arco_requests(company_id,ticket)` (unique), `incidents(company_id,status)`, `sessions(expires_at)`, `documents(company_id,kind)` (unique), `users(lower(email))`. Add `UNIQUE(company_id,kind)` on documents only after de-duplicating.
5. Encrypt sensitive free-text columns at rest at the application level? (DNI/email/phone in `arco_requests`). Evaluate; at minimum ensure disk encryption and that backups are encrypted.
6. Data lifecycle: implement account deletion + export (P3-ACCOUNT) and a retention job for expired sessions, old `payments.raw`, and logs.
**Acceptance:** restore drill succeeds from an off-box encrypted backup; `schema_migrations` shows baseline; an empty DB boots to the same schema as the migrated one (test compares `sqlite_master`).

#### P1-DEMO — Isolate the demo (D-11)
1. Move the demo to **read-only mode**: a `demo` session cannot mutate (add `isDemo` guard to `requireActiveSession()` mutating variants), cannot call AI against the real key (canned responses only), cannot export, cannot publish, cannot submit ARCO via its public form without a throttle.
2. Seed the demo from a script/migration, **not** on every boot of the production DB; better a separate `DATOSPRIVADOS_DEMO_DB` file opened read-only.
3. Remove the credentials hint from `(auth)/login/page.tsx:40` or keep the account but force password rotation and disable password login for it (`/demo` link only).
4. Rate limit `/demo`.
**Acceptance:** tests: demo session attempting every mutating action is refused; production DB contains no `casa-verde` rows.

#### P1-ABUSE — Public endpoints (D-09)
Apply to `createArcoRequestAction`, `/solicitud/[slug]`, `/p/[slug]`, webhook:
1. Rate limit (P1-AUTH-1) + a proof-of-work or Cloudflare Turnstile token on the ARCO form (free, no personal data stored by us besides what Cloudflare sees; list it as a sub-processor).
2. Validate email format, DNI/CE format (8 digits / CE pattern) when provided, cap lengths (already partly done), strip control characters.
3. Replace `listRequests(company.id).some(...)` with `SELECT 1 ... WHERE company_id=? AND ticket=?`.
4. Add `Cache-Control: no-store` to anything that renders ticket/PII; `X-Robots-Tag: noindex` for `/solicitud/*`.
5. Webhook: size-limit body, respond quickly, make processing idempotent (see P4).
**Acceptance:** automated flood test; spam submissions are rejected; a valid submission still produces a ticket and a log entry.

**Exit gate P1:** all P1 acceptance checks pass; D-01, D-03, D-04, D-05, D-06 (rate limit + verification + reset), D-09, D-11, D-12, D-13, D-14 closed; backups restored once successfully.

---

### PHASE 2 — Test harness and CI

No tests exist. Without them, nothing below can be declared "working perfectly".

> **Status (2026-10-31): implemented in the working tree, NOT yet committed, CI workflow NOT yet run on GitHub.**
> Verified locally: `pnpm typecheck` · `pnpm lint` (0 warnings) · `pnpm test` 136/136 · `pnpm build` · `pnpm exec playwright test` 1/1 (full journey against `next start` with mock MercadoPago + mock SUNAT) · `pnpm audit --prod` clean.
>
> | Task | State |
> |---|---|
> | P2-HARNESS 1–3 | **Done.** Vitest; per-file temp DB; `test/helpers/next.ts` (cookies/headers/redirect mocks, `freezeTime`) registered globally in `test/helpers/setup.ts`; `test/helpers/db.ts` factories. |
> | P2-HARNESS 4 | **Mostly.** Playwright runner + `e2e/mock-server.mjs` (MercadoPago preapproval + Decolecta). `MERCADOPAGO_API_BASE`, `DECOLECTA_API_BASE`, `ANTHROPIC_API_BASE`, `OPENAI_API_BASE` added. **Not done:** a mock LLM server (no journey step uses the model yet). |
> | P2-HARNESS 5–6 | **Done in files, unproven in CI.** `.github/workflows/ci.yml` (typecheck, lint, test, build, E2E, `pnpm audit --prod`), ESLint flat config (`eslint-config-next`), `.github/dependabot.yml` as the update policy. |
> | P2-COVERAGE | **Covered:** business days/holidays/Lima TZ, incident criteria + actions (incl. 48 h, future date, closed = immutable), compliance, document freshness + `regenerateOutdatedAction`, all 14 builders × 4 sectors × 2 tool variants (no `undefined`/`{{`/`[object` leaks), anonymizer + no PII reaching `callLlm`, auth/session/cookie flags/timing, provider-input/`cleanUrl`, cross-tenant for banks/ARCO/incidents/providers/evidence. **Gaps:** documents are checked structurally, not as snapshots; webhook route handler is not tested end to end (only signature + `confirmAuthorizedSubscription`); no coverage report tool. |
> | P2-E2E | **Done except two steps:** the journey covers signup → pay → onboarding → bank → registered → publish → public policy → public ARCO → respond → incident → notified → document download → cancel → expiry redirect. "Export" is the per-document download (account data export is Phase 3). |
>
> **Defect found and fixed by the new tests:** a closed incident could still be re-notified or moved back to "en análisis" (`updateIncidentAction`). **Known limit surfaced:** the anonymizer cannot detect a person's name typed in free text (only DNI/RUC/email/phone/address patterns and names it already knows).

**P2-HARNESS**
1. Add **Vitest** (unit/integration, `node` environment) — `pnpm add -D vitest`; scripts `test`, `test:watch`. Pin versions (repo pins exact versions).
2. Make the DB injectable: `getDb()` should accept `DATOSPRIVADOS_DB=:memory:` or a temp file so each test gets a clean schema via the migration runner. Provide `test/helpers/db.ts` (`makeCompany`, `makeSession`, `freezeTime`).
3. Mock `next/headers` (`cookies`, `headers`) and `next/navigation` (`redirect` throws a sentinel) in a helper so server actions can be called as plain functions.
4. Add **Playwright test runner** (`@playwright/test`; `playwright` is already a devDependency) for E2E against `next start` on a temp DB with a mock MercadoPago server and mock LLM server (env var overrides for the base URLs: add `MERCADOPAGO_API_BASE`, `ANTHROPIC_API_BASE`, `OPENAI_API_BASE` — currently hardcoded in `mercadopago.ts:17` and `llm.ts`).
5. CI: `.github/workflows/ci.yml` (or equivalent): install with `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, E2E on PRs. Add `eslint` (`eslint-config-next`) and fix findings; `next lint` behavior may differ in 16 — check `01-app/03-api-reference/05-config/` docs.
6. Add `pnpm audit --prod` and a dependency update policy (the deps are exact-pinned).

**P2-COVERAGE — what must be covered (minimum)**
| Module | Cases |
|---|---|
| `db.addBusinessDays/businessDaysBetween/peruHolidays` | Easter 2026–2030, Thursday/Friday Santo, weekends, year boundaries, Lima time zone at 23:30, 10 vs 20 day types, due-date equals holiday. |
| `incident-criteria` + incident actions | Each art. 34.1 criterion; no criteria → "documentar" only; 48 h from `detected_at` in Lima TZ; future-date rejection (5 min tolerance); closed incident immutable. |
| `compliance.computeCompliance` | Weights sum to 100; each item toggles; penalties capped; alert generation; stale policy. |
| `document-freshness` | Fingerprint stability, each stale reason, `regenerateOutdatedAction`. |
| `documents.ts` builders | Snapshot per kind × representative sectors (clinic, e-commerce, SaaS, education, no-tools, tools-abroad). No `undefined`/`{{`/`[object` leaks; required headings present. |
| `anonymizer` | DNI/RUC/email/phone/address regexes, overlapping entries, round-trip `anonymize→deAnonymize`, **no raw PII reaches `callLlm`** (spy), Unicode names, empty input. |
| `auth` | Session create/expire/destroy, cookie flags (Secure/HttpOnly/SameSite), enumeration timing, rate limit. |
| `billing` + webhook | See P4 test list. |
| Server Actions authz | The matrix from P1-AUTHZ; cross-tenant: company A cannot read/update/delete B's bank/ARCO/incident/evidence/provider by ID (every `WHERE ... company_id = ?`). |
| `provider-input` / `cleanUrl` | `javascript:` and `data:` URLs rejected; length caps; unknown categories dropped. |

**P2-E2E — scripted journeys (Playwright)**: signup → pay (mock MP) → onboarding → create bank → mark registered → publish policy → public policy page → public ARCO submit → inbox → respond within deadline → incident with criteria → mark notified → export → cancel subscription → expiry redirect to `/pago`.

**Exit gate P2:** `pnpm typecheck && pnpm test && pnpm build` green in CI on a clean checkout; coverage on the tables above; E2E journey green.

---

### PHASE 3 — Core product completion

> **Status (2026-11-01): implemented in the working tree, NOT committed, NOT deployed.** `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm exec playwright test` — see the verification note at the end of the phase for the last run.
> Decisions and their reversal cost are in `docs/DECISIONS.md` ("Decididas en la Fase 3"); operations in `docs/RUNBOOK.md`.
>
> | Task | State |
> |---|---|
> | P3-EMAIL | **Code done, delivery unproven.** `mail.ts` (Resend over HTTP, outbox with backoff/dead-letter/dedupe/atomic claim, opt-out, suppression list, signed bounce/complaint webhook), 19 templates (all listed, plus `lapsed_notice`, `email_changed`, `account_deleted`, `ops_alert`), wired to billing, ARCO (owner + requester acknowledgement with ticket and legal deadline), incidents, password reset, verification. **Not done:** SPF/DKIM/DMARC, mail-tester score, sending to a real inbox, provider chosen provisionally (needs P0-ENTITY), weekly digest (optional), a11y of HTML mail. |
> | P3-JOBS | **Done in code.** `POST /api/cron/[job]` (bearer `CRON_SECRET`, constant-time), 9 jobs, `job_runs` lock + log, `GET /api/cron/health` (503 when a job is late or mail is stuck). Each job run twice is proven not to duplicate mail. **Not done:** the cron/systemd units are documented, not installed; no external monitor; the alert was never triggered on a real monitor. `backup` stays a shell script (not an HTTP job). |
> | P3-ACCOUNT | **Done.** Delete (password + `ELIMINAR`, cancels MercadoPago first and aborts if it cannot, keeps tax records only), full JSON export from a route (works with a lapsed subscription), change password (closes other sessions), change email (confirmed from the new address, old address notified), password reset (single use, 1 h, hashed), email verification (non-blocking), lapsed behaviour decided (see DECISIONS). **Not done:** PDF/ZIP export; `purge-old-data` retention is 90 days *pending P0-SUPPORT*; email verification does not gate anything yet. |
> | P3-AI | **Done except live validation.** `ai_usage` log (no prompt text), per-plan monthly quota, per-minute limit, `AI_DISABLED`, monthly budget kill-switch with alert, retries with jitter for 429/5xx, circuit breaker, per-company opt-in consent with date, prompt-injection hardening (delimited untrusted text + system rules), "GPT-6 Luna" removed and OpenAI now requires `OPENAI_MODEL`, anonymizer fixed for DNIs with spaces/hyphens and addresses without "Av.". Eval set in `test/ai-evals/` (27 cases; basic mode in CI, `AI_EVAL_LIVE=1` for a real model). **Not done:** nothing was run against a real provider (no key), so `ANTHROPIC_MODEL` validity, real token accounting and the live eval are unverified; the anonymizer still cannot detect a free-text name (a test documents it); the vendor is not yet in a platform privacy policy (none exists). |
> | P3-DOCS | **Done except the lawyer's feedback.** `document_versions` (immutable, publish/unpublish dates), the public page serves the *published* version, publishing is blocked while `[…]` fields are unfilled, version history in the UI, `holidays` table seeded 2025–2032 and editable, `holidays-check` job. **Not done:** P0-LEGAL feedback (no lawyer review exists), print stylesheet verification on Chrome/Safari, server-side PDF, a regional-holiday disclaimer in the ARCO UI, an admin screen for holidays (SQL only). |
> | P3-UX | **Not done.** No accessibility pass or axe-core, no mobile pass, no copy review, no single source for plan benefits, no onboarding resume, no pagination/search. Only the new screens (Ajustes sections, `/cuenta`, `/olvide`, `/restablecer`, `/verificar`) were added, unreviewed on mobile. |
>
> **Defects found by the new tests and fixed:** the ARCO response drafts cited "artículo 73" as the source of the 10/20-day deadline (the product's own legal sources say art. 69; 73 is the tutela procedure); the consent auditor matched "ruc" and "baja" inside words ("estructura", "rebajas") and so credited texts that identified nobody; the anonymizer let through DNIs written "4567 8912" / "45-678-912" and addresses like "jiron lima 123". **Behaviour changes to be aware of:** Pro customers lose AI until they accept it in Ajustes; regenerating a published policy no longer changes the public page until it is published again.

#### P3-EMAIL — Transactional email (blocks D-06 completion, D-08)
1. Choose provider (Resend/Postmark/SES; record in DECISIONS, add to sub-processor list). Implement `src/lib/mail.ts` with a template layer (Spanish, text + HTML), a **DB outbox** (`email_outbox(id,to,template,payload,status,attempts,next_attempt_at,error)`) and a worker triggered by the scheduler (P3-JOBS), so a provider outage never loses or blocks a request.
2. Domain auth: SPF, DKIM, DMARC on `datosprivados.pe`; test deliverability (mail-tester ≥ 9/10).
3. Templates: verify email, password reset, welcome, payment receipt/failed/renewal-soon, subscription cancelled/expiring, ARCO received (owner), ARCO acknowledgement (requester, with ticket + legal deadline), ARCO due in 3 days / overdue, incident opened (48 h clock), incident deadline in 12 h / 2 h, document outdated, weekly digest (optional).
4. Respect opt-outs for non-essential mail; include company identity and a support address.
**Acceptance:** sending to a real inbox for every template; bounce/complaint webhook handling; outbox retries tested with a failing transport.

#### P3-JOBS — Scheduler (replaces the missing "daily jobs")
1. Add a protected route `POST /api/cron/[job]` (bearer `CRON_SECRET`) **or** a PM2 secondary process; trigger from system cron/systemd timers. Jobs: `expire-sessions`, `send-outbox`, `arco-deadline-reminders`, `incident-deadline-reminders`, `billing-reconcile`, `document-staleness-notice`, `backup` (shell), `purge-old-data`.
2. Make each job idempotent and lock-protected (a `job_runs` table with `started_at/finished_at/error`); alert when a job hasn't succeeded for N hours.
**Acceptance:** run each job twice → no duplicate emails/side effects; a failing job produces an alert.

#### P3-ACCOUNT — Account lifecycle
1. Account deletion (self-service, with confirmation + re-auth): cancel MP subscription, export offered, then hard delete or anonymize per the retention policy decided in P0-SUPPORT; remove ARCO requesters' PII; keep financial records required by tax law only (as legal obligation).
2. Complete JSON export (D-15) plus optional per-document PDF/ZIP; stream it from a route handler instead of embedding the JSON in the page HTML.
3. Change email/password (P1-AUTH-3). 
4. Behavior for lapsed accounts: read-only access + export for N days, then data deletion warning emails; public `/p/[slug]` and `/solicitud/[slug]` must keep working or show a clear "inactive" state — decide and implement (a customer's published ARCO channel going dark is itself a compliance incident for them).

#### P3-AI — AI controls and quality (D-10, D-16)
1. Configure the real provider; set `ANTHROPIC_MODEL` explicitly (default in `llm.ts` is `claude-sonnet-5-5`; verify the id is valid for your account at deploy time — see the `claude-api` skill for current model ids and parameters).
2. `ai_usage(id, company_id, feature, model, input_tokens, output_tokens, latency_ms, ok, created_at)`; log every call (no prompt text, no PII). Per-plan monthly quota + per-minute rate limit; clear UI message on limit; global monthly cost ceiling with an alert/kill-switch env (`AI_DISABLED=1`).
3. Reliability: retries with jitter for 429/5xx, 20–45 s timeouts already exist; add circuit breaker and graceful fallback to "modo básico" with a visible banner (already partly present: `aiMode()`).
4. Safety: prompt-injection hardening for user-supplied text (ARCO descriptions, incident text, pasted marketing text) — keep system prompt separate, instruct to ignore embedded instructions, never let model output trigger actions; validate structured outputs with a schema before use; always show "borrador, revisa con tu abogado" on AI legal text.
5. Privacy: the anonymizer is a regex vault. Add tests with realistic adversarial inputs (names written without titles, addresses without "Av.", DNIs with spaces, free-text names not in the vault). Document its limits honestly in the in-app AI disclosure and in the platform privacy policy; consider an opt-in toggle per company and a logged consent.
6. Build an eval set (`test/ai-evals/`): 30–50 representative ARCO / incident / consent-audit inputs with expected properties (deadline correct, cites the right right, no hallucinated article numbers). Run on every model change.
7. Fix the "GPT-6 Luna" comments and disclosures to match the actual provider; list the vendor in the platform privacy policy + transfer mechanism.
**Acceptance:** with a real key, every AI feature works end to end in staging; quota enforced; usage rows written; no raw PII appears in a captured outbound request (integration test with a local mock LLM).

#### P3-DOCS — Document engine
1. Lawyer review feedback (P0-LEGAL) applied to `lib/documents.ts`, `sector-legal.ts`; bump `TEMPLATE_VERSIONS` in `document-freshness.ts` for every changed template so customers are prompted to regenerate.
2. Keep immutable history: table `document_versions(id, document_id, version, content, published_at, built_from)`; show history and "published on date X" evidence; the public policy page should serve the *published* version, not the working draft (today `togglePublishAction` flips a flag on the single row that regeneration also overwrites).
3. PDF/print: verify the print stylesheet on Chrome/Safari for each document; add server-side PDF only if needed.
4. Placeholders: ensure no unfilled placeholder can be published (the Terms and Libro have placeholders per the audit) — block publish when required fields (Libro link, address…) are missing.
5. Legal calendar: replace the hardcoded holiday function with a `holidays(date, name, source)` table seeded per year and editable by an admin; add a yearly task to load the next year's decree. Add the regional-holiday disclaimer in the ARCO UI.

#### P3-UX — Product polish checklist
- Accessibility pass (keyboard, focus rings, contrast, `aria` on forms/toasts, `prefers-reduced-motion` — videos already respect it); axe-core in Playwright.
- Mobile pass of every `/app/*` page (nav exists in two variants); empty/error/loading states everywhere.
- Spanish copy review for consistency (tuteo, es-PE terms); one source of truth for plan benefits (landing `page.tsx`, `pago/page.tsx` `PLAN_BULLETS`, `plans.ts` currently duplicate copy).
- Onboarding: allow resume; validate required inputs before submit; show progress.
- Pagination/search on ARCO, incidents, banks, evidence.
- Multi-user & roles (admin / viewer / contador) — **post-launch** unless P0-PRICING requires it; schema already has `users.role`.

**Exit gate P3:** emails, jobs, account lifecycle, AI controls and document versioning implemented with tests; lawyer comments incorporated; a11y/mobile checklist done.

---

### PHASE 4 — Billing end to end (MercadoPago) and invoicing

Prerequisite: P0-ENTITY, P0-SUNAT, D-01…D-05 fixed. Read the current MercadoPago docs for *Subscriptions (preapproval)* and *webhooks/signature* at implementation time; do not rely on memory (the code already hedges `cancelled` vs `canceled`, and the manifest format for `x-signature` must be re-verified).

1. **Sandbox first.** Create an MP test seller + buyer, set `MERCADOPAGO_ACCESS_TOKEN=TEST-…`, webhook URL = staging `/api/mercadopago/webhook`, configure `MERCADOPAGO_WEBHOOK_SECRET`. Verify with real sandbox events: subscription created → authorized → first payment → renewal → payment rejected → paused → cancelled.
2. **State machine**: write `docs/BILLING.md` with an explicit table `(company.billing_status, subscription_status, event) → (new state, paid_until change, email)`. Implement exactly that (refactor `billing.ts`). Required behaviors:
   - `paid_until` only advances on an **approved authorized payment** (invoice), idempotent by `payment_id` (already unique-checked in `recordSubscriptionCharge` — add a DB `UNIQUE(payment_id)` constraint).
   - Yearly = 12-month frequency; make sure `termDays` (365) vs MP's calendar-month renewal doesn't drift (use calendar months, not fixed days).
   - Plan/term change per D-02. 
   - Payment failure/dunning: grace period (e.g. 5–7 days read-only) + 3 reminder emails, then `expired`.
   - Cancellation: access until `paid_until`; reactivation path.
   - Refunds/chargebacks: handle `refunded`/`charged_back` statuses (reduce `paid_until` or flag the account).
3. **Webhook robustness**: store every raw event in `webhook_events(id, provider_event_id UNIQUE, type, payload, received_at, processed_at, error)`; respond 200 fast, process idempotently; on handler error respond 5xx so MP retries (current code does) but never double-apply; protect against out-of-order events by re-fetching the resource from MP (already done) and comparing `last_modified`.
4. **Reconciliation job** (`billing-reconcile`): daily, for every company with a `subscription_id`, fetch the preapproval + recent authorized payments from MP, correct drift, alert on mismatches (README lists this as a known gap).
5. **Customer portal**: show next charge date, last payments (`payments` table already stored), invoice/comprobante links, and a "update card" link (MP-hosted).
6. **Invoicing (P0-SUNAT):** on each approved payment enqueue a comprobante via the chosen PSE/OSE; store series/number/PDF; email it; reflect in the Ajustes payment list. Collect RUC/razón social for factura at checkout (company data already has RUC).
7. **Remove dev bypass in prod:** `canBypassPayment()` is already `NODE_ENV!=='production'`; additionally require `PAYMENTS_DEV_BYPASS=1` (opt-in) instead of the current opt-out, and add a test that production build never renders `activateDevAction` UI.
8. **Live cutover checklist:** swap to production MP credentials; webhook secret set; small real payment end-to-end with refund; verify the comprobante and email; verify IGV on the receipt.
**Acceptance:** an automated suite using a MP mock covers every row of the state machine; a manual sandbox run of the full lifecycle produces correct `paid_until`, payments rows, emails and activity log; one real live S/ 19 transaction verified and refunded.

> **Phase 4 status (2026-11-01) — partly done.** Done in code + tests (367 unit tests, E2E journey green): calendar-month periods, `UNIQUE(payment_id)`, `webhook_events` log, refund/chargeback handling, `billing-sync` job, `invoices` queue with IGV split and an operator screen (`/operador`) for manual factura issuing, bank transfer against a factura, payments + invoices in Ajustes, dev bypass now opt-in. Yape/Plin deliberately not offered. See `docs/BILLING.md`. **Not done:** the real MercadoPago sandbox run, `x-signature` re-verification against current docs, grace period + dunning emails, automated PSE/OSE issuing (needs the operator entity), the live S/ 19 test, and the provider interface.

**Exit gate P4:** billing state machine tested + reconciled; first real payment verified; comprobante issued.

---

### PHASE 5 — Staging soak, performance and acceptance

> **Phase 5 status (2026-11-01) — everything doable from the repo is done; gate NOT passed.** Phase 4 was worked first by the owner's call, so phases overlap. Full checklist with evidence and what is left for the owner: **`docs/GO-NO-GO.md`**.
>
> Verified on a clean build of the current tree: typecheck · lint · `pnpm test` 378/378 · Playwright 31/31 (journey + quality, desktop and Pixel 7) · `pnpm audit --prod` clean.
>
> | Task | State |
> |---|---|
> | §1 staging + deploy | **Artifacts written, staging not created.** `scripts/deploy.sh` (tests, backup, build in copy, swap, `pm2 restart`, smoke test, auto-rollback; not run: it would restart the live preview), `ecosystem.staging.config.cjs`, `docs/STAGING.md`. DNS/nginx/cert are the owner's. |
> | §2 performance | **Done locally.** Per-request p95 ≤ 33 ms; panel p95 194 ms at 10 continuous users; one process saturates ≈ 70 panel req/s at 50 continuous. No caching needed yet. Landing LCP on mobile 4G: 3.0–3.4 s → **1.8–2.1 s** after removing the hero `<h1>` entrance animation. Videos use `preload="none"` and none download on load. Scripts: `perf-seed.mjs`, `perf-check.sh`, `loadtest.mjs`, `lcp-check.mjs`. Lighthouse/k6 not installed (dependency-free equivalents used). |
> | §3 security | **Partly.** `test/xss.test.ts`, header/cookie checks, secrets scan of tree + git history (clean), `pnpm audit` clean. Open: nginx `server_tokens` (change blocked by the environment; steps in GO-NO-GO), no CSP (needs a decision), ASVS walk-through, SSL Labs, external pen-test. `docs/MERCADOPAGO-SANDBOX.md` holds sandbox secrets and is untracked: do not commit as is. |
> | §4 accessibility / browsers | **Partly.** Basic a11y + mobile overflow checks on Chrome desktop and Android Chrome. Found and fixed unlabeled form inputs (`Field`). Firefox/Safari/iOS not installed here. |
> | §5 UAT | **Not done.** Needs 3–5 people. |
> | §6 legal acceptance | **Mechanism done, content open.** `legal_consents` table (document, version, context, IP, UA, time), required checkbox at signup, notice + consent record at checkout, footer links, draft `/terminos` `/privacidad` `/cookies` with draft banner and `noindex` (`src/lib/platform-legal.ts`). Needs the operator entity and the lawyer. |
> | §7 DR drill | **Local only:** backup 0.16 s, restore 0.09 s, checksum + integrity OK. Fresh-box drill with RTO/RPO and an hourly backup cron are open. |


1. **Staging environment** identical to prod (separate domain `staging.…`, separate DB, MP sandbox, LLM key with low budget, mail in sandbox/catch-all). Deploy script `scripts/deploy.sh` (build, migrate, `pm2 reload`, smoke test, rollback to previous build dir).
2. **Performance:** run Lighthouse on landing (target LCP < 2.5 s on mobile 4G; the landing HTML is 95 KB and videos are 3.7–8.4 MB each — verify they are lazy and that `preload="none"` is used; Cloudflare caching rules for `/video/*`), and the main `/app` pages. Check `getDb()` query counts per page (layout alone runs 7+ queries per navigation); add caching or consolidate if p95 > 300 ms. Load test (k6) 50 concurrent users on login, panel, public ARCO form, webhook.
3. **Security review:** run the checklist: OWASP ASVS L1 walk-through, authz matrix test, CSRF (Server Actions use Origin checks — confirm `allowedOrigins` if behind a proxy with a different host), SSRF (none expected: only fixed vendor URLs), XSS (documents are rendered via a custom parser in `doc-body.tsx`, **no `dangerouslySetInnerHTML` anywhere** — keep it that way; add a test with `<script>` in company name/address and ARCO description), clickjacking, cookie flags, dependency audit, secrets scan (`gitleaks`), TLS config (ssllabs A), nginx `server_tokens off`. Consider an external pen-test before public launch.
4. **Accessibility & browser matrix**: latest Chrome/Edge/Safari/Firefox + Android Chrome + iOS Safari.
5. **UAT with 3–5 real MYPE owners** (clinic, e-commerce, SaaS) in staging using the sandbox: observe where they get stuck; fix.
6. **Legal acceptance**: lawyer sign-off on final documents; platform legal pages live and linked in footer, signup (checkbox with consent log: timestamp, version, IP), and checkout.
7. **Disaster recovery drill**: kill the server, restore from backup to a fresh box using only `docs/RUNBOOK.md`; record RTO/RPO.

**Exit gate P5 (go/no-go checklist):**
- [ ] CI green; E2E green on staging; zero open S1/S2 defects.
- [ ] Authz matrix test passes; no tenant data leak.
- [ ] Backup restore drill passed (RPO ≤ 1 h, RTO ≤ 2 h).
- [ ] Full billing lifecycle verified in sandbox; reconciliation job green.
- [ ] All emails delivered to real inboxes; deadlines reminders verified by faking the clock.
- [ ] AI features verified with real key, quotas enforced, anonymization verified by captured requests.
- [ ] Platform legal documents published and lawyer-approved; SIPDP registration of the platform's own banks done (or scheduled with date).
- [ ] Monitoring and alerts live (P6-OBS).

---

### PHASE 6 — Production cutover and launch

**P6-INFRA**
- Dedicated production host (don't share with unrelated apps: the preview box also runs `micita` and `deepseek-harness`). Non-root user for the app; `systemd` unit or PM2 with `--max-memory-restart`, log rotation (`pm2 install pm2-logrotate`), and `ulimit` set; firewall (only 80/443 + SSH key-only); unattended security updates; Fail2ban.
- nginx: `server_tokens off`, gzip/brotli, `proxy_read_timeout` ≥ AI timeout (45 s → currently 60 s OK), request size limits, and **rate limiting at the edge** (`limit_req`) for `/login`, `/registro`, `/solicitud/`, `/api/`. Keep `X-Forwarded-Proto` handling; confirm `$forwarded_proto` map exists in the nginx http block.
- Cloudflare: proxy on, "Full (strict)" SSL, WAF managed rules + bot fight mode, cache rules for static assets and `/video/*`, page rule to bypass cache for `/app`, `/api`, `/solicitud`, `/pago`. Real-IP restoration in nginx (`set_real_ip_from` Cloudflare ranges) so rate limits see the true client IP.
- Secrets: managed outside the repo (`/etc/datosprivados.env` mode 600 or a secret manager); rotate any token ever pasted in chats/logs.
- Build in CI, deploy an artifact (`output: "standalone"` is worth evaluating — check `02-guides/self-hosting.md`); keep last 3 releases for instant rollback.

**P6-OBS — Observability**
- `GET /api/health` (checks DB read/write, migrations applied, mail/MP/LLM config presence — never secrets) and `GET /api/ready`. External uptime monitor (landing, `/api/health`, public ARCO page, webhook GET) with SMS/email alert.
- Error tracking (Sentry or equivalent via `instrumentation.ts` / `instrumentation-client.ts`), scrub PII; structured JSON logs with request id, company id (no PII), job name; ship logs off-box.
- Business alerts: webhook failures > N, billing reconcile mismatches, outbox backlog, AI error rate, backup age > 26 h, disk > 80 %, job missed.
- Product analytics (privacy-friendly, cookie-less or consent-first): signup → paid → onboarding done → first policy published funnel. Must be reflected in the cookie/privacy notice.

**P6-CUTOVER runbook (write as `docs/CUTOVER.md` and execute)**
1. Freeze changes; tag release `v1.0.0`.
2. DNS TTL lowered 24 h before; mail DNS verified.
3. Fresh production DB from migrations; **no demo seed in prod DB** (P1-DEMO); create the first admin account; set env; `pnpm build`; migrate; start.
4. Smoke tests on prod URL: landing, legal pages, signup (real card, S/ 19, refund), onboarding, policy publish, public ARCO submit, email receipt, health endpoints, robots/sitemap.
5. Switch MercadoPago webhook URL to prod; confirm one real event arrives and verifies.
6. Enable monitoring; confirm alert delivery by triggering a test alert.
7. Announce (soft launch to a limited cohort first, feature flag if needed). Keep staging for hotfix rehearsal.
8. **Rollback plan**: previous release dir + DB backup taken immediately before cutover; criteria for rollback defined in advance.

**Exit gate P6:** production live, smoke tests pass, first paying customer completes the flow, alerts verified.

---

### PHASE 7 — Post-launch operations

- **Weekly:** review error tracker, billing reconcile report, AI usage vs budget, support inbox, failed emails.
- **Monthly:** restore drill from backup; dependency/security updates (`pnpm audit`, Next.js patch releases — read upgrade notes in `01-getting-started/18-upgrading.md`); review AI eval results if the model changed.
- **Yearly / legal:** load next year's holidays; review Peru regulatory changes (ANPD directives, DS 016-2024-JUS amendments, sector norms listed in `AUDITORIA_DOCUMENTOS_LEGALES.md` §7), bump `TEMPLATE_VERSIONS` so customers are prompted to refresh documents; renew platform's own SIPDP data.
- **Backlog after launch (in rough value order):** multi-user + roles; file attachments for evidence (with antivirus + size/type limits, stored outside web root, encrypted); WhatsApp notifications; trial/limited preview per `AUDITORIA_PORTADA.md` §9 once funnel data exists; Postgres migration if growth/availability demands; admin console (customers, billing overrides, AI usage); referral/partner channel (accountants/lawyers); English/other-country expansion (explicitly out of scope today).

---

## 4. Reference

### 4.1 Personal-data flows the platform's own legal pages must describe
- **Customer account data:** name, email, password hash, company name, RUC, address, phone, DPO name/email, billing state. Banks, ARCO inbox, incidents, documents, activity log, provider/tool declarations, evidence log.
- **Data subjects' data held for customers (platform = encargado):** ARCO requesters' name, DNI, email, phone, free-text description, our responses; incident `affected_sample` free text (may contain emails/phones).
- **Sub-processors / recipients:** hosting provider + Cloudflare; MercadoPago (payments, Argentina/Peru entities — verify); email provider (P3-EMAIL); LLM vendor(s) (P3-AI) with anonymization limits; error tracker; backup storage; Turnstile (if used).
- **Technical data:** IP, user agent, session ids, logs; cookies: only `pdp_session` (strictly necessary) today — keep it that way or add a consent banner before any analytics.

### 4.2 Environment variables (target state for `.env.example`)
`NEXT_PUBLIC_APP_URL`, `DATOSPRIVADOS_DB`, `DATOSPRIVADOS_DEMO_DB`, `COOKIE_SECURE`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_SANDBOX`, `MERCADOPAGO_API_BASE` (tests), `PAYMENTS_DEV_BYPASS`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_DISABLED`, `AI_MONTHLY_BUDGET_USD`, `MAIL_PROVIDER`, `MAIL_API_KEY`, `MAIL_FROM`, `CRON_SECRET`, `SENTRY_DSN`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `INVOICING_*` (per chosen PSE/OSE), `BACKUP_*` (shell only).

### 4.3 Where things live (quick map)
- Data layer: `src/lib/db.ts` (schema, migrate, seed, deadlines/holidays, password hashing), `src/lib/data.ts` (queries).
- Auth: `src/lib/auth.ts`, `src/app/actions/auth.ts`, cookie `pdp_session`.
- Billing: `src/lib/{plans,billing,mercadopago}.ts`, `src/app/pago/*`, `src/app/api/mercadopago/webhook/route.ts`.
- Compliance logic: `src/lib/{compliance,incident-criteria,security-checks,document-freshness}.ts`.
- Legal content: `src/lib/{documents,document-catalog,sector-legal,sectors,bank-presets,provider-catalog,legal-faq}.ts`.
- AI: `src/lib/{ai,llm,anonymizer}.ts`, `src/app/actions/ai.ts`, components `ai-chat-assistant`, `incident-ai-panel`, `consent-ai-auditor`, `business-doc-advisor`.
- Public pages: `src/app/page.tsx`, `p/[slug]`, `solicitud/[slug]`.
- Infra on the preview host: `/etc/nginx/sites-enabled/datosprivados.registio.app`, PM2 app `datosprivados` (`next start -p 3000 -H 127.0.0.1`).

### 4.4 Definition of "production-ready" for this app
All of: (1) every S1/S2 defect above closed with a regression test; (2) tests + CI + E2E green; (3) backups restored successfully in a drill; (4) a real payment completed, invoiced, renewed (sandbox) and refunded; (5) every legal deadline feature (ARCO 10/20 business days, incident 48 h) verified by tests *and* produces reminders by email; (6) the platform's own legal documents published and lawyer-reviewed; (7) monitoring and alerting verified by a triggered test alert; (8) one rehearsed rollback; (9) no secrets in git, `.env.example` complete, startup fails fast on missing config.
