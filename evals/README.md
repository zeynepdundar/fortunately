# Evals

Labelled, **synthetic** job postings used to measure requirement extraction and CV matching.

- `cases/*.json` — one posting per file: `{ id, role, posting, gold: Extraction }` (schema in `src/lib/schemas.ts`).
- `run.ts` — `pnpm eval --model <provider:model>`; writes `results/<model>.json` and updates the README table.
- `results/raw/` is git-ignored.

Rules: no real company names, no text copied from real postings, no real CVs.
