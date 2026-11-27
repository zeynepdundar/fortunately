# Evals

Labelled, **synthetic** job postings that measure requirement extraction: the same model call and
code clean-up the app uses, scored against hand-written gold labels.

```bash
pnpm eval --model ollama:qwen3:8b             # local, free
pnpm eval --model anthropic:claude-haiku-5-5  # needs ANTHROPIC_API_KEY in .env.local
pnpm eval --model ollama:qwen3:8b --case 03-ai-engineer-amsterdam-relocation   # one case, not saved
```

A full run writes `results/<provider>-<model>__<prompt version>.json` and regenerates the table
below. Raw model outputs go to `results/raw/`, which is git-ignored.

## Results

<!-- eval:start -->
| Model | Prompt | Cases | Requirement F1 | Precision | Recall | Skill recall | Must/nice | Years | Country | Relocation | Median latency | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | extract-v8 | 25/25 | 95% | 100% | 91% | 81% | 100% | 100% | 96% | 92% | 20.9 s | 2026-11-27 |
| ollama:qwen3:8b | extract-v6 | 5/5 | 92% | 100% | 85% | 77% | 100% | 100% | 100% | 100% | 65.2 s | 2026-11-27 |
| ollama:qwen3:8b | extract-v7 | 5/5 | 92% | 100% | 85% | 77% | 100% | 100% | 100% | 100% | 70.2 s | 2026-11-27 |
| ollama:qwen3:8b | extract-v5 | 5/5 | 81% | 100% | 68% | 69% | 100% | 100% | 100% | 100% | 42.6 s | 2026-11-27 |
<!-- eval:end -->

## How it is scored

- **Pairing:** each predicted requirement is paired with at most one gold requirement. Items that
  name technologies compare their skill sets; other items compare the words of their text. A pair
  needs a similarity of at least 0.5 (Jaccard).
- **Requirement precision / recall / F1:** paired items over predicted / gold items, summed over
  all cases.
- **Skill recall:** gold skill slugs the model also produced.
- **Must/nice, Years:** share of paired items with the right kind and minimum years.
- **Country, Relocation:** share of cases with the right posting fact.
- A case without valid output counts as predicting nothing.

## Cases

`cases/*.json`, one posting per file: `{ id, role, level, posting, gold }`, with `gold` in the
`Extraction` schema (`src/lib/schemas.ts`). `cases.test.ts` checks that every gold label follows
the extraction rules (text copied from the posting, canonical skill slugs, anyOf only with two or
more skills).

Rules: every company is fictional and marked so, no text copied from real postings, no real CVs.
