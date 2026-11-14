# Legal engine, plan 1 of 6: combination fixtures, safety harness and clause-library migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 14 document generators of `src/lib/documents.ts` as a clause library (approach B) with every generated text provably byte-identical to today's, across all 63 business types and all relevant company combinations.

**Architecture:** A frozen copy of today's generators (`src/legal/legacy/`) acts as the oracle while each document kind is moved into clause records under `src/legal/documents/`. A parity test renders every kind for every fixture with both engines and fails on the first differing line. When all 14 kinds are migrated, the oracle is replaced by permanent hash and text snapshots, and the legacy copy is deleted.

**Tech Stack:** TypeScript, Next.js (see `node_modules/next/dist/docs/` before touching app code, per `AGENTS.md`), vitest (`pnpm vitest run`), Node 22, pnpm 10.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` (§3 approach B, §4.3 clause library, §4.4 combination matrix, §5 safe migration).

**Plan sequence** (each its own plan, written after the previous one ships):
1. **This plan:** fixtures, harness, clause-library migration.
2. Law library, `facts.ts`, citations on clauses, family profiles and non-document modules; citation lint; rule checks; known-failures baseline (spec §4.1, §4.2, §4.3 lint, §6).
3. Approval flow: `legal_changes`, `/operador/legal` dashboard, `repository_dispatch` → GitHub Actions apply/test/auto-merge, pull-based deploy (spec §8 approval, §10a).
4. Correctness audit with founder-approved fixes and the lawyer list (spec §7).
5. `legal-watch` monitor and quarterly re-audit (spec §8, §9).
6. Run-time AI output check and the developer skill (spec §4.5, §11).

## Global Constraints

- **Zero content change.** Every text produced by `buildDocument()` and by every exported `build*` function must stay byte-identical to the baseline. No exceptions, no snapshot updates in this plan.
- **Out of scope here (plan 2):** the family profiles in `sector-legal.ts`, and the snapshots of the non-document modules (help, guides, FAQ, AI prompt, ARCO letters, incident texts). Plan 2 touches those files, so it snapshots them before changing them.
- `TEMPLATE_VERSIONS` in `src/lib/document-freshness.ts` is **not** bumped.
- `src/lib/sector-legal.ts`, `src/lib/sectors.ts`, `src/lib/bank-presets.ts` and `src/lib/provider-catalog.ts` are not edited in this plan.
- Every export of `src/lib/documents.ts` keeps its name and signature (`legalBasisLabel`, `appUrl`, `companyShortId`, `companyIdentityLine`, `controllerParagraph`, and the 14 `build*` functions); its 20+ importers are not edited.
- Work happens on the **contabo server**, in a git worktree outside the deploy folder: `/root/work/motor-legal` on branch `feat/motor-legal-1`. Never edit, build or switch branches in `/var/www/datosprivados`. Push the branch to GitHub after each task; the founder pulls locally.
- Code comments in Spanish, matching the project's style.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **A company whose sector label is not in `SECTORS`** (real data has `sector = "software"`): it falls back to the `BASE` profile and must render exactly as before. Pinned in Task 1 fixtures.
2. **Empty, null or whitespace-only company fields** (address, website, `complaints_url`, `dpo_name`, `dpo_email`, `sales_band`): generators emit placeholders such as `[enlace de tu Libro de Reclamaciones virtual]`, and these must survive the move. Pinned in Task 1 fixtures.
3. **Markdown-breaking characters in company data** (`|`, `*`, `«»`, `&`, accents, `Ñ`) inside table rows: the clause must not escape or reorder them. Pinned in Task 1 fixtures.
4. **Banks with status `cancelado` or `borrador`, and an AI/voice bank** (triggers `usesAutomation`): filtering and the automation paragraphs must stay identical. Pinned in Task 1 fixtures.
5. **Providers with country `"No sé"` and foreign providers**: the transfer wording (`país por verificar`) must stay identical. Pinned in Task 1 fixtures.

---

### Task 1: Server worktree and the combination fixtures

**Files:**
- Create: `test/legal/fixtures.ts`
- Create: `test/legal/pairwise.ts`
- Test: `test/legal/fixtures.test.ts`

**Interfaces:**
- Consumes: `SECTORS` (`src/lib/sectors.ts`), `getBankPreset` (`src/lib/bank-presets.ts`), types `Company`, `DataBank`, `Provider` (`src/lib/db.ts`), `SALES_BANDS` (`src/lib/sector-legal.ts`).
- Produces:
  - `pairwise<T extends Record<string, readonly unknown[]>>(dims: T): Array<{ [K in keyof T]: T[K][number] }>`: deterministic all-pairs covering array (greedy), same output on every run.
  - `type LegalFixture = { id: string; company: Company; banks: DataBank[]; providers: Provider[] }`
  - `legalFixtures(): LegalFixture[]`: every entry of `SECTORS` plus one company with `sector = "software"` (not a label), each crossed with every row of `pairwise(COMPANY_DIMENSIONS)`.
  - `FIXED_NOW = "2026-11-13T15:00:00.000Z"`, `FIXED_APP_URL = "https://datosprivados.pe"`.

`COMPANY_DIMENSIONS` (exact values):
- `entity`: `"peruana"`, `"extranjera"`
- `name`: `"Comercial Andina S.A.C."`, `"Pérez & Hijos | «Ñandú» *Express* E.I.R.L."`
- `web`: `""`, `"https://ejemplo.pe"`
- `complaints`: `""`, `"   "`, `"https://ejemplo.pe/reclamos"`
- `dpo`: `"none"` (`dpo_name` and `dpo_email` null), `"filled"` (`"Ana Torres"`, `"privacidad@ejemplo.pe"`)
- `salesBand`: `""` plus every `id` in `SALES_BANDS`
- `banks`: `"sector"` (the sector's preset banks, status `registrado`), `"mixed"` (presets with the first one `cancelado`, one extra `borrador` bank named `"Grabaciones de voz analizadas con IA"`), `"none"`
- `providers`: `"none"`, `"peru"` (one provider country `"Perú"`), `"foreign"` (one `"Perú"`, one `"Estados Unidos"`, one `"No sé"`)

- [ ] **Step 1: Create the worktree and install**

Run on contabo:
```bash
cd /var/www/datosprivados && git fetch origin && git worktree add -b feat/motor-legal-1 /root/work/motor-legal origin/master
cd /root/work/motor-legal && pnpm install --frozen-lockfile && pnpm vitest run test/documents-versions.test.ts
```
Expected: install succeeds, existing test passes.

- [ ] **Step 2: Write the failing tests** in `test/legal/fixtures.test.ts`

```ts
it("pairwise covers every pair of values", () => {
  const dims = { a: [1, 2, 3], b: ["x", "y"], c: [true, false] } as const;
  const rows = pairwise(dims);
  for (const [k1, k2] of [["a","b"],["a","c"],["b","c"]] as const)
    for (const v1 of dims[k1]) for (const v2 of dims[k2])
      expect(rows.some(r => r[k1] === v1 && r[k2] === v2)).toBe(true);
});
it("pairwise is deterministic", () => { expect(pairwise(D)).toEqual(pairwise(D)); });
it("every sector plus the unknown label is covered", () => {
  const sectors = new Set(legalFixtures().map(f => f.company.sector));
  for (const s of SECTORS) expect(sectors.has(s.label)).toBe(true);
  expect(sectors.has("software")).toBe(true);
});
it("fixture ids are unique", () => { const ids = legalFixtures().map(f => f.id); expect(new Set(ids).size).toBe(ids.length); });
it("includes the review-focus cases", () => {
  const all = legalFixtures();
  expect(all.some(f => f.company.complaints_url === "   ")).toBe(true);
  expect(all.some(f => f.company.dpo_name === null)).toBe(true);
  expect(all.some(f => f.company.name.includes("|"))).toBe(true);
  expect(all.some(f => f.banks.some(b => b.status === "cancelado"))).toBe(true);
  expect(all.some(f => f.banks.some(b => /voz analizadas con IA/.test(b.name)))).toBe(true);
  expect(all.some(f => f.providers.some(p => p.country === "No sé"))).toBe(true);
});
```

- [ ] **Step 2b: Run and see them fail**

Run: `pnpm vitest run test/legal/fixtures.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `pairwise` in `test/legal/pairwise.ts` and `legalFixtures` in `test/legal/fixtures.ts`**

Fixture ids are `${sectorId}__${rowIndex}` (`"software"` uses `unknown`). Every `Company` field is set explicitly. Use the column list of `companies`, fixed dates from `FIXED_NOW`, `slug` from the id, and every other optional field `null` or `""` as the real DB default. Banks are built from `getBankPreset(id)` fields.

- [ ] **Step 4: Run and see them pass**

Run: `pnpm vitest run test/legal/fixtures.test.ts`
Expected: PASS. Also print `legalFixtures().length` once in the test output and record the number in the commit message.

- [ ] **Step 5: Commit and push**

```bash
git add test/legal && git commit -m "test(legal): fixtures de combinaciones para el motor legal" && git push -u origin feat/motor-legal-1
```

---

### Task 2: Legacy oracle, parity test and baseline hashes

**Files:**
- Create: `src/legal/legacy/documents.ts` (verbatim copy of `src/lib/documents.ts` at `origin/master`, relative imports rewritten to `@/lib/...`; header comment: frozen copy, delete in Task 7)
- Create: `test/legal/render-all.ts`
- Create: `test/legal/parity.test.ts`
- Create: `test/legal/baseline-hashes.json` (generated)
- Create: `test/legal/baseline.test.ts`

**Interfaces:**
- Consumes: `legalFixtures`, `FIXED_NOW`, `FIXED_APP_URL` (Task 1); `buildDocument` (`src/lib/document-catalog.ts`); `DocumentKind` (`src/lib/db.ts`).
- Produces:
  - `legacyBuildDocument(kind: DocumentKind, company: Company, banks: DataBank[], providers?: Provider[]): string`, exported from `src/legal/legacy/documents.ts` (a copy of today's switch in `buildDocument`).
  - The following, all in `test/legal/render-all.ts`:
  - `DOCUMENT_KINDS: DocumentKind[]`: the 14 kinds, in `buildDocument` switch order.
  - `withFrozenWorld<T>(fn: () => T): T`: sets `vi.setSystemTime(FIXED_NOW)` and `vi.stubEnv("NEXT_PUBLIC_APP_URL", FIXED_APP_URL)`, runs `fn`, restores both.
  - `firstDiff(expected: string, actual: string): string`: returns `"line N\n- <expected line>\n+ <actual line>"` or `""` if equal.
  - `renderAll(build: typeof buildDocument): Map<string, string>`: key `${fixture.id}|${kind}`, every render inside `withFrozenWorld`.

- [ ] **Step 1: Write `parity.test.ts`**

```ts
it.each(DOCUMENT_KINDS)("%s: new engine equals legacy for every fixture", (kind) => {
  withFrozenWorld(() => {
    for (const f of legalFixtures()) {
      const a = legacyBuildDocument(kind, f.company, f.banks, f.providers);
      const b = buildDocument(kind, f.company, f.banks, f.providers);
      if (a !== b) throw new Error(`${f.id} ${kind}\n${firstDiff(a, b)}`);
    }
  });
});
it("firstDiff names the first differing line", () => {
  expect(firstDiff("a\nb\nc", "a\nX\nc")).toBe("line 2\n- b\n+ X");
  expect(firstDiff("same", "same")).toBe("");
});
```

- [ ] **Step 2: Write `baseline.test.ts`**

Assert that the sha256 of every `renderAll(buildDocument)` entry equals `test/legal/baseline-hashes.json`. When the file is missing and `WRITE_LEGAL_BASELINE=1`, write it instead. This guards against a change in shared data (`sector-legal.ts`), which the legacy copy would follow silently.

- [ ] **Step 3: Generate the baseline once, on untouched code**

Run: `WRITE_LEGAL_BASELINE=1 pnpm vitest run test/legal/baseline.test.ts && pnpm vitest run test/legal`
Expected: hashes file written, then parity and baseline PASS (both engines are still the same code).

- [ ] **Step 4: Prove the harness catches a change**

Temporarily add one character to a sentence in `buildCookiePolicy` in `src/lib/documents.ts`. Run `pnpm vitest run test/legal`. Expected: parity FAIL showing `line N` with that sentence, baseline FAIL. Revert with `git checkout src/lib/documents.ts`, rerun, expected PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/legal/legacy test/legal && git commit -m "test(legal): oráculo legacy, paridad y huellas base de los 14 documentos" && git push
```

---

### Task 3: Clause engine

**Files:**
- Create: `src/legal/types.ts`
- Create: `src/legal/context.ts`
- Create: `src/legal/render.ts`
- Create: `src/legal/shared.ts` (helpers moved out of `documents.ts`: `LEGAL_BASIS`, `legalBasisLabel`, `appUrl`, `sentence`, `isForeign`, `complaintsLink`, `AUTOMATED_BANK`, `usesAutomation`, `COUNTRY_LABEL`, `foreignProviders`, `categoryLabel`, `bullets`, `table`, `companyShortId`, `companyIdentityLine`, `controllerParagraph`, bodies unchanged)
- Modify: `src/lib/documents.ts` (import the helpers from `@/legal/shared` and re-export the public ones; delete the moved bodies)
- Test: `test/legal/engine.test.ts`

**Interfaces:**
- Produces (`src/legal/types.ts`):
  ```ts
  export type Citation = { norm: string; art: string; claim?: string };
  export type LegalContext = {
    company: Company; banks: DataBank[]; providers: Provider[];
    profile: SectorLegalProfile; date: string; // formatDate(now, "long")
  };
  export type Clause = {
    id: string;                                   // "<kind>.<section>.<name>", unique
    when?: (ctx: LegalContext) => boolean;        // absent = always
    text: (ctx: LegalContext) => string;          // exact legacy wording
    cites: Citation[];                            // [] in plan 1; filled in plan 2
    nonLegal?: string;
  };
  export type DocumentSpec = { kind: DocumentKind; join: string; clauses: Clause[] };
  ```
- Produces: `legalContext(company: Company, banks: DataBank[], providers: Provider[]): LegalContext` (`src/legal/context.ts`), with `profile = sectorLegalProfile(company)` and `date = formatDate(new Date().toISOString(), "long")`.
- Produces: `renderDocument(spec: DocumentSpec, ctx: LegalContext): string` (`src/legal/render.ts`): clauses whose `when` passes, in order, `text(ctx)` joined with `spec.join`. It throws `Error("clause <id> rendered empty text")` if a selected clause returns `""`.

- [ ] **Step 1: Write the failing tests**

```ts
const ctx = legalContext(fixture.company, fixture.banks, fixture.providers);
it("renders selected clauses in order with the spec separator", () => {
  const spec: DocumentSpec = { kind: "aviso", join: "\n\n", clauses: [
    { id: "t.a", text: () => "A", cites: [] },
    { id: "t.b", when: () => false, text: () => "B", cites: [] },
    { id: "t.c", text: () => "C", cites: [] } ] };
  expect(renderDocument(spec, ctx)).toBe("A\n\nC");
});
it("refuses a selected clause with empty text", () => {
  expect(() => renderDocument({ kind: "aviso", join: "\n", clauses: [{ id: "t.e", text: () => "", cites: [] }] }, ctx))
    .toThrow("clause t.e rendered empty text");
});
```

- [ ] **Step 2: Run and see them fail**: `pnpm vitest run test/legal/engine.test.ts`. Expected: FAIL, modules missing.
- [ ] **Step 3: Implement** `types.ts`, `context.ts`, `render.ts`, and move the helpers into `shared.ts`.
- [ ] **Step 4: Run the engine tests and the whole legal suite**: `pnpm vitest run test/legal`. Expected: PASS, parity unchanged.
- [ ] **Step 5: Commit and push**: `feat(legal): motor de cláusulas (tipos, contexto, render) y utilidades compartidas`

---

### Tasks 4–6: Migrate the 14 kinds

The same procedure applies to every kind:

1. Create `src/legal/documents/<kind>.ts` exporting `export const <kind>Spec: DocumentSpec`.
2. Split the legacy generator into clauses at its natural boundaries: headings, paragraphs, conditional blocks. Each `if` in the generator becomes a `when`. Text is moved verbatim, and template literals keep their exact whitespace. A value the generator computes once and uses in several places becomes a small function in the same file, called from each clause.
3. Choose `join` so that `renderDocument` reproduces the legacy output exactly. If a generator uses mixed separators, a clause carries its own leading or trailing newlines and `join` is `""`.
4. Make the exported `build<X>(...)` in `src/lib/documents.ts` return `renderDocument(<kind>Spec, legalContext(company, banks ?? [], providers ?? []))`, keeping its signature.
5. Run `pnpm vitest run test/legal`. Expected: parity and baseline PASS for every kind. A failure prints `fixture kind / line N / - expected / + actual`: fix the clause, never the snapshot.
6. Commit and push, one commit per kind: `refactor(legal): <kind> como biblioteca de cláusulas (salida idéntica)`.

Clause ids follow `<kind>.<section>.<name>`. Task 7 checks they are unique.

#### Task 4: Short and public documents
- [ ] `aviso` (`buildShortNotices`)
- [ ] `reclamaciones` (`buildComplaintBook`)
- [ ] `cookies` (`buildCookiePolicy`)
- [ ] `consentimiento` (`buildConsentTexts`: one clause group per section A–E)
- [ ] `politica` (`buildPrivacyPolicy`)

#### Task 5: Internal documents
- [ ] `seguridad` (`buildSecurityDocument`)
- [ ] `retencion` (`buildRetentionPolicy`)
- [ ] `clausulas` (`buildInternalClauses`, including the CCTV sign)
- [ ] `trabajadores` (`buildWorkerNotice`)
- [ ] `arco` (`buildArcoProcedure`)

#### Task 6: Contract and analysis documents
- [ ] `terminos` (`buildTermsOfService`; the private `buildSalesTerms` becomes clauses with `when: ctx => ctx.profile.terms === "venta"`)
- [ ] `encargo` (`buildProcessingAgreement`)
- [ ] `eipd` (`buildImpactAssessment`)
- [ ] `sectorial` (`buildSectorProtocol`)

Each task ends with `pnpm vitest run` (the whole suite, not only `test/legal`). Expected: PASS.

---

### Task 7: Registry, permanent snapshots and removal of the legacy copy

**Files:**
- Create: `src/legal/registry.ts`
- Create: `test/legal/__snapshots__/<family>/<kind>.md` (generated, 26 × 14 files)
- Create: `test/legal/snapshots.test.ts`
- Modify: `test/legal/baseline.test.ts` (keep the hash check, now the permanent guard)
- Delete: `src/legal/legacy/`, `test/legal/parity.test.ts`
- Modify: `src/lib/documents.ts` (now only re-exports and the 14 thin `build*` functions)

**Interfaces:**
- Produces: `SPECS: Record<DocumentKind, DocumentSpec>`, `allClauses(): Clause[]` (`src/legal/registry.ts`). Plan 2 consumes these to attach citations and run the lint.
- Produces: `representativeFixtures(): LegalFixture[]` in `test/legal/fixtures.ts`: for each of the 26 families, the first fixture whose profile has that family, with the richest dimension row (`banks: "mixed"`, `providers: "foreign"`, `dpo: "filled"`).

- [ ] **Step 1: Write the failing tests**

```ts
it("every kind has a spec", () => { for (const k of DOCUMENT_KINDS) expect(SPECS[k].kind).toBe(k); });
it("clause ids are unique", () => { const ids = allClauses().map(c => c.id); expect(new Set(ids).size).toBe(ids.length); });
it("clause ids follow <kind>.<section>.<name>", () => {
  for (const c of allClauses()) expect(c.id).toMatch(/^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/);
});
it.each(representativeFixtures().flatMap(f => DOCUMENT_KINDS.map(k => [f, k] as const)))(
  "snapshot %#", async (f, kind) => {
    const text = withFrozenWorld(() => buildDocument(kind, f.company, f.banks, f.providers));
    await expect(text).toMatchFileSnapshot(`./__snapshots__/${sectorLegalProfile(f.company).family}/${kind}.md`);
  });
```

- [ ] **Step 2: Run and see the registry tests fail**: `pnpm vitest run test/legal/snapshots.test.ts`. Expected: FAIL, `registry` missing.
- [ ] **Step 3: Implement `registry.ts`**, then generate the text snapshots once with `pnpm vitest run test/legal/snapshots.test.ts -u`. Parity is still green at this point, so these texts equal the legacy output.
- [ ] **Step 4: Delete the legacy copy and `parity.test.ts`**. Add a header comment to `snapshots.test.ts` and `baseline.test.ts`: updating them is allowed only with a logged reason and a `TEMPLATE_VERSIONS` bump (spec §5; plan 3 automates it).
- [ ] **Step 5: Full verification**

Run: `pnpm vitest run && pnpm typecheck && pnpm lint && pnpm build` (in the worktree only, never in the deploy folder)
Expected: all PASS; `git grep -n "legacy" src test` returns nothing.

- [ ] **Step 6: Commit, push, open the pull request**

On contabo:
```bash
git add -A src/legal src/lib/documents.ts test/legal && git commit -m "refactor(legal): registro de cláusulas, instantáneas permanentes y retiro del oráculo legacy" && git push
```
The server has no `gh`, so open the PR from the PC, where `gh` is logged in as `janymil`:
```bash
gh pr create --repo janymil/datosprivados --base master --head feat/motor-legal-1 --title "Motor legal 1/6: biblioteca de cláusulas con salida idéntica" --body "<summary + fixture count + test results>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Then bind the PR with the ccd_pr tools (`get_status`, `bind_pr`).
The founder reviews and merges. Then deploy from `/var/www/datosprivados` with `git pull && bash scripts/deploy.sh --check && bash scripts/deploy.sh`, and on the PC: `git pull`. Remove the worktree with `git worktree remove /root/work/motor-legal`.
