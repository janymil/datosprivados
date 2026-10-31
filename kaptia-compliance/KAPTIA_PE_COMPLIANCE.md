# Kaptia (kaptia.app) — Peru compliance dossier

**Date:** 29 October 2026
**Analysed:** live site (`kaptia.app`, sk/en/es) **and** the source at `C:\Users\USER\Documents\FinanzerPro` (Express + React + Postgres).
**Operator on the legal pages:** **NutriNova LLC**, 2105 Vista Oeste NW, Albuquerque, NM 87120, USA — no RUC, no establishment in Peru.

---

## 0. Bottom line

You already have the *public* layer: privacy policy, terms, cookie policy with a consent-first banner, refund policy, a working **Libro de Reclamaciones**, account export and account deletion.

What you do **not** have is the *Peruvian compliance file* — the part the ANPD actually asks for in a fiscalización:

| Layer | State |
|---|---|
| Política de privacidad | ⚠️ exists, but written to a 2022-era template: cites the **repealed** DS 003-2013-JUS, names 7 of your ~14 recipients, promises "solo texto anonimizado" while voice audio goes raw to Groq, and gives the ARCO deadlines only as a vague "8–20" range |
| Términos de uso | ⚠️ exists, reasonably complete, but New Mexico law + exclusive NM courts for Peruvian consumers is an abusive-clause risk, and there is no RUC / IGV statement |
| Bancos de datos registrados (RNPDP/SIPDP) | ✘ none |
| Documento de Seguridad | ✘ none |
| Contratos de encargado de tratamiento (DPA) | ✘ none documented |
| Transferencias internacionales (garantías) | ✘ disclosed vaguely, no legal mechanism |
| Procedimiento + registro ARCO | ⚠️ only an e-mail address; no register, no deadlines, no template |
| Protocolo de incidentes 48 h + registro | ✘ none |
| Libro de Reclamaciones | ✔ works (missing RUC + mandatory aviso) |
| IGV / RUC as non-domiciled digital provider | ✘ apparently not done (D. Leg. 1623) |

Rough effort to close: **2–4 weeks of paperwork + ~2 weeks of small code changes**, most of it in the privacy policy and the security document.

---

## 1. Which law applies to you

| Rule | Why it hits Kaptia |
|---|---|
| **Ley N.° 29733** (protección de datos personales) + **DS N.° 016-2024-JUS** (new Reglamento, in force since end of March 2025, repeals DS 003-2013-JUS) | You process data of people in Peru. The new Reglamento explicitly has **extraterritorial reach**: it applies to controllers not established in Peru that offer goods/services to people in the country or monitor their behaviour. A US LLC with a Spanish-language checkout in PEN is squarely inside. |
| **Non-domiciled controllers** | The Reglamento requires foreign controllers to operate through a **representative in Peru** and to comply like a local one. Confirm the exact mechanism with counsel — but plan for "you must act as if you were Peruvian". |
| **Ley N.° 29571** (Código de Protección y Defensa del Consumidor) | Libro de Reclamaciones, information duties, abusive clauses, auto-renewal. You already target Peru with `reclamaciones`, PEN pricing and MercadoPago. |
| **D. Leg. N.° 1623** (IGV on digital services by non-domiciled providers) | A foreign provider selling digital services to Peruvian **final consumers** must register in the **RUC** and charge/pay **IGV 18%** monthly, without a physical office. It does **not** have to issue comprobantes de pago. |
| **Ley N.° 31814** (AI, 2023) | Principles + a pending reglamento; no heavy private-sector duties yet. Watch item. |

**Key consequence:** the fact that NutriNova LLC is in New Mexico protects you from nothing in Peru. It *does* change one thing: you have no RUC today, and both the SIPDP register and the IGV regime assume you have one. The RUC you get under D. Leg. 1623 is the same identifier you will use to register your bancos de datos.

---

## 2. Bancos de datos you need

A "banco de datos" is not a table — it is an **organised set of personal data with one purpose**. The ANPD expects one registration (one ficha, one code) per bank. From your schema and routes, Kaptia has **nine**, and four of them are the ones people forget.

| # | Banco de datos | Purpose (finalidad) | Data / subjects | Retention | Main recipients | Register? |
|---|---|---|---|---|---|---|
| 1 | **Usuarios / Cuentas** | Authentication, account, plan, preferences, support | Clerk id, e-mail, first/last name, photo URL, phone, website, language, timezone, plan, currency, `ai_enabled`, notification prefs, Stripe/MP ids | Until deletion + 30 d backups | Clerk, Neon, Stripe, MercadoPago | ✅ |
| 2 | **Registros financieros** | The product itself: expenses, income, budgets, goals, reminders, recurring rules | Amounts, descriptions (**encrypted**), dates, categories, merchant names, payment URLs, notes, `ocr_text` | Until user deletes / account deletion | Neon; AI providers (redacted text); own PDF service | ✅ |
| 3 | **Recibos y estados de cuenta** | OCR / extraction of receipts and bank statements | Images, masked images, OCR text, detected amount/date, `image_url`, OCR vendor, import logs | Until deleted | Cloudflare R2 / Bunny CDN; Mistral OCR → Google Vision → OpenAI vision | ✅ |
| 4 | **Voz y transcripciones** | Voice expense entry | **Raw audio buffer** sent to Groq (whisper-large-v3-turbo); resulting transcript stored in `merchant_learning.transcript` | Audio: transient. Transcript: as long as the transaction/learning row | **Groq** | ✅ |
| 5 | **Metas colaborativas y mensajes** | Shared goals, chat, contributions between users | Participations, contributions, messages, public flags, join codes, cover images | Until goal/account deleted | Neon (visible to other participants) | ✅ |
| 6 | **Invitados / contactos que no son usuarios** | Invitations by e-mail (`POST /api/friends/request`, `POST /api/collaborative-goals/:id/invite`) | **E-mail address of a third party who never signed up** + who invited them | Not defined in code | Neon + Zoho SMTP | ✅ **and it is a notice gap** |
| 7 | **Libro de Reclamaciones** | Legal duty (Ley 29571) | Name, document type/number (**DNI/CE/passport/RUC**), address, e-mail, phone, service, amount, facts, request, response | Legal record — keep ≥ 2 years (prescription), 5 is safer | None (e-mail only) | ✅ |
| 8 | **Seguridad, logs y analítica** | Abuse prevention, security, debugging, AI cost control | IP (`ai_usage.ip_address`), user-agent, route, error messages/stacks, breadcrumbs, GeoJS `countryCode/city`, blocked-country logs | 30 days today (policy). Access logs should be **≥ 2 years** | Cloudflare, GeoJS, ipapi.co, Error Guard tables | ✅ (register as "control de seguridad") |
| 9 | **Facturación y pagos** | Billing, dunning, tax | Stripe customer/subscription, MP preapproval, payment failures, invoices | ≥ 5 years (tax) | Stripe, MercadoPago | ✅ |

Optional 10th if you ever sell courses seriously: **Progreso de aprendizaje** (course progress, achievements, learning stats).
And when you hire anyone (even a VA): **Trabajadores / Colaboradores**.

### Notes that matter for the fichas

- **#6 is your sharpest exposure.** The app lets a user type a friend's e-mail; that person gets an e-mail and their address sits in `friendships`. Under Ley 29733 you are treating a third party's data without having informed them. You need (a) a line in the invitation e-mail identifying Kaptia/NutriNova, the purpose (invitation), and how to object, and (b) a retention rule (delete unaccepted invitations after e.g. 90 days).
- **#4 breaks a statement in your policy** ("las funciones de IA… solo texto anonimizado"). The audio leaves your server unmasked. Either anonymise/transcribe locally, or fix the wording (see §6).
- **#8**: IP addresses are personal data in Peru (indirect identification). Today they are stored in `ai_usage` and shipped to `get.geojs.io` and `ipapi.co` on request paths. Both are third-party communications that your policy does not disclose.
- **Financial data is not "sensitive data"** under Ley 29733 (the closed list is biometric, health, religion, political opinion, sexual life, racial/ethnic origin). Good news: no "consentimiento expreso por escrito" regime. But it *is* high-risk, and bank statements can reveal health (pharmacy, clinic) — treat the receipt bank as sensitive-adjacent in the Documento de Seguridad.

### How the registration works

1. Create the account at **`sipdp.minjus.gob.pe`** with proof of representation of NutriNova LLC.
2. Fill one **ficha** per bank above: name, purpose, data categories, data-subject categories, storage system/location, recipients, international transfers, security measures, retention, controller + processor.
3. Free, **automatic approval**, subject to later inspection. You get a **constancia** and a **código** per bank.
4. Keep them updated: any change of purpose, recipients or cancellation is a filing obligation.

The ficha is the document the ANPD asks for first — and it must match reality. Do not register five banks if the app has nine.

---

## 3. Internal documents (not published)

| # | Document | Basis | Must contain | Status |
|---|---|---|---|---|
| 1 | **Documento de Seguridad** (approved, with *fecha cierta*) | Art. 16 Ley 29733; DS 016-2024-JUS | Inventory of every bank + systems; access management and privilege review (every 6 months); backups and restore tests; retention/purge rules; encryption; incident procedure; roles; **logical-access records kept ≥ 2 years** | ✘ missing |
| 2 | **Inventario / ROPA** (registro de actividades de tratamiento) | Accountability | The 9 banks above, purposes, legal basis, recipients, transfers, retention | ✘ (implicit in code only) |
| 3 | **Acta de designación del ODP** + comunicación a la ANPD | DS 016 + RD 100-2025-JUS-DGTAIPD | Name, independence, contact published on the site; communicated to ANPD | ✘ — likely **not yet mandatory** for you (see below), but cheap to do voluntarily |
| 4 | **Contratos de encargado de tratamiento (DPA)** with each provider | DS 016 | Purpose limitation, security, confidentiality, sub-processors, incident notice, return/deletion at end, audit | ✘ none on file |
| 5 | **Cláusulas contractuales / garantías de flujo transfronterizo** | DS 016 (transfers) | The ANPD has not declared the US as providing an adequate level → contractual clauses + a short transfer assessment; include onward transfers to sub-processors | ✘ |
| 6 | **Protocolo de incidentes (48 h)** + **registro de incidentes** + modelo de notificación ANPD/CNSD | DS 016 | Who decides, in what hour, what data goes in the notice (nature, categories, ~number of people, consequences, contact, measures) | ✘ (you have error monitoring, not a breach protocol) |
| 7 | **Procedimiento ARCO + portabilidad** + formulario + **registro de solicitudes** + plantillas de respuesta | Arts. 19-27 Ley 29733; DS 016 | Free channel, identity verification, **20 business days (acceso) / 10 (rectificación, cancelación, oposición)**, portability, evidence of each answer, notice of the right to complain to ANPD | ⚠️ e-mail only, no register, no deadlines |
| 8 | **Política de retención y eliminación** + evidence of purges | Minimisation | Per bank; backups 30 d, AI cache 7 d, error logs 30 d, complaints 2-5 y, billing 5 y | ⚠️ partially in the policy table |
| 9 | **Política de control de accesos y privilegios** | DS 016 | Who has admin (your `ADMIN_PASSWORD`), 2FA, review every 6 months, offboarding | ✘ |
| 10 | **Política de respaldos y recuperación probada** | DS 016 | `backupScheduler`, R2/local backups, restore test evidence | ⚠️ code exists, no document/evidence |
| 11 | **Acuerdos de confidencialidad** (founder, contractors, any collaborator) | Art. 17 Ley 29733 | Confidentiality survives termination; ban on copying datasets; incident reporting | ✘ |
| 12 | **Evaluación de Impacto (EIPD)** — voluntary | DS 016 (facultative) | For AI/OCR + financial profiling: necessity, risks, mitigations | ✘ — recommended, and a strong defence if the ANPD ever looks at the AI pipeline |
| 13 | **Registro de consentimientos** | Art. 5, 13 | Evidence of the AI opt-in, cookie choice, terms acceptance (timestamp + version) | ✘ (no consent log today) |
| 14 | **Capacitación / evidencia** | Accountability | Short annual privacy training record | ✘ |

### About the ODP

The obligation is **conditional** — it applies to controllers that process large volumes, data that can affect many people, or sensitive data, and it is being phased in by revenue bracket: >2,300 UIT (30 Nov 2025), 1,700–2,300 UIT (30 Nov 2026), 150–1,700 UIT (30 Nov 2027), ≤150 UIT (30 Nov 2028). A pre-revenue/early-stage SaaS is almost certainly in the last bracket, so **not yet mandatory**. Still, the ODP is the person who signs the Documento de Seguridad and answers the ANPD — appointing an external ODP for a few hundred soles a month is the cheapest way to have items 1–14 actually written.

### DPAs you need to sign (or at least archive the provider's standard one)

Clerk · Neon · Cloudflare (R2 + WAF) · Bunny.net · Stripe · MercadoPago · OpenAI · Mistral · Groq · Google Cloud Vision · your e-mail provider (Zoho/SMTP) · GeoJS · ipapi.co · Google (Analytics/Ads, only with consent).

Note: `ai-processor.formatika.dev` and `pdf-processor.formatika.dev` are **your own** services on your own VPS — no DPA needed, but they must appear as **sub-processors / internal recipients** in the Documento de Seguridad and in the transfer assessment.

---

## 4. Documents the user must be able to see

| # | Document | State | What to fix |
|---|---|---|---|
| 1 | **Política de privacidad** | ⚠️ | See §6 — the biggest single piece of work |
| 2 | **Aviso de privacidad corto** at each collection point (signup, receipt upload, complaint form, invitation) | ✘ | 2-3 lines + link to the policy. Required by the *deber de información* at the moment of collection |
| 3 | **Textos de consentimiento** (AI opt-in; marketing if ever; cookie categories) | ⚠️ | AI is **on by default** (`users.ai_enabled = true`). Make it an explicit opt-in, or a clearly separated setting enabled at signup with a checkbox |
| 4 | **Política de cookies + banner** | ✔ | Banner is genuinely consent-first (`consent.ts`, `analytics.ts`). But the cookie table lists generic rows, not the real cookie names/durations |
| 5 | **Términos de servicio** | ⚠️ | See §7 |
| 6 | **Política de cancelación y reembolsos** | ✔ | Adequate; tie it to the consumer-rights section |
| 7 | **Libro de Reclamaciones (virtual)** + **aviso** | ⚠️ | Works and stores the record, but the hoja has **no RUC** and there is no visible **aviso** ("Este establecimiento cuenta con un Libro de Reclamaciones a su disposición") next to the footer link. Response term 30 calendar days ✔ |
| 8 | **Canal ARCO público** (form + e-mail + deadlines) | ⚠️ | Add a form (you already have `complaints` as a model), a ticket number, and the legal deadlines |
| 9 | **Aviso de IA / transparencia** | ⚠️ | You have a good "no automated decisions" paragraph — keep it, but make it accurate for voice + OCR |
| 10 | **Aviso legal / imprint** (razón social, RUC, domicilio, contacto) | ✘ | Needed for consumer information duties once you have a RUC |

---

## 5. Other obligations (not "documents" but they will block you)

1. **RUC + IGV (D. Leg. 1623).** Register as a non-domiciled digital service provider, then declare and pay 18% IGV monthly in the SUNAT virtual system. Prices in PEN on the `es` checkout make this hard to argue away. No comprobantes required — but you *do* need the RUC.
2. **Representante en Perú.** Required of non-domiciled controllers under the new Reglamento; also the practical addressee for ANPD notifications and INDECOPI complaints.
3. **Consumer information.** Provider identity, RUC, domicile, price with IGV, auto-renewal terms, and a working complaints channel must be visible *before* purchase.
4. **Auto-renewal consent.** Peruvian consumer practice requires clear disclosure and an easy cancellation — you have the disclosure; verify the checkout shows it before the charge.
5. **App stores (if you ship a native wrapper).** Play/App Store data-safety forms must match the privacy policy — including Groq/OpenAI/Mistral.
6. **Children.** Your policy says "not directed to under 13" but the terms require 18+. Pick one (18) and align.
7. **Data of third parties** (invitations): notice + opt-out + retention.

---

## 6. Audit — Política de Privacidad

**Overall:** structurally good (sections, retention table, Peru block, CCPA block, security notice). It reads like a US template with a Peruvian appendix bolted on, and the appendix is where the risk is.

### 6.1 Legal errors (fix first)

| # | Finding | Why it matters | Fix |
|---|---|---|---|
| P1 | Cites **"D.S. 003-2013-JUS"** (`privacy.peru.intro`) | Repealed. Citing a dead regulation in your privacy policy is the first thing an ANPD reviewer notices | Replace with **DS 016-2024-JUS** and mention the right to portability |
| P2 | **"Respondemos dentro de los plazos… (entre 8 y 20 días hábiles)"** | Not false, but useless: the reader cannot tell which right takes how long, and it hides the 10-day term. The real terms are **8** (información), **10** (rectificación, cancelación, oposición), **20** (acceso) — extendable once by the same period | State the three terms explicitly, per right |
| P3 | **"solo texto anonimizado" / "Nunca enviamos a un modelo de IA tu nombre…"** (`privacy.section3.no_personal_data`) | Voice audio goes **raw** to Groq. And what you do to images/text is **redaction/pseudonymisation**, not anonymisation (reversible, and a name can survive masking) | Reword: "datos personales identificativos se suprimen o enmascaran antes de enviarse (seudonimización)"; for voice, say audio is sent to the speech provider, or transcribe locally |
| P4 | Recipients list is **incomplete** (`section4`, `ccpa.providers`, `data_transfers`) | Lists Clerk, Stripe, MercadoPago, OpenAI, Mistral, Neon, Cloudflare. **Missing:** Groq, DeepSeek (fallback), Google Cloud Vision, Bunny.net, GeoJS, ipapi.co, Cloudflare Turnstile, Google Analytics/Ads (consent-only), Zoho/SMTP, and your own formatika services. An inaccurate recipient list is a *deber de información* breach | Add a recipients table: provider → role (encargado) → country → purpose |
| P5 | **No legal basis per purpose** | Ley 29733 requires a lawful basis, not just "you consent" | Table: purpose → basis (ejecución contractual / consentimiento / obligación legal / interés legítimo-not in PE: use the art. 14 exceptions) |
| P6 | **No mention of portability** | In force since 30 Sep 2025 | Add as a right, with the export already available in Profile |
| P7 | No RNPDP **código de inscripción**, no **ODP** contact, no representative in Peru | These are exactly what an inspector checks | Add once registered |
| P8 | Data **required vs optional** and the **consequences of not providing** them | Explicit item of the deber de información | Add a short paragraph |
| P9 | Retention table omits complaints, invitations, billing/tax, security logs (2 y) | Incomplete = inaccurate | Extend the table |

### 6.2 Accuracy / consistency

| # | Finding | Fix |
|---|---|---|
| A1 | **AI enabled by default** while the policy frames AI as "optional, you can disable it" | Make it an explicit choice at signup, or state clearly that it is on by default and how to turn it off |
| A2 | "Transferencias internacionales: …con proveedores que los protegen" | No legal mechanism named. Say: transfers to the US are covered by **contractual clauses** with each provider (and list them) |
| A3 | Minors: policy says 13, terms say 18 | One rule: 18+ |
| A4 | CCPA section claims "geolocation" category | You only derive a country from IP. Either align the wording or drop the category |
| A5 | "Datos de uso… dirección IP" in §1 but IP processing is not explained (geo lookups, anti-abuse, AI cost) | Add to the data table with purpose and retention |
| A6 | Deletion promise "inmediata e irreversible" vs 30-day backups | You already caveat backups — keep, but also note legal retention (billing, complaints) survives deletion |
| A7 | English/Spanish/Slovak versions say the same thing? | Verify the `sk` and `en` blocks match the Spanish; they are separate JSON keys |

### 6.3 Suggested wording (paste-ready)

For the Peru block intro:

> Si usas Kaptia desde el Perú, tus datos personales están protegidos por la Ley N.° 29733 (Ley de Protección de Datos Personales) y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS. NutriNova LLC actúa como responsable del tratamiento y ha designado un representante en el Perú: **[nombre, domicilio, correo]**.

For the deadlines:

> Plazos legales de respuesta, contados desde el día siguiente a la presentación de la solicitud: **ocho (8) días hábiles** para el derecho de información; **diez (10) días hábiles** para rectificación, cancelación, oposición y revocación del consentimiento; **veinte (20) días hábiles** para acceso y portabilidad. Salvo el derecho de información, el plazo puede ampliarse una sola vez por un periodo igual. El ejercicio de estos derechos es gratuito.

For the AI paragraph:

> Antes de enviar información a un proveedor de IA suprimimos o enmascaramos los datos que identifican directamente a una persona (nombre, correo, teléfono, documento, IBAN, tarjeta, dirección y número de cuenta). Esta supresión es una **seudonimización**: reduce el riesgo, pero no convierte los datos en anónimos. Cuando usas la entrada por voz, el audio se envía al proveedor de transcripción para convertirlo en texto; puedes desactivar esta función en Perfil → Preferencias.

---

## 7. Audit — Términos de Servicio

**Overall:** more complete than most SaaS terms (13 sections, acceptable use, auto-renewal, refunds, consumer carve-out). Three things will get you in trouble in Peru.

| # | Finding | Risk | Fix |
|---|---|---|---|
| T1 | **"se regirán por las leyes del Estado de Nuevo México… tribunales del condado de Bernalillo"** | A clause imposing foreign law and exclusive foreign courts on a Peruvian consumer is a classic **cláusula abusiva** under Ley 29571 (arts. 49-51). Your carve-out helps, but the clause as drafted still *dissuades* consumers from claiming | For consumers resident in Peru: Peruvian law and **INDECOPI / courts of the consumer's domicile**, non-exclusive |
| T2 | **No RUC, no domicilio fiscal, no "proveedor" block** | Consumer information duty; also blocks the Libro de Reclamaciones | Add an "Información del proveedor" section: NutriNova LLC, RUC (once obtained), address, e-mail, representative |
| T3 | **Price / IGV unclear** ("todos los impuestos aplicables se calcularán… o estarán incluidos") | In Peru the consumer must see the final price. With D. Leg. 1623 you are the IGV collector | State: "Los precios en soles incluyen IGV (18%). Los precios en dólares no incluyen impuestos locales." |
| T4 | **Liability cap of US$100** | For consumers, caps covering wilful misconduct/negligence or personal injury are unenforceable; the clause may be read as abusive | Keep the cap but carve out: dolo, culpa inexcusable, daño a la persona, and rights that cannot be waived |
| T5 | No mention of **data protection** beyond a link | Acceptable, but add one line: processing per the Privacy Policy, which forms part of the terms | Add |
| T6 | No **right of withdrawal** statement | Peru has no general cooling-off for digital services; silence is fine — but if you advertise "7 days", make it a commercial promise, not a legal one | Clarify |
| T7 | **Versioning / acceptance evidence** | No stored proof of accepted version | Log acceptance (user id + version + timestamp) at signup, and in checkout for paid plans |
| T8 | Missing sections common in PE: **modificaciones** (you have §11 ✔), **notificaciones**, **divisibilidad**, **acuerdo íntegro**, **fuerza mayor** | Low risk, but cheap to add | Add |
| T9 | "Comprobantes de pago" says the processor e-mails a receipt | Under D. Leg. 1623 you are **not** required to issue comprobantes; don't promise a "comprobante de pago" you don't issue | Reword to "constancia de pago" |

---

## 8. Cookies and consent — what is right, what to fix

**Right (and better than most):** nothing loads before the click. `initGA()` refuses without `hasAnalyticsConsent()`; fonts are gated behind functional consent; the banner offers "Rechazar No Esenciales". Keep it.

| # | Finding | Fix |
|---|---|---|
| C1 | Cookie table uses generic rows without real names | List `__session`/`__client_uat` (Clerk), `__cf_bm`, `_ga`, `_ga_*`, `_gcl_*`, `cookie-consent` with real durations |
| C2 | Policy dated 14 June 2025, page/features changed since | Re-date |
| C3 | No cookie policy mention of the **Cloudflare Turnstile** challenge or GeoJS/ipapi lookups | Add to the third-party table |
| C4 | Consent stored only in `localStorage` | Fine for the banner; if you ever need proof, store server-side too (timestamp + categories) |
| C5 | No "reject" at the same visual level as "accept"? | It is present — verify it is equally prominent |

---

## 9. Plan

**Week 1 — decisions (no code)**
1. Decide the Peru structure: representative + RUC under D. Leg. 1623.
2. Draft the 9 fichas (use the table in §2 as the source of truth).
3. Appoint an external ODP (optional but recommended) or at least name an internal responsible.

**Weeks 2-3 — the file**
4. Documento de Seguridad (with fecha cierta) + inventario + retention policy.
5. Protocolo de incidentes 48 h + registro + notice template.
6. Procedimiento ARCO + portabilidad + register + response templates.
7. Collect DPAs / standard contractual clauses from the 13 providers; write the transfer assessment.

**Weeks 2-3 — the public layer**
8. Rewrite the Peru block of the privacy policy (P1-P9, A1-A6).
9. Add the short notice at collection points; add RUC/representative block to terms; fix governing law (T1-T3).
10. Add aviso + RUC to the Libro de Reclamaciones; add ARCO form + deadlines.

**Weeks 3-4 — code**
11. AI opt-in explicit (default off, or checkbox at signup) + consent log.
12. Invitation e-mail notice + retention for unaccepted invites.
13. Remove `get.geojs.io` / `ipapi.co` from request paths or disclose them; prefer Cloudflare's `CF-IPCountry`.
14. Keep access logs ≥ 2 years (today error logs are 30 days and there is no access audit trail).
15. Transactional "comprobante" wording.

**Then:** register in SIPDP, publish the codes in the policy, and diarise the 6-month privilege review.

---

## 10. What I verified, and how

- Live site structure, `sitemap.xml`, `robots.txt`, crawler SSR shell.
- Legal texts in `client/public/locales/{es-pe,en-us,sk-sk}/translation.json` and `client/src/pages/{privacy-policy,terms-of-service,reclamaciones,cookie-policy,refund-policy}.tsx`.
- Data model in `shared/schema.ts` (users, transactions, ocr fields, friendships, collaborative goals, complaints, error tables, `ai_usage.ip_address`).
- Third-party calls found in `server/`, `lib/`, CSP in `server/index.ts`: OpenAI, Mistral, Groq, DeepSeek, Google Vision, Clerk, Stripe, MercadoPago, Neon, Cloudflare R2, Bunny, Zoho SMTP, GeoJS, ipapi.co, Google Analytics/Ads, pdf-processor / ai-processor (own).
- Consent gating in `client/src/lib/consent.ts` + `analytics.ts`.
- Deletion/export in `server/routes/userRoutes.ts` (`/api/account/export`, `/api/account/delete`).

**Legal sources:** [ANPD — inscription procedure (gob.pe)](https://www.gob.pe/8060-inscribir-informacion-en-el-registro-nacional-de-proteccion-de-datos-personales) · [OSINERGMIN/gob.pe — ARCO deadlines 8 / 10 / 20](https://www.gob.pe/es/79729-solicitar-el-uso-adecuado-de-tus-datos-personales) · [Cuatrecasas — new Reglamento summary](https://www.cuatrecasas.com/es/latam/propiedad-intelectual/art/nuevo-reglamento-ley-de-proteccion-datos-personales) · [El Peruano — ODP directive and staggered calendar](https://elperuano.pe/noticia/288028-suplemento-legal-juridica-tratas-datos-sensibles-o-grandes-volumenes-evalua-si-debes-nombrar-un-odp) · [Lexy — obligations checklist](https://lexy.pe/reglamento-de-proteccion-de-datos-personales-para-empresas/) · [DS 016-2024-JUS text](https://lpderecho.pe/reglamento-ley-proteccion-datos-personales-decreto-supremo-016-2024-jus/) · [Ugaz Zegarra — D. Leg. 1623 / IGV digital services](https://estudiougaz.com/publicaciones/recaudacion-de-igv-e-impuesto-a-la-renta-para-servicios-digitales-provistos-por-sujetos-no-domiciliados/).

**Cross-check flags:** the 2-year log retention, the 6-month privilege review, and the "10% of annual revenue" fine cap appear in Peruvian firm summaries but not in the article text I could read — confirm with counsel. The ODP brackets and the 48-hour breach rule are corroborated by three independent sources.

---

## 11. Caveat

This is a technical + documentary gap analysis by an engineering agent, not legal advice. Before you publish the rewritten policy and file with SIPDP, have a Peruvian lawyer (or an external ODP) review the Documento de Seguridad, the transfer assessment and the consumer-law clauses. The cost of that review is roughly one month of a mid-level salary — two orders of magnitude below the smallest "grave" fine.
