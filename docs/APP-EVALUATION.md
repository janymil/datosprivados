# DatosPrivados — full evaluation and path to production

**Date:** 2026-11-13. **Method:** code read area by area; the app run end to end on an isolated build (signup → payment → onboarding → data bank → policy → public ARCO request → response → incident → export → password reset → deletion) with simulated MercadoPago, SUNAT lookup and email; every public and panel screen captured on desktop and mobile; all internal links checked; the live preview server inspected. Nothing here is copied from older docs.

**Evidence:** 678/678 unit tests · end-to-end 139/139 (Chrome, mobile Chrome, Firefox, Safari/WebKit, accessibility) with the blocking CSP · 43 screens: all HTTP 200, no horizontal overflow on mobile, 0 browser console errors after the fixes · 107 internal links: none broken · typecheck and lint clean.

---

## 1. Does the app fulfil its purpose?

**Purpose:** let a small Peruvian business (MYPE/PYME with RUC) comply with Ley 29733 and its regulation DS 016-2024-JUS without a lawyer doing everything: know what personal data it holds, register it in the state registry (SIPDP), have the required documents, answer people's data-rights requests on time, handle data breaches within 48 hours, and keep evidence for an ANPD inspection.

**Verdict: yes — the product is functionally complete for that purpose.** Every legal obligation a MYPE has is covered by a working, connected module, and the whole cycle works end to end. Five defects that broke or weakened that promise were found in this audit and fixed (§3). What stands between the app and production is mostly **not code**: domain, legal entity, lawyer review, live integrations (payments, email, AI) and server hardening (§5).

Coverage of the law, obligation by obligation:

| Obligation (Ley 29733 / DS 016-2024-JUS) | Where the app does it | State |
|---|---|---|
| Inventory of data banks and registration in the SIPDP (arts. 29, 34, 44) | Data banks + SIPDP sheet numbered like the state form (I–X), sector presets, "changed after registration" alert | Complete |
| Privacy policy, public (art. 18) | Generated from company data, versioned, published at `/p/[slug]` | Complete (lawyer review pending) |
| Consent texts (arts. 5, 13.5, 13.6) — web, WhatsApp, newsletter, sensitive data | Documents → consent texts | Complete |
| Security document and measures (art. 16; regulation arts. 46–47) | Security document + checklist of measures + six-monthly access review alert | Complete |
| Confidentiality of staff (art. 17) | Confidentiality agreement | Complete |
| Processors (encargados) and international transfers | Tools/providers module, processor clause, transfer alerts | Complete |
| Retention, worker notices, impact assessment (EIPD), data officer (ODP) | Dedicated documents; ODP deadline alert for sensitive-data businesses | Complete |
| ARCO rights: information 8, access 20, others 10 business days, Peruvian holidays | Public form, ticket, deadline clock, reminder emails, legal reply templates | **Complete after fix** (information right was missing) |
| Data breach: 48 h notice when criteria of art. 34.1 apply, incident log | Incidents with criteria, 48 h clock, ANPD draft, notice to affected people | Complete |
| Evidence for inspection (proactive accountability) | Activity log, evidence records, JSON/ZIP export of the whole file | Complete |
| CCTV sign (video-surveillance directive) | Documents → CCTV sign | Complete |
| Libro de Reclamaciones (consumer law) for the customer's business | Generated for customers | Complete |

---

## 2. Area by area

Status: **Complete** = built, connected and verified · **Complete, blocked** = built, waits for an outside input · **Partial** = works, with a functional gap.

| # | Area | What it does / how it is connected | State | Findings |
|---|---|---|---|---|
| 1 | Public website (17 pages: landing, sectors, guides, templates, fine calculator, self-diagnosis, glossary, accountants) | Static and SEO pages; CTA → `/registro` or `/demo`; prices read from `plans.ts` | Complete | Claims need the lawyer. "Implementación incluida" is ambiguous (see §4). `/contadores` offers multi-client management that does not exist (labelled as pilot). |
| 2 | Demo | `/demo` signs into a read-only sample company | **Complete after fix** | Seed had fixed dates: the demo was aging (expired requests, "EN RIESGO") and showed a false "update your SIPDP sheet" alert. Fixed: dates move with today on every demo entry. |
| 3 | Signup, login, verification, password reset, email change | RUC verified against SUNAT (Decolecta); scrypt; session rotation; single-use expiring tokens; rate limits | Complete | — |
| 4 | Payment and activation | Annual only: first year S/ 290 / 390, renewal S/ 120 / 190; MercadoPago (subscription closed after first charge) or bank transfer + manual invoice; webhook verified and re-fetched | Complete, blocked | Needs production MercadoPago under the entity. README described the old monthly model (fixed). |
| 5 | Onboarding | Sector wizard proposes the typical data banks | Complete | — |
| 6 | Dashboard, score, alerts | 8-step plan (100 pts), alerts (overdue ARCO, 48 h, transfers, ODP, access review), penalties | Partial | **Score overstates compliance:** processor contracts, retention, worker notices, ARCO procedure and EIPD don't count, and contract/transfer gaps are only warnings — a company can show "Al día". |
| 7 | Data banks + SIPDP sheet | Create, edit, register with code/date, sheet to copy into the state portal | **Complete after fix** | **Editing a bank crashed ("Algo salió mal")** — fixed at the root. Draft banks could not be removed — added. A registered bank can now be retired (cancelled at ANPD). |
| 8 | Tools / providers | Catalogue of common tools, country, contract and transfer status, feeds bank sheets and alerts | Complete | — |
| 9 | Documents (14 kinds) | Generated from company + banks + providers; versions; publish/unpublish; outdated detection when templates change; print/PDF | Complete, blocked | Lawyer review of every template. |
| 10 | ARCO requests | Public form (rate limit, honeypot, optional proof-of-work), ticket, deadline with holidays, reminders, reply templates, AI drafter (Pro), inbox, manual entry for WhatsApp/phone | **Complete after fix** | **Right of information (8 days) was missing** — such a request would run on a 20-day clock; added. Replies had to be copied by hand — added "Enviar por correo" (pre-filled). |
| 11 | Incidents | Criteria of art. 34.1, 48 h clock only when criteria apply, ANPD draft, notice to affected people, AI evaluator (Pro), overdue banner | Complete | — |
| 12 | Evidence | Dated records (access reviews, training, etc.) | Complete | Records only, no file attachments (decided for v1). |
| 13 | Help centre, glossary, legal assistant | 18 articles, journey, tooltips; same source feeds the assistant | Complete, blocked | Lawyer/editor review. |
| 14 | AI features (assistant, ARCO drafter, bank wizard, incident evaluator, text reviewer, document advisor) | Anonymised before sending, consent, quotas, budget, kill switch; rule-based fallback for each | Complete, blocked | Not live (no vendor). **Pro is sold for its AI features**: without AI live, Pro customers pay for rule-based answers. |
| 15 | Account: export and deletion | JSON + ZIP export; deletion cancels payment first, keeps tax records | Complete | — |
| 16 | Emails (24 templates) and notifications | Outbox with retries, dedupe, suppression, bounce webhook, opt-out | Complete, blocked | No provider/domain: nothing is sent today (password reset doesn't work live). |
| 17 | Operator back office (`/operador`) | Issue invoices, confirm transfers, credit notes, holidays | Partial | **Anyone signing up first with the operator's email got access** — fixed (verified email required). Customer/billing overview added (`/operador/clientes`). |
| 18 | Scheduled jobs (13) | Reminders, billing reconcile/sync, outbox, purge, lapsed notices, holidays, digest, ops alert, demo reset | Complete | `ops-alert` and `demo-reset` not enabled on the server. A job used the system clock instead of its own (fixed). |
| 19 | Platform's own legal pages | Terms, privacy, cookies; acceptance recorded with version/IP | Complete, blocked | Drafts (entity + lawyer). Libro de Reclamaciones: LibroDigital.pe (SEMANTIKA TECH E.I.R.L.), linked from the footer. |
| 20 | Security (application) | Tenant isolation enforced by a static test, CSRF by Origin, CSP (report-only by default), headers, input limits, no third-party cookies | Complete | — |
| 21 | Server and operations | PM2, nginx + Cloudflare, hourly backups, logrotate, fail2ban, auto security updates | Partial | Firewall off with **remote desktop (3389) and another app's dev server (5000, root) open to the internet**; app runs as root; backups only on the same server; 2 DB dumps were world-readable (fixed). |
| 22 | Tests and CI | 678 unit, 139 E2E, coverage floors, dependency audit | Complete | CI red on GitHub since 11-04 (fixed locally, needs push). |

---

## 3. Fixed in this audit (all tested)

1. **Data-bank edit page crashed** for every customer (SQLite row passed to a client component). Root fix in `src/lib/data.ts`; unit test + E2E step.
2. **Right of information (8 business days) missing** from the public form, inbox, templates and classifier. Added everywhere, with reply template; tests.
3. **Demo aging + false alert.** `refreshDemoDates()` on every demo entry and weekly reset; test.
4. **Operator takeover** via unverified signup with the operator's email; test.
5. **Draft data banks could not be deleted**; added with tenant test.
6. ARCO reply "Enviar por correo" (pre-filled), public form deadlines text, cookie policy (localStorage), README pricing.
7. Earlier today: CI red (2 causes), job clock bug, world-readable backups (S1), deploy copying 1.9 GB, lint warnings, junk files removed.

---

## 4. Product decisions only the owner can take

- **"Implementación incluida"**: is it the app generating the documents (then reword) or a person doing the setup (then define the service, who and how long)? It justifies the higher first-year price; a mismatch is a consumer-complaint risk.
- **Pro plan before AI is live**: connect the AI vendor before launch, or sell only Básico until then.
- **Accountant offer**: keep `/contadores` as a waiting list, or fund multi-company accounts.
- **Score**: approve counting processor contracts, retention, worker notices and the ARCO procedure in the score (recommended; the agent implements it).

---

## 5. To production

### Agent — doing now / next, no input needed
- [x] Platform's **Libro de Reclamaciones**: the official one is SEMANTIKA TECH E.I.R.L.'s on LibroDigital.pe (`PLATFORM_COMPLAINTS_URL`), linked from the footer; `/libro-de-reclamaciones` redirects there. Complaints are answered in LibroDigital, not in `/operador`.
- [x] Retirement of a **registered** data bank: status `cancelado` with date and resolution number; final, leaves documents/score/digest, kept in history. Tests: `test/bank-cancel.test.ts`.
- [ ] Score rebalancing (after the owner's yes in §4).
- [x] Keyboard-only walkthrough (automated, `e2e/keyboard.spec.ts`): visible focus at every stop, no traps or positive tabindex, footer link to the Libro reachable by keyboard, panel → bank → sheet. Added a "Saltar al contenido" skip link. A screen-reader pass by a person is still open.
- [x] Operator overview of customers and billing state: `/operador/clientes` (read-only; deleted accounts counted, not listed).

### Agent — ready, needs only the owner's "yes" (touches the live server or GitHub)
- [ ] Commit, push (turns CI green), deploy.
- [ ] Firewall: allow 22/80/443 + Tailscale; 80/443 only from Cloudflare; 3389 only over Tailscale; close 5000.
- [ ] Run the app as a non-root user.
- [ ] Turn on ARCO-form proof-of-work, enforce CSP, enable `ops-alert` and `demo-reset` jobs, weekly restore drill.
- [ ] Merge Dependabot #1–#6.

### Owner — decisions, accounts, secrets, legal, people
- [ ] **Register `datosprivados.pe` today** (not registered; anyone can take it). Cloudflare zone.
- [ ] Legal entity with RUC; Peruvian data-protection lawyer (templates, platform legal pages, landing claims, incident of 11-03); register the platform's own data banks in SIPDP.
- [ ] MercadoPago production account; invoicing route (PSE/OSE or SEE-SOL) and IGV; bank details for transfers.
- [ ] Email provider account (Resend), `hola@` mailbox, alert address.
- [ ] AI vendor + data-processing contract + monthly budget.
- [ ] Decisions in §4; refund policy; retention of cancelled accounts; support channel.
- [ ] Off-server backup storage account; uptime-monitor and error-tracker accounts.
- [ ] Staging DNS record or skip staging; dedicated server or stay shared; SSH password login.
- [ ] People: 3–5 business owners for testing, screen-reader check, external pen-test.

After the owner items arrive, the agent wires each one (DNS/mail records, certificates, credentials, webhook URLs, AI tests, monitoring) and runs the cutover in `docs/CUTOVER.md`.
