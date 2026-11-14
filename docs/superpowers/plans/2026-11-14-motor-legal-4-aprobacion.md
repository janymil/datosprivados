# Legal engine, plan 4 of 7: approval dashboard and one-click approval

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The founder sees every proposed legal change in `/operador/legal`, together with its source, the official article quoted, what it affects and the exact diff. They approve it with one click. GitHub then runs every check, merges if all pass, and the server deploys by itself. Nothing reaches clients without that click.

**Architecture:**
- **A change is a git branch.** Each proposed change is a branch `legal/<id>` on GitHub. It carries the edited files, a change log `legal/changes/<id>.md` and, if document text changes, the regenerated snapshots plus a `TEMPLATE_VERSIONS` bump.
- **The app stores the change.** A row in a new `legal_changes` table holds metadata and the diff. Rows are registered through an internal endpoint, guarded by `CRON_SECRET`, by a development session (plan 5) or the monitor (plan 6).
- **Approve.** It sends a `repository_dispatch` to GitHub. A workflow checks that the branch is exactly the approved commit, validates the change, runs CI, and merges into `master`.
- **Pull-based deploy.** An app job learns the merge through the GitHub API and writes a deploy request. A root cron script pulls `master` and runs `scripts/deploy.sh` (tests, build in a copy, smoke test, automatic rollback). No GitHub secret can reach the server.

**Tech Stack:** Next.js (read `node_modules/next/dist/docs/` before app code, per `AGENTS.md`), `node:sqlite`, vitest, GitHub Actions, bash.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` §8 "Approval dashboard" and "One-click approval", §10a (the founder approves each fix).

## Global Constraints

- Only operators (`requireOperator()`, `OPERATOR_EMAILS` with a verified email) can see or act in `/operador/legal`. Anyone else gets 404, as in the existing operator pages.
- **Approval is bound to a commit.** The row stores `head_sha` at registration. The workflow refuses to merge if the branch head is not that sha, so a change edited after approval needs a new approval.
- The server never writes into `/var/www/datosprivados` from the app process and never runs the test suite in production. Only the root cron script pulls and deploys, through the existing `scripts/deploy.sh`.
- **Tokens:**
  - `GITHUB_DISPATCH_TOKEN`: fine-grained, this repository only, "Contents: read and write". It lives in `/etc/datosprivados.env`. **The founder creates it.** The plan only reads it and shows "falta token" when it's absent.
  - The workflow uses its own `GITHUB_TOKEN` (`contents: write`).
- Migration `v17` follows the pattern in `src/lib/db.ts` (`SCHEMA_VERSION`, idempotent `CREATE TABLE IF NOT EXISTS`).
- Spanish UI copy and comments. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on contabo in worktree `/root/work/motor-legal-4`, on branch `feat/motor-legal-4` from `origin/master` (`a36a0c6`). Open a normal PR to `master`.

## Review Focus

1. **A branch changed after approval.** The workflow must refuse it and mark the change `falló`, with the reason "la rama cambió después de aprobar". Pinned in Task 5.
2. **Double approval or a stale row.** Clicking Approve twice, or approving a row already `aprobado`, `rechazado` or `aplicado`, must not dispatch twice. Pinned in Task 3.
3. **No token, GitHub down, or dispatch rejected.** The row shows the error and can be retried. Nothing is lost silently. Pinned in Task 3.
4. **The deploy fails after merge.** `deploy.sh` rolls back. The row must say `falló` with the deploy log tail, and the deploy request must not loop forever. Pinned in Task 6.
5. **Lint and approval are not bypassed.** The workflow validator must reject a branch that:
   - adds entries to `legal/known-failures/*.json`;
   - changes document snapshots or hashes without a `TEMPLATE_VERSIONS` bump;
   - has no change log.

   Pinned in Task 5. (This is the review recommendation carried over from plan 2.)

---

### Task 1: `legal_changes` table and data functions

**Files:**
- Modify: `src/lib/db.ts` (v17 migration, `LegalChange` type)
- Create: `src/lib/legal-changes.ts`
- Test: `test/legal-changes.test.ts`

**Interfaces:**
- Produces (`src/lib/db.ts`):
  ```ts
  export type LegalChangeStatus = "nuevo" | "aprobado" | "rechazado" | "abogado" | "fusionado" | "aplicado" | "fallo";
  export type LegalChange = {
    id: string; kind: "auditoria" | "norma"; title: string; summary: string;  // markdown: qué cambia y por qué, con la cita textual
    source_url: string | null; branch: string; head_sha: string; diff: string;
    affected: string;                 // JSON: Array<{ kind; source }> (affectedBy, plan 3)
    status: LegalChangeStatus; reason: string | null; decided_by: string | null; decided_at: string | null;
    dispatched_at: string | null; merged_sha: string | null; deployed_at: string | null; error: string | null;
    created_at: string; updated_at: string;
  };
  ```
- Produces (`src/lib/legal-changes.ts`):
  - `registerLegalChange(input: Pick<LegalChange, "kind" | "title" | "summary" | "source_url" | "branch" | "head_sha" | "diff"> & { affected: Array<{ kind: string; source: string }> }): LegalChange`. The id is `lc-<yyyymmdd>-<6 hex>`. It rejects a `branch` not matching `^legal/[a-z0-9-]+$`, a `head_sha` not 40-hex, or an empty `diff`. It is idempotent for the same branch and sha.
  - `listLegalChanges(filter?: { status?: LegalChangeStatus[] }): LegalChange[]`, newest first.
  - `getLegalChange(id: string): LegalChange | null`.
  - `decideLegalChange(id, decision: "aprobado" | "rechazado" | "abogado", by: string, reason?: string): { ok: true; change: LegalChange } | { ok: false; error: "no-existe" | "ya-decidido" | "motivo-requerido" }`. Only a row with status `nuevo` (or `fallo` for a retry approval) can be decided. `rechazado` requires a reason.
  - `markLegalChange(id, patch: Partial<Pick<LegalChange, "status" | "dispatched_at" | "merged_sha" | "deployed_at" | "error">>): void`.

- [ ] **Step 1: Write the failing tests:**
  - register, then get;
  - registering the same branch and sha returns the same row;
  - invalid branch, sha or empty diff throws;
  - decide `aprobado` from `nuevo` gives ok, deciding again gives `ya-decidido`;
  - `rechazado` without a reason gives `motivo-requerido`;
  - approving again from `fallo` is allowed;
  - list order and status filter;
  - the migration from v16 adds the table without touching data. Use the existing `test/db-migrations.test.ts` style.
- [ ] **Step 2:** Run `pnpm vitest run test/legal-changes.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the migration and functions.
- [ ] **Step 4:** Run it plus `test/db-migrations.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit and push: `feat(legal): tabla de cambios legales propuestos`.

---

### Task 2: Internal endpoint to register a change, plus the operator email

**Files:**
- Create: `src/app/api/legal/changes/route.ts` (POST)
- Modify: `src/lib/mail-templates.ts` (template `legal_change_new`, essential)
- Test: `test/legal-changes-api.test.ts`

**Interfaces:**
- `POST /api/legal/changes`:
  - Auth: `Authorization: Bearer ${CRON_SECRET}`, using the same check as `/api/cron/[job]` and reusing its helper.
  - Body: the `registerLegalChange` input as JSON. The `diff` may be at most 2 MB.
  - Returns 201 `{ id, status }`, 200 when it already existed, 400 `{ error }` on invalid input, 401 without the bearer.
- On a new row, it enqueues `legal_change_new` to every address in `OPERATOR_EMAILS`. The email carries the title, the kind, the number of affected items and a link to `${siteUrl()}/operador/legal/<id>`.

- [ ] **Step 1:** Write the failing tests: 401 without auth; 400 on a bad branch; 201 then 200 on a repeat; one outbox row per operator email with the dedupe key `legal-change:<id>`.
- [ ] **Step 2:** Run: FAIL. **Step 3:** Implement. **Step 4:** Run: PASS.
- [ ] **Step 5:** Commit and push: `feat(legal): registro interno de cambios legales y aviso al operador`.

---

### Task 3: Approve, reject and lawyer actions with the GitHub dispatch

**Files:**
- Create: `src/lib/github-dispatch.ts`
- Create: `src/app/operador/legal/actions.ts`
- Test: `test/legal-changes-actions.test.ts`

**Interfaces:**
- `dispatchLegalChange(change: LegalChange, fetchImpl = fetch): Promise<{ ok: true } | { ok: false; error: string }>`.
  - It POSTs `https://api.github.com/repos/${GITHUB_REPOSITORY ?? "janymil/datosprivados"}/dispatches`.
  - Body: `{ event_type: "legal-change-approved", client_payload: { id, branch, head_sha } }`, with `Authorization: Bearer ${GITHUB_DISPATCH_TOKEN}`.
  - No token gives `error: "falta GITHUB_DISPATCH_TOKEN"`; a non-204 response gives `error: "GitHub <status>: <body excerpt>"`.
- Server actions, each starting with `await requireOperator()`:
  - `approveLegalChangeAction(formData)` (`id`): decides `aprobado`, then dispatches. On success it sets `dispatched_at`. On failure it sets `status: "fallo"` and `error`, so a later click retries. It redirects to the detail page with `?ok=aprobado` or `?error=…`.
  - `rejectLegalChangeAction(formData)` (`id`, `reason`).
  - `lawyerLegalChangeAction(formData)` (`id`, `reason`): status `abogado`. It also appends a line to `legal/audit/abogado.md`? **No**: the app must not write the repo. The lawyer list is the `abogado` filter in the dashboard.

- [ ] **Step 1: Write the failing tests** with a fake `fetchImpl`:
  - an operator approves, so dispatch is called once with the exact payload;
  - a second approve on the same row does not dispatch (Review Focus 2);
  - without a token the row becomes `fallo` with the error, and re-approve dispatches;
  - GitHub 422 sets `fallo` with the excerpt;
  - reject without a reason fails;
  - a non-operator gets 404 (`notFound`).
- [ ] **Step 2:** Run: FAIL. **Step 3:** Implement. **Step 4:** Run: PASS.
- [ ] **Step 5:** Commit and push: `feat(legal): aprobar, rechazar o enviar al abogado; aprobación envía el cambio a GitHub`.

---

### Task 4: The dashboard `/operador/legal`

**Files:**
- Create: `src/app/operador/legal/page.tsx` (list) and `src/app/operador/legal/[id]/page.tsx` (detail)
- Create: `src/components/diff-view.tsx` (renders a unified diff: file headers, `+` and `-` lines with colours and a text prefix, so it doesn't depend on colour alone; line numbers from the hunk headers)
- Modify: `src/components/operator-nav.tsx` (link "Cambios legales", key `legal`)
- Test: `test/diff-view.test.ts` (pure parsing function `parseUnifiedDiff(diff): Array<{ file; hunks: Array<{ header; lines: Array<{ type: "add" | "del" | "ctx"; text; oldNo?; newNo? }> }> }>`)

**Content:**
- **List:**
  - tabs "Pendientes" (`nuevo`, `fallo`), "Abogado", "Historial" (all others), with counts;
  - each row shows title, kind, created date, status pill and affected count.
- **Detail:**
  - title and kind; `summary` rendered as markdown, using the existing renderer `doc-body.tsx` if suitable;
  - the source link;
  - affected items grouped by kind (clause, fact, module, page);
  - the diff, via `DiffView`;
  - status timeline: created, decided (by whom, reason), dispatched, merged sha (linking to the GitHub commit), deployed, error;
  - the three action forms, shown only while the status allows them. The reject and lawyer forms need a reason textarea.
- **Empty state:** "No hay cambios propuestos. La auditoría (plan 5) y el monitor de normas (plan 6) los crean."

- [ ] **Step 1:** Write the `parseUnifiedDiff` tests (a multi-file diff, a new file, a deleted file, a `\ No newline at end of file` line). Expected FAIL.
- [ ] **Step 2:** Implement `parseUnifiedDiff` and `DiffView`, then the pages.
- [ ] **Step 3:** Verify:
  - `pnpm vitest run test/diff-view.test.ts` passes;
  - `pnpm typecheck && pnpm lint` pass;
  - render check: register a sample change in the worktree's own DB through the endpoint, start `next dev` on a spare port in the worktree, log in as operator and confirm the list and detail render. Use the existing e2e operator helper if there is one; otherwise do a manual check with curl and a session cookie created by `createSession` in a script.
- [ ] **Step 4:** Commit and push: `feat(legal): panel /operador/legal con diff, impacto y decisiones`.

---

### Task 5: GitHub workflow that validates, tests and merges an approved change

**Files:**
- Create: `scripts/legal/validate-change.mjs` (pure checks over a list of changed files and their contents; CLI wrapper)
- Create: `.github/workflows/legal-change.yml`
- Test: `test/legal-validate-change.test.ts`

**Interfaces:**
- `validateChange({ id, changedFiles: string[], read: (path) => string | null, readBase: (path) => string | null }): string[]`. It returns a list of violations, empty when valid:
  - `legal/changes/<id>.md` is missing;
  - a `legal/known-failures/*.json` file gained entries (compare JSON arrays by `rule|clause|detail` keys);
  - document snapshots (`test/legal/__snapshots__/**`) or `test/legal/baseline-hashes.json` changed, but `TEMPLATE_VERSIONS` in `src/lib/document-freshness.ts` was not raised for at least one kind;
  - files outside the allowed set changed. Allowed: `src/legal/**`, `src/lib/**`, `legal/**`, `test/legal/**`, `src/app/**`, `src/components/**`, `docs/**`.
- `legal-change.yml`, on `repository_dispatch` with types `[legal-change-approved]`:
  1. Check out `client_payload.branch` with full history. **Fail** if `git rev-parse HEAD` ≠ `client_payload.head_sha` (Review Focus 1).
  2. `node scripts/legal/validate-change.mjs <id> origin/master`; fail on violations.
  3. Same steps as `ci.yml`'s checks job: install, typecheck, lint, test, build (with the same env).
  4. If green: `git checkout master && git merge --no-ff <branch> -m "legal: <id> aprobado"` and push. Permissions: `contents: write`.
  5. On any failure, the job fails. The server learns it in Task 6 by reading the run conclusion through the API.

- [ ] **Step 1:** Write the validator tests, each violation plus a valid case. Expected FAIL.
- [ ] **Step 2:** Implement the validator and the workflow.
- [ ] **Step 3:** Run the validator tests and `actionlint` if it's available on the server (otherwise `node -e` YAML parse with the `yaml` dev dependency if present). Expected PASS.
- [ ] **Step 4:** Commit and push: `ci(legal): flujo que valida, prueba y fusiona un cambio legal aprobado`.

---

### Task 6: Status sync and pull-based deploy

**Files:**
- Modify: `src/lib/jobs.ts` (new job `legal-change-sync`, every 10 minutes, enabled only when `GITHUB_DISPATCH_TOKEN` is set)
- Create: `deploy/datosprivados-autodeploy` (bash, installed to `/usr/local/bin`) and its cron line in `deploy/cron.d-datosprivados`
- Modify: `docs/RUNBOOK.md` (token setup, how a change flows, how to read a `fallo`)
- Test: `test/legal-change-sync.test.ts`, and extend `test/ops-scripts.test.ts` for the script (pattern already used there)

**Interfaces:**
- `legal-change-sync` (`JOBS["legal-change-sync"]`). For rows `aprobado` with `dispatched_at`:
  - It reads the latest run of workflow `legal-change.yml` triggered after `dispatched_at` (`GET /repos/{repo}/actions/workflows/legal-change.yml/runs?event=repository_dispatch`) and matches it by the run's `display_title`. The workflow sets `run-name: legal <id>`.
  - Conclusion `failure` gives `status: "fallo"`, `error: "<run html_url>"`, plus an ops email.
  - On `success` it reads the merge commit (`GET /repos/{repo}/commits/master` and checks whether `head_sha` is an ancestor via the compare API). Then it sets `status: "fusionado"`, sets `merged_sha` and writes the deploy request file `${DEPLOY_REQUEST_FILE ?? "/var/lib/datosprivados/deploy-request"}` containing the merged sha.
  - For rows `fusionado`: when `${DEPLOYED_FILE ?? "/var/lib/datosprivados/deployed-sha"}` holds a sha that contains `merged_sha` (checked through the compare API), it sets `status: "aplicado"` and `deployed_at`. If `/var/lib/datosprivados/deploy-failed` exists for that sha, it sets `fallo` with the log tail.
- `datosprivados-autodeploy`, run by root every 5 minutes:
  - if the request file exists: `git -C /var/www/datosprivados pull --ff-only origin master`, then `bash scripts/deploy.sh`;
  - on success it writes `deployed-sha` (the `git rev-parse HEAD`) and removes the request;
  - on failure it writes `deploy-failed` (sha plus the last 40 log lines) and removes the request, so it never loops (Review Focus 4);
  - it uses `flock` against concurrent runs.

- [ ] **Step 1:** Write the job tests with a fake fetch and temp files for each transition (success → fusionado → aplicado; failure → fallo; deploy failure → fallo with tail). Write the script tests in the `ops-scripts` style with a fake `git` and `deploy.sh` on `PATH`. Expected FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run the full suite, typecheck, lint and build. Expected PASS.
- [ ] **Step 4:** Commit and push: `feat(legal): seguimiento del cambio aprobado y despliegue automático tras la fusión`.

---

### Task 7: Final review and PR

- [ ] **Step 1:** Fresh-reviewer final review.
- [ ] **Step 2:** Fix Important findings with TDD.
- [ ] **Step 3:** Open a PR to `master`, bind it, and offer Auto-fix.
- [ ] **Step 4:** Tell the founder the two manual setup steps (they can't be automated by Claude):
  1. Create the fine-grained token `GITHUB_DISPATCH_TOKEN` (repository `janymil/datosprivados`, "Contents: read and write") and put it in `/etc/datosprivados.env`.
  2. Install the autodeploy script and its cron line. I can do this on their go-ahead, as a server change.
