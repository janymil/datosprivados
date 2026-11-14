# Legal engine, plan 3 of 7: legal facts and the non-document modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every legal number the product uses (deadlines, fine ranges, UIT, Data Officer dates, retention periods) becomes a single record verified against the official article text. Code and texts read that record, and every legal text outside the 14 documents is covered by snapshots and the citation lint. Nothing the user sees changes.

**Architecture:**
- **Fact registry.** `src/legal/facts.ts` holds `LegalFact` records with value, citation and a verbatim quote. A test proves each quote appears in the cited article of the law library (plan 2).
- **Code constants derive from facts.** Behaviour stays identical: the existing tests cover it, plus a new snapshot of the module data.
- **Non-document modules** (guides, help, FAQ, glossary, fines, incidents, security checks, compliance, platform legal pages, tips, bank presets, AI policy, the AI prompt and ARCO reply letters) are snapshotted first. Then the citation lint runs over their text, with their own known-failures ratchet.
- **Legal text index.** A single index lists every legal text in the product with its parsed citations, so the monitor (plan 6) can map an article change to everything it affects.

**Tech Stack:** TypeScript, vitest, Node 22.

**Spec:** `docs/superpowers/specs/2026-11-13-motor-legal-design.md` (§4.2 facts, §4.3 "same Citation type for the non-document modules", §4.5 the prompt generated from `facts.ts`, §5 safe migration). Builds on plan 2 (`docs/superpowers/plans/2026-11-14-motor-legal-2-citas.md`, branch `feat/motor-legal-2`).

## Global Constraints

- **Zero visible change.** Document hashes and snapshots from plans 1–2 stay unchanged. The module snapshot from Task 1 stays unchanged after it is created. `TEMPLATE_VERSIONS` is not bumped. All existing tests (ARCO due dates, incidents, fines calculator, guides) pass unchanged.
- Fact `quote`s are copied from `legal/library/*/articles.json` (official text), never typed from memory. A fact whose norm is `no-verificada` carries `quote: null` and is listed in `legal/known-failures/facts.json`.
- Work on contabo in worktree `/root/work/motor-legal-3`, on branch `feat/motor-legal-3` cut from `feat/motor-legal-2`. Never touch `/var/www/datosprivados`. Push after each task.
- Spanish code comments. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A deadline used both as text and as behaviour.** ARCO `due_at` (`arcoLegalBusinessDays` in `src/lib/db.ts`) and the incident deadline (`48 * 3_600_000` in `src/app/actions/incidents.ts`). After the change, both must read the same fact as the texts, and the computed dates must not move. Pinned in Task 3.
2. **The UIT changes every January.** `UIT_2026` must become a fact with a year, and the fine calculator must keep `S/ 5,500` for 2026. Pinned in Tasks 2 and 3.
3. **Help text built from data at render time** (`help-content.ts` search docs, `guides.ts` tables derived from `SALES_BANDS`). The snapshot must capture the rendered strings, not only the source arrays. Pinned in Task 1.
4. **The AI prompt `PERU_LEGAL_RAG`.** It must stay byte-identical when generated from facts (spec §4.5), because a silent prompt change alters every AI answer. Pinned in Tasks 1 and 4.
5. **Citations inside page components (`src/app/**/*.tsx`)** that no module exports. They are linted from the static source text, and a page added later with a new citation is caught. Pinned in Task 5.

---

### Task 1: Snapshot every non-document legal text

**Files:**
- Create: `test/legal/modules.ts`: `legalModuleTexts(): Array<{ source: string; text: string }>`
- Create: `test/legal/modules-baseline.test.ts`, `test/legal/__snapshots__/modules/modules.json`

**Interfaces:**
- Produces: `legalModuleTexts()`. One entry per legal string, with `source` a stable id such as `"guides:<slug>:<section-index>"`, `"glossary:<key>"`, `"fines:FINE_TIERS"`, `"ai:PERU_LEGAL_RAG"`, `"faq:<question-index>"`, `"incident-notice:<fixture-id>"` or `"compliance:<fixture-id>"`. It covers:
  - `GUIDES` (every section, every table cell, rendered as markdown text);
  - `help-content` `TOPICS`, `FAQ`, `SCREENS`, `JOURNEY` and `NEEDS` (plus `topicToPlainText` per topic);
  - `answerWithoutLlm` over its own question list;
  - `FINE_TIERS`, `UIT_2026`, `LEVE_EXAMPLES`, `INCIDENT_CRITERIA` and `SECURITY_CHECKS`;
  - `GLOSSARY`, `LEGAL_CONTENT` (platform legal pages), `TIPS`, `BANK_PRESETS` and `AI_DISCLAIMER`;
  - `FAMILIES` and `SALES_BANDS` from `sector-legal.ts`;
  - `PERU_LEGAL_RAG`, and the basic-mode ARCO reply letters in `ai.ts` rendered for each ARCO type with a fixed context;
  - `buildAuthorityNotice` for 3 fixed incidents;
  - `computeCompliance` for the representative fixtures, if it is pure (otherwise its static label texts).
- The snapshot file is JSON, `{ [source]: text }`, sorted by key. The test fails on any change, and a failure prints the source ids that changed.

- [ ] **Step 1:** Write `modules-baseline.test.ts`. With the file absent and `WRITE_MODULES_BASELINE=1` it writes the snapshot; otherwise it compares. Run without the file: expected FAIL.
- [ ] **Step 2:** Implement `modules.ts`, then write the snapshot once. Run again: expected PASS.
- [ ] **Step 3:** Prove it. Temporarily change one word in a `GLOSSARY` entry and in `PERU_LEGAL_RAG`: both are reported by source id. Revert.
- [ ] **Step 4:** Commit and push: `test(legal): instantánea de todos los textos legales fuera de los documentos`.

---

### Task 2: Fact registry verified against the official text

**Files:**
- Create: `src/legal/facts.ts`
- Create: `test/legal/facts.test.ts`, `legal/known-failures/facts.json`

**Interfaces:**
- Produces:
  ```ts
  export type LegalFact = {
    id: string;                 // "arco.plazo.acceso"
    value: number | string;     // 20, "2026-11-30"
    unit: "días hábiles" | "días" | "horas" | "años" | "meses" | "UIT" | "soles" | "fecha";
    cites: Citation[];
    quote: string | null;       // verbatim from the cited article; null only if the norm is no-verificada
    validFrom?: string;         // facts that change by year (UIT)
  };
  export const FACTS: Record<string, LegalFact>;
  export function fact(id: string): LegalFact;      // throws on unknown id
  ```
- Initial facts. Each value is taken from today's code or texts; the quote comes from the library:
  - `arco.plazo.informacion` (8), `arco.plazo.acceso` (20), `arco.plazo.otros` (10): DS art. 69. `arco.ampliacion` (once, an equal period): art. 71.
  - `arco.subsanacion.pedido` (5) and `arco.subsanacion.titular` (5): art. 66.2. `arco.info-adicional.pedido` (7) and `arco.info-adicional.titular` (10): art. 70. `arco.encargado.traslado` (3): art. 66.4.
  - `incidente.notificacion` (48 hours): art. 34. `revocacion.plazo` (10): arts. 10.2 and 26.5.
  - `seguridad.registros` (2 years): art. 46.3. `seguridad.revision-privilegios` (6 months): art. 46.1.c. `encargado.conservacion` (2 years): art. 31.2.
  - `odp.comunicacion` (15 days): art. 37.5. `odp.desde.grande`, `odp.desde.mediana`, `odp.desde.pequena` and `odp.desde.micro`: the dates in `SALES_BANDS`, from the Primera Disposición Complementaria Final. That provision is not split as an article yet, so these carry `quote: null` and a `facts.json` entry.
  - `multa.leve`, `multa.grave` and `multa.muy-grave` (UIT ranges): Ley 29733 art. 39.
  - `uit.2026` (5500): no norm in the library yet (a stub `ds-uit-2026` with `no-verificada`).
  - `cctv.conservacion` (30–60) and `cctv.conservacion.educacion` (30): Directiva 01-2020 (a stub, `quote: null`).
  - `reclamo.respuesta` (30 days calendario): DS 011-2011-PCM (a stub).

- [ ] **Step 1: Write the failing tests:**
  - `"every fact's quote appears verbatim in its cited article"`, comparing whitespace-normalised and NFKC text;
  - `"every fact's cited article exists"`;
  - `"facts with null quote are exactly the ones in known-failures/facts.json"`, a ratchet like plan 2's;
  - `"fact() throws on unknown id"`.
  Expected: FAIL, module missing.
- [ ] **Step 2:** Implement `facts.ts`. For each quote, open the article in `legal/library/<norm>/articles.json` and copy the exact sentence that states the value.
- [ ] **Step 3:** Run `pnpm vitest run test/legal/facts.test.ts`. Expected: PASS. A quote that cannot be found means the fact's value or citation is wrong. **Do not change the value:** set `quote: null`, add the fact to `facts.json` with detail `"quote no encontrada: <reason>"`, and leave it for the audit.
- [ ] **Step 4:** Commit and push: `feat(legal): hechos legales verificados contra el texto oficial`.

---

### Task 3: Code constants read the facts

**Files:**
- Modify: `src/lib/db.ts` (`arcoLegalBusinessDays`), `src/app/actions/incidents.ts` (48 h), `src/lib/fines.ts` (`UIT_2026`, `FINE_TIERS`), `src/lib/sector-legal.ts` (`SALES_BANDS[].odpFrom`)
- Test: existing ARCO, incident, fines and guides tests; `test/legal/modules-baseline.test.ts`; plus a new `test/legal/facts-wiring.test.ts`

**Interfaces:**
- Consumes: `fact(id)`.
- Produces: no new exports. `UIT_2026`, `FINE_TIERS` and `SALES_BANDS` keep their names and shapes, but are built from facts.

- [ ] **Step 1:** Write `facts-wiring.test.ts`:
  - `arcoLegalBusinessDays("informacion")` returns `fact("arco.plazo.informacion").value`; likewise `"acceso"` and the other types;
  - `UIT_2026 === fact("uit.2026").value`;
  - `FINE_TIERS.leve.minUit === 0.5`, built from `fact("multa.leve")`;
  - each `SALES_BANDS` `odpFrom` equals its fact;
  - the incident due date for a fixed `detected_at` equals `detected_at + fact("incidente.notificacion").value` hours.

  Expected: FAIL only where the code does not yet read facts. (The value assertions pass today; the wiring assertions use `vi.spyOn` on `fact` or a changed fact value through a test-only override `withFactOverride(id, value, fn)`.)
- [ ] **Step 2:** Make each constant read its fact.
- [ ] **Step 3:** Run the full suite. Expected: PASS, with the module snapshot and document hashes unchanged.
- [ ] **Step 4:** Commit and push: `refactor(legal): plazos, multas, UIT y fechas del ODP salen de los hechos legales`.

---

### Task 4: The AI prompt is generated from facts

**Files:**
- Modify: `src/lib/ai.ts` (`PERU_LEGAL_RAG`)
- Test: `test/legal/modules-baseline.test.ts` (`ai:PERU_LEGAL_RAG`), the existing `test/ai-evals`

- [ ] **Step 1:** Replace the numbers inside `PERU_LEGAL_RAG` that have a fact with template expressions reading `fact(...)`. These are the ARCO deadlines, the 48 hours, the fine ranges, the UIT and the ODP calendar. The surrounding wording stays.
- [ ] **Step 2:** Run `pnpm vitest run test/legal/modules-baseline.test.ts test/ai-evals`. Expected: PASS, prompt byte-identical.
- [ ] **Step 3:** Commit and push: `refactor(ai): el prompt legal toma los plazos y montos de los hechos legales`.

---

### Task 5: Citation lint for module texts and page components

**Files:**
- Create: `test/legal/modules-lint.test.ts`, `legal/known-failures/modules.json`
- Modify: `test/legal/checks.ts`. `checkCitations` gains a generic overload `checkTextCitations(items: Array<{ source: string; text: string }>)`.

**Interfaces:**
- Consumes: `legalModuleTexts()`, `parseCitations`, `ratchet`.
- Produces: `pageSourceTexts(): Array<{ source: string; text: string }>`. It reads every `src/app/**/*.tsx` and `src/components/**/*.tsx` as raw source (`source` = file path), because citations in JSX are static strings.

- [ ] **Step 1:** Write the ratchet tests ("no new failures", "no stale entries") over modules plus pages. Create the list once with `WRITE_KNOWN_FAILURES=1`, then review it by hand. It must contain the `2.6` and `2.8` cases that exist outside the documents too.
- [ ] **Step 2:** Prove it. Add `"(art. 999)"` to a page component: FAIL. Revert.
- [ ] **Step 3:** Commit and push: `test(legal): lint de citas en módulos y páginas`.

---

### Task 6: Legal text index for impact mapping

**Files:**
- Create: `src/legal/index-texts.ts`
- Test: `test/legal/index-texts.test.ts`

**Interfaces:**
- Produces: `legalTextIndex(): Array<{ kind: "clause" | "module" | "page" | "fact"; source: string; cites: Citation[] }>`.
  - Clause cites are the declared ones (plan 2).
  - Module and page cites are parsed from text.
  - Fact cites are declared.
- Produces: `affectedBy(norm: string, art: string): Array<{ kind; source }>`. It matches an article and every item under it (`"26"` matches `"26.5"`).

- [ ] **Step 1:** Tests:
  - `affectedBy("ds-016-2024-jus", "69")` includes `politica.7.derechos-arco`, `arco.3.plazos`, the fact `arco.plazo.acceso` and at least one module source;
  - `affectedBy("ley-29733", "39")` includes the fine facts;
  - every clause appears in the index.

  Expected FAIL, then implement and PASS.
- [ ] **Step 2:** Commit and push: `feat(legal): índice de textos legales para medir el impacto de un cambio de norma`.

---

### Task 7: Verification, review, PR

- [ ] **Step 1:** Run `pnpm vitest run && pnpm typecheck && pnpm lint && pnpm build` in the worktree. Expected: all PASS.
- [ ] **Step 2:** Final review by a fresh reviewer. Then open the PR from the PC with base `feat/motor-legal-2` (or `master` if plans 1 and 2 are merged), bind it with the ccd_pr tools, and offer Auto-fix.
