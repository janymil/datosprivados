# SAAS Projects

@AGENTS.md

DatosPrivados (datosprivados.pe): Ley 29733 personal-data compliance SaaS for Peruvian small businesses. Generated legal texts are drafts pending lawyer review.

## Stack
Next.js + TypeScript (`src/`), Vitest (`test/`), Playwright (`e2e/`), ESLint.

## Commands
- `npm run dev`: port 3000
- `npm run typecheck`
- `npm test`: Vitest
- `npm run lint`
- `npm run test:e2e`: builds with CSP enforced, then Playwright

## Where things are
Docs in `docs/`, legal sources in `legal/`, deploy files in `deploy/`.
- Decisions: `docs/decisions/` (one file per decision; read the relevant one before changing pricing, features, legal or architecture).
- New one-off scripts go in `scripts/`; reports in `docs/reports/`; plans in `docs/plans/`. Nothing new in the repo root.
