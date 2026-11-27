/**
 * Extraction eval runner.
 *
 *   pnpm eval --model ollama:qwen3:8b
 *   pnpm eval --model anthropic:claude-haiku-5-5 --limit 3
 *   pnpm eval --model ollama:qwen3:8b --case 03-ai-engineer-amsterdam-relocation
 *   pnpm eval --rescore    # re-score saved runs from results/raw after a scoring change
 *
 * Runs every case in evals/cases through the same extraction and clean-up the app uses,
 * scores it against the gold labels, writes evals/results/<run>.json and regenerates the
 * table in evals/README.md. Keys come from ANTHROPIC_API_KEY / OPENAI_API_KEY (.env.local).
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  EXTRACTION_PROMPT_VERSION,
  streamExtraction,
  type ExtractionResult,
} from "@/lib/ai/extract";
import { supportsThinkingToggle } from "@/lib/ai/models";
import { getModel, ProviderId } from "@/lib/ai/provider";
import { cleanExtraction } from "@/lib/extraction";
import { loadCases } from "./cases";
import { renderTable, replaceBetweenMarkers, type RunResult } from "./report";
import { scoreCase, summarize, type CaseScore } from "./score";

const ROOT = path.join(process.cwd(), "evals");
const RESULTS = path.join(ROOT, "results");
const RAW = path.join(RESULTS, "raw");
const README = path.join(ROOT, "README.md");

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { values } = parseArgs({
  options: {
    model: { type: "string" },
    limit: { type: "string" },
    case: { type: "string" },
    thinking: { type: "boolean", default: false },
    rescore: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (values.rescore) {
  rescore();
  process.exit(0);
}

/** Re-score every saved run whose raw outputs are still on disk; keeps latencies. */
function rescore() {
  const cases = loadCases();
  for (const file of readdirSync(RESULTS).filter((f) => f.endsWith(".json"))) {
    const run = JSON.parse(
      readFileSync(path.join(RESULTS, file), "utf8"),
    ) as RunResult;
    const rawDir = path.join(RAW, file.replace(/\.json$/, ""));
    if (!existsSync(rawDir)) {
      console.log(`- ${file}: no raw outputs, kept as is`);
      continue;
    }
    const scores: CaseScore[] = [];
    run.cases = run.cases.map((row) => {
      const c = cases.find((x) => x.id === row.id);
      const rawFile = path.join(rawDir, `${row.id}.json`);
      if (!c || row.failed || !existsSync(rawFile)) return row;
      const predicted = cleanExtraction(
        JSON.parse(readFileSync(rawFile, "utf8")),
        c.posting,
      );
      const score = scoreCase(predicted, c.gold);
      scores.push(score);
      return {
        ...row,
        paired: score.paired,
        gold: score.gold,
        predicted: score.predicted,
        missed: score.missed,
        extra: score.extra,
      };
    });
    run.summary = summarize(scores);
    writeFileSync(
      path.join(RESULTS, file),
      `${JSON.stringify(run, null, 2)}\n`,
    );
    console.log(`✓ ${file}: F1 ${Math.round(run.summary.f1 * 100)}%`);
  }
  writeTable();
}

function writeTable() {
  const all = readdirSync(RESULTS)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(readFileSync(path.join(RESULTS, f), "utf8")) as RunResult,
    );
  writeFileSync(
    README,
    replaceBetweenMarkers(readFileSync(README, "utf8"), renderTable(all)),
  );
}

const spec = values.model ?? fail("Usage: pnpm eval --model <provider:model>");
const colon = spec.indexOf(":");
const parsedProvider = ProviderId.safeParse(spec.slice(0, colon));
const modelId = spec.slice(colon + 1);
if (colon === -1 || !parsedProvider.success || !modelId)
  fail(
    `Unknown model "${spec}". Use anthropic:<id>, openai:<id> or ollama:<id>.`,
  );
const provider: ProviderId = parsedProvider.data;

const apiKey =
  provider === "anthropic"
    ? process.env.ANTHROPIC_API_KEY
    : provider === "openai"
      ? process.env.OPENAI_API_KEY
      : undefined;
if (provider !== "ollama" && !apiKey)
  fail(
    `Set ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} in .env.local to run this eval.`,
  );

const model = getModel({ provider: provider, modelId, apiKey });
const disableThinking =
  supportsThinkingToggle(provider, modelId) && !values.thinking;

let cases = loadCases();
if (values.case) cases = cases.filter((c) => c.id === values.case);
if (values.limit) cases = cases.slice(0, Number(values.limit));
if (cases.length === 0) fail("No cases selected.");

function extract(posting: string): Promise<ExtractionResult | null> {
  return new Promise((resolve) => {
    const result = streamExtraction({
      model,
      posting,
      disableThinking,
      onComplete: resolve,
      onFailure: () => resolve(null),
    });
    void result.consumeStream();
  });
}

const slug =
  `${provider}-${modelId}${values.thinking ? "-thinking" : ""}__${EXTRACTION_PROMPT_VERSION}`.replace(
    /[^a-z0-9._-]+/gi,
    "-",
  );
mkdirSync(path.join(RAW, slug), { recursive: true });

async function main() {
  const scores: CaseScore[] = [];
  const rows: RunResult["cases"] = [];
  const latencies: number[] = [];

  for (const c of cases) {
    const started = performance.now();
    const result = await extract(c.posting);
    const latencyMs = Math.round(performance.now() - started);
    if (!result) {
      console.log(`✗ ${c.id}: no valid output (${latencyMs} ms)`);
      rows.push({ id: c.id, latencyMs, failed: true });
      // A failed case counts as predicting nothing.
      scores.push(
        scoreCase(
          {
            facts: {
              ...c.gold.facts,
              country: null,
              workMode: null,
              relocation: "not_stated",
              title: null,
              company: null,
              city: null,
            },
            requirements: [],
          },
          c.gold,
        ),
      );
      continue;
    }
    const predicted = cleanExtraction(result.output, c.posting);
    writeFileSync(
      path.join(RAW, slug, `${c.id}.json`),
      `${JSON.stringify(predicted, null, 2)}\n`,
    );
    const score = scoreCase(predicted, c.gold);
    scores.push(score);
    latencies.push(latencyMs);
    rows.push({
      id: c.id,
      latencyMs,
      failed: false,
      paired: score.paired,
      gold: score.gold,
      predicted: score.predicted,
      missed: score.missed,
      extra: score.extra,
    });
    console.log(
      `✓ ${c.id}: ${score.paired}/${score.gold} found, ${score.extra.length} extra (${(latencyMs / 1000).toFixed(1)} s)`,
    );
  }

  latencies.sort((a, b) => a - b);
  const run: RunResult = {
    provider: provider,
    model: modelId,
    promptVersion: EXTRACTION_PROMPT_VERSION,
    thinking: !disableThinking && supportsThinkingToggle(provider, modelId),
    date: new Date().toISOString(),
    failures: rows.filter((r) => r.failed).length,
    medianLatencyMs: latencies.length
      ? latencies[Math.floor((latencies.length - 1) / 2)]
      : null,
    summary: summarize(scores),
    cases: rows,
  };

  const partial = Boolean(values.case || values.limit);
  if (partial) {
    console.log("\nPartial run (--case / --limit): results not saved.");
  } else {
    mkdirSync(RESULTS, { recursive: true });
    writeFileSync(
      path.join(RESULTS, `${slug}.json`),
      `${JSON.stringify(run, null, 2)}\n`,
    );
    writeTable();
  }

  const s = run.summary;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  console.log(
    `\n${spec} · ${EXTRACTION_PROMPT_VERSION} · ${s.cases} cases · F1 ${pct(s.f1)} (P ${pct(s.precision)}, R ${pct(s.recall)}) · must/nice ${pct(s.kindAccuracy)} · years ${pct(s.minYearsAccuracy)} · relocation ${pct(s.factsAccuracy.relocation)}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
