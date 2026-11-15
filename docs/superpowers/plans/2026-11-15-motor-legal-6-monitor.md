# Motor legal 6/7: monitor de normas y re-auditoría trimestral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every day the app reads the new norms published in El Peruano and on the ANPD's gob.pe page. It keeps the ones that can affect the legal library, triages them with AI, shows each relevant one in `/operador/legal` with the clauses, documents and number of customers it touches, and emails the founder. Every quarter the full audit runs again on its own and its summary is emailed.

**Architecture:** One job, `legal-watch` (daily 07:00 Lima), reads both sources with plain HTML parsing:
- El Peruano: `diariooficial.elperuano.pe/Normas/Filtro` with a date range, `/Normas/LoadNormasLegales` for today.
- ANPD: `www.gob.pe/institucion/anpd/normas-legales`.

New items are stored in `legal_watch_items`. A deterministic pre-filter (issuer, keywords, numbers of norms in the library) keeps the AI cost near zero. The candidates are triaged through `src/lib/llm.ts`. The impact comes from the existing citation index (`affectedBy`). Each source records its health; a source failing 3 days in a row, or returning a page with a different structure, raises an ops alert.

The quarterly re-audit is a root cron script, `deploy/datosprivados-reaudit.sh`, styled like the autodeploy script. It runs `pnpm legal:audit` in a clean checkout of `master` under `/var/lib/datosprivados/reaudit/` (never in `/var/www`) and posts the summary to an internal endpoint that emails the operators.

**Tech Stack:** Next.js 16, TypeScript, `node:sqlite`, vitest, `src/lib/llm.ts` (model from configuration: `gpt-6-luna`), bash + cron.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` §8 (law monitor) and §9 (quarterly re-audit). **Scope cut (14.11.2026). Correction of 15.11.2026: Claude made this cut without the founder's agreement and did not report it to him; steps 3 and 5 are restored in plan 7 (`2026-11-15-motor-legal-7-redaccion.md`):** the monitor detects, triages and measures impact, but it does **not** download texts into the library, draft clause text or create branches. A relevant norm becomes a correction through a development session with `scripts/legal/ingest.mjs` + `propose-change.mjs` (plan 5), approved in `/operador/legal`. Automatic drafting is a later plan, once the monitor has proven reliable.

## Global Constraints

- **Sources:** only official sources: El Peruano and gob.pe. Parse HTML with regular expressions and `node:` built-ins. No new dependencies.
- **Politeness:** at most 1 request per second to each source; a timeout of 20 s; a `User-Agent` of `DatosPrivados-monitor/1.0`. No credentials, no cookies.
- **What the pre-filter keeps** (spec §8):
  - issuers containing «JUSTICIA», «MINJUS», «AUTORIDAD NACIONAL DE PROTECCIÓN DE DATOS» or «DGTAIPD»;
  - keywords: «datos personales», «29733», «016-2024-JUS», «videovigilancia», «UIT»;
  - the number of every norm in `legal/library` (its `number` field).
  - Everything from the ANPD source passes.
- **AI calls:** only for pre-filtered items, never more than 30 per run. Each verdict is cached per item id. When AI is not configured, items stay `pendiente` and are retried the next day; the run never fails because of it.
- **Text:** user-facing text and emails in Spanish.
- **Schema:** `SCHEMA_VERSION` 18 → 19.
- **Re-audit:** never writes to `/var/www/datosprivados` or to git. It reads `/var/www/datosprivados/.env` only to pass `LEGAL_AUDIT_ENV_DIR`.

## Review Focus

1. **El Peruano changes its page.** If zero items are parsed on a weekday, or the expected markers are missing, record `structure_changed` and alert. Never report "no norms today" silently.
2. **The same norm on two runs or in two sources** (an extraordinary edition, ANPD repeating an El Peruano norm). It must give one item per source and external id, and one email per relevant item.
3. **The AI is unavailable or returns garbage.** The item stays `pendiente` for the next run, and the job still succeeds.
4. **A missed day** (server down). The next run fetches every date since the last success, up to 7 days back.
5. **The re-audit fails half-way** (no AI, a broken checkout). Exactly one email saying it failed, and the next quarter isn't blocked.

---

### Task 1: Storage and source health

**Files:** `src/lib/db.ts` (v19), create `src/lib/legal-watch/store.ts`, test `test/legal-watch-store.test.ts`

**Interfaces (produces):**
- Tables:
  - `legal_watch_items(id TEXT PK, source TEXT, external_id TEXT, url TEXT, pdf_url TEXT, issuer TEXT, title TEXT, summary TEXT, published_on TEXT, status TEXT DEFAULT 'nuevo', relevance TEXT, reason TEXT, norms TEXT, affected TEXT, notified_at TEXT, created_at TEXT, UNIQUE(source, external_id))`. `status` is one of `nuevo | descartado_filtro | pendiente | irrelevante | relevante | revisado`.
  - `legal_watch_sources(source TEXT PK, last_ok_at TEXT, last_error TEXT, last_error_at TEXT, failing_since TEXT, last_count INTEGER, structure_changed INTEGER DEFAULT 0)`.
- `type WatchItem` and `type NewWatchItem = Omit<WatchItem, "id" | "status" | ... >`.
- `upsertWatchItems(items: NewWatchItem[]): number` returns how many items were new (ignoring source + external_id duplicates).
- `recordSourceOk(source, count, now)`
- `recordSourceError(source, error, now)`
- `sourceHealth(now): Array<{ source; lastOkAt; failingDays; structureChanged }>`
- `listWatchItems(filter: { status?: string[] })`
- `setWatchStatus(id, status, extra?)`

- [ ] **Step 1: Failing tests:**
  - `"inserta una vez por fuente e id externo"`
  - `"la salud cuenta días seguidos fallando y se reinicia al primer éxito"`
  - `"migración v19 crea las tablas"`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(legal): almacén del monitor de normas`.

### Task 2: Source parsers with real fixtures

**Files:** create `src/lib/legal-watch/elperuano.ts`, `src/lib/legal-watch/anpd.ts`, fixtures `test/fixtures/legal-watch/elperuano-2026-11-12.html` (trimmed to 5 articles, one of them «Edición Extraordinaria») and `anpd-normas-legales.html` (5 entries); test `test/legal-watch-sources.test.ts`

**Interfaces:**
- `parseElPeruano(html: string): { items: NewWatchItem[]; structureOk: boolean }`
  - From each `<article class="edicionesoficiales_articulos">` it reads:
    - `issuer` from `<h4>`;
    - `title` and `url` from `<h5><a href>`;
    - `published_on` from «Fecha: dd/mm/yyyy», converted to ISO;
    - `summary` from the following `<p>`;
    - `pdf_url` = url + `/pdf`;
    - `external_id` from the url's last path segment (`2575001-1`).
  - `structureOk` is false when the marker `edicionesoficiales_articulos` is missing.
- `fetchElPeruanoDay(date: string /*YYYY-MM-DD*/, fetchImpl?): Promise<{ items; structureOk }>` does a POST to `/Normas/Filtro?dateparam=…` with `cddesde` and `cdhasta` set to `dd/mm/yyyy`.
- `parseAnpd(html): { items; structureOk }` reads the links `/institucion/anpd/normas-legales/<id>-<slug>` with their title and «d de mes de yyyy» date; `external_id` = `<id>`.
- `fetchAnpd(fetchImpl?)` reads the first page.

- [ ] **Step 1: Failing tests** on the fixtures:
  - `"El Peruano: 5 normas con emisor, título, fecha ISO, resumen y PDF"`
  - `"El Peruano: sin el marcador, structureOk = false"`
  - `"ANPD: 5 entradas con id, título y fecha"`
  - `"fetchElPeruanoDay envía cddesde y cdhasta dd/mm/yyyy"` (with a fake `fetchImpl`)
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(legal): lectura de El Peruano y de la ANPD`.

### Task 3: Pre-filter, AI triage and impact

**Files:** create `src/lib/legal-watch/triage.ts`, test `test/legal-watch-triage.test.ts`

**Interfaces:**
- `libraryNumbers(): string[]` returns the `number` of every norm in `legalLibrary()`.
- `prefilter(item: NewWatchItem): boolean` applies the Global Constraints rules; ANPD items always pass.
- `TRIAGE_SYSTEM` (Spanish). The model gets the item (issuer, title, summary) and the library index (norm ids, titles, numbers). It must answer only with `{"relevance":"irrelevant"|"relevant"|"amends","norms":["ley-29733"],"articles":["13.6"],"reason":"…"}`.
- `triage(item, deps: { call: typeof callLlm }): Promise<{ relevance; norms; articles; reason } | null>`, which returns null on an invalid reply.
- `impactOf(norms: string[], articles: string[]): { sources: Array<{ kind; source }>; documentKinds: string[]; customers: number }`.
  - It uses `affectedBy(norm, art)` from `src/legal/index-texts.ts`; with no articles, all of that norm's citations.
  - `customers` = active companies with at least one document of an affected kind.

- [ ] **Step 1: Failing tests:**
  - `"pasa el filtro: emisor MINJUS, palabra clave, número de norma de la biblioteca; no pasa: designación en MIDIS"`
  - `"triaje con respuesta válida dentro de texto; JSON inválido → null"`
  - `"impacto de ds-016-2024-jus 69: cláusulas de arco, tipos de documento y clientes activos"`
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(legal): filtro, triaje con IA e impacto de una norma nueva`.

### Task 4: The `legal-watch` job

**Files:** `src/lib/legal-watch/run.ts`; `src/lib/jobs.ts` (job `legal-watch`, `JOB_MAX_AGE_HOURS` 26); `src/lib/ops.ts` (alerts `legal_watch_failing` at 3 days, `legal_watch_structure`); `src/lib/mail-templates.ts` (`legal_watch_found`, essential: `title`, `issuer`, `reason`, `documents`, `customers`, `path`); `deploy/cron.d-datosprivados` (`--at 07:00`; check that the hour is free, as `test/deploy-artifacts.test.ts` requires); `docs/RUNBOOK.md`; test `test/legal-watch-run.test.ts`, `test/mail.test.ts`

**Interfaces:** `runLegalWatch({ now, fetchImpl?, call? }): Promise<{ fetched; nuevos; candidatos; relevantes; pendientes }>`. In order:
1. Dates from the day after `last_ok_at` (at most 7 days) up to today, for El Peruano; the first page for the ANPD. One second between requests.
2. Upsert the items. New items that don't pass the pre-filter become `descartado_filtro`; the rest become `pendiente`.
3. Triage the `pendiente` items (at most 30). Results: `irrelevant` becomes `irrelevante`; `relevant` or `amends` becomes `relevante`, saving `norms`, `reason` and the `affected` JSON from `impactOf`.
4. Email `legal_watch_found` to each `OPERATOR_EMAILS` once per item (`notified_at`, dedupe `legal-watch:<id>:<email>`).
5. Record each source's health; a source error doesn't stop the other source.

- [ ] **Step 1: Failing tests** with fake fetch and call:
  - `"ejecuta de punta a punta: 1 relevante, 1 irrelevante, 3 descartados; un correo por operador"`
  - `"dos corridas no duplican ítems ni correos"`
  - `"un día sin correr: la siguiente pide cada fecha desde el último éxito (máx. 7)"`
  - `"IA caída: quedan pendientes y la tarea termina bien"`
  - `"El Peruano falla 3 días: alerta legal_watch_failing; estructura distinta: legal_watch_structure"`
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS; the full suite is green except the installed-cron drift check.
- [ ] **Step 5: Commit** `feat(legal): tarea diaria legal-watch con aviso al fundador`.

### Task 5: `/operador/legal` shows what the monitor found

**Files:** `src/app/operador/legal/page.tsx` (new section «Normas detectadas» above the changes list); `src/app/operador/legal/watch-actions.ts` (`markWatchItemAction(formData)` → `revisado` or `irrelevante`, operator only); test `test/legal-watch-pages.test.ts`; `test/route-guards.test.ts` stays green.

**What the section shows:**
- The `relevante` items, newest first. For each:
  - issuer, title with a link to the official page, date and the AI's reason;
  - impact: the document kinds affected and «N clientes»;
  - buttons «Revisado» and «No aplica».
- A source-health line: «El Peruano: última lectura hace 3 h · ANPD: …», shown in red when failing or when the structure changed.

- [ ] **Step 1: Failing tests:**
  - `"muestra los relevantes con su impacto y oculta los revisados"`
  - `"marcar exige operador"`
  - `"la salud de las fuentes se ve y se marca en rojo si falla"`
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(legal): normas detectadas en /operador/legal`.

### Task 6: Quarterly re-audit

**Files:**
- Create `deploy/datosprivados-reaudit.sh`. It runs as root:
  1. a `flock`;
  2. clone or fetch into `/var/lib/datosprivados/reaudit/repo` and `git checkout -f origin/master`;
  3. `pnpm install --frozen-lockfile`;
  4. `LEGAL_AUDIT_ENV_DIR=/var/www/datosprivados pnpm legal:audit` with a 2-hour timeout;
  5. read `legal/audit/<date>.json`;
  6. POST `{ ok, errors, review, aiFailures, date }` (or `{ ok:false, error }`) to `/api/legal/reaudit` with the `CRON_SECRET` bearer.
- Create `src/app/api/legal/reaudit/route.ts`: it emails `legal_reaudit` (essential) to each operator, once per date.
- Add `deploy/cron.d-datosprivados`: `30 6 1-7 1,4,7,10 1 root /usr/local/bin/datosprivados-reaudit`, i.e. the first Monday of each quarter. The `1-7` day range combined with Monday works because cron joins day-of-month and day-of-week with OR, so the script checks itself that the date is in days 1–7 *and* a Monday.
- Update `test/deploy-artifacts.test.ts` (drift pair for the script), `test/route-guards.test.ts` (public route list with its reason), `docs/RUNBOOK.md`.
- Test: `test/reaudit.test.ts`.

- [ ] **Step 1: Failing tests:**
  - `"el endpoint exige el secreto, avisa una vez por fecha y cuenta errores"`
  - `"el script sale sin hacer nada si no es el primer lunes"` (bash with a fake date via `REAUDIT_TODAY`)
  - `"el script avisa ok:false si la auditoría falla"` (with `REAUDIT_CMD=false`)
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(legal): re-auditoría trimestral automática`.

### Task 7: Ship

- [ ] **Checks:** full suite and chromium E2E on the server; PR; merge without waiting for GitHub (pre-launch rule).
- [ ] **Install and deploy:** install `/usr/local/bin/datosprivados-reaudit` and the new cron table (backing up the old one), then deploy.
- [ ] **Smoke test:** run `datosprivados-cron legal-watch` once by hand. It should read today from both sources, `/operador/legal` should show the source health, and no error should appear. Report how many items were read, filtered and triaged.
- [ ] **Tell the founder:** the triage needs `OPENAI_MODEL` in production; without it, items stay `pendiente`.
