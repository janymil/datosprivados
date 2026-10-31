# Video “GRATIS no es suficiente” vs. the app — claim-by-claim audit

**Source:** `C:\Users\USER\Downloads\final_480p.mp4` (1:49, 854×480, Spanish voice-over with burned-in
captions). 109 frames were extracted (1 fps); 55 of them are distinct slides. Every caption and every
on-screen element was read, then checked against the code and against the running app
(`http://localhost:3001`, Next 16 dev server + the demo company *Casa Verde Perú S.A.C.*).

> The video closes with a disclaimer that is easy to miss: *«Funciones y precio: documento MVP de
> datosprivados.pe · Pantallas ilustrativas»*. So the promise is the **capability**, not the pixel
> layout. This audit therefore checks capabilities and the literal URLs/prices, not the mock-up art.

---

## 1. What the video actually claims

| Time | Claim (as spoken / shown) |
| --- | --- |
| 0:00 | «GRATIS no es suficiente»: registering the data bank in the State portal (SIPDP) is free, but it is only the first step. |
| 0:06 | Analogy: «Registro gratis + sistema contable» = comprobantes, sustentos, plazos, pruebas. |
| 0:13 | datosprivados.pe is «el software contable de la protección de datos». |
| 0:17 | **Reason 1** — the State form «habla en legal»: *V. FINALIDAD*, *VI. FLUJO TRANSFRONTERIZO*. «¿Un dentista sabe qué poner ahí?» |
| 0:24 | «En la app eliges qué datos tienes (clientes en WhatsApp, trabajadores)» → *«Ficha lista ✓ · Copiar»* → «sin pagar a un abogado por cada formulario». |
| 0:31 | **Reason 2** — the State does **not** give you a privacy policy nor consent texts; «política ≠ consentimiento»; «tú debes probar el *sí*» (case: inmobiliaria, 22,5 UIT ≈ S/ 100 mil). |
| 0:42 | «La app genera tu política, un enlace para tu Instagram» (`datosprivados.pe/p/tu-negocio`) «o tu web, y textos para pedir permiso» («¿Te podemos enviar ofertas por WhatsApp? Responde Sí o No»). |
| 0:47 | **Reason 3** — a client writes «borren mi número»: the app gives a request form, «te avisa», «cuenta días hábiles» (10 / 20), «sugiere la respuesta», «guarda la prueba». |
| 0:55 | «¿Tarde? Multa desde S/ 2 750» (0,5 UIT), «¿sin respuesta? grave» (> 5 UIT). |
| 1:10 | **Reason 4** — the Reglamento requires a *Documento de Seguridad* with: quién accede a qué · revisión de permisos (semestral) · inventario y datos sensibles · baja cuando alguien se va. |
| 1:19 | **Reason 5** — incidents: «te roban la laptop» / «un correo sale a 500 clientes» (*ana@… luis@… rosa@… visibles*), criterios (muchas personas · datos sensibles · gran volumen · daño evidente) → «48:00:00» → «47:59:58», «todo incidente se documenta», «borrador del reporte ANPD». |
| 1:37 | «El Estado: registro gratuito ✓. Lo demás: tu problema.» |
| 1:41 | Closing: *datosprivados.pe, tu asistente de cumplimiento* — documentos · políticas · enlace para clientes · plazos · pruebas. |
| 1:47 | «Desde S/ 19 al mes». |

---

## 2. Verdict

**7 of the 14 claims were already fully true**, **5 were only half true** and **2 were missing**.
All 12 that were incomplete are now implemented. The only promise that is still not literal is
**«te avisa»** (see §5): the app alerts inside the panel, it does not send an e-mail or WhatsApp
message yet.

| # | Claim | Before | Now |
| --- | --- | --- | --- |
| 1 | SIPDP registration is free / only the first step | ✅ compliance step «Inscríbelos gratis en el SIPDP», S/ 0 everywhere | ✅ |
| 2 | Ficha del Estado with *V. FINALIDAD* / *VI. FLUJO TRANSFRONTERIZO*, «Ficha lista ✓» + **Copiar** | ⚠️ ficha existed but numbered 1–10 in Arabic (finalidad = #2, flujo = #7) and **had no copy button** | ✅ ficha renumbered **I–X** like the State form (finalidad = **V**, flujo = **VI**), «✓ Ficha lista» badge + «Copiar ficha» |
| 3 | «Eliges qué datos tienes» (clientes WhatsApp, trabajadores…) | ✅ onboarding asks *«¿Qué datos de personas maneja tu negocio?»* + 14 one-click presets | ✅ |
| 4 | Policy generated + public link for Instagram/WhatsApp (`datosprivados.pe/p/tu-negocio`) | ⚠️ policy + `/p/[slug]` existed, but the public host fell back to `datosprivados.pe` | ✅ host defaults to **datosprivados.pe**, full URL visible on the dashboard and in Documentos |
| 5 | Consent texts to ask permission (WhatsApp Sí/No, doble opt-in) | ✅ Documentos → Textos de consentimiento | ✅ |
| 6 | Public ARCO form (`datosprivados.pe/solicitud/tu-negocio`) | ✅ `/solicitud/[slug]` with ticket + constancia | ✅ |
| 7 | Business-day clock (10 / 20 días hábiles) | ✅ `addBusinessDays()` skips weekends **and Peruvian holidays** (incl. Easter) | ✅ |
| 8 | Response template + saved evidence | ✅ 4 legal templates, response stored with date/time, activity log | ✅ |
| 9 | «Te avisa» when a request arrives | ⚠️ in-panel alert + nav badge only (no e-mail/WhatsApp) | ⚠️ same (documented limit) |
| 10 | Security document with the 4 required measures | ⚠️ all four were in the generated text, but there was **no way to track implementation** (the video shows them as a checklist) | ✅ **Checklist de medidas implementadas** with persistence, dates and evidence log entry |
| 11 | Incident with the people affected (*500 clientes, ana@…, luis@…*) | ❌ only a number of affected people | ✅ «A quiénes alcanzó» field, shown in the record and in the ANPD draft |
| 12 | The four art. 34.1 criteria drive the 48 h obligation | ❌ criteria were only a static paragraph; the 48 h clock ran for **every** incident | ✅ criteria checkboxes at registration, chips + verdict in the record, 48 h clock **only when a criterion is met**, otherwise «solo documentar (art. 35)» |
| 13 | 48-hour countdown `48:00:00 → 47:59:58` + ANPD report draft | ⚠️ countdown existed but showed «48 h 0 min»; draft existed | ✅ `HH:MM:SS` ticking clock + draft including criteria and affected people |
| 14 | «Desde S/ 19 al mes» | ✅ Plan Básico S/ 19 / Pro S/ 39 (monthly and annual) | ✅ |

Bonus item from the video's *Reason 3* panels (**«¿Tarde? Multa desde S/ 2 750» / «> 5 UIT»**): the app
quoted «responder fuera de plazo es una infracción» but never the amount → now an **«Si no respondes a
tiempo»** panel on every ARCO request.

---

## 3. What was implemented (files)

| Change | Files |
| --- | --- |
| Ficha as the official form + copy | `src/lib/bank-sheet.ts` *(new)*, `src/app/app/bancos/[id]/ficha/page.tsx` |
| Incident criteria, affected people, conditional 48 h clock, HH:MM:SS | `src/lib/incident-criteria.ts` *(new)*, `src/lib/db.ts` (schema v5 + migration + seed), `src/app/actions/incidents.ts`, `src/app/app/incidentes/{page,nuevo,[id]}` , `src/components/countdown.tsx`, `src/lib/format.ts` (`hoursClock`), `src/lib/compliance.ts`, `src/lib/ai.ts` |
| Documento de Seguridad checklist | `src/lib/security-checks.ts` *(new)*, `src/lib/data.ts` (`listSecurityChecks`), `src/app/actions/documents.ts` (`toggleSecurityCheckAction`), `src/app/app/documentos/page.tsx` |
| Public domain `datosprivados.pe` | `src/lib/documents.ts`, `src/lib/ai.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/app/page.tsx`, `src/app/app/documentos/page.tsx`, `src/components/landing-interactive.tsx`, `src/components/explainer-video.tsx`, `.env.example` |
| ARCO lateness fine panel | `src/app/app/arco/[id]/page.tsx` |
| Full rebrand PrivadoPE → **DatosPrivados** | 26 files (UI copy, legal documents, e-mails, `package.json`, env var `DATOSPRIVADOS_DB`, database `data/datosprivados.db`), wordmark in `src/components/icons.tsx` and `src/app/(auth)/layout.tsx`, schema v6 migrating `demo@privadope.pe` → `demo@datosprivados.pe` |
| Docs | `README.md`, this report |

New database columns (`incidents.affected_sample`, `incidents.criteria`) and table
(`security_checks`) are added by an idempotent migration, so the existing `data/datosprivados.db` keeps
working; incidents already notified are backfilled with a criterion so the demo does not show the
contradiction «notificado» + «solo documentar».

---

## 4. Evidence (running app)

| Screen | File |
| --- | --- |
| Dashboard: public links now `datosprivados.pe/p/…` and `/solicitud/…` | `shots/audit/20-dashboard.png` |
| Ficha SIPDP: «✓ Ficha lista», «Copiar ficha», rubros I–X with V. Finalidad / VI. Flujo transfronterizo | `shots/audit/11-ficha-nueva.png` |
| Incident created from the form: 500 affected, «A quiénes alcanzó», chips, `47:59:47` | `shots/audit/14-incidente-creado.png` |
| Incident form with the four art. 34.1 criteria | `shots/audit/22-incidente-nuevo.png` |
| Incident list: criteria chips, «solo documentar» for non-notifiable ones | `shots/audit/21-incidentes-lista.png` |
| Documento de Seguridad + checklist (1 de 4 marcada, con fecha) | `shots/audit/16-seguridad-marcada.png` |
| ARCO: «Si no respondes a tiempo — desde S/ 2 750 / más de 5 UIT» | `shots/audit/23-arco-detalle.png` |
| Public policy mentioning `datosprivados.pe` | `shots/audit/18-politica-publica.png` |
| Rebrand: landing with the «DatosPrivados» wordmark | `shots/audit/30-landing.png` |
| Rebrand: login with the new wordmark and `demo@datosprivados.pe` | `shots/audit/31-login.png` |
| Rebrand: app shell after signing in with the new demo account | `shots/audit/34-dashboard-brand.png` |

Checks run:

```bash
pnpm typecheck                        # 0 errores
pnpm build                            # compila: 16 páginas generadas, sin warnings
node scripts/verify-video-claims.mjs  # recorre la app con Playwright, 0 errores de consola
```

The Playwright run prints the values it checks — copy button + «Ficha lista» on the ficha, 4 criteria
checkboxes, a countdown matching `^\d{2}:\d{2}:\d{2}$` (`47:59:47`), 4 security checkboxes that toggle
and keep their state on the next page load, the S/ 2 750 panel, and `datosprivados.pe` inside the
generated policy — and it reported `ERRORS: 0`.

---

## 5. Deliberate decisions & known limits

1. **«Te avisa» is in-app.** The app raises a dashboard alert, a nav badge and an activity entry, but
   it still does not send e-mail or WhatsApp messages (no provider is configured in the MVP). If the
   video is meant to promise a *message*, that is the one remaining gap and it needs an e-mail/WhatsApp
   provider — say the word and I wire it.
2. **Rebrand complete.** The whole product is now **DatosPrivados**: logo, page titles, legal
   documents, e-mails (`hola@datosprivados.pe`, demo `demo@datosprivados.pe`), package name and
   database (`data/datosprivados.db`, env var `DATOSPRIVADOS_DB`). Every public address is
   **datosprivados.pe/p/{slug}** and **datosprivados.pe/solicitud/{slug}**, exactly as the video
   shows. The host is `NEXT_PUBLIC_APP_URL` (empty in `.env` ⇒ `https://datosprivados.pe`).
3. **Illustrative numbers.** 22,5 UIT / S/ 100 mil / S/ 2 750 / 5 UIT are the video's figures;
   the app labels the UIT as *referencial* instead of asserting a tax value.
4. **The State's form layout.** The ficha now mirrors the rubros the video shows (*V. Finalidad*,
   *VI. Flujo transfronterizo*) and keeps a printable one-pager; it is still a working sheet, not a
   scraping of the SIPDP web form.
5. **Demo data.** The Playwright verification creates one incident and marks one security measure;
   that residue was removed afterwards, so `data/datosprivados.db` is back to its seed state (one closed
   incident, checklist empty). Re-run `node scripts/verify-video-claims.mjs` any time to reproduce it.
