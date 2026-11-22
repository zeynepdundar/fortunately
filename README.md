# Fortunately

> Turn every "Unfortunately" into a "Fortunately". AI job-fit copilot.

Paste a job posting (or its link). Fortunately streams out the requirements as they are extracted, matches each one to your CV with the **exact CV line that proves it**, and shows which skills you are missing across all the roles you look at.

**Status:** work in progress — MVP target: December 2026. Live demo: `fortunately.vercel.app` (coming soon).

## Features (MVP)

- **Posting input** — paste text or a URL (scraped to clean markdown with Firecrawl).
- **Live requirement extraction** — must-have / nice-to-have, technology, years of experience, rendered as they stream (generative UI).
- **Evidence-backed matching** — Met / Partial / Missing per requirement, citing CV line numbers. Citations are verified in code: a cited line that does not exist downgrades the verdict to Missing. No invented evidence.
- **Gap dashboard** — the most requested skills you lack, across postings.
- **Agent trace panel** — every step and tool call with tokens, cost and latency.
- **Evals** — 25 labelled synthetic postings; extraction precision / recall / F1 per model (table below).
- **Bring your own key** — Anthropic or OpenAI. Your key stays in your browser session and is sent per request; it is never stored or logged.
- **Free local mode** — run open models with [Ollama](https://ollama.com) on your machine, no key needed (local development only).

## Eval results

<!-- eval:start -->

_Not run yet._
<!-- eval:end -->

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Vercel AI SDK 7 · zod · TanStack Query · Zustand · Postgres (Neon) + Drizzle · Vitest · Playwright · GitHub Actions · Vercel

## Getting started

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL etc.
pnpm db:migrate
pnpm dev
```

| Script                                               | What it does                                       |
| ---------------------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                                           | Dev server on http://localhost:3000                |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks                                      |
| `pnpm test`                                          | Unit tests (Vitest)                                |
| `pnpm e2e`                                           | End-to-end tests (Playwright)                      |
| `pnpm db:generate` / `pnpm db:migrate`               | Drizzle migrations                                 |
| `pnpm eval`                                          | Run the eval set (uses your API key, costs tokens) |

## Run with a free local model (Ollama)

```bash
ollama pull qwen3:8b   # about 5 GB; needs ~8 GB free RAM
pnpm dev
```

Then open Settings, choose **Ollama (local)** and keep the model as `qwen3:8b`.

## Privacy

The repo contains only fictional CVs and synthetic postings. Put anything real in `/private/` (git-ignored).

## License

[MIT](./LICENSE)
