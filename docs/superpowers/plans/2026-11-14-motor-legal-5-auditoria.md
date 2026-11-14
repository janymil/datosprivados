# Motor legal 5/7: auditoría de corrección — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm legal:audit` checks every citation, fact and clause of the legal engine, writes a dated report and the lawyer list, and every confirmed error becomes a legal change the founder approves in `/operador/legal`.

**Architecture:** The mechanical checks (spec §7 items 1–4) already run as vitest lint tests whose current failures are pinned in `legal/known-failures/*.json` by the ratchet; the audit reads those lists instead of re-implementing them. New code adds the two missing checks (uncited obligations, AI meaning check with two independent passes), a report writer, the lawyer list, and a script that turns a fix branch into a registered `legal_changes` row. The audit runs under vitest with its own config (path aliases and fixtures work, no new dependency). Fixes follow the plan-4 flow: branch `legal/<slug>` → register → founder approves → GitHub verifies and merges → server deploys.

**Tech Stack:** Next.js 16, TypeScript, vitest, `node:sqlite`, `src/lib/llm.ts`, pnpm, Node 22.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` (§7, §10a, phase 6 in §12). Builds on plans 1–4 (`docs/superpowers/plans/2026-11-1*-motor-legal-*.md`).

**Where:** on contabo, worktree `/root/work/motor-legal-5`, branch `feat/motor-legal-5` from `origin/master`; push to GitHub, open the PR, pull locally after merge.

## Global Constraints

- No developer or job changes legal wording without the founder's approval through `/operador/legal` (§10a). This plan's PR adds tooling, the dated report and `legal/audit/abogado.md`; it changes no document text.
- Confirmed errors are fixed as deliberate changes (§5 rule): snapshot update with a reason, `TEMPLATE_VERSIONS` raised, known-failures list only shrinks.
- What cannot be settled automatically goes to `legal/audit/abogado.md`. The October audit's §7 items (`AUDITORIA_DOCUMENTOS_LEGALES.md` §7) start on that list.
- Meaning check: two independent passes with different instructions, each returns `supported | partial | not_supported` with the quoted article text; disagreement ⇒ flagged.
- Uncited obligations: sentences with "debe", "obligatorio", a deadline or a number but no citation ⇒ flagged.
- The AI goes through `src/lib/llm.ts` with the configured model. Never hard-code or swap the model (the project's model is `gpt-6-luna`).
- No new npm dependencies. User-facing and report text in Spanish.
- A registered diff is exactly `git diff --no-color --no-ext-diff -M origin/master...<head_sha>`.
- Never print secrets (`CRON_SECRET`, API keys) in logs, reports or commits.

## Review Focus

1. The model answers with JSON wrapped in prose or a ```json fence → the verdict is still read; a reply with no valid JSON becomes a "revisar" finding, never a crash or a silent pass.
2. The AI stops answering mid-run (`callLlm` returns null) → the run finishes, those clauses are "revisar: la IA no respondió", and the report header counts them.
3. A clause that applies in no fixture profile (its `when` is false everywhere) → reported as "no auditada: no aplica en ningún perfil", not dropped silently.
4. Re-running the audit on the same day with the same inputs → identical JSON (stable ids, sorted findings), so diffs between runs show only real changes.
5. `propose-change` retried after a network failure → registering the same id, branch and commit again returns the existing change; the same id with another branch is rejected.

---

### Task 1: Registration accepts the change id from the caller

Plan 4 gap: the legal workflow requires `legal/changes/<id>.md` in the branch, but the server picks the id only when registering, after the branch commit exists. The caller now chooses the id, writes the log, commits, then registers.

**Files:**
- Modify: `src/lib/legal-changes.ts` (`LegalChangeInput`, `registerLegalChange`)
- Modify: `src/app/api/legal/changes/route.ts` (`parseInput`)
- Modify: `docs/RUNBOOK.md` (section "Cambios legales")
- Test: `test/legal-changes.test.ts`, `test/legal-changes-api.test.ts`

**Interfaces:**
- Produces: `LegalChangeInput.id?: string`; `CHANGE_ID = /^lc-\d{8}-[0-9a-f]{6}$/` exported from `src/lib/legal-changes.ts`.

- [ ] **Step 1: Failing tests** in `test/legal-changes.test.ts`:
  - `"usa el id que envía quien registra"`: register with `id: "lc-20261114-abc123"` → `change.id === "lc-20261114-abc123"`.
  - `"rechaza un id con forma inválida"`: `id: "lc-1"` → throws `/id inválido/`.
  - `"mismo id, rama y commit: devuelve el existente"`: second call returns the same row, one row in the table.
  - `"mismo id con otra rama: rechaza"`: throws `/id ya usado/`.
  - In `test/legal-changes-api.test.ts`: POST with `id` → 201 and body `id` equals it; POST with `id: "x"` → 400.
- [ ] **Step 2:** `pnpm vitest run test/legal-changes.test.ts test/legal-changes-api.test.ts` → the new tests FAIL.
- [ ] **Step 3: Implement.** `registerLegalChange` uses `input.id ?? changeId()`; validates with `CHANGE_ID` (error `id inválido: <id>`); the existing branch+sha lookup runs first (idempotent); then an id already in the table → `id ya usado: <id>`. `parseInput` passes `data.id` as a string when present. RUNBOOK: one paragraph saying the caller chooses the id and the branch must already contain `legal/changes/<id>.md`.
- [ ] **Step 4:** same command → PASS; `pnpm test` green except the known server-only drift check.
- [ ] **Step 5: Commit** `fix(legal): el id del cambio lo elige quien lo registra (el registro va en la rama)`.

### Task 2: Mechanical findings and the report

**Files:**
- Create: `src/legal/audit/types.ts`, `src/legal/audit/mechanical.ts`, `src/legal/audit/report.ts`
- Test: `test/legal/audit-mechanical.test.ts`, `test/legal/audit-report.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `AuditCheck = "cita" | "vigencia" | "cita-textual" | "numero" | "significado" | "obligacion-sin-cita"`
  - `AiVerdict = { pass: "a" | "b"; verdict: "supported" | "partial" | "not_supported"; quote: string; reason: string }`
  - `AuditFinding = { id: string; check: AuditCheck; rule: string; source: string; detail: string; severity: "error" | "revisar"; verdicts?: AiVerdict[] }`
  - `findingId(check, source, detail): string`, the first 12 hex characters of sha256 of `check|source|detail`.
  - `AuditMeta = { date: string; model: string | null; aiEnabled: boolean; clausesAudited: number; notAudited: Array<{ source: string; reason: string }>; aiFailures: number }`
- Produces (`mechanical.ts`): `mechanicalFindings(dir: string = KNOWN_FAILURES_DIR): AuditFinding[]`, `RULE_CHECK: Record<string, AuditCheck>`.
- Produces (`report.ts`): `renderReport(findings: AuditFinding[], meta: AuditMeta): string`, `writeReport(dir: string, findings: AuditFinding[], meta: AuditMeta): { md: string; json: string }`, which writes `<dir>/<meta.date>.md` and `.json`.

- [ ] **Step 1: Failing tests.**
  - `audit-mechanical`: `"cada regla de legal/known-failures tiene su chequeo"`: every `rule` in the four real files is a key of `RULE_CHECK`.
  - `audit-mechanical`: `"cite-norm-repealed y cite-norm-unverified son vigencia; cite-misnumbered es cita; fact-unverified es cita-textual"`.
  - `audit-mechanical`: `"una regla desconocida rompe"`: temp dir with `{rule:"nueva-regla"}` → throws `/sin chequeo: nueva-regla/`.
  - `audit-mechanical`: `"severidad"`: `cite-*` and `fact-*` are `error`; `clause-without-basis` is `obligacion-sin-cita` / `revisar`.
  - `audit-report`: `"mismo input, mismo JSON"`: two `writeReport` runs into temp dirs give byte-identical `.json`. Findings are sorted by check, source and detail.
  - `audit-report`: `"el informe cuenta lo no auditado y las fallas de la IA"`: the markdown contains `No auditadas: 1` and `Sin respuesta de la IA: 2`.
- [ ] **Step 2:** `pnpm vitest run test/legal/audit-mechanical.test.ts test/legal/audit-report.test.ts` → FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - Move `KNOWN_FAILURES_DIR` and the `KnownFailure` type from `test/legal/checks.ts` into `src/legal/audit/types.ts`, and re-export them from `checks.ts` so the existing tests keep working.
  - Fill `RULE_CHECK` from the rule names actually present in the four files.
  - Report layout: a header with the date, model, AI on/off and counts. Then one section per check, with a table of id, source, detail and severity. The meaning findings come last, with both verdicts quoted.
- [ ] **Step 4:** same command → PASS.
- [ ] **Step 5: Commit** `feat(legal): hallazgos mecánicos de la auditoría e informe fechado`.

### Task 3: Uncited obligations

**Files:**
- Create: `src/legal/audit/obligations.ts`
- Test: `test/legal/audit-obligations.test.ts`

**Interfaces:**
- Consumes: `parseCitations`, `CLAUSE_DEFAULT_NORM` (`src/legal/citations.ts`); `AuditFinding`, `findingId`.
- Produces:
  - `OBLIGATION = /\b(debe|deben|deberá|deberán|obligatori[oa]s?|obligad[oa]s?|tiene la obligación|plazo|dentro de(l)? \d+|\d+\s*(?:días|horas|meses|años)|UIT)\b/i`
  - `obligationSentences(text: string): string[]` splits on `. `, `; ` and line breaks, after stripping markdown.
  - `findUncitedObligations(items: Array<{ source: string; text: string; cites: Citation[]; nonLegal?: string }>): AuditFinding[]`. A sentence is flagged when it matches `OBLIGATION`, has no article mention of its own (`parseCitations` empty), and its item has no `cites` or has `nonLegal`. The finding is `check: "obligacion-sin-cita"`, `rule: "obligation-uncited"`, `severity: "revisar"`, and its `detail` is the sentence cut to 200 characters.
- [ ] **Step 1: Failing tests:**
  - `"marca «El responsable debe responder en 10 días.» sin citas"`.
  - `"no la marca si el ítem cita un artículo"`.
  - `"la marca en una cláusula nonLegal"`.
  - `"una frase con «(art. 69 del DS N.° 016-2024-JUS)» no se marca"`.
  - `"«Esta política describe cómo tratamos sus datos.» no se marca"`.
  - `"mismas frases, mismos ids"`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(legal): obligaciones sin cita en la auditoría`.

### Task 4: Meaning check (two AI passes)

**Files:**
- Create: `src/legal/audit/meaning.ts`, `src/legal/audit/verdict-cache.ts`
- Test: `test/legal/audit-meaning.test.ts`

**Interfaces:**
- Consumes: `callLlm`, `untrusted`, `activeModelId` (`src/lib/llm.ts`); types from Task 2.
- Produces:
  - `PASS_A_SYSTEM`, `PASS_B_SYSTEM` (Spanish). A asks: "¿el artículo respalda lo que dice la cláusula?". B is adversarial: "lista cada afirmación de la cláusula y di si el artículo la dice; si una no está, not_supported o partial". Both demand only `{"verdict":…,"quote":…,"reason":…}`, with `quote` a literal extract of the article.
  - `parseVerdict(raw: string | null, pass: "a" | "b"): AiVerdict | null` takes the first `{…}` object, including one inside a ```json fence, validates `verdict`, and requires non-empty strings.
  - `type MeaningInput = { source: string; text: string; articles: Array<{ norm: string; art: string; text: string }> }`.
  - `checkMeaning(input: MeaningInput, deps: { call: typeof callLlm; cache: VerdictCache; model: string }): Promise<{ finding: AuditFinding | null; aiFailed: boolean }>`.
  - `class VerdictCache { constructor(file: string); get(key: string): AiVerdict | undefined; set(key: string, v: AiVerdict): void; save(): void }` with key = sha256 of `model|pass|system|text|articles`. File `.cache/legal-audit/verdicts.json`, added to `.gitignore`.
- Decision rules:

  | Outcome of the two passes | Finding |
  |---|---|
  | both `supported` | none |
  | both `not_supported` | `severity: "error"` |
  | anything else: partial, disagreement | `revisar` |
  | a pass returns null or invalid JSON | `revisar` with `detail` "la IA no respondió" and `aiFailed: true` |
  | a `quote` not found verbatim (whitespace-normalised) in any cited article | `revisar` with `detail` "la cita de la IA no está en el artículo" |

  Every finding carries both verdicts (`check: "significado"`, `rule: "meaning"`).
- [ ] **Step 1: Failing tests** with a fake `call` that returns scripted strings:
  - `"dos supported: sin hallazgo"`.
  - `"supported + partial: revisar con los dos veredictos"`.
  - `"dos not_supported: error"`.
  - `"JSON dentro de ```json y con texto alrededor: se lee"`.
  - `"sin JSON válido: revisar, aiFailed"`.
  - `"null de la IA: revisar, aiFailed"`.
  - `"cita inventada: revisar"`.
  - `"segunda vez con la misma entrada: usa la caché (0 llamadas)"`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; the two passes run in parallel per clause. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(legal): chequeo de significado con dos pasadas de IA`.

### Task 5: The audit runner and the lawyer list

**Files:**
- Create: `vitest.audit.config.ts`, `test/legal/audit/run.audit.ts`, `test/legal/audit/inputs.ts` (it uses the test fixtures, so it lives under `test/`), `src/legal/audit/lawyer-list.ts`, `legal/audit/abogado.md`
- Modify: `package.json` (script `legal:audit`), `.gitignore` (`.cache/`), `docs/RUNBOOK.md` (section "Auditoría legal")
- Test: `test/legal/audit-lawyer-list.test.ts`, `test/legal/audit-inputs.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4; `allClauses()` (`src/legal/registry.ts`); `representativeFixtures()`, `withFrozenWorld` (`test/legal/fixtures.ts`, `test/legal/render-all.ts`); `legalDataModuleTexts()`; `legalLibrary().findArticle`.
- Produces:
  - `auditInputs(): { clauses: MeaningInput[]; obligations: Array<{source,text,cites,nonLegal?}>; notAudited: Array<{source, reason}> }` in `test/legal/audit/inputs.ts`.
    - It renders each clause over every representative fixture inside `withFrozenWorld`, keeps distinct non-empty texts, and takes at most the 2 longest per clause.
    - A clause with no text in any fixture goes to `notAudited` with the reason "no aplica en ningún perfil".
    - A clause with a citation that `findArticle` cannot resolve skips the meaning check, with the reason "cita rota (ver hallazgo mecánico)".
  - `updateLawyerList(file: string, findings: AuditFinding[]): number` adds each `revisar` finding of check `significado` or `obligacion-sin-cita` whose id is not yet in the file, as `- [ ] <id> · <source> · <detail>`, under `## Pendientes de la auditoría`. It keeps every other line untouched and returns how many it added.
  - `pnpm legal:audit` = `vitest run test/legal && vitest run --config vitest.audit.config.ts`. The lint run goes first, so the known-failure lists are current. The env `LEGAL_AUDIT_AI=0` skips the meaning check.
  - `vitest.audit.config.ts` sets the same aliases as `vitest.config.ts`, `include: ["test/legal/audit/**/*.audit.ts"]`, `testTimeout: 3_600_000`, and `env: loadEnv("audit", process.cwd(), "")`. `DATOSPRIVADOS_DB` points to a temp file, so `ai_usage` rows never touch the real database.
  - `run.audit.ts` behaves as follows:
    - When AI is enabled and `isLlmConfigured()` is false, it fails with "La auditoría de significado necesita la IA configurada (OPENAI_MODEL); usa LEGAL_AUDIT_AI=0 para la parte mecánica".
    - It runs the meaning checks with at most 4 at a time.
    - It writes `legal/audit/<YYYY-MM-DD Lima>.{md,json}`, updates `abogado.md`, saves the cache, and prints the counts.
- [ ] **Step 1: Failing tests:**
  - `audit-lawyer-list`: `"conserva las líneas escritas a mano"`, `"agrega solo lo nuevo"`, `"no duplica en una segunda pasada"`.
  - `audit-inputs`: `"cada cláusula está auditada o en notAudited con motivo"`, i.e. `clauses + notAudited` covers all of `allClauses()` minus the `nonLegal` ones.
  - `audit-inputs`: `"como máximo 2 textos por cláusula"`.
- [ ] **Step 2:** run → FAIL. **Step 3: Implement.** Seed `legal/audit/abogado.md`:
  - a header explaining the file is the list for a human lawyer;
  - `## De la auditoría de octubre (AUDITORIA_DOCUMENTOS_LEGALES.md §7)`, one `- [ ]` line per item of that section, in its own words;
  - an empty `## Pendientes de la auditoría`.
- [ ] **Step 4:** tests PASS; `LEGAL_AUDIT_AI=0 pnpm legal:audit` writes the report with the mechanical and obligation findings and exits 0.
- [ ] **Step 5: Commit** `feat(legal): pnpm legal:audit y lista para el abogado`.

### Task 6: `propose-change`, from a fix branch to a registered change

**Files:**
- Create: `src/legal/propose.ts` (no `@/` imports: it is loaded by `node --experimental-strip-types`), `scripts/legal/propose-change.mjs`
- Test: `test/legal/propose.test.ts`

**Interfaces:**
- Consumes: `CHANGE_ID` format (Task 1), `validateChange` (`src/legal/validate-change.ts`).
- Produces:
  - `newChangeId(now?: Date): string` gives `lc-YYYYMMDD-xxxxxx`.
  - `changeLog(p: { id: string; title: string; summary: string; findings: string[] }): string` gives the markdown for `legal/changes/<id>.md`: title, date, why (summary), the finding ids and how to verify.
  - `proposalPayload(p: { id; title; summary; branch; headSha; diff; findings: string[] }): object` gives the `/api/legal/changes` body with `kind: "auditoria"` and `affected` = the finding sources as `{ kind: "clause", source }`.
- Script: `node --experimental-strip-types scripts/legal/propose-change.mjs --title "…" --summary-file <md> --findings id1,id2`. It runs on the current `legal/<slug>` branch, which must have a clean tree. In order, it:
  1. creates the id;
  2. writes and commits the log;
  3. pushes;
  4. runs `git fetch origin master`;
  5. computes the exact diff;
  6. POSTs to `${LEGAL_API_URL:-http://127.0.0.1:3000}/api/legal/changes` with `authorization: Bearer $CRON_SECRET`;
  7. prints the id and `/operador/legal/<id>`.

  It refuses to run off a `legal/` branch or when `validateChange` reports problems.
- [ ] **Step 1: Failing tests:**
  - `"el id tiene la forma lc-AAAAMMDD-xxxxxx"`.
  - `"el registro del cambio nombra los hallazgos"`.
  - `"una rama con su registro pasa validateChange"`: a fake input with `legal/changes/<id>.md` present gives no `falta …` problem.
  - `"el cuerpo lleva kind auditoria e id"`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS; `pnpm typecheck && pnpm lint && pnpm test` green (except the known server-only drift check).
- [ ] **Step 5: Commit** `feat(legal): propose-change registra una rama de corrección`.

### Task 7: Run the audit and open the PR

- [ ] **Step 1:** with the model configured for the run, `OPENAI_MODEL=gpt-6-luna pnpm legal:audit`. Do not change the model; if production's `.env` still lacks `OPENAI_MODEL`, ask the founder before setting it there.
- [ ] **Step 2:** read the report; check 10 meaning findings by hand against the article text; record in the PR body how many held up.
- [ ] **Step 3:** commit `legal/audit/<date>.{md,json}` and `legal/audit/abogado.md`: `docs(legal): primer informe de auditoría`.
- [ ] **Step 4:** push `feat/motor-legal-5`, open the PR, final whole-branch review, fix Critical/Important, merge and deploy only with the founder's go-ahead.

### Task 8: Fixes, one approved change per cause (after Task 7 is deployed)

Needs Task 1 in production, so that registering with an id works.

- [ ] **Step 1: Group the `error` findings by cause**, at most 10 clauses per change. For example, all `cite-misnumbered` 2.x → III.x form one change, and each clause the meaning check rejects is its own change.
- [ ] **Step 2: For each group:**
  1. `git switch -c legal/<slug> origin/master` in `/root/work`;
  2. fix the text, citation or fact;
  3. `vitest -u` on the affected snapshots, with the reason written in the change log;
  4. raise `TEMPLATE_VERSIONS` for each document kind whose text changed;
  5. remove the fixed entries from `legal/known-failures/*.json`;
  6. `pnpm vitest run test/legal`, which must be green;
  7. run `propose-change`.
- [ ] **Step 3:** `revisar` findings the founder cannot settle stay in `abogado.md`; nothing else.
- [ ] **Step 4:** report to the founder: the list of registered changes (id, title, link) waiting in `/operador/legal`. Their approval is the merge.
