# Motor legal 7: redacción automática de correcciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The legal engine drafts its own corrections. An audit error or a relevant new norm becomes a checked legal change in `/operador/legal`, ready for the founder's approval, with no developer session. This covers steps 3 and 5 of design §8, which plan 6 left out without the founder's agreement.

**Architecture:**
- **Queue:** the app keeps a queue of drafting requests (`legal_draft_requests`). The re-audit, the law monitor and an operator button add to it.
- **Drafter:** a root script on the server (`datosprivados-draft`, every 30 min, same pattern as `datosprivados-reaudit`) takes one request, works in its own clone of master, and runs `scripts/legal/draft.mjs`.
- **What a draft does:** loads a new norm into the library if needed (step 3). Finds the affected clause, fact or module text and asks the AI for a replacement (step 5). Then it runs deterministic gates, the two-pass meaning check and the full test suite.
- **Result:** if every check passes, the drafter registers the change through the existing `propose-change` flow. If not, it reports why, and the founder gets one email.

**Tech Stack:** Next.js 16, TypeScript, `node:sqlite` (schema v20), vitest, TypeScript compiler API (`typescript`, already a dependency) for locating source spans, `callLlm` with `gpt-6-luna`, bash + flock for the root script.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` §8 (pipeline steps 3 «download official text into the library» and 5 «draft the change: new clause text / fact value, with the article quote»), §7 (audit findings feed the same dashboard), plus the plan 5/6 approval flow (`/operador/legal` → `legal-change.yml` → autodeploy).

## Decisions this plan takes (the design leaves them open; the founder reviews them here)

1. **Drafting runs on the server, not in GitHub Actions.** It needs the AI key, `pdftotext`, a git clone and the test suite. The re-audit already works this way, and no new GitHub secrets are needed. The clone is `/var/lib/datosprivados/drafts/repo`; it never touches `/var/www/datosprivados`.
2. **The AI may only change legal content:** the `text`/`cites` of a clause object, a `LegalFact`'s `value`/`unit`/`cites`/`quote`, a string literal inside a legal data module, and new library files (`legal/library/<id>/`, `scripts/legal/sources.json`). It may never change `id`, `when`, `nonLegal`, `defaultNorm`, imports or any other code. The gates in Task 4 enforce this.
3. **A draft only reaches the founder if it passed everything:** the gates, the two-pass meaning check of the new text (both passes «supported»), and typecheck + lint + the full vitest suite. Otherwise the request ends as `sin_solucion` with the reasons, and the founder gets one email. No half-done change is ever registered.
4. **One request = one legal change, at most 10 texts.** A norm that affects more texts is split by document kind (one change per kind) so each stays reviewable.
5. **No two open changes touch the same text.** A request whose target is already in an open change (`nuevo`, `aprobado`, `fallo`, `abogado`) waits in `pendiente` until that change closes.
6. **Limits stated plainly:**
   - If a new norm *amends* an article of a norm already in the library, the new norm is loaded as its own entry. The old norm is then marked `modificada` with `amendedBy`, and the affected clauses are redrafted to cite the new article. The old norm's consolidated text is **not** rewritten automatically; the change is flagged for the lawyer.
   - Norms published only as images, with no text layer, are reported as `sin_solucion` («PDF sin texto»).
   - Design §8 step 3 also mentions a «new version» of a norm already in the library, compared article by article. This plan covers it only when the monitor finds the amending norm. A republished consolidated text with no amending norm in El Peruano isn't detected; the quarterly re-audit doesn't download texts again.
7. **Every AI-drafted change says so:** «Redactado por IA» on the page and in the email, with the two meaning verdicts of the new text. Any change to what a customer is told is added to the lawyer list (`legal/audit/abogado.md`).
8. **AI spend counts against `AI_MONTHLY_BUDGET_USD`.** The drafter reports its tokens with the result, and the app records them in `ai_usage` (feature `legal-draft`). `GET /next` returns 409 when the budget is spent. Estimated cost: about $0.03 per draft.

## Global Constraints

- Schema version 19 → 20; migrations append only.
- Legal branches may only touch `src/legal`, `src/lib`, `legal/`, `test/legal`, `src/app`, `src/components`, `docs`, plus (new, Task 6) exactly `scripts/legal/sources.json`. Known-failures only shrink; document text changes raise `TEMPLATE_VERSIONS`.
- AI model `gpt-6-luna` (`OPENAI_MODEL`); never another model.
- Server: Europe/Berlin; cron has no `CRON_TZ`; Lima-time checks live in the scripts. Bearer `CRON_SECRET` read like the cron wrapper (`/etc/datosprivados.env` then `/var/www/datosprivados/.env`, quotes and `\r` stripped).
- Files written from Windows must be LF.
- User-facing text in Spanish (Peru); identifiers in English as in the codebase.

## Review Focus

1. **The AI slips in code** (a new `${...}` expression, a changed `when`, an import). The draft is rejected by the gates and never reaches the founder. Test: Task 4.
2. **The target is already in an open change.** The request waits; no second branch touches the same text. Test: Task 1.
3. **The new text is still not supported after the retry.** `sin_solucion` with the verdict reasons, one email, nothing registered, no branch left on GitHub. Test: Task 7.
4. **Master moves while drafting** (another change merges). The drafter rebuilds from fresh master on the next run; a rejected push puts the request back to `pendiente`, at most 3 attempts. Test: Task 7.
5. **AI down or budget spent.** The queue waits, the request is not marked failed, no partial branch. Test: Task 1 (409) and Task 7.

---

### Task 1: Drafting queue (DB v20, store, internal API)

**Files:** `src/lib/db.ts` (v20), create `src/lib/legal-drafts.ts`, create `src/app/api/legal/drafts/route.ts` (POST enqueue), `src/app/api/legal/drafts/next/route.ts` (GET claim), `src/app/api/legal/drafts/[id]/result/route.ts` (POST result); modify `test/route-guards.test.ts` (`PUBLIC_FILES`: the three routes, «interna: bearer CRON_SECRET (authorizedByCronSecret)»); test `test/legal-drafts.test.ts`.

**Interfaces — Produces:**
- Table `legal_draft_requests(id, origin TEXT CHECK IN ('auditoria','norma','operador'), ref TEXT /* finding id or watch item id */, targets TEXT /* JSON string[] of sources */, context TEXT /* JSON: finding verdicts or watch item norms/articles/url */, status TEXT DEFAULT 'pendiente' /* pendiente|redactando|propuesto|sin_solucion */, attempts INTEGER DEFAULT 0, change_id TEXT, reasons TEXT, claimed_at, created_at, updated_at, UNIQUE(origin, ref))`.
- `type DraftRequest = { id: string; origin: "auditoria" | "norma" | "operador"; ref: string; targets: string[]; context: unknown; attempts: number }`.
- `enqueueDraft(r: { origin; ref; targets: string[]; context: unknown }): boolean` (false if it already exists).
- `claimNextDraft(now: Date): DraftRequest | null`: the oldest `pendiente` whose targets are in no open legal change (see Decision 5); sets it to `redactando` and `attempts + 1`. A `redactando` request older than 2 h is released back to `pendiente`.
- `finishDraft(id, r: { status: 'propuesto' | 'sin_solucion' | 'reintentar'; changeId?; reasons?: string[]; usage?: { inputTokens: number; outputTokens: number } })`: `reintentar` goes back to `pendiente`, or to `sin_solucion` after 3 attempts. Usage goes into `ai_usage` (company_id NULL, feature `legal-draft`, model `OPENAI_MODEL`).
- `GET /api/legal/drafts/next`: 401 without the bearer; 409 `{reason: "budget" | "ai-off"}` when `budgetExceeded()`, `aiKillSwitch()` or no model is configured; 204 when there's nothing to do; 200 with the request.

- [ ] **Step 1: Write the failing tests** (`test/legal-drafts.test.ts`):
  - `enqueue dedupes by origin+ref`;
  - `claim skips a request whose target is in an open legal change and takes the next one` (seed `legal_changes` with status `nuevo` and an `affected` entry `{kind:"clause", source:"aviso.nota.regla-practica"}`);
  - `a request stuck in redactando for more than 2 h is claimable again`;
  - `reintentar three times ends sin_solucion`;
  - `finish records usage in ai_usage with feature legal-draft`;
  - `GET next: 401 without secret, 409 when AI_MONTHLY_BUDGET_USD is spent, 204 on an empty queue`.
- [ ] **Step 2:** Run `npx vitest run test/legal-drafts.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the migration, store and routes (copy `authorizedByCronSecret` use from `src/app/api/legal/reaudit/route.ts`).
- [ ] **Step 4:** Run `npx vitest run test/legal-drafts.test.ts test/route-guards.test.ts test/db*.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(legal): cola de redacción de correcciones (plan 7, tarea 1)`.

### Task 2: What feeds the queue

**Files:** `src/legal/draft/draftable.ts` (create); `src/lib/legal-watch/run.ts` (enqueue on `relevante`); `src/app/api/legal/reaudit/route.ts` (accept `findings`); `deploy/datosprivados-reaudit.sh` (send draftable findings); `src/app/operador/legal/draft-actions.ts` (create: «Redactar corrección» for one finding source, operator only); tests `test/legal-draftable.test.ts`, `test/reaudit.test.ts`, `test/legal-watch-run.test.ts`.

**Interfaces — Produces:**
- `DRAFTABLE_RULES = ["meaning", "cite-misnumbered", "clause-without-basis", "obligation-uncited", "fact-quote-not-found", "fact-unverified"]`. Only `severity === "error"` for `meaning`.
- `draftRequestsFromReport(report: { findings: AuditFinding[] }): Array<{ origin: "auditoria"; ref: string; targets: string[]; context: unknown }>`: one request per source, `ref` = sorted finding ids joined, `context` = the findings.
- The re-audit route body gains an optional `findings: AuditFinding[]` (max 500), queued with `enqueueDraft`. The script sends the report's findings.
- Law monitor: when an item becomes `relevante`, `enqueueDraft({ origin: "norma", ref: item.id, targets: [], context: { url, pdf_url, title, issuer, published_on, norms, articles } })`. Targets are filled by the drafter after ingestion.
- Backlog: `node --experimental-strip-types scripts/legal/enqueue-report.mjs legal/audit/<date>.json` posts the existing report once (RUNBOOK).

- [ ] **Step 1: Failing tests:**
  - `meaning with severity revisar is not draftable; error is`;
  - `two findings on one source give one request`;
  - `reaudit with findings enqueues them once (same ref twice → one row)`;
  - `a relevant watch item enqueues one norma request; irrelevant ones none`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal-draftable.test.ts test/reaudit.test.ts test/legal-watch-run.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Locating and replacing a text in the source

**Files:** create `src/legal/draft/locate.ts`; test `test/legal/draft-locate.test.ts`.

**Interfaces — Produces:**
- `type Span = { file: string; start: number; end: number; source: string; kind: "clause" | "fact" | "module-string" }`.
- `locateTarget(target: string, root = process.cwd()): Span | null`, using `typescript.createSourceFile` (no regex):
  - **clause id** → the object literal in `src/legal/documents/*.ts` whose `id` property is that string;
  - **fact id** → the object literal in `src/legal/facts.ts`;
  - **module path** → the same `source` strings `legalDataModuleTexts()` emits (`"sector-legal:FAMILIES.condominio.cctvDays"`, `"guides:…"`). Resolved by walking object and array literals, with the same `label()` rule (slug/id/key, otherwise position). The span is the string or template literal.
- `applySpan(span: Span, replacement: string): string` returns the new file text, and checks that the file still holds `span.source` at `span.start`.

- [ ] **Step 1: Failing tests:**
  - `aviso.nota.regla-practica → src/legal/documents/aviso.ts, source starts with { and contains its id`;
  - `cctv.conservacion → src/legal/facts.ts`;
  - `sector-legal:FAMILIES.condominio.cctvDays → a string literal containing "30 a 60 días"`;
  - `unknown id → null`;
  - `applySpan rejects a stale span`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal/draft-locate.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 4: Gates (what a draft may and may not change)

**Files:** create `src/legal/draft/gates.ts`; test `test/legal/draft-gates.test.ts`.

**Interfaces:**
- Consumes `Span`.
- Produces `checkReplacement(span: Span, replacement: string, lib = legalLibrary()): string[]` (problems; empty = ok):
  - **clause:** parses as one object literal; `id` unchanged; property set ⊆ {id, when, text, cites, nonLegal, defaultNorm}; `when`/`nonLegal`/`defaultNorm` text identical to the original; every `${…}` expression in the new `text` appears in the original `text`; `cites` is an array of `{norm, art}` string literals and each resolves with `lib.findArticle` in a norm whose status is not `no-verificada`.
  - **fact:** same `id`; `unit` in the `LegalFact` union; `quote` non-empty and found in a cited article (`quoteFound` from `src/legal/audit/meaning.ts`); `valueStatedInQuote` true (move it from `test/legal/facts.test.ts` to `src/legal/facts.ts` and import it in both places).
  - **module-string:** a string literal (or a template literal with only expressions already in the original). Every citation written in it (`parseCitations`) resolves in the library. For the meaning check these parsed citations are its articles.
- Problem messages are Spanish sentences, shown to the founder in `sin_solucion` emails.

- [ ] **Step 1: Failing tests** (Review Focus 1):
  - `a new ${ctx.company.ruc} expression is rejected`;
  - `a changed when is rejected`;
  - `a cite to an article that does not exist is rejected`;
  - `an import or a second object is rejected`;
  - `a fact quote not in the article is rejected`;
  - `a clean rewrite of aviso.nota.regla-practica citing ley-29733 art. 18 passes`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal/draft-gates.test.ts test/legal/facts.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 5: Composing the draft with the AI (step 5)

**Files:** create `src/legal/draft/compose.ts`; test `test/legal/draft-compose.test.ts`.

**Interfaces:**
- Consumes `Span`, `checkReplacement`, `checkMeaning`, `legalLibrary`.
- Produces `composeDraft(input: { span: Span; renderedVariants: string[]; context: unknown }, deps: { call: typeof callLlm; cache: VerdictCache; model: string }): Promise<{ ok: true; replacement: string; rationale: string; verdicts: AiVerdict[] } | { ok: false; reasons: string[] }>`.
- **Two AI calls per attempt:**
  1. **Pick articles:** the AI gets the finding or norm context, the current text, and the library title index (`norm · art · title`, one line each). It returns up to 6 `{norm, art}`.
  2. **Write:** the AI gets their full official text and returns JSON `{ replacement, rationale }`.
- **After each attempt:** `checkReplacement`, then render the new text on the same fixtures the audit uses, and run `checkMeaning` on each variant.
- **Retry:** at most 2 attempts. The second one receives the first one's gate problems and verdict reasons.
- **Prompts:** fixed in the file. The system prompt states the allowed changes (Decision 2), Peruvian Spanish, and «no inventes artículos: solo los del texto oficial dado».

- [ ] **Step 1: Failing tests** with a fake `call`:
  - `first attempt passes gates and both passes support → ok`;
  - `first attempt fails a gate, second passes → ok with 4 AI calls for writing+meaning`;
  - `both attempts not supported → ok:false with the verdict reasons` (Review Focus 3);
  - `call returns null (AI down) → ok:false with reason "IA sin respuesta"` and no exception.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal/draft-compose.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 6: Loading a new norm into the library (step 3)

**Files:** create `src/legal/draft/ingest-norm.ts`; refactor `scripts/legal/ingest.mjs` so the download/split/write logic lives in `src/legal/library/ingest.ts` (pure parts testable; the script becomes a thin wrapper); `src/legal/validate-change.ts` (allow exactly `scripts/legal/sources.json`; normal PR, since legal branches can't change their own rules); tests `test/legal/draft-ingest.test.ts`, `test/legal-validate-change.test.ts`.

**Interfaces — Produces:**
- `proposeSource(pdfText: string, item: { title; issuer; published_on; url; pdf_url }, deps): Promise<{ id: string; entry: SourceEntry } | { reasons: string[] }>`. The AI proposes `id` (`ds-001-2027-jus` style), `start`/`end` regexes, `type`, `number`, `title`, `publishedAt`, and `sections` for directives.
- `ingestProposed(entry, pdfPath): { articles: Article[] } | { reasons }`. Sanity checks:
  - the start regex matches exactly once at the chosen occurrence;
  - at least 1 article;
  - no repeated numbers;
  - article numbers ascending for arabic numbering;
  - text layer present (`pdftotext` output over 500 characters).
- For `amends` verdicts: the amended norm's `norm.json` gets `status: "modificada"` and `amendedBy += [id]` (Decision 6).

- [ ] **Step 1: Failing tests:**
  - `a proposed entry for the fixture DS (test/fixtures/legal-draft/ds-fixture.txt) splits into 3 articles`;
  - `a start regex that does not match → reasons`;
  - `an image-only PDF text (under 500 chars) → reasons "PDF sin texto"`;
  - `validate-change allows scripts/legal/sources.json and still rejects scripts/legal/ingest.mjs`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal/draft-ingest.test.ts test/legal-validate-change.test.ts test/legal/ingest.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 7: The drafter (orchestration, branch, proposal, root script)

**Files:**
- create `src/legal/draft/run.ts` and `scripts/legal/draft.mjs`;
- modify `scripts/legal/propose-change.mjs` + `src/legal/propose.ts`: `--kind auditoria|norma`, `--source-url`, `--ai-drafted`, affected from targets;
- create `deploy/datosprivados-draft.sh`;
- `deploy/cron.d-datosprivados`: `*/30 * * * * root /usr/local/bin/datosprivados-draft`;
- `test/deploy-artifacts.test.ts` (drift pair);
- `docs/RUNBOOK.md`;
- tests `test/legal/draft-run.test.ts` and `test/draft-script.test.ts`.

**Interfaces:**
- Consumes everything above.
- Produces `runDraft(request: DraftRequest, deps: { call; exec: (cmd: string, args: string[]) => { code: number; out: string }; now: Date; root: string }): Promise<{ status: "propuesto"; changeId: string } | { status: "sin_solucion" | "reintentar"; reasons: string[] }>`, with these steps:
  1. **(norma only)** Task 6. Then targets = `affectedBy(norm, art)` for each triaged article, capped at 10 per document kind.
  2. `git checkout -B legal/auto-<request id> origin/master`.
  3. For each target: locate → compose → apply.
  4. **Regenerate the baselines** (the snapshot command from plan 5) and run `changedByKind` → raise those kinds in `TEMPLATE_VERSIONS`. Drop known-failures entries the tests report as stale.
  5. Add the customer-facing targets to `legal/audit/abogado.md`.
  6. **Run** `pnpm typecheck`, `pnpm lint`, `npx vitest run`. Any failure → `sin_solucion` with the first 20 failing lines. Delete the local branch; never push.
  7. **Register:** `propose-change` with an auto title and summary (old/new text per target, the article quoted, both verdicts, «Redactado por IA»). A rejected push → `reintentar` (Review Focus 4).
- **`datosprivados-draft.sh`** (root, flock, clone `/var/lib/datosprivados/drafts/repo`, same env/secret handling as `datosprivados-reaudit.sh`):
  - `GET /next`; on 204 or 409, exit 0;
  - otherwise: fresh `checkout -f origin/master`, `pnpm install --frozen-lockfile`, `node … draft.mjs <request json>`, then `POST /<id>/result` with its JSON output;
  - at most 2 requests per run.
  - Env overrides for tests: `DRAFT_STATE_DIR`, `DRAFT_API_URL`, `DRAFT_CMD`, `DATOSPRIVADOS_ENV`.

- [ ] **Step 1: Failing tests:**
  - `runDraft on a temp clone with a fake AI producing a good rewrite of aviso.nota.regla-practica → branch has exactly aviso.ts, snapshots, baseline, document-freshness (aviso raised) and abogado.md changed, and validateChange returns []` (exec for tests/push injected);
  - `a failing test run → sin_solucion, no push called`;
  - `push rejected → reintentar` (Review Focus 4);
  - `AI down → reintentar, not sin_solucion` (Review Focus 5);
  - **script tests:** `204 → exit 0, no draft command`; `a request → result posted with the command's JSON`; `409 → exit 0`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal/draft-run.test.ts test/draft-script.test.ts test/deploy-artifacts.test.ts`. Expected: PASS (the installed-copy drift test fails until install, as in plan 6).
- [ ] **Step 5:** Commit.

### Task 8: What the founder sees

**Files:** `src/app/operador/legal/page.tsx` + create `src/app/operador/legal/drafts-section.tsx`; `src/app/operador/legal/[id]/page.tsx` («Redactado por IA» badge and the two verdicts, from the change log's summary block); `src/lib/mail-templates.ts` (`legal_draft_failed`: target, reasons, path; essential); `src/lib/legal-drafts.ts` (`finishDraft` with `sin_solucion` emails each operator once, dedupe `legal-draft:<id>:<email>`); tests `test/legal-drafts-pages.test.ts`, `test/mail.test.ts` (count +1).

**Interfaces — Produces:**
- Section «Correcciones en redacción»: requests by status, each `sin_solucion` with its reasons and a «Redactar de nuevo» button (back to `pendiente`, attempts reset).
- A failed request emails the operators once.

- [ ] **Step 1: Failing tests:**
  - `the section lists a sin_solucion request with its reasons`;
  - `Redactar de nuevo requires an operator and resets the request`;
  - `sin_solucion emails each operator once`;
  - `the change page shows «Redactado por IA» for an AI-drafted change`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run test/legal-drafts-pages.test.ts test/mail.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 9: Review, ship, install, first real run

- [ ] Run a final whole-branch review (most capable model) with this plan's Review Focus. Fix the Critical/Important findings, each with a test that failed first.
- [ ] Run the full suite + typecheck + lint on the server. Then open the PR, **check that GitHub CI is green** (it runs again since PR #25), and merge.
- [ ] Deploy:
  - back up and reinstall `/etc/cron.d/datosprivados`;
  - `install -m 755 deploy/datosprivados-draft.sh /usr/local/bin/datosprivados-draft`;
  - reinstall `datosprivados-reaudit`.
- [ ] Load the backlog: `enqueue-report.mjs legal/audit/2026-11-14.json`. Sources already in open changes wait (Decision 5).
- [ ] Run `/usr/local/bin/datosprivados-draft` by hand once. Then check in `/operador/legal`, as the founder sees it, that a drafted change appears with its diff, verdicts and «Redactado por IA». Or check that a `sin_solucion` shows its reasons.
- [ ] Report to the founder: what was drafted, what was not and why, and the limits in Decision 6.
