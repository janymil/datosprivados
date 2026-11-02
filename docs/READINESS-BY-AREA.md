# DatosPrivados — Readiness by area (oblasti) and task checklists

**Audience:** AI coding agents and humans continuing this project.
**Written:** 2026-11-02, from a read of the repo at `8ea6c6a`, `docs/GO-NO-GO.md`, `PRODUCTION_ROADMAP.md`, and checks run that day.
**Read first:** [AGENTS.md](../AGENTS.md) — Next.js 16.4.3 has breaking changes; read `node_modules/next/dist/docs/` before touching any Next API.

## How to use this file

The app is split into 20 independent **areas**. Work one area at a time, close its checklist, and only then think about the app as a whole (section 4).
This file is a *view* over the other docs, not a replacement. When this file and a dated doc disagree, trust whichever has the later date **and** was verified against the code or the machine.

- **Code %** — is the code built, tested and hardened? **Launch %** — could it go live today, counting things outside the repo (entity, lawyer, domain, credentials)?
- Percentages are the author's judgment from evidence, **not measurements**. Re-score an area only after its checklist items were actually verified.
- Checklist legend: `[x]` done and verified · `[ ]` open · tag `[AGENT]` = can be done in the repo · `[OWNER]` = needs the human / a third party (legal entity, lawyer, DNS, paid accounts, real people) · `[VERIFY]` = a check to run, not code to write.
- Do not tick a box without running its check. Do not mark an `[OWNER]` item done on the owner's behalf.

### Verified facts at time of writing (2026-11-02)

| Check | Result |
|---|---|
| `pnpm test` | 443/443 passing, 28 files |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean (0 errors, 0 warnings) |
| CI | `.github/workflows/ci.yml`; green run `41272543343` per GO-NO-GO (audit, typecheck/lint/test/build, E2E 31/31) |
| Hourly DB backup cron | **Installed and running** (`/etc/cron.d/datosprivados`, `/usr/local/bin/datosprivados-backup`; newest file in `/var/backups/datosprivados` was from 2026-11-02 19:00 Lima). `GO-NO-GO.md` row 5 and `RUNBOOK.md` were corrected on 2026-11-02. |
| Rate limiting | Exists in SQLite (`src/lib/rate-limit.ts`) and is applied to login, signup, ARCO form, password reset, verification, password/email change, account deletion, export, demo, AI. |
| Invoicing | Data model + manual issuance only (`src/lib/invoicing.ts` header says so). **No PSE/OSE API integration.** |
| New guard tests (2026-11-02) | `db-migrations`, `db-indexes`, `tenancy-queries`, `route-guards`, `public-pages`, `zip`, `env` — 38 new tests, all green. |
| Not present | `proxy.ts`/middleware (so no CSP), real staging, Anthropic key, production domain, lawyer review. |

---

## 1. Summary table

| # | Area (oblasť) | Main files | Code | Launch | Biggest blocker |
|---|---|---|---|---|---|
| 1 | Data layer | `lib/db.ts`, `lib/data.ts` | 93 % | 80 % | Single SQLite node; no horizontal scaling |
| 2 | Auth & accounts | `lib/auth.ts`, `actions/auth.ts`, `actions/account.ts` | 93 % | 75 % | Email delivery unproven (verification now gates publishing) |
| 3 | Multi-tenancy & authorization | `requireSession`, `test/authz.test.ts`, `test/tenancy.test.ts` | 96 % | 90 % | No roles beyond `admin` |
| 4 | Billing (MercadoPago) | `lib/billing.ts`, `lib/mercadopago.ts`, `lib/subscriptions.ts`, `api/mercadopago/webhook` | 75 % | 55 % | Reject→pause→cancel never seen with real events; no prod credentials |
| 5 | Invoicing (SUNAT) | `lib/invoicing.ts` | 50 % | 20 % | No PSE/OSE chosen; issuance is manual (P0-SUNAT) |
| 6 | Email & notifications | `lib/mail.ts`, `lib/mail-templates.ts`, `lib/notify.ts` | 85 % | 25 % | No domain / SPF / DKIM / DMARC; never sent to a real inbox |
| 7 | Compliance documents | `lib/documents.ts`, `lib/sector-legal.ts`, `lib/document-freshness.ts`, `lib/document-catalog.ts`, `/p/[slug]` | 85 % | 40 % | Templates never lawyer-reviewed (P0-LEGAL) |
| 8 | ARCO requests | `actions/arco.ts`, `solicitud/[slug]`, `app/arco/*` | 80 % | 65 % | Requester/owner email delivery unproven; no captcha |
| 9 | Incidents (48 h) | `app/app/incidentes/*`, `lib/incident-criteria.ts` | 75 % | 65 % | Pre-deadline alerts depend on email |
| 10 | Data banks & SIPDP | `app/app/bancos/*`, `lib/bank-sheet.ts`, `lib/bank-presets.ts` | 90 % | 85 % | Platform's own banks unregistered (P0-OWN-BANKS) |
| 11 | AI assistant | `lib/ai.ts`, `lib/llm.ts`, `lib/anonymizer.ts`, `lib/ai-guard.ts`, `actions/ai.ts` | 80 % | 40 % | No vendor/key/DPA decided (P0-AI-VENDOR) |
| 12 | Help & knowledge base | `lib/help-content.ts`, `lib/glossary.ts`, `lib/help-tips.ts`, `lib/help-knowledge.ts`, `lib/legal-faq.ts` | 90 % | 70 % | Content not reviewed by lawyer/editor |
| 13 | Landing, demo, SEO | `app/page.tsx`, `components/landing-interactive.tsx`, `lib/demo.ts`, `public/video/*` | 88 % | 65 % | Production domain not wired; demo account is public |
| 14 | Platform legal pages | `lib/platform-legal.ts`, `/terminos`, `/privacidad`, `/cookies` | 70 % | 20 % | Drafts; need operating entity + lawyer (P0-ENTITY, P0-LEGAL) |
| 15 | Security | `lib/security-checks.ts`, `next.config.ts` | 75 % | 65 % | No CSP; no pen-test; no SSL Labs |
| 16 | Cron jobs & operations | `lib/jobs.ts`, `lib/ops.ts`, `api/cron/[job]`, `api/health`, `api/ready` | 88 % | 70 % | No external monitor, error tracking or test alert |
| 17 | Backup & restore | `scripts/backup-db.mjs`, `restore-db.mjs`, `restore-drill.mjs` | 80 % | 65 % | Backups live on the same box; no fresh-machine drill |
| 18 | Deploy & infrastructure | `scripts/deploy.sh`, `ecosystem.staging.config.cjs`, `deploy/nginx-production.conf` | 78 % | 40 % | No real staging; `deploy.sh` never run |
| 19 | Tests & CI | `test/`, `e2e/`, `.github/workflows/ci.yml` | 85 % | 80 % | No Firefox/Safari/iOS; no UAT |
| 20 | Accessibility & UI | `components/`, `app/globals.css` | 75 % | 70 % | Only Chrome desktop + Android checked |

**Reading:** areas 1, 3, 10, 19 are strong. Areas 6, 7, 11, 14 have finished code but are blocked by non-code inputs. Areas 4, 5, 15, 17, 18 still need real engineering or ops work.

---

## 2. Dependencies between areas

Most `[OWNER]` items are shared across areas. Resolve them once:

| Owner input | Unblocks areas |
|---|---|
| P0-ENTITY (operating company, RUC) | 4, 5, 14 |
| P0-DOMAIN (`datosprivados.pe`, DNS, mailbox, SPF/DKIM/DMARC) | 2, 6, 8, 9, 13, 18 |
| P0-LEGAL (Peruvian data-protection lawyer) | 7, 12, 14 |
| P0-SUNAT (invoicing provider, IGV policy) | 5 |
| P0-AI-VENDOR (LLM vendor, DPA, region) | 11 |
| P0-OWN-BANKS (register platform's own banks in SIPDP) | 10, 14 |
| P0-SUPPORT (support channel, refund + retention policy) | 2, 14, 16 |

---

## 3. Checklists per area

### 1. Data layer
Files: `src/lib/db.ts` (1.3k lines, `getDb()` is the hub with 132 callers), `src/lib/data.ts`, `test/db-migrations.test.ts`, `test/db-indexes.test.ts`, `test/tenancy-queries.test.ts`.
- [x] Schema + migrations in `getDb()`, WAL mode, single file `data/datosprivados.db`.
- [x] Decision recorded: hardened SQLite, one process (`docs/DECISIONS.md`).
- [x] [VERIFY] Migrations idempotent on a clean DB and on a DB from the previous release — `test/db-migrations.test.ts` (2026-11-02): same schema on a second open, a v1-shaped DB reaches the current schema with its rows and backfills intact, and re-running `migrate()` on an open connection is a no-op.
- [x] [VERIFY] Indexes for hot queries — `test/db-indexes.test.ts` (2026-11-02) pins 18 panel/cron queries with `EXPLAIN QUERY PLAN` (no `SCAN`, expected index) and fails if a table with `company_id` lacks a company index. Schema v14 added the three that were missing: `idx_activity_company`, `idx_rate_limits_window`, `idx_users_company`.
- [x] [AGENT] Test that fails if a table with `company_id` is queried without it — `test/tenancy-queries.test.ts` scans every SQL literal in `src/app/**`, derives tenant tables from the live schema, and allows only three documented exceptions (own-user lookups).
- [x] [AGENT] Postgres migration trigger documented in `docs/DECISIONS.md` (“Cuándo se pasa a Postgres”), with the cost of turning `db.ts`/`data.ts` async.
- [x] [AGENT] `PRAGMA quick_check` + `wal_checkpoint(PASSIVE)` in `dbIntegrity()` (`src/lib/ops.ts`), reported by the authenticated `GET /api/cron/health` (503 + `db_integrity` alert on failure). `/api/health` stays cheap on purpose.


### 2. Auth & accounts
Files: `src/lib/auth.ts`, `src/app/actions/auth.ts`, `src/app/actions/account.ts`, `src/app/(auth)/*`, `src/app/cuenta/exportar/route.ts`, `src/app/cuenta/exportar/zip/route.ts`, `src/lib/zip.ts`, `src/lib/export-files.ts`.
- [x] scrypt hashes, DB sessions, `pdp_session` HttpOnly + SameSite=Lax, Secure via `COOKIE_SECURE`.
- [x] Rate limits on login, signup, reset, verification, password/email change, delete, export.
- [x] Password reset (single use, 1 h, hashed), change password (closes other sessions), change email (confirmed from new address), delete account (re-auth + `ELIMINAR`, cancels MercadoPago first), JSON export.
- [x] Minimum password 10 characters.
- [x] [AGENT] Email verification now gates **publishing the public policy** (`emailVerificationGate` in `account.ts` + `togglePublishAction`), decided and justified in `DECISIONS.md` (“Verificación de correo: qué bloquea”). Publishing is the only act that exposes the company on an open URL and switches on the public ARCO form; ARCO replies, payment and export stay unblocked on purpose. Test: `test/documents-versions.test.ts`.
- [x] [AGENT] RUC validation beyond “11 digits” was already done and is now verified: `isValidRuc` (prefix + módulo-11 checksum) runs before the SUNAT call in both `signupAction` and `updateCompanyAction`, with `checkCompanyRuc` failing closed. Covered by `test/ruc-lookup.test.ts`.
- [x] [AGENT] ZIP export (`/cuenta/exportar/zip`): own dependency-free ZIP writer (`lib/zip.ts`), bundle builder (`lib/export-files.ts`) with `LEEME.txt`, `empresa.txt`, documents as text, history, CSV tables and the full JSON. Validated by `test/zip.test.ts` and by `unzip -t`. PDF keeps being the print stylesheet (areas 7/20), not a server-side generator.
- [ ] [OWNER] Retention policy for lapsed/cancelled accounts (P0-SUPPORT); `purge-old-data` is 90 days pending that decision.
- [ ] [VERIFY] Reset and verification emails arrive in a real inbox (depends on area 6).
- [ ] [AGENT] Multi-user and roles (admin/viewer/contador): schema has `users.role` default `admin`; post-launch unless pricing requires it.


### 3. Multi-tenancy & authorization
Files: `requireSession`, `requireActiveSession` in `src/lib/auth.ts`; `test/authz.test.ts`, `test/tenancy.test.ts`, `test/tenancy-queries.test.ts`, `test/route-guards.test.ts`, `test/public-pages.test.ts`.
- [x] Authorization matrix tested: no cross-company reads or writes.
- [x] [VERIFY] Re-run the matrix whenever a new route, Server Action or `/api` handler is added — now automatic: `test/route-guards.test.ts` enumerates every page, layout and route handler under `src/app` plus every exported Server Action and fails on a missing guard, with an explicit public allow-list that carries a reason per entry (and fails if an entry goes stale). `test/tenancy-queries.test.ts` does the same for `company_id` in every SQL literal under `src/app/**`. Both run in `pnpm test`, so the PR check is the test suite itself.
- [x] [AGENT] Test that enumerates all routes/actions and fails if one lacks a session guard — `test/route-guards.test.ts` (2026-11-02). Its first run found `createArcoRequestAction` (public ARCO form, guarded by slug + rate limits) and three unguarded layouts, now documented instead of assumed.
- [x] [AGENT] Public pages (`/p/[slug]`, `/solicitud/[slug]`) expose only published data and never internal IDs — `test/public-pages.test.ts` renders both pages and asserts: the published version is served instead of a newer draft, no company/user/document IDs appear in the HTML, another tenant's name never leaks, and the ARCO form identifies the company only by slug (an `ok` ticket from another company is not acknowledged).
- [ ] [AGENT] Roles/permissions model if multi-user is built (see area 2).


### 4. Billing (MercadoPago)
Files: `src/lib/billing.ts`, `mercadopago.ts`, `subscriptions.ts`, `plans.ts`, `src/app/pago/*`, `src/app/api/mercadopago/webhook`, `docs/BILLING.md`, `docs/MERCADOPAGO-SANDBOX.md`.
- [x] State machine unit-tested; webhook signature check (invalid signature → 401).
- [x] Plan change creates a pending subscription; the plan changes only after MercadoPago authorizes (see `DECISIONS.md`).
- [x] One S/ 19 payment approved in sandbox (2026-11-01).
- [x] `billing-sync` reconciliation job exists.
- [ ] [VERIFY] Sandbox run of: rejected payment → paused → cancelled, with real events, confirming local state at each step.
- [ ] [VERIFY] Re-check the `x-signature` manifest format and the `cancelled`/`canceled` spelling against current MercadoPago docs (the roadmap says not to rely on memory).
- [ ] [VERIFY] Webhook idempotency: replay the same event twice and out of order; state must not regress.
- [ ] [AGENT] Dunning: notices for failed payment and the lapsed grace period (check what `lapsed_notice` already covers).
- [ ] [OWNER] Production credentials, merchant account under the operating entity (P0-ENTITY).
- [ ] [OWNER] Confirm pricing/limits and trial policy (P0-PRICING).
- [ ] [OWNER] Refund/cancellation policy and Código del Consumidor auto-renewal disclosure (with area 14).
- [ ] [AGENT] **Security:** `docs/MERCADOPAGO-SANDBOX.md` contains sandbox tokens and test passwords and is untracked. Redact or rotate before it is ever committed (remote `origin` is on GitHub).

### 5. Invoicing (SUNAT)
Files: `src/lib/invoicing.ts`, `test/invoicing.test.ts`.
- [x] An approved payment creates a `pending` invoice with buyer RUC, name, address and IGV split (prices include 18 % IGV).
- [x] The operator records series, number and PDF link by hand; the customer is emailed.
- [ ] [OWNER] Choose the invoicing route: PSE/OSE with an API vs. manual SUNAT portal (P0-SUNAT). Confirm IGV treatment of S/ 19 / 39 / 190 / 390.
- [ ] [OWNER] Operating entity with RUC (P0-ENTITY) — nothing can be issued without it.
- [ ] [AGENT] After the provider is chosen: adapter that moves `pending` → `issued` via API, with retries and failure state.
- [ ] [AGENT] Collect RUC/razón social/fiscal address at checkout and validate (area 2 RUC work).
- [ ] [AGENT] Credit note / void flow (`void` status exists; confirm what triggers it, e.g. refunds).
- [ ] [AGENT] Show invoice numbers and PDFs in Ajustes payment list; confirm.
- [ ] [VERIFY] Rounding: `splitIgv` cases for every plan price, base + IGV = total to the cent.
- [ ] [AGENT] Operator alert when an invoice stays `pending` too long (SUNAT has issuance deadlines — confirm exact rule with the accountant).

### 6. Email & notifications
Files: `src/lib/mail.ts` (Resend over HTTP, outbox), `mail-templates.ts` (19+ templates), `notify.ts`, `api/mail/webhook`, cron `send-outbox`.
- [x] Outbox with backoff, dead letter, dedupe, atomic claim, opt-out, suppression list, signed bounce/complaint webhook.
- [x] Wired to billing, ARCO (owner + requester), incidents, reset, verification.
- [x] `send-outbox` runs every minute via cron.
- [ ] [OWNER] Domain, mailbox (`hola@`), SPF, DKIM, DMARC (P0-DOMAIN).
- [ ] [OWNER] Final provider choice, tied to the operating entity (P0-ENTITY).
- [ ] [VERIFY] Send every template to Gmail, Outlook and a Peruvian ISP mailbox; check spam placement and mail-tester score.
- [ ] [VERIFY] Bounce/complaint webhook with a real signed event; address becomes suppressed.
- [ ] [AGENT] Accessibility check of HTML mail (contrast, alt text, plain-text part).
- [ ] [AGENT] Alert when the outbox has dead-lettered messages (feed into area 16).
- [ ] [AGENT] Optional weekly digest.

### 7. Compliance documents
Files: `src/lib/documents.ts` (1.5k lines), `sector-legal.ts` (1k lines), `document-catalog.ts`, `document-freshness.ts` (`TEMPLATE_VERSIONS`), `document-publish.ts`, `src/app/p/[slug]`, `src/app/app/documentos`.
- [x] 14 document kinds, sector-specific content, immutable `document_versions`, public page serves the published version.
- [x] Publishing blocked while `[…]` placeholders are unfilled; version history in UI; staleness detection.
- [x] XSS tests on names and addresses (`test/xss.test.ts`).
- [ ] [OWNER] Lawyer review of all templates, especially health, education, minors, sensitive data, and the landing claims (P0-LEGAL). `AUDITORIA_DOCUMENTOS_LEGALES.md` §7 lists what was never checked against primary sources.
- [ ] [AGENT] Apply lawyer feedback in `documents.ts`/`sector-legal.ts` and **bump `TEMPLATE_VERSIONS`** for every changed template so customers are prompted to regenerate.
- [ ] [VERIFY] Print stylesheet on Chrome, Firefox and Safari.
- [ ] [AGENT] Server-side PDF generation (optional).
- [ ] [AGENT] Regional-holiday disclaimer where deadlines are shown; admin UI for the `holidays` table (SQL only today).
- [ ] [AGENT] Prominent in-product notice that documents are templates, not legal advice, until reviewed.
- [ ] [AGENT] Split `documents.ts` (1.5k lines) by document kind if it becomes the review bottleneck.

### 8. ARCO requests
Files: `src/app/actions/arco.ts`, `src/app/solicitud/[slug]`, `src/app/app/arco/*`.
- [x] Public form with honeypot and rate limits (5 per IP per 10 min, 300 per company per hour).
- [x] Deadlines (10 / 20 business days) with seeded holidays 2025–2032 and a `holidays-check` job.
- [x] Owner notification and requester acknowledgement with ticket number are coded.
- [ ] [VERIFY] End to end with real email: requester submits → owner notified → owner responds → requester notified.
- [ ] [AGENT] Captcha or proof-of-work on the public form (Cloudflare Turnstile is the natural fit); rate limits are keyed by IP, which is weak behind shared NATs.
- [ ] [AGENT] Attachment handling for identity proof, if required (also see evidence in area 10/12; today evidence is free text only). Decide scope.
- [ ] [AGENT] Reminder emails before each deadline; confirm what `jobs.ts` already sends.
- [ ] [OWNER] Retention of requesters' personal data after closing a request (P0-SUPPORT).
- [ ] [AGENT] Holiday disclaimer for regional holidays in the UI.

### 9. Incidents (48 h)
Files: `src/app/app/incidentes/*`, `src/app/actions/incidents.ts`, `src/lib/incident-criteria.ts`, cron `incident-deadline-reminders` (every 30 min).
- [x] Incident record with criteria evaluation and 48 h deadline.
- [x] Reminder job runs every 30 minutes.
- [ ] [VERIFY] Reminder emails arrive in a real inbox before the deadline (area 6); simulated-clock coverage exists in `test/jobs.test.ts`.
- [ ] [AGENT] Confirm the 48 h rule and notification content against primary sources with the lawyer (P0-LEGAL); `incident-criteria.ts` is the place to change.
- [ ] [AGENT] Generate the notification text/draft for the authority from incident data, if not present.
- [ ] [AGENT] In-app banner for overdue incidents, in addition to email.

### 10. Data banks & SIPDP
Files: `src/app/app/bancos/*`, `src/lib/bank-sheet.ts`, `src/lib/bank-presets.ts`.
- [x] Presets per sector, bank sheet for manual SIPDP registration (by design the user registers).
- [ ] [OWNER] Register the platform's own banks in SIPDP: users, billing, technical logs, ARCO requesters held as processor (P0-OWN-BANKS); appoint the platform's data contact.
- [ ] [VERIFY] Bank sheet fields against the current SIPDP form with the lawyer.
- [ ] [AGENT] Export of the bank sheet to a printable/PDF format, if missing.
- [ ] [AGENT] Cross-border transfer fields (`transfers.ts`) reviewed against the current rules.

### 11. AI assistant
Files: `src/lib/ai.ts` (1.2k lines), `llm.ts`, `anonymizer.ts`, `ai-guard.ts`, `src/app/actions/ai.ts`, `src/app/app/asistente`, `test/ai-controls.test.ts`, `test/ai-evals/`.
- [x] Quotas and per-minute rate limit; anonymization before sending; tested with a simulated LLM.
- [ ] [OWNER] Choose vendor(s), region and contract with DPA and no-training terms (P0-AI-VENDOR). Disclose as sub-processors and as a cross-border transfer in area 14.
- [ ] [OWNER] Provide a production key (none for Anthropic; the OpenAI key was never tested end to end).
- [ ] [VERIFY] Real call per feature: success, timeout, 429, malformed output, empty output.
- [ ] [AGENT] Run `test/ai-evals/` against the real model and record pass rates; set a minimum.
- [ ] [VERIFY] Anonymizer on real Peruvian data patterns (DNI, RUC, phone, address, names); check for leakage in logs.
- [ ] [AGENT] Cost ceiling and an alert on spend per day (feeds area 16).
- [ ] [AGENT] Demo company is on plan `pro`: confirm demo AI usage is capped so it cannot burn the budget (area 13).
- [ ] [AGENT] Disclaimers on AI output; refuse or redirect legal-advice requests.
- [ ] [AGENT] Prompt-injection tests via user-supplied text (document fields, ARCO text) that reaches prompts.

### 12. Help & knowledge base
Files: `src/lib/help-content.ts` (974 lines), `glossary.ts`, `help-tips.ts`, `help-knowledge.ts` (feeds the assistant), `legal-faq.ts`, `src/app/app/ayuda/*`, `test/help.test.ts`.
- [x] Help center, glossary, contextual tips, knowledge base for the assistant (latest commit `8ea6c6a`).
- [ ] [OWNER] Lawyer review of `legal-faq.ts`, glossary and help articles (P0-LEGAL).
- [ ] [OWNER] Native-speaker editorial pass for Peruvian Spanish.
- [ ] [AGENT] Add last-reviewed date per article and a staleness warning.
- [ ] [AGENT] Check every article's links and referenced UI labels still exist (extend `test/help.test.ts`).
- [ ] [AGENT] Search inside help, if absent.
- [ ] [AGENT] Keep `help-knowledge.ts` in sync with `help-content.ts`; add a test that fails on drift.

### 13. Landing, demo, SEO
Files: `src/app/page.tsx`, `components/landing-interactive.tsx`, `src/lib/demo.ts`, `src/app/demo/*`, `public/video/*` (23 MB), `robots.ts`, `sitemap.ts`, `AUDITORIA_PORTADA.md`, `COMPARACION_VIDEO.md`.
- [x] `robots.ts`, `sitemap.ts`, `error.tsx`, `global-error.tsx`, `not-found.tsx` exist.
- [x] LCP mobile 4G about 1.8–2.1 s; videos `preload="none"`; page transfers about 244 KB.
- [x] [AGENT] Hardcoded host removed from the generated artefacts: `documents.ts` `appUrl()` and `bank-sheet.ts` now go through `siteUrl()` (`lib/site.ts`, the single `NEXT_PUBLIC_APP_URL` reader); `layout.tsx` `metadataBase`, `robots.ts`, `sitemap.ts` and `ai.ts` already did. Test: `test/domain.test.ts` (“dominio configurado”) sets a staging host and asserts the generated policy and bank sheet contain it and never `datosprivados.pe`. Still literal on purpose: the support address (`hola@datosprivados.pe`), the demo/seed e-mails and the marketing copy in `landing-interactive.tsx`/`explainer-video.tsx` — they are product identity, not routing.
- [ ] [OWNER] Production domain live (P0-DOMAIN); verify canonical, OG tags and sitemap on it.
- [ ] [AGENT] Demo hardening: the demo company is shared and its credentials are public. Confirm it is reset periodically, is isolated from real customers' data and cannot trigger email, billing or paid AI.
- [ ] [OWNER] Verify every claim on the landing page with the lawyer (P0-LEGAL), including `scripts/verify-video-claims.mjs` outputs.
- [ ] [AGENT] Cloudflare cache rules for `/video/*` (the app already sends `immutable`).
- [ ] [AGENT] Decide on the Fraunces font variable axes (118 KB).
- [ ] [VERIFY] Lighthouse or equivalent on the production domain.
- [ ] [AGENT] Analytics/consent: decide whether any analytics is used; if so, the cookie banner and `/cookies` page must match.

### 14. Platform legal pages
Files: `src/lib/platform-legal.ts`, `src/app/terminos`, `privacidad`, `cookies`, `legal-page.tsx`, acceptance log (version, date, IP).
- [x] Pages and acceptance recording implemented as **drafts**, marked with a notice and `noindex`.
- [ ] [OWNER] Operating entity details (name, RUC, address) (P0-ENTITY).
- [ ] [OWNER] Lawyer-approved Terms, Privacy Policy, DPA, cookie notice, refund/cancellation policy, Libro de Reclamaciones (P0-LEGAL).
- [ ] [AGENT] Fill in entity data and flows listed in `PRODUCTION_ROADMAP.md` §4.1 (personal-data flows the platform's own pages must describe), including sub-processors: hosting, Cloudflare, Resend, MercadoPago, LLM vendor.
- [ ] [AGENT] Remove the draft notice and `noindex` only after legal sign-off; bump the document version so existing users must re-accept.
- [ ] [AGENT] Add Libro de Reclamaciones page/link if the lawyer confirms it applies.
- [ ] [VERIFY] Acceptance record is created at signup and again when a version changes.

### 15. Security
Files: `src/lib/security-checks.ts`, `next.config.ts`, `src/app/actions/*`, `test/security.test.ts`, `test/xss.test.ts`.
- [x] Headers: nosniff, X-Frame-Options DENY, HSTS, Referrer-Policy, Permissions-Policy; no `X-Powered-By`.
- [x] No `dangerouslySetInnerHTML`, `eval(` or `new Function(` in `src/`.
- [x] `pnpm audit --prod` clean; secrets scan of tree and git history clean.
- [x] `server_tokens off` applied on the preview nginx.
- [ ] [OWNER] **Decide on CSP.** It needs a `proxy.ts` with a per-request nonce (see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) and forces dynamic rendering for all pages, which changes performance. Read the performance data in `GO-NO-GO.md` first.
- [ ] [AGENT] Implement the CSP (report-only first) once decided; re-run the E2E and the performance checks.
- [ ] [OWNER] External pen-test; SSL Labs grade A on the production domain.
- [ ] [VERIFY] Server Actions CSRF with the real domain behind Cloudflare and nginx (Origin vs Host); add `allowedOrigins` only if it fails.
- [ ] [AGENT] nginx rate limits on `/login`, `/registro`, `/solicitud/`, `/api/` and `set_real_ip_from` for Cloudflare ranges (`deploy/nginx-production.conf`; the app has its own limits keyed by IP, so the real client IP must be right).
- [ ] [VERIFY] `clientIp()` (`lib/client-ip.ts`) cannot be spoofed with `X-Forwarded-For` from outside Cloudflare.
- [ ] [AGENT] Add `gitleaks` or equivalent to CI (not installed today).
- [ ] [AGENT] Dependabot PRs open for GitHub Actions versions; merge them.
- [ ] [AGENT] Session lifecycle review: expiry, rotation on password change, revocation list.

### 16. Cron jobs & operations
Files: `src/lib/jobs.ts`, `ops.ts`, `src/app/api/cron/[job]`, `api/health`, `api/ready`, `src/instrumentation.ts`, `scripts/weekly-report.mjs`, `docs/RUNBOOK.md`, `docs/POST-LAUNCH.md`.
- [x] Real cron installed (`/etc/cron.d/datosprivados`, wrapper converts to Lima time because Ubuntu cron has no `CRON_TZ`).
- [x] Jobs: `send-outbox`, `incident-deadline-reminders`, `purge-old-data`, `expire-sessions`, `billing-sync`, `holidays-check`, health; bearer `CRON_SECRET`.
- [x] `GET /api/cron/health` checks the backup directory.
- [x] Weekly report and post-launch review scripts (`ops:weekly`).
- [ ] [OWNER] External uptime monitor on `/api/health` and `/api/ready`, plus a paging channel (P6-OBS).
- [ ] [OWNER] Error tracking account (Sentry or similar) and a deliberate test alert fired and received.
- [ ] [AGENT] Wire `instrumentation.ts` to the chosen error tracker.
- [ ] [AGENT] The cron host has no MTA, so job output is lost; failures only go to syslog. Add alerting (via `ops_alert` email or the monitor) when a job fails or misses its window.
- [ ] [VERIFY] Every job is idempotent and safe to run twice; add tests where missing.
- [ ] [AGENT] Structured logs with request IDs (`lib/log.ts`) and log rotation.
- [x] [AGENT] Stale text fixed: `RUNBOOK.md` now states that the hourly cron **is installed** (`/etc/cron.d/datosprivados` → `/usr/local/bin/datosprivados-backup`) and how to verify it; `GO-NO-GO.md` row 5 carries the correction. Verified on the box on 2026-11-02: jobs for `send-outbox` (every minute), `incident-deadline-reminders` (30 min), the backup (hourly) and the daily/weekly ones via the Lima-time wrapper; newest backup file 19:00 Lima, under the 1 h RPO.

### 17. Backup & restore
Files: `scripts/backup-db.mjs`, `restore-db.mjs`, `restore-drill.mjs`, `/usr/local/bin/datosprivados-backup`, `docs/RUNBOOK.md`.
- [x] Backup with sha256 and integrity check; restore script; local drill (0.16 s backup, 0.09 s restore).
- [x] Hourly cron installed and producing files (RPO target of 1 h is met on this box).
- [ ] [AGENT/OWNER] **Off-box copy.** Backups sit on the same server as the database, so a disk or host loss loses both. Add a copy to object storage (encrypted) and verify it.
- [ ] [OWNER] Fresh-machine restore drill following only the RUNBOOK, timed against RTO ≤ 2 h.
- [ ] [AGENT] Retention policy for backup files (the backups contain personal data: apply the same retention and deletion rules as the DB, including account deletion requests).
- [ ] [AGENT] Encrypt backups at rest.
- [ ] [VERIFY] The restore drill runs on a schedule (`ops:restore-drill`) and alerts on failure.
- [ ] [AGENT] Backup of `.env` secrets handled separately and securely (not in the DB backup).

### 18. Deploy & infrastructure
Files: `scripts/deploy.sh`, `ecosystem.staging.config.cjs`, `deploy/nginx-production.conf`, `docs/STAGING.md`, `docs/CUTOVER.md`, `.deploy/`.
- [x] Deploy script, PM2 staging config, production nginx template, cutover doc.
- [ ] [OWNER] Create real staging: domain, separate DB, certificate (`docs/STAGING.md`).
- [ ] [VERIFY] Run `scripts/deploy.sh` once on staging, including a rollback.
- [ ] [OWNER] Production domain, Cloudflare zone, certificate, canonical host (P0-DOMAIN).
- [x] [AGENT] Production `.env.example` complete and matching `lib/env.ts` validation; fail fast on missing variables — `test/env.test.ts` (2026-11-02, 15 tests): every `process.env.*` read by `src/**` must appear in `.env.example` (only `NODE_ENV`/`NEXT_RUNTIME` exempt), each production hazard produces a boot error, and `instrumentation.ts` still throws on errors. `CRON_SECRET` was a warning and is now an **error** in production: without it no email, reminders, session expiry or billing reconciliation run.
- [ ] [VERIFY] Zero-downtime or acceptable-downtime deploy with the single PM2 instance; document the expected blip.
- [ ] [OWNER] Capacity: the box is shared with other apps (`deepseek-harness`, `micita`). Decide on a dedicated host before real customers. One Node process serves about 70 panel renders per second.
- [x] [AGENT] `.deploy/` confirmed git-ignored (`.gitignore`: `.deploy/`, `.next.prev/`, `.next.failed/`) and therefore never shipped in a commit.
- [x] [AGENT] `kaptia-compliance/` resolved: it is another product's dossier. Kept as reference but marked with `kaptia-compliance/README.md` (not product code, never imported, not in the build or the export ZIP) so nobody mistakes it for a spec of this app.

### 19. Tests & CI
Files: `test/` (21 files), `e2e/` (journey + quality specs, mock server), `playwright.config.ts`, `vitest.config.mts`, `.github/workflows/ci.yml`.
- [x] 405 unit/integration tests, E2E 31/31 (desktop Chrome + Pixel 7), CI green, `pnpm audit` job.
- [x] CI bug fixed: tests no longer depend on a pre-existing `test/.tmp`.
- [ ] [AGENT] Add Firefox and WebKit projects to `playwright.config.ts` (`pnpm exec playwright install firefox webkit`).
- [ ] [AGENT] Coverage report with a floor on `lib/billing.ts`, `auth.ts`, `jobs.ts`, `mail.ts`.
- [ ] [AGENT] Add the "every route has a guard" test from area 3 and the "company_id on every query" test from area 1.
- [ ] [OWNER] UAT with 3–5 real MYPE owners; record defects.
- [ ] [AGENT] Keep a living defect list so the "zero S1/S2 open" gate (GO-NO-GO row 3) can be verified instead of assumed.
- [ ] [AGENT] Merge Dependabot PRs for CI actions; pin new action versions.
- [ ] [AGENT] Run the load test (`scripts/loadtest.mjs`) in CI or before each release against a seeded DB.

### 20. Accessibility & UI
Files: `src/components/*` (34 files), `src/components/ui.tsx` (`Field`), `src/app/globals.css`, `e2e/quality.spec.ts`.
- [x] Labels associated with inputs (`Field` uses `<label htmlFor>` and `aria-describedby`); basic a11y checks on desktop Chrome and Pixel 7.
- [ ] [AGENT] Automated axe checks on every main screen (panel, documents, banks, ARCO, incidents, assistant, help).
- [ ] [VERIFY] Keyboard-only walkthrough and screen reader pass (NVDA/VoiceOver) on signup, ARCO form and document publishing.
- [ ] [VERIFY] Firefox, Safari, iOS Safari rendering (shared with area 19).
- [ ] [AGENT] Color contrast audit in both themes if a dark theme exists.
- [ ] [AGENT] Empty, loading and error states for each screen (`loading.tsx` is absent per the roadmap; confirm and add where the panel is slow).
- [ ] [AGENT] Print layouts for documents and the bank sheet (shared with area 7).
- [ ] [AGENT] Mobile layouts for tables (ARCO inbox, banks).

---

## 4. Whole-app gate (do this last)

Only after the areas above are closed or consciously waived:

- [ ] All 20 areas have no open `[AGENT]` items and each open `[OWNER]` item has a named owner and date.
- [ ] `docs/GO-NO-GO.md` rows 1–10 re-evaluated and the file updated with the new date and evidence.
- [ ] Full journey on staging with real domain, real email, sandbox payment and real AI key.
- [ ] Restore from the off-box backup on a fresh machine within RTO.
- [ ] Legal pages approved and published, `noindex` removed.
- [ ] Monitoring alert fired and received.
- [ ] Cutover per `docs/CUTOVER.md`; post-launch reviews per `docs/POST-LAUNCH.md`.

## 5. Maintaining this file

- When you close an item, tick it and put the date and the check you ran in the commit message, not here.
- When you re-score an area, change the numbers in section 1 and say why in the commit message.
- If you find that a statement here is wrong (as happened with the backup cron and the ARCO rate limit while writing this), fix it and note the correction in the commit.
- New area? Add a row to section 1 and a checklist to section 3; keep numbering stable.
