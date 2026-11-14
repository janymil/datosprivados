# Legal engine for DatosPrivados — design

Date: 2026-11-13 · Status: open questions answered; awaiting founder approval of the whole document · Repo: `/var/www/datosprivados`
(GitHub `janymil/datosprivados`, branch `master` at `9659c1d`).

## 1. Intent

DatosPrivados assesses a Peruvian business and gives it the legal documents it
needs under Ley 29733 and DS 016-2024-JUS, pre-filled with its own data. Today
those texts are AI-drafted and were audited once (October 2026,
`AUDITORIA_DOCUMENTOS_LEGALES.md`). The founder wants them at the quality a
privacy lawyer would deliver, kept current **without anyone having to ask**:
when a law changes, the system notices, works out what is affected and prepares
the fix.

A paid per-company review by a human lawyer is offered as an add-on on top; it
is not part of the subscription.

### Goals

1. Every legal statement in the product is traceable to the exact article it
   relies on, as data, not as free text.
2. Every citation is checked against the official text of the law: the article
   exists, is in force, and says what the clause claims.
3. All combinations the product can produce (63 business types × company
   variables × 14 document generators) are covered by automatic checks.
4. New or changed laws are detected daily, automatically; affected clauses and
   clients are identified automatically; a ready-to-apply change is prepared.
5. The remodel introduces no unintended change to any generated text.

### Non-goals

- Replacing the lawyer add-on, or giving individual legal advice.
- Rewriting the legal content during the migration. Content changes happen only
  in the audit phase, each one deliberate and logged.
- Changing the AI provider. `src/lib/llm.ts` stays as it is; the engine uses
  whatever provider/model it is configured with (currently OpenAI
  `gpt-6-luna` per the founder; do not swap it).
- Monitoring Congress bills. Only published norms and ANPD decisions count.

### Anti-goals (failure even if it "works")

- A generated document changes wording during the migration without anyone
  deciding it.
- A law change reaches clients' documents without the founder's approval.
- A monitor source silently breaks and the system reports "no new laws".
- Citations that look precise but were never checked against the official text.

## 2. Current state (facts from the code)

- `src/lib/documents.ts` (≈1,510 lines): 14 generators (`buildPrivacyPolicy`,
  `buildConsentTexts`, `buildSecurityDocument`, `buildInternalClauses`,
  `buildTermsOfService`, `buildCookiePolicy`, `buildShortNotices`,
  `buildComplaintBook`, `buildProcessingAgreement`, `buildRetentionPolicy`,
  `buildImpactAssessment`, `buildWorkerNotice`, `buildArcoProcedure`,
  `buildSectorProtocol`), dispatched by `buildDocument()` in
  `src/lib/document-catalog.ts`. Several generators emit multiple texts
  (consent A–E, CCTV sign inside `clausulas`).
- `src/lib/sector-legal.ts` (≈1,080 lines): 26 `LegalFamily` profiles built from
  `BASE` + overrides; ~12 boolean switches plus `norms`, `retention`,
  `consent`, `security`, `risks`, `cctvDays`. 63 sectors map to families via
  `src/lib/sectors.ts`.
- Generators also read company data: banks, providers (incl. foreign), entity
  type, website, complaints URL, DPO fields, sales band.
- Legal references live in **≈40 files**, not only the generators: 350
  `art. N` mentions and ~36 distinct norms. Biggest: `documents.ts` (146),
  `sector-legal.ts` (104), `ai.ts` (33, system-prompt facts and ARCO letters),
  `guides.ts` (31), `help-content.ts` (24), `legal-faq.ts` (15), fine
  calculator page and component, incident pages, `compliance.ts`, `fines.ts`,
  `security-checks.ts`, `incident-notice.ts`, `glossary.ts`, `platform-legal.ts`.
- All references are free text inside sentences. Nothing links a sentence to an
  article.
- `src/lib/document-freshness.ts`: `TEMPLATE_VERSIONS` per kind + a data
  fingerprint; bumping a version marks every client's saved document stale.
  Weekly job `document-staleness-notice` emails clients.
- Jobs: `src/lib/jobs.ts` + `/api/cron/[job]` + `/etc/cron.d/datosprivados`
  (wrapper decides Lima time with `--at/--dow`), locked and logged in
  `job_runs`, failures emailed.
- Tests: vitest (`pnpm test`, 55 files, AI evals in `test/ai-evals`),
  Playwright e2e, GitHub Actions `ci.yml`. Deploy: `scripts/deploy.sh` + pm2.
- Operator panel: `src/app/operador` (clientes, feriados).
- Open items from the October audit (§7 there): several sector norms, Directiva
  01-2020-JUS/DGTAIPD details and Ley 29733 art. 14 numerals were cited from
  secondary sources, never read in the primary text.

## 3. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Keep the generators; add citation tags next to clauses, a lint that fails on untagged `art.` mentions, the law library, checker and monitor. | Fastest. Citations live beside code, so text and tag can drift; reviewing clauses means reading TypeScript. |
| **B (chosen)** | Rebuild the generators as a **clause library**: every clause is a record with its text, its conditions and its citations; documents are assembled from records. Migrated with a snapshot-and-compare harness so output stays byte-identical. | More work up front, but citations are a required field, clauses can be listed and reviewed one by one (also by the add-on lawyer), and the monitor can map a law change to exact records. |
| C | Generate each company's documents with the LLM from the law library. | Rejected: not reproducible, not testable across combinations, and every client gets different wording. |

The founder chose B on the condition that the migration is provably safe (§5)
and that the original content is then verified against the law (§7).

## 4. Architecture

### 4.1 Law library (`legal/library/`)

One folder per norm, from **official sources only** (El Peruano, official
PDFs on gob.pe / congreso.gob.pe). Blogs and law-firm summaries are not
sources; the October audit found them wrong.

```
legal/library/ds-016-2024-jus/
  norm.json      # id, title, type, number, issuer, publishedAt, officialUrl,
                 # sourceSha256, status (vigente|modificada|derogada),
                 # amends[], amendedBy[], retrievedAt
  source.pdf     # the official file as downloaded
  articles.json  # [{ num: "26.5", text, sha256 }]
```

- Articles are extracted from the source (`pdftotext -enc UTF-8`, no
  `-layout`, as the DS 016-2024-JUS two-column PDF requires) and split by
  numbering. Extraction is checked by spot tests on known articles.
- Initial scope: Ley 29733, DS 016-2024-JUS, the ANPD directives the product
  relies on (videovigilancia 01-2020-JUS/DGTAIPD, Oficial de Datos, security),
  then every sector norm cited by `sector-legal.ts` (list in §2 of the October
  audit §7 and the grep above).
- A norm that cannot be obtained officially is marked `status: "no-verificada"`;
  clauses citing it are flagged in every audit until resolved.

### 4.2 Legal facts (`src/legal/facts.ts`)

Numbers and periods that appear in many places become single records:

```ts
{ id: "arco.plazo.acceso", value: 20, unit: "días hábiles",
  cites: [{ norm: "ds-016-2024-jus", art: "69" }],
  quote: "<verbatim fragment of the article that states it>" }
```

Examples: ARCO deadlines, 48-hour incident notice, 10-day advertising opt-out,
fine ranges (0.5–5 / 5–50 / 50–100 UIT), UIT value per year, CCTV retention,
ODP calendar. Every text in the product (documents, help, guides, FAQ, fine
calculator, AI prompt) reads the fact instead of hard-coding the number. The
`quote` must be found verbatim in the cited article's text: that check is
mechanical.

### 4.3 Clause library (`src/legal/documents/`)

```ts
type Clause = {
  id: string;                       // "politica.derechos.arco"
  when?: (ctx: LegalContext) => boolean;   // conditions over profile + company
  text: (ctx: LegalContext) => string;     // exactly today's wording
  cites: Citation[];                // exactly the articles the text cites (lint-enforced); [] needs nonLegal or a known-failures entry
  nonLegal?: string;                // structural clause (heading, note, signature); never with a cite or a norm name
  defaultNorm?: string;             // norm of bare mentions; default ds-016-2024-jus
};
```

As built (plan 1): one file per document kind under `src/legal/documents/`, each
exporting a `DocumentSpec` (`{ kind, join, clauses }`); the kind lives in the
spec and in the clause id prefix, so clauses carry no `doc` field. `SPECS` and
`allClauses()` are in `src/legal/registry.ts`.

```ts
// (continuation of the type above)
type Citation = { norm: string; art: string; claim?: string };
```

- A document is an ordered list of clause ids; `buildDocument()` keeps its
  current signature and assembles the clauses, so pages, PDFs, freshness and
  the rest of the app do not change.
- Family profile content (`norms`, `retention`, `security`, `risks`, consent
  defaults) becomes records with the same `cites` field.
- **Lint (build fails):** every `art. N`, `Ley N.° …`, `DS N.° …` appearing in
  a clause's rendered text must match one of its `cites`; every `cites` entry
  must exist in the library; no clause without `cites` unless `nonLegal` is
  set.
- The same `Citation` type is used by the non-document modules (help, guides,
  FAQ, AI prompt facts, ARCO letters, incident texts, fine calculator,
  `platform-legal.ts`) so the whole product is covered, not only documents.
- **Baseline of known failures (design call):** when cites are first filled in
  (phase 4) and rules first run (phase 5), today's content will fail some
  checks. Those failures go into `legal/known-failures.json`. CI fails only on
  failures *not* in that file, and the file may only shrink: an entry is
  removed when phase 6 fixes it. This keeps the "no content change during
  migration" rule and keeps CI green.
- A norm marked `no-verificada` has a `norm.json` but no official articles.
  Citing it passes the lint (the norm exists) but every audit lists the clause
  until the norm is verified or the clause changes.

### 4.5 Run-time AI output (design call)

`src/lib/ai.ts` has two kinds of legal text:
- **Fixed text**: `PERU_LEGAL_RAG` (the facts given to the model) and the ARCO
  reply letter templates used in basic mode. These are covered like any clause:
  snapshots, cites, facts.
- **Text written by the model at run time**: `runAnonymizedLegalChat`,
  `analyzeAndDraftArcoWithAi`, `evaluateIncidentWithAi`,
  `auditMarketingOrFormTextWithAi`, `recommendDocumentsForBusinessWithAi`.
  These cannot be snapshotted. They get an **output check**: every norm or
  article the answer mentions must exist in the library and be in force; an
  unknown or repealed reference is removed or replaced by a "verificar"
  note, and logged. Extend `test/ai-evals` with cases for it. The prompt
  (`PERU_LEGAL_RAG`) is generated from `facts.ts` so the model is always given
  current figures.

### 4.4 Combination matrix

- Input space: 63 sectors (→ 26 families) × company variables (website,
  foreign providers, automation/AI bank, entity type peruana/extranjera,
  complaints URL present, DPO data present, sales band, bank sets, CCTV) × 14
  kinds.
- Generate **all 63 sectors × pairwise combinations of the company variables**
  (a few hundred company fixtures) and render every kind for each. The
  fixtures live in `test/legal/fixtures.ts`.
- Used three ways: snapshots (§5), rule checks (§6), audit samples (§7).

## 5. Safe migration (snapshot and compare)

1. **Before touching anything:** render every kind for every fixture with the
   current code and store the outputs under `test/legal/__snapshots__/`.
   Also snapshot the legal strings of the non-document modules (help,
   guides, FAQ, AI prompt facts, ARCO letters, incident texts).
2. Migrate one document kind at a time into the clause library behind the
   same `build*` functions.
3. After each kind: full matrix must be **byte-identical** to the snapshots.
   Any diff fails the test and prints the exact sentence. No exceptions,
   no snapshot updates during migration.
4. Same for moving numbers into `facts.ts` and for the non-document modules.
5. `TEMPLATE_VERSIONS` is **not** bumped during migration (identical output ⇒
   clients' documents are not stale).

Only after the whole migration is merged do content changes start (§7). From
then on, a snapshot update is allowed only together with a logged reason
(`legal/changes/YYYY-MM-DD-<id>.md`) and a `TEMPLATE_VERSIONS` bump for the
affected kinds.

## 6. Rule checks (deterministic, on every build)

Run over the full matrix, as vitest tests:

- Privacy policy contains every item of the information duty (art. 18 Ley
  29733 and the DS 016-2024-JUS items listed in `DOCUMENTOS_LEGALES_PERU.md`).
- `sensitive` ⇒ written-consent clause; `minors` ⇒ parental consent clause;
  `biometric` ⇒ its consent; foreign providers ⇒ international transfer
  clause; CCTV ⇒ sign with the directive's retention fact; `consumer` ⇒
  complaints book; `processor` ⇒ processing agreement; `automated` ⇒
  automated-decision notice.
- No placeholder like `[indicar …]` reaches a published document unless the
  UI asks the client to fill it.
- Every fact used in text equals its `facts.ts` value.

New rules are added whenever the audit or the monitor finds a gap.

## 7. Correctness audit (after migration)

The snapshots prove nothing changed, not that the original is right. The audit
(`pnpm legal:audit`, writes `legal/audit/YYYY-MM-DD.{md,json}`) checks every
citation and fact:

**Mechanical (exact):**
1. Cited norm and article exist in the library.
2. Norm/article status is in force (not `derogada`, not replaced).
3. Every fact's `quote` appears verbatim in the cited article.
4. Numbers in clause text (deadlines, amounts, periods) come from facts.

**Meaning (AI, through `llm.ts`):**
5. For each clause: does the cited article support what the clause says?
   Two independent passes with different instructions; each returns
   `supported | partial | not_supported` with the quoted article text.
   Disagreement between passes ⇒ flagged.
6. Uncited obligations: sentences with "debe", "obligatorio", a deadline or a
   number but no citation ⇒ flagged.

**Output:** confirmed errors are fixed as deliberate changes (§5 rule), each
logged. What cannot be settled automatically goes to `legal/audit/abogado.md`,
the short list for a human lawyer. The October audit's §7 items start on that
list until verified against primary text.

## 8. Law monitor (daily, automatic)

New job `legal-watch` in `jobs.ts`, cron `--at 07:00` Lima.

**Sources at launch (design call: two scrapers, not a dozen)** — configured in
`src/legal/watch-sources.ts`, each with a parser and a health check:
- **El Peruano — Normas Legales.** Every published norm appears here, so this
  one source also covers the sector issuers (MINSA, MINEDU, SBS/UIF, INDECOPI,
  MTC, MINCETUR…) and the yearly UIT decree. Filters: issuer MINJUSDH / ANPD /
  DGTAIPD; keywords (datos personales, 29733, 016-2024-JUS, videovigilancia,
  UIT); and the number of every norm in the library (a new norm that mentions
  "Ley N.° 29414" is caught because 29414 is in the library).
- **gob.pe ANPD** — resoluciones directorales and opiniones consultivas, which
  do not all appear in El Peruano.

Separate sector-issuer scrapers are added later only if El Peruano proves to
miss something.

**Pipeline per new item:**
1. Store in `legal_watch_items` (id, source, url, title, date, raw hash).
2. Triage with the LLM against the library index: irrelevant / relevant /
   amends norm X articles Y.
3. If relevant: download official text into the library as a new norm or new
   version; diff articles (sha256).
4. Impact from the citation graph: affected facts, clauses, document kinds,
   families, and the number of clients whose documents use them.
5. Draft the change: new clause text / fact value, with the article quote.
6. Create a `legal_changes` row (`nuevo → aprobado | descartado → aplicado`)
   and email the operator.

**Approval dashboard `/operador/legal`** (new section of the existing operator
panel, same login and protection as `/operador/clientes`):

- **Pending list**, newest first, each marked as *law change* (monitor) or
  *audit finding* (§7).
- **Detail of one change:** origin (El Peruano / ANPD link, or the audit
  finding); the official article text quoted; today's clause next to the
  proposed wording with differences highlighted; impact (document kinds,
  business types, number of clients affected); for audit findings, both AI
  verdicts with their reasoning.
- **Actions:** Approve · Reject (reason required) · Send to lawyer list.
- **History:** every decision with date, reason and resulting commit.
- **Source health:** last successful check of each monitor source.
- **Email** to the operator when a new change arrives.

**One-click approval (decided 2026-11-13).** Approve is final:
1. The server sends a `repository_dispatch` event with the approved change.
   It never writes into `/var/www/datosprivados` (the deploy folder) and never
   runs the test suite on the production box. It needs only a fine-grained
   GitHub token limited to `repository_dispatch` on this repo.
2. A GitHub Actions workflow applies the data-file change, regenerates
   snapshots, bumps `TEMPLATE_VERSIONS`, writes the change log and runs all
   checks.
3. All green ⇒ the workflow merges to `master` by itself. Any failure ⇒ no
   merge; the change returns to the dashboard as *falló* with the error.
4. Deploy is pull-based: a server job checks the change's status through the
   GitHub API and, once merged, runs `scripts/deploy.sh`. No GitHub secret
   gives SSH access to the server.
5. After deploy, the existing staleness machinery marks clients' documents
   and emails them. The dashboard shows each step's state. After
deploy, the existing staleness machinery marks client documents and emails
them.

**Never silent:** each source records last successful fetch; a source failing
for 3 days or returning a structurally different page raises an ops alert.
The weekly operator summary shows "sources checked / items found / pending
approvals".

## 9. Quarterly re-audit

Job `legal-reaudit` (first Monday of Jan/Apr/Jul/Oct) runs the full §7 audit
on the current code and library and emails the report. It catches our own
past mistakes even when no law changed.

## 10. Lawyer review add-on (outline; own design later)

Design call: **deferred to its own design** after the engine ships. Today a
user belongs to exactly one company (`users.company_id`), so a lawyer who
reviews many companies needs a change to the access model, which touches
tenant isolation across the whole app. That deserves its own design and
security review, not a corner of this one.

What this engine provides for it now: clause ids and citations per document
(so a lawyer can review clause by clause) and the per-company audit flags.
Until the add-on exists, the operator can record an outside lawyer's review
as evidence in the company file ("revisado por <nombre>, CAL N.° …, fecha").
Systemic findings from any lawyer review feed `legal/audit/abogado.md` and
become clause changes through §5.

## 10a. Who approves content fixes from the audit — decided 2026-11-13

**The founder approves each fix.** Every content change found by the audit
(§7) goes through the same `/operador/legal` approval flow as law changes:
the change is shown with the clause, the cited article text, both AI verdicts
and the proposed new wording; the founder approves or rejects it. Meaning
disputes the founder cannot settle go to `legal/audit/abogado.md`. No
developer or job changes legal wording without that approval.

Consequence: the `legal_changes` table, the `/operador/legal` page and the
GitHub `repository_dispatch` → pull request workflow are built **before** the
audit (new phase 5b), not with the monitor.

## 11. Developer skill

A project skill `.claude/skills/privacy-law/SKILL.md` documents how to add a
norm, edit a clause, add a fact, run `legal:audit`, and update snapshots with a
change log. It is for development sessions; the automation itself runs in the
app (§8, §9), never depends on someone invoking the skill.

## 12. Phases and parallelism

| # | Phase | Depends on | Can run in parallel with |
|---|---|---|---|
| 0 | Fixtures + snapshot harness | — | 2 |
| 1 | Migrate 14 kinds + family profiles to clause library (one kind per step, byte-identical) | 0 | 2 |
| 2 | Law library: fetch official texts, split articles, `norm.json` | — | 0, 1 |
| 3 | `facts.ts` + move numbers from all ~40 files (byte-identical) | 0 | 2 |
| 4 | Fill `cites` for every clause/fact, citation lint | 1, 2, 3 | — |
| 5 | Rule checks (§6) + known-failures baseline | 1 | 4 |
| 5b | Approval flow: `legal_changes` table, `/operador/legal` dashboard, `repository_dispatch` → GitHub Actions apply/test/auto-merge, pull-based deploy | 1 | 4, 5 |
| 6 | Correctness audit; each fix approved by the founder through 5b; lawyer list | 4, 5b | — |
| 7 | `legal-watch` monitor (El Peruano + ANPD gob.pe), feeding the 5b flow | 2, 4, 5b | 6 |
| 7b | Run-time AI output check (§4.5) + evals | 2, 3 | 6, 7 |
| 8 | Quarterly re-audit job | 6 | 7 |
| 9 | Lawyer add-on — separate design (§10) | — | — |
| 10 | Developer skill | 4 | any |

Phase 2 touches only `legal/library/` and is a good candidate for a separate
session or subagent while phases 0–1 run. Phases 1 and 3 touch the same files
and stay sequential in one session.

## 13. Left to the builder

- Exact folder names and file format of clause records (TS modules are fine;
  the text must stay byte-identical).
- Parser details per monitor source and how to obtain each official PDF.
- The concrete pairwise generator for fixtures.
- Prompt wording for triage and meaning checks, and the eval cases for them
  (extend `test/ai-evals`).
- GitHub authentication for PR creation from the server.
