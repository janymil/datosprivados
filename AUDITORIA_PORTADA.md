# Front page vs. product — audit and redesign

**Date:** 30 October 2026  
**Scope:** public landing (`src/app/page.tsx`), interactive landing (`src/components/landing-interactive.tsx`), onboarding, app modules, and Peru-specific legal claims.  
**Bottom line:** the compliance core is real, but the old landing overpromised on commercial mechanics (a 14-day trial, plan limits, annual billing, a “real” dashboard) and hid the clinic/MYPE use case behind four broad business cards. Those issues are fixed in this pass. The legal claims themselves are broadly correct for Peru.

**Scope correction:** DatosPrivados is for companies constituted in Peru with a RUC. The SIPDP requires a Peruvian company to register a data bank, so foreign controllers are **out of scope by design**. The old “sociedades extranjeras” README claim and the foreign-company option in Empresa were removed.

---

## 1. What I verified, and how

- Rendered the running app with Playwright at desktop (1440 px) and mobile (390 px), with zero console errors.
- Logged into `/demo` and exercised the dashboard, bancos, documentos, ARCO, incidentes, asistente and ajustes.
- Read the implementation for the claims: `src/app/page.tsx`, `src/components/landing-interactive.tsx`, `src/lib/sectors.ts`, `src/lib/bank-presets.ts`, `src/lib/document-catalog.ts`, `src/app/actions/*`, `src/lib/compliance.ts`, `src/lib/anonymizer.ts`, `src/lib/db.ts`.
- Ran `pnpm typecheck` and `pnpm build`; both pass.
- Cross-checked the Peru legal facts against official sources (section 3).
- Captured before/after evidence in `shots/audit/` (list in section 7).

**The core is not vapourware.** The product really creates an inventory of data banks, generates a SIPDP worksheet, publishes a privacy policy, runs a public ARCO form with 10/20-business-day clocks, records incidents with the art. 34.1 criteria and a 48-hour clock, generates 11 legal documents, keeps an evidence log, exports a JSON, and runs an AI assistant. The AI reply I tested came back in ~10 seconds with “IA activa”.

---

## 2. Claim-by-claim comparison

Status: ✅ implemented · 🟡 true with a caveat / wording issue · 🔴 not implemented in the product · ⚪ legally verified

| # | Claim on the old front page | What the app actually does | Status | What changed |
|---|---|---|---|---|
| 1 | “La Ley 29733 te obliga a declarar esas listas y publicar tu Política.” | Creates bank records, the SIPDP worksheet and a policy with a public link. It does **not** file with SIPDP or verify that you put the link on your website. | 🟡 | Copy now says “te da la ficha” and “publicas con un clic”; the user still files in SIPDP. |
| 2 | “Listo en 30 minutos.” | Onboarding and document generation can be done quickly, but the SIPDP account validation, signed form, and legal review are outside the app. | 🟡 | Changed to “tu expediente en ~30 min”, not “cumplimiento listo”. |
| 3 | “Trámite estatal S/ 0 en SIPDP.” | True. Registration is free, virtual and automatic under DS 016-2024-JUS. | ✅ ⚪ | Kept; verified on gob.pe. |
| 4 | “14 días gratis · sin tarjeta · cancela cuando quieras.” | **No trial.** New accounts are created in `pending` and must activate a monthly or yearly subscription; the demo stays free. | ✅ | Removed the trial claim and implemented a recurring MercadoPago subscription. |
| 5 | “Planes desde S/ 19/mes” and “Pago anual −17 %” (S/ 190 / S/ 390). | Monthly or yearly subscription: S/ 19 / S/ 39 monthly, S/ 190 / S/ 390 yearly (2 months free), charged automatically through MercadoPago (preapproval). | ✅ | Restored the annual option as a real recurring subscription; both terms are wired to checkout. |
| 6 | “Básico: hasta 2 bancos de datos” and “hasta 30 solicitudes ARCO al año.” | **Not enforced anywhere.** A basic account can create unlimited banks and ARCO requests. A clinic typically needs 4 banks, so the old copy excluded clinics from the affordable plan. | 🔴 | Removed the numeric limits. Básico now says “todas tus listas y solicitudes, sin límite”. |
| 7 | “Pro: registros ilimitados” (and “todo lo del Básico + Asistente IA”). | There are no limits in either plan; the actual Pro differentiator is four Pro-gated AI actions (ARCO copilot, SIPDP autocomplete, incident triage, text auditor). | 🔴 | Rewrote Pro as “automatización con IA”; Básico includes the chat assistant. |
| 8 | Hero panel: “92/100 · Al día · 3 de 4 · 1 en plazo · Listo para inspección · Vista real del panel.” | The actual demo is **60/100 · En riesgo · 3 de 4 banks · 2 open ARCO (1 overdue) · 6 of 7 steps**. The old panel was a mock, not the demo. | 🔴 | The hero now shows the real demo starting point: **60/100, 3 pendientes, 2 ARCO abiertas**, labelled “Panel de demo”. |
| 9 | “Las 6 obligaciones legales, resueltas en un solo lugar.” | Six modules exist, but they are not all “obligations”; the app also has EIPD, retention, processing agreements, CCTV, evidence log and JSON export. “Reporte oficial” and “calendario oficial” were overstated. | 🟡 | Renamed to “Todo lo que la ANPD te puede pedir” and “Módulo”; “reporte oficial” → “borrador de reporte”; “calendario oficial” → “días hábiles con feriados del Perú”. |
| 10 | “Asistente Legal con IA 24/7 … redacta correos, respuestas ARCO y cláusulas.” | Works when an LLM key is configured; if the call fails or no key exists, it falls back to predefined answers (“modo básico”). There is no 24/7 SLA. | 🟡 | Kept the capability; removed the “24/7” promise from the pricing bullet and changed “100 % privados” to “se anonimizan antes de enviarse”. |
| 11 | “Tus datos y los de tus clientes se mantienen 100 % privados.” | The app replaces company data, DNI, RUC, phone, email and addresses with tokens before calling the model, and re-hydrates the answer. It is good, but no regex-based anonymizer can guarantee 100 %. | 🟡 | Softened the claim. |
| 12 | “Ficha lista para copiar al SIPDP.” | Real: `bankSheetText()` and a print/copy page. | ✅ | Kept; wording now clarifies it is a worksheet you paste. |
| 13 | “Enlace público para tu Política y formulario ARCO.” | Real: `/p/[slug]` and `/solicitud/[slug]`. | ✅ | Kept. |
| 14 | “Reloj de 10 y 20 días hábiles.” | Real: `addBusinessDays()` excludes weekends and Peruvian national holidays; access = 20, R/C/O = 10. | ✅ ⚪ | Kept. |
| 15 | “Reloj de 48 horas para incidentes.” | Real: criteria from art. 34.1; only qualifying incidents generate the notification deadline; the rest are documented. | ✅ ⚪ | Kept; stat band now says “que cumpla los criterios del art. 34.1”. |
| 16 | “Documento de Seguridad y contratos internos.” | Real: 11 document types, including security, retention, processing agreement, confidentiality/CCTV and EIPD; security checklist for arts. 46/47. | ✅ | Kept. |
| 17 | “Exportación del expediente.” | Real: JSON download in Ajustes. | ✅ | Kept (not prominent on the landing). |
| 18 | “Demo interactiva de Casa Verde.” | Real. | ✅ | Kept; hero state now matches it. |
| 19 | “Multas desde ~S/ 2,600.” | Outdated. With the 2026 UIT of S/ 5,500, 0.5 UIT = **S/ 2,750**; 100 UIT = **S/ 550,000**. The app itself already said S/ 2,750 in the ARCO detail. | 🔴 | Fixed in the stat band to S/ 2,750–S/ 550,000. |
| 20 | “Solo si tratas grandes volúmenes o datos sensibles … microempresa desde 2028.” | Broadly consistent with the published ODP calendar, but “contratar” is not the right verb (the ODP can be internal) and the obligation depends on the type/volume of processing, not only revenue. | 🟡 ⚪ | Removed from the landing FAQ; the app’s Empresa guide still explains it. |
| 21 | “Sin abogados” (hero) vs. “no reemplaza a un abogado” (footer/pricing). | The app is a document generator, not legal advice. | 🟡 | Hero now says “sin lenguaje de abogados”; the disclaimer remains. |
| 22 | “Para todo negocio con RUC 10 o 20.” | RUC 10/20 are taxpayer types, not company sizes. The product is Peru-only: SIPDP requires a Peruvian company, so foreign controllers are out of scope. Legacy DB columns remain for compatibility, but the UI no longer offers a foreign-company path. | 🟡 | Removed from the hero; removed the foreign option from Empresa and the README claim; added a Peru-only notice to signup. |
| 23 | “Soporte WhatsApp” with `wa.me/51987654321`. | Placeholder number; no real support channel is implemented. | 🔴 | Removed the fake number from the footer. |
| 24 | “Al crear tu cuenta aceptas los términos del servicio y la política de privacidad de DatosPrivados.” | **DatosPrivados has no own terms or privacy pages.** It generates those for customers, but does not publish its own. | 🔴 | Not fixed — needs legal copy and two public pages. High priority for a compliance product. |

---

## 3. Peru legal check (the claims that must be right)

| Claim | Verification | Result |
|---|---|---|
| SIPDP registration is free and automatic | gob.pe: “la inscripción … se realiza de manera gratuita y bajo el procedimiento de aprobación automática”, virtual via SIPDP; DS 016-2024-JUS in force since 31 March 2025. [gob.pe/8060](https://www.gob.pe/8060-inscribir-informacion-en-el-registro-nacional-de-proteccion-de-datos-personales) | ✅ Correct |
| ARCO: 20 business days for access, 10 for rectification/cancellation/opposition | gob.pe: “derecho de acceso: 20 días hábiles; derecho de rectificación, cancelación u oposición: 10 días hábiles”. [gob.pe/9269](https://www.gob.pe/9269) | ✅ Correct |
| Fines from 0.5 to 100 UIT | Ley 29733 arts. 38–39; the app’s legal knowledge base uses the same ranges. With UIT 2026 = S/ 5,500: S/ 2,750 to S/ 550,000. [Ley 29733](https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733) | ✅ Correct (old “S/ 2,600” was stale) |
| 48-hour incident notification | DS 016-2024-JUS art. 34: notify the ANPD within 48 hours when the incident meets the criteria (large volume, many people, sensitive data, evident harm). [DS 016-2024-JUS](https://www.gob.pe/institucion/smv/normas-legales/6426760-016-2024-jus) | ✅ Correct |
| ODP schedule: micro (≤150 UIT) 2028, small (150–1,700 UIT) 2027 | El Peruano’s legal supplement (27 Jan 2026) sets the progressive calendar; the app’s dates are consistent. The ODP is only mandatory when the entity also meets the volume/sensitive-data condition. [El Peruano](https://elperuano.pe/noticia/288028-suplemento-legal-juridica-tratas-datos-sensibles-o-grandes-volumenes-evalua-si-debes-nombrar-un-odp) | ✅ Broadly correct |
| UIT 2026 = S/ 5,500 | El Peruano / MEF. [El Peruano](https://elperuano.pe/noticia/286277-ya-rige-la-uit-2026-en-s-5-500-revisa-como-impacta-en-tus-impuestos-y-obligaciones-tributarias) | ✅ Correct |

**Conclusion:** the legal claims were not the main problem. The main problem was that the commercial copy promised things the product did not do (trial, limits, billing) and the social proof was not the actual demo. Those are now fixed or explicitly out of scope.

---

## 4. Why clinics and small MYPE felt forgotten

The app already had a large sector catalogue (55 templates before this pass, including clínica, dental, psicología, laboratorio, fisioterapia, estética, gimnasio, veterinaria, óptica and farmacia). The **landing** did not show it:

1. The old “¿A quién aplica?” block had **four** broad cards. “Consultorio / Salud / Estética” was one card, together with gyms and spas. A clinic owner could not see a clinic-specific answer.
2. The old pricing tied **Básico to RUC 10** and **Pro to RUC 20**. A small clinic is often RUC 20; the copy therefore pushed it to Pro even when it was a micro business.
3. Básico said **“hasta 2 bancos”**. A clinic normally needs at least **pacientes, trabajadores, cámaras and proveedores** (4). The limit made Básico unusable for the exact segment the user was asking about.
4. The hero examples were WhatsApp, Excel, boletas and couriers. There was no “historias clínicas”, “pacientes”, “consentimiento escrito” or “colegio” in the first screen.

This was a real product-marketing gap, not just a feeling.

### What I changed

- **10 visible templates**, with clinics first: consultorio médico/policlínico, dental, farmacia/botica, colegio/nido/academia, restaurante/delivery, bodega/mercado, estudio contable/abogados/agencia, SaaS, hotel, gimnasio/estética/spa. Each shows:
  - the lists the law expects,
  - a clinic-specific legal note (e.g. health data requires written consent),
  - a “Usar esta plantilla” CTA.
- **“Usar esta plantilla” is wired end to end:** `/registro?sector=policlinico` → hidden `sector` field → `signupAction` stores the sector → onboarding preselects the same sector and the right banks. Tested with “Policlínico San Martín”: the clinic template checked **pacientes, trabajadores, reclamaciones, cámaras and proveedores**.
- **8 new sector templates** added to `src/lib/sectors.ts`: policlínico/centro médico, casa de reposo/adultos mayores, salud ocupacional, puesto de mercado, food truck/carreta, comedor/catering de obra, taller de confección, gasfitería/electricidad/mantenimiento. The catalogue now has **63** entries and still says “más de 60” on the landing.
- **Básico is no longer framed by RUC type or bank count.** It is “para ordenar lo esencial” and includes all lists and ARCO requests. Pro is “para consultorios y equipos” and sells AI automation. That is both more accurate and more inclusive.
- The onboarding now shows a **“Plantilla elegida: …”** note so the user sees why the clinic sector is already selected.

---

## 5. Is less text better? Yes — but not by deleting the explainer

**Before:** 8,687 px tall, **1,754 words**, two videos (the 8 MB promo + the interactive explainer), four business types, three myths, seven FAQs, and the false “2 banks / 30 ARCO” limits.
**After:** 7,235 px tall, **1,379 words** (~21 % fewer words, ~17 % shorter), one video, ten templates, six FAQs, no fake limits.

What was removed or compressed:

- the second (promo) video — it duplicated the explainer and loaded a large MP4;
- the “3 errores” interactive card;
- the long “problema” copy;
- two FAQs (ODP detail and the drafting question) — they belong in the app/help, not on a cold landing;
- the “6 obligations” framing — it implied a closed list and was not literally true;
- the trial, cancellation and “unlimited” claims that the product does not enforce.

What was kept, deliberately:

- **one** explainer video, because the target user does not know what a “banco de datos” is; a 40-second illustrated story does more than 300 words;
- the “does this apply to me?” selector, now with 10 real templates;
- the demo panel, now honest;
- the price transparency and the SIPDP S/ 0 message.

For a cold MYPE/consultorio owner, the first two questions are “does this apply to me?” and “what do I actually have to do?”. The page now answers both before asking them to read about ARCO or the DS. Detailed legal explanations should live in the app (`GuideBox`, `help.tsx`) and in a public `/preguntas` page later, not in the first scroll.

If you want to cut further, the next candidates are: (a) move the explainer into a tab or below pricing, (b) reduce the pricing bullets to four per plan, (c) move the FAQ to a separate public page. I would not remove the template selector or the demo panel.

---

## 6. What I changed (files)

- `src/app/page.tsx` — new hero, honest stat band, template section, one video, shorter product/steps/pricing/FAQ, honest demo panel, footer cleanup; header now shows **Entrar** and **Crear cuenta** on mobile too and wraps cleanly at 320 px.
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/registro/page.tsx` — a demo session no longer blocks these pages; both show a “sal de la demo” notice and the form.
- `src/app/demo/salir/route.ts` — clean exit from the demo, optionally redirecting to `/login` or `/registro`.
- `src/app/app/layout.tsx` — demo banner with “Crear mi cuenta” and “Salir de la demo”.
- `src/components/landing-interactive.tsx` — 10 templates + `InteractiveSegments`, shorter product modules, new pricing copy.
- `src/lib/sectors.ts` — 8 new sectors + `findSectorById()`.
- `src/app/(auth)/registro/page.tsx`, `src/components/auth-forms.tsx`, `src/app/actions/auth.ts` — sector/plan prefill; removed the 14-day claim; the signup now honors `plan=pro`; added the “solo empresas constituidas en el Perú” notice.
- `src/app/app/empresa/page.tsx` — removed the foreign-company selector and representative fields; the form is now RUC-only and explains that SIPDP requires a Peruvian company.
- `src/app/actions/company.ts` — saving the company now forces `peruana` / `Perú` and clears legacy foreign fields.
- `README.md` — removed the “sociedades extranjeras” claim; added the Peru-only scope and limitation.
- `src/components/onboarding-wizard.tsx` — “Plantilla elegida” note.
- `src/app/app/ajustes/page.tsx` — plan descriptions now match the product; renewal and plan changes go to `/pago` instead of the old free plan switch.
- `src/lib/plans.ts`, `src/lib/billing.ts`, `src/lib/mercadopago.ts` — monthly/yearly prices, subscription status, 30/365-day periods and MercadoPago Suscripciones (preapproval, REST, no SDK).
- `src/app/pago/page.tsx`, `src/app/pago/resultado/page.tsx`, `src/app/pago/actions.ts`, `src/app/pago/layout.tsx` — paid-first flow: pending account → recurring subscription (monthly or yearly) → activation; dev activation when no token.
- `src/app/api/mercadopago/webhook/route.ts` — webhook for `subscription_preapproval` and `subscription_authorized_payment`, with optional `x-signature` validation.
- `src/app/actions/auth.ts`, `src/lib/db.ts` — new accounts start in `pending`; schema v9 adds `billing_term`, `billing_status`, `paid_until`, `last_payment_id`, `subscription_id`, `subscription_status` and `payments`.
- `src/app/app/layout.tsx`, `src/app/bienvenida/page.tsx` — pending/expired accounts are redirected to `/pago`.
- `src/components/explainer-video.tsx` — removed the “protegido contra multas” guarantee and the “evita multas” badge; changed “casi toda MYPE” to “muchas MYPE”; added `min-w-0` so the video does not force horizontal scroll at 320 px.
- `src/components/ai-chat-assistant.tsx` — changed “100 % privados” to “se anonimizan antes de enviarse al modelo”.
- `src/app/(auth)/layout.tsx` — ARCO line now says 10 and 20 business days.
- `src/app/layout.tsx` — metadata now mentions consultorios and clinics.

---

## 7. Evidence

| Before | After |
|---|---|
| `shots/audit/40-landing-before.png` (8,687 px) | `shots/audit/50-landing-after.png` (7,235 px) |
| `shots/audit/41-dashboard-before.png` (actual demo: 60/100, En riesgo) | `shots/audit/51-segment-clinic.png` (clinic template) |
| — | `shots/audit/52-segment-farmacia.png` |
| — | `shots/audit/53-registro-sector.png` (template prefill) |
| — | `shots/audit/54-onboarding-prefilled.png` (sector selected) |
| — | `shots/audit/56-onboarding-banks.png` (clinic banks preselected) |
| — | `shots/audit/57-empresa-peru-only.png` (RUC-only company form) |
| — | `shots/audit/65-pago-suscripcion.png` (pending account, monthly subscription) |
| — | `shots/audit/66-pago-anual.png` (annual subscription, S/ 190 / S/ 390) |
| — | `shots/audit/63-dev-activated.png` (dev activation → onboarding) |
| — | `shots/audit/64-ajustes-billing.png` (billing status in Ajustes) |
| — | `shots/audit/58-demo-banner.png` (demo banner + exit) |
| — | `shots/audit/59-login-with-demo.png` (login reachable from demo) |
| — | `shots/audit/60-mobile-header.png` (Entrar + Crear cuenta on mobile) |
| — | `shots/audit/61-mobile-header-320.png` (320 px, no horizontal overflow) |
| — | `shots/audit/55-mobile-after.png` (mobile, 390 px) |

Verification commands:

```bash
pnpm typecheck   # pass
pnpm build       # pass
```

---

## 8. Still open / next steps

1. **MercadoPago credentials:** the integration is built, but this environment has no `MERCADOPAGO_ACCESS_TOKEN`. Set a `TEST-…` token for sandbox, `NEXT_PUBLIC_APP_URL` for the back URLs, and `MERCADOPAGO_WEBHOOK_SECRET` for signature validation. Without a token, development shows a manual activation button; production fails closed.
2. **Subscription hardening:** recurring preapproval is implemented, but production still needs webhook testing, dunning/grace handling and a daily reconciliation job against MercadoPago.
3. **Plan limits:** I removed “2 bancos / 30 ARCO” because they were not enforced. If you want limits, implement them — but for clinics, set Básico at **4–5 banks**, not 2, or you will exclude them again.
4. **DatosPrivados’ own terms and privacy policy:** still missing. This is the most important compliance/trust gap left.
5. **Support:** the fake WhatsApp number was removed. Add a real channel when available.
6. **Legal review:** the generated documents are still drafts; the disclaimers are present and should stay.

**Out of scope by design:** foreign controllers. SIPDP requires a Peruvian company with RUC, so the product does not support companies constituted abroad. The old README claim and the foreign-company UI were removed; the legacy DB columns are no longer exposed.

---

## 9. Trial recommendation: paid-first vs. 14 days

The risk is real, not imagination. This product produces **one-time deliverables** (policy, SIPDP worksheet, consent texts, security document). A 14-day full-access trial lets a business download the whole folder and leave; the monthly “guardian” value only matters after they have a reason to come back. For a low-price MYPE product, that is a meaningful leak.

It is also true that a trial increases conversion, especially for a category the buyer does not understand. The answer is not “no trial ever”; it is **do not give away the final artifacts**.

Recommended model (now implemented):

1. **Free demo with sample data** (Casa Verde) — enough to see the panel and documents, no exports, no publishing, no own client data.
2. **Monthly or yearly subscription** (S/ 19 / S/ 39 monthly, S/ 190 / S/ 390 yearly) with automatic renewal through MercadoPago. The first payment activates the period; subsequent charges extend it. The user can cancel from Ajustes. This is the “at least they pay the first month” idea, without turning the product into a one-time document purchase.
3. If you want a trial, make it a **limited preview**: one bank, watermarked documents, no public policy link, no ARCO form, no SIPDP code, no JSON export. The clocks can be shown but not activated.
4. Keep the **recurring guardian value** visible: ARCO deadlines, 48-hour incidents, evidence log, annual updates and document regeneration. That is what justifies the subscription after the initial setup.
5. Track trial-to-paid and 30/60/90-day retention before changing the model. If most trial users export once and cancel, paid-first is the right call.

A free demo plus a monthly subscription is now the implemented model. A full 14-day trial was rejected because it would train users to take the documents and leave.
