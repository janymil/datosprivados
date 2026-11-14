# Legal engine, plan 2 of 7: law library, citations on every clause, citation lint and rule checks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every clause of the 14 documents carries, as data, the exact articles its text cites. A lint proves text and citations agree for every combination. The core laws exist in the repo as official text split by article. Today's mismatches are recorded in a known-failures list that can only shrink.

**Architecture:**
- A law library (`legal/library/<norm>/`) holds article-level text extracted from official PDFs, with provenance (URL, sha256, retrieval date).
- A citation parser reads the "art. N del DS…" mentions out of rendered text.
- Clause `cites` are filled from what each clause actually renders across all fixtures. A lint then keeps text and `cites` in lockstep, and checks that every cited article exists in the library.
- Rule checks (spec §6) run over the fixture matrix.
- Content still does not change: every current error goes to `legal/known-failures.json` for the founder-approved audit (plan 5).

**Tech Stack:** TypeScript, vitest, Node 22, `pdftotext` (poppler, present on the server), `curl`.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` (§4.1 law library, §4.3 citation lint and known-failures baseline, §6 rule checks). Builds on plan 1 (`docs/superpowers/plans/2026-11-13-motor-legal-1-migracion.md`; PR janymil/datosprivados#9).

**Plan sequence (updated):**
1. Clause library (PR #9).
2. **This plan:** law library, citations, lint, rule checks.
3. `facts.ts` and the non-document modules (help, guides, FAQ, AI prompt, ARCO letters, incident texts, fine calculator): snapshots first, then facts and citations.
4. Approval flow: `/operador/legal`, one-click approval through GitHub Actions, pull-based deploy.
5. Correctness audit with founder-approved fixes.
6. `legal-watch` monitor and quarterly re-audit.
7. Run-time AI output check and the developer skill.

Plan 3 is split out of the old plan 2 because the non-document modules are about 30 files of their own.

## Global Constraints

- **Zero content change.** `test/legal/baseline.test.ts` (28,672 hashes) and `test/legal/snapshots.test.ts` (364 files) must stay green with no hash or snapshot update. `TEMPLATE_VERSIONS` is not bumped.
- **Official sources only.** No blogs, no law-firm summaries. A norm without an official text is a stub with `status: "no-verificada"`.
- Downloaded PDFs are not committed: they are 5 MB or more each, and the repo is public. Commit `norm.json` (with `officialUrl` and `sourceSha256`) and `articles.json`. Keep the PDFs in `/var/lib/datosprivados/legal-sources/<norm>/` on the server.
- Work on contabo in worktree `/root/work/motor-legal-2`, on branch `feat/motor-legal-2` cut from `feat/motor-legal-1` (stacked on PR #9; retarget to `master` once #9 merges). Never touch `/var/www/datosprivados`. Push after each task.
- Spanish code comments. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Roman-numeral articles of the Título Preliminar** (`Artículo III. Definiciones`, item 6 = datos sensibles). They must be addressable as `III.6`. Today's text says "art. 2.6", which must be reported as a known failure (Arabic article 2 exists but is about consent), not silently accepted. Pinned in Tasks 3 and 6.
2. **Bare article mentions with no norm named** ("(art. 87)", "(arts. 46 a 51)"). They resolve to the clause's default norm, and ranges and "y" lists expand to every article. Pinned in Task 4.
3. **The same article number in two norms** (art. 39 of Ley 29733 "Sanciones" vs. art. 39 of the old 2013 Reglamento, which sits in the same PDF). The splitter must keep only the target norm's articles. Pinned in Task 3.
4. **PDF ligatures and line breaks** (`ﬁ`, hyphenated words, an article title split over two lines). Text is NFKC-normalised and titles joined. Pinned in Task 3.
5. **A citation whose text only appears in a rare branch** (a fintech notice, the rrhh line, empty address). `cites` must be the union over all fixtures, and a cite no fixture produces is flagged as stale. Pinned in Tasks 5 and 6.

---

### Task 1: Split whole-paragraph alternatives into `when` clauses

**Files:**
- Modify: `src/legal/documents/politica.ts` (clauses `.6`, `.8`, `.10`), `aviso.ts` (`.b`), `consentimiento.ts` (`.d`), `clausulas.ts` (`.d`), `terminos.ts` (`plataforma-5`), `encargo.ts` (`.b`, `.d`), `sectorial.ts` (`.2`, `.7`)
- Test: existing `test/legal/baseline.test.ts`, `test/legal/snapshots.test.ts`

**Interfaces:**
- Produces: clause ids of the form `<kind>.<section>-<variant>.<name>` for the split pieces. Examples:
  - `politica.6-transferencia.si` and `politica.6-transferencia.no`;
  - `politica.8-automatizado.si` and `politica.8-automatizado.no`;
  - `politica.10-sensibles.si` and `politica.10-sensibles.no`;
  - `politica.10-menores.si` and `politica.10-menores.no`.

  The heading stays in its own clause (`politica.6.encabezado`). All ids still match `^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$`.

Rule: split only alternatives that are whole paragraphs separated by a blank line. Inline fragments inside a sentence stay inside their clause, and their citations become the union (Task 5).

- [ ] **Step 1:** For each listed clause, replace the ternary with sibling clauses carrying `when`, keeping `join: "\n\n"`. A text that ends without a blank line (e.g. `politica.6`'s `${providerTable}` suffix) stays attached to the paragraph it follows.
- [ ] **Step 2:** Run `pnpm vitest run test/legal`. Expected: PASS with no snapshot written (`git status test/legal/__snapshots__` clean) and the hashes unchanged.
- [ ] **Step 3:** Commit and push: `refactor(legal): alternativas de párrafo como cláusulas con when (salida idéntica)`.

---

### Task 2: Law library format and loader

**Files:**
- Create: `src/legal/library/types.ts`, `src/legal/library/index.ts`
- Create: `legal/library/README.md` (format, provenance rules, how to add a norm)
- Test: `test/legal/library.test.ts`

**Interfaces:**
- Produces (`src/legal/library/types.ts`):
  ```ts
  export type NormStatus = "vigente" | "modificada" | "derogada" | "no-verificada";
  export type Norm = {
    id: string;              // "ds-016-2024-jus", "ley-29733", "ley-29571", ...
    title: string; type: "ley" | "decreto-supremo" | "decreto-legislativo" | "directiva" | "resolucion" | "norma-tecnica" | "codigo";
    number: string;          // "016-2024-JUS"
    publishedAt: string | null;   // YYYY-MM-DD
    officialUrl: string | null;
    sourceSha256: string | null;
    retrievedAt: string | null;
    status: NormStatus;
    consolidated: boolean;   // false = original text; later amendments not merged
    amendedBy: string[];     // norm ids
    aliases: string[];       // exact spellings used in our texts: "DS N.° 016-2024-JUS", "Decreto Supremo N.° 016-2024-JUS", "Reglamento"
  };
  export type Article = { num: string; title: string; text: string; sha256: string }; // num "34", "26", "III", "1DCF"
  ```
- Produces (`src/legal/library/index.ts`):
  - `NORMS: Record<string, Norm>`, loaded from `legal/library/*/norm.json` at import time.
  - `articlesOf(normId: string): Article[]`.
  - `findArticle(normId: string, ref: string): { article: Article; item?: string } | null`, where `ref` is `"26.5"`, `"III.6"`, `"14"` or `"46.1.c"`. The first segment is the article; the rest is an item path and is not validated against the text in this plan.
  - `normByAlias(alias: string): Norm | undefined`.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it("every norm.json is valid and its id equals its folder", ...)
  it("aliases are unique across norms", ...)
  it("findArticle splits article and item", () => {
    // with a fixture norm in test/legal/fixtures/library/demo/
    expect(findArticle("demo", "26.5")?.article.num).toBe("26");
    expect(findArticle("demo", "26.5")?.item).toBe("5");
    expect(findArticle("demo", "III.6")?.article.num).toBe("III");
    expect(findArticle("demo", "99")).toBeNull();
  });
  it("a no-verificada norm has no articles and findArticle returns null", ...)
  ```
  Use a `LEGAL_LIBRARY_DIR` env override so the tests can point at `test/legal/fixtures/library/`.
- [ ] **Step 2:** Run `pnpm vitest run test/legal/library.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3:** Implement `types.ts` and `index.ts` (read JSON with `fs` at module load; the files are tiny).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit and push: `feat(legal): formato y cargador de la biblioteca de normas`.

---

### Task 3: Ingest the core norms from official PDFs

**Files:**
- Create: `scripts/legal/ingest.mjs` (CLI: `node scripts/legal/ingest.mjs <normId>`)
- Create: `scripts/legal/sources.json` (per norm: `officialUrl`, `startMarker`, `endMarker`, `numbering`)
- Create: `legal/library/ds-016-2024-jus/{norm.json,articles.json}`, `legal/library/ley-29733/…`, plus stubs (below)
- Test: `test/legal/ingest.test.ts` (splitter unit tests on text samples) and `test/legal/library-core.test.ts` (spot checks on real data)

**Interfaces:**
- Produces: `splitArticles(text: string, opts: { start: RegExp; end?: RegExp }): Article[]`, exported from `scripts/legal/split.mjs` and imported by both the CLI and the tests.
  - It recognises `Artículo <arabic>.`, `Artículo <arabic>.-` and `Artículo <ROMAN>.`.
  - It joins a title that continues on the next line, up to the first line that starts a sentence.
  - It NFKC-normalises the text and removes hyphenation at line ends.
  - It ignores everything before `start` and after `end`.
- Consumes: Task 2 types.

Core norms and sources:
- `ds-016-2024-jus`: `https://www3.congreso.gob.pe/Docs/DGP/DIDP/files/ds_016-2024-jus.pdf`. `start` = the second `REGLAMENTO DE LA LEY Nº 29733`; the first four "Artículo" entries belong to the approving decree. Aliases: `"DS N.° 016-2024-JUS"`, `"DS 016-2024-JUS"`, `"Decreto Supremo N.° 016-2024-JUS"`, `"Reglamento"`.
- `ley-29733`: `https://cdn.www.gob.pe/uploads/document/file/272360/Ley%20N%C2%BA%2029733.pdf.pdf`. Keep only the Law, up to the end of its final provisions. The same PDF continues with the 2013 Reglamento (its own art. 39, "Seguridad…"), which must be cut. `consolidated: false`; list the known amending norms in `amendedBy` as stubs.
- Stubs (`status: "no-verificada"`, no articles), one per norm the clause texts mention: every other norm id produced by `normByAlias` during Task 5. That includes Ley 29571, DS 011-2011-PCM, Directiva 01-2020-JUS/DGTAIPD, DS 003-2013-JUS, Código Civil, the sector norms in `sector-legal.ts`, D. Leg. 1623 and Opinión Consultiva 045-2021. Each official text is added later through this same script.

- [ ] **Step 1: Write the failing splitter tests** with inline samples: Roman and Arabic headings; the `.-` style; a title wrapped over two lines; `ﬁ` → `fi`; a decree prefix before `start` that is ignored; an `end` cut.
- [ ] **Step 2:** Run `pnpm vitest run test/legal/ingest.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `split.mjs` and `ingest.mjs`. Download with `curl`, compute sha256, store the PDF under `/var/lib/datosprivados/legal-sources/<id>/source.pdf`, run `pdftotext -enc UTF-8` (no `-layout`), split, and write `articles.json` and `norm.json`.
- [ ] **Step 4:** Run the ingestion: `node scripts/legal/ingest.mjs ds-016-2024-jus && node scripts/legal/ingest.mjs ley-29733`.
- [ ] **Step 5: Write `library-core.test.ts`** with spot checks taken from the real texts:
  - `ds-016-2024-jus`:
    - article `"34"` title matches `/incidente de seguridad/i`;
    - `"69"` matches `/plazos de respuesta/i`;
    - `"8"` matches `/datos sensibles/i`;
    - `"III"` title matches `/definiciones/i`, and its text contains `"6. Datos sensibles"`;
    - `"1"` matches `/consentimiento/i` (not the approving decree's `"Aprobación"`);
    - there is at least one article above 130.
  - `ley-29733`:
    - `"39"` title matches `/sanciones/i` (not `/seguridad/i`);
    - `"2"` matches `/definiciones/i`;
    - article numbers form a consecutive Arabic sequence with no duplicates.
- [ ] **Step 6:** Run `pnpm vitest run test/legal/ingest.test.ts test/legal/library-core.test.ts`. Expected: PASS.
- [ ] **Step 7:** Commit and push: `feat(legal): biblioteca con el texto oficial del DS 016-2024-JUS y la Ley 29733`.

---

### Task 4: Citation parser

**Files:**
- Create: `src/legal/citations.ts`
- Test: `test/legal/citations-parser.test.ts`

**Interfaces:**
- Produces: `parseCitations(text: string, defaultNorm: string): Citation[]` (the `Citation` type from `src/legal/types.ts`, deduplicated, in order).
  - `defaultNorm` applies to bare mentions.
  - A mention's norm is the nearest alias that follows it in the same sentence, matching `de la Ley N.° 29733` or `del DS N.° 016-2024-JUS` (via `normByAlias`).
  - An unknown norm name yields `norm: "desconocida:<text>"`, so the lint can report it.
- Produces: `CLAUSE_DEFAULT_NORM = "ds-016-2024-jus"`. Clause types gain an optional `defaultNorm?: string` for clauses whose bare mentions mean another norm (e.g. the complaints book, Ley 29571).

Exact cases, taken from today's texts:
```ts
expect(parseCitations("(art. 26.5)", D)).toEqual([{ norm: D, art: "26.5" }]);
expect(parseCitations("(arts. 46 a 51)", D).map(c => c.art)).toEqual(["46","47","48","49","50","51"]);
expect(parseCitations("(art. 66.4 y 66.5)", D).map(c => c.art)).toEqual(["66.4","66.5"]);
expect(parseCitations("(arts. 10.2 y 26.5)", D).map(c => c.art)).toEqual(["10.2","26.5"]);
expect(parseCitations("art. 14, num. 5 de la Ley N.° 29733", D)).toEqual([{ norm: "ley-29733", art: "14.5" }]);
expect(parseCitations("art. 5 y 13.5 de la Ley N.° 29733", D).map(c => `${c.norm}:${c.art}`)).toEqual(["ley-29733:5","ley-29733:13.5"]);
expect(parseCitations("art. 2.6 del DS N.° 016-2024-JUS", D)).toEqual([{ norm: "ds-016-2024-jus", art: "2.6" }]);
expect(parseCitations("(Código Civil, art. 15)", D)).toEqual([{ norm: "codigo-civil", art: "15" }]);
expect(parseCitations("(art. 6.1.3 y 6.1.7)", D).map(c => c.art)).toEqual(["6.1.3","6.1.7"]);
expect(parseCitations("arts. 61 a 88 del DS N.° 016-2024-JUS", D)).toHaveLength(28);
expect(parseCitations("Primera Disposición Complementaria Final", D)).toEqual([]); // named provisions are a later scope
```

- [ ] **Step 1:** Write the tests above. **Step 2:** Run them; expected FAIL. **Step 3:** Implement. **Step 4:** Run; expected PASS. **Step 5:** Commit and push: `feat(legal): lector de citas de artículos`.

---

### Task 5: Fill `cites` on every clause

**Files:**
- Create: `scripts/legal/fill-cites.ts` (one-off codemod, run with `pnpm tsx`)
- Modify: all 14 `src/legal/documents/*.ts` (the `cites: []` literals, plus `defaultNorm` where Task 4 requires it)
- Test: `test/legal/citations.test.ts` (Task 6 adds the lint; this task adds the coverage test)

**Interfaces:**
- Consumes: `allClauses()`, `legalFixtures()`, `legalContext()`, `parseCitations()`.
- Produces: `clauseCitationsOverFixtures(): Map<string, Citation[]>` in `test/legal/render-all.ts`. Key = clause id; value = the union of `parseCitations(clause.text(ctx), clause.defaultNorm ?? CLAUSE_DEFAULT_NORM)` over every fixture where `when` passes, sorted by norm then art.

- [ ] **Step 1:** Write the test `"every clause's cites equal the citations its text renders, over all fixtures"`. It asserts `clause.cites` (sorted) equals the map entry. Expected FAIL, since all cites are `[]`.
- [ ] **Step 2:** Run `fill-cites.ts`. For each clause it replaces `cites: []` in the source with the sorted literal list from the map, one `{ norm, art }` per line. It is idempotent.
- [ ] **Step 3:** Run `pnpm vitest run test/legal`. Expected: PASS, with baseline and snapshots unchanged (cites do not affect text).
- [ ] **Step 4:** Set `nonLegal` consistently. A clause whose map entry is empty and that mentions no norm gets `nonLegal: "<reason>"`. Remove `nonLegal` from clauses that do cite (e.g. `arco.nota.borrador`). Add the test `"a clause has nonLegal if and only if its cites are empty"`. Expected PASS.
- [ ] **Step 5:** Commit and push: `feat(legal): cada cláusula declara los artículos que cita`.

---

### Task 6: Citation lint and the known-failures ratchet

**Files:**
- Create: `legal/known-failures.json` (generated once, then shrink-only)
- Modify: `test/legal/citations.test.ts`

**Interfaces:**
- Produces: `KnownFailure = { rule: string; clause: string; detail: string }` (`detail` is e.g. `"ds-016-2024-jus:2.6"`), and `checkCitations(): KnownFailure[]` in `test/legal/citations.test.ts` (or `test/legal/checks.ts` if Task 7 shares it). Rules:
  - `cite-norm-missing`: the norm is not in `NORMS`.
  - `cite-norm-unknown`: the parser returned `desconocida:…`.
  - `cite-article-missing`: the norm is verified but `findArticle` returns null.
  - `cite-norm-unverified`: the norm status is `no-verificada`.
  - `cite-norm-repealed`: the status is `derogada`.

- [ ] **Step 1: Write the ratchet tests**
  - `"no failure outside known-failures.json"`: `checkCitations()` minus the file is empty. The message lists each new failure.
  - `"known-failures.json has no stale entries"`: the file minus `checkCitations()` is empty. The message says "remove these, they are fixed".
  - `WRITE_KNOWN_FAILURES=1` writes the file only when it does not exist.
- [ ] **Step 2:** Run with the file absent and `WRITE_KNOWN_FAILURES=1`, then without the variable. Expected: the file is created, then PASS. Check by hand that it contains `cite-article-missing` for `ds-016-2024-jus:2.6`, `2.4`, `2.8` and `2.2` (Review Focus 1), and `cite-norm-unverified` for the stub norms.
- [ ] **Step 3:** Prove the ratchet. Temporarily add `"(art. 999)"` to one clause text and remove it from the cites: the first test FAILS. Revert. Temporarily delete one line from the file: the first test FAILS. Revert.
- [ ] **Step 4:** Commit and push: `test(legal): lint de citas con lista de fallas conocidas que solo puede reducirse`.

---

### Task 7: Rule checks over the fixture matrix (spec §6)

**Files:**
- Create: `test/legal/rules.test.ts`, `test/legal/rules.ts`
- Modify: `legal/known-failures.json` (new rule entries are added once, through the same write mode, then frozen)

**Interfaces:**
- Produces: `RULES: Array<{ id: string; applies: (ctx: LegalContext) => boolean; check: (docs: Record<DocumentKind, string>, ctx: LegalContext) => string | null }>`. A non-null return is the failure detail. Results feed the same `KnownFailure` ratchet, with `clause` set to the fixture id.

Rules (each exact):
- `politica-deber-informacion`: the privacy policy contains the headings for identity, banks and purposes, mandatory or optional data, legal basis, retention, recipients and transfers, rights and channels, and automated decisions (the `## 1.` to `## 8.` headings present today).
- `sensibles-consentimiento-escrito`: `profile.sensitive || profile.biometric` ⇒ `consentimiento` contains `"AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS SENSIBLES"` and `"por escrito"`.
- `menores-consentimiento-padres`: `profile.minors` ⇒ `consentimiento` contains `"AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS DE UN MENOR DE EDAD"`.
- `proveedor-extranjero-transferencia`: a provider with `isAbroad` ⇒ `politica` contains `"flujo transfronterizo"` and the provider's country label, and `encargo` lists the provider.
- `cctv-plazo`: `clausulas` contains the CCTV sign with `"30"`. For `educacion_menores` it contains `"como máximo"` and not `"sesenta"`.
- `consumidor-libro-reclamaciones`: `profile.consumer` ⇒ `terminos` mentions `"Libro de Reclamaciones"`.
- `automatizado-aviso`: `usesAutomation` ⇒ `politica` contains `"tratamiento objetivo (art. 87"` and the automated variant.
- `sin-marcadores-internos`: no document contains `{{` or `TODO`. (`[indicar …]` placeholders are expected client-fill fields and are excluded.)

- [ ] **Step 1:** Write `rules.test.ts`. It renders all 14 kinds per fixture once, runs `RULES`, and feeds the ratchet. Expected: FAIL until known failures are recorded.
- [ ] **Step 2:** Record the current failures once (write mode), review them by hand, then run without write mode. Expected: PASS.
- [ ] **Step 3:** Prove one rule. Temporarily drop `consentimiento.f.menores`'s `when` so the clause never renders: `menores-consentimiento-padres` FAILS. Revert.
- [ ] **Step 4:** Commit and push: `test(legal): reglas de cumplimiento sobre todas las combinaciones`.

---

### Task 8: Deferred minors from plan 1, then PR

**Files:**
- Modify: `test/legal/snapshots.test.ts` (exact family count: `Object.keys(FAMILIES).length`, plus representatives for the unknown sector and a foreign company without a representative, under `__snapshots__/unknown/` and `__snapshots__/extranjera/`)
- Create: `.gitattributes` with `test/legal/__snapshots__/** text eol=lf` and `legal/**/*.json text eol=lf`
- Modify: `test/legal/fixtures.ts` (`legalFixtures()` returns a frozen array of frozen fixtures)
- Modify: `docs/superpowers/specs/2026-11-13-motor-legal-design.md` §4.3 (location `src/legal/documents/`, no `doc` field; the kind is in the id and `SPECS`)

- [ ] **Step 1:** Write the snapshot count test (exact). Expected: FAIL while the count is `>= 20`.
- [ ] **Step 2:** Implement, then generate the new snapshots with `-u`. Only new files should appear: `git status` must show no modified snapshot.
- [ ] **Step 3:** Full verification: `pnpm vitest run && pnpm typecheck && pnpm lint && pnpm build` (in the worktree). Expected: all PASS.
- [ ] **Step 4:** Commit and push. From the PC, run `gh pr create --repo janymil/datosprivados --base feat/motor-legal-1 --head feat/motor-legal-2 …` (base `master` if #9 is merged by then), bind it with the ccd_pr tools, and offer Auto-fix.
