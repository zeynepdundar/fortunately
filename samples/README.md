# Samples

Fictional data only. Used by "Try a sample" on the home page and by tests.

- `cv-alex-rivera.md` — a fictional frontend engineer's CV.
- `postings/*.md` — synthetic job postings.
- `results/*.json` — each posting analysed and matched against the CV ahead of time, so "Try a
  sample" needs no key, no model call and no database. Rebuild after a prompt change:

  ```bash
  pnpm samples:build --model ollama:qwen3:8b
  ```

Real CVs and real postings go in `/private/` (git-ignored) if you need them locally.
