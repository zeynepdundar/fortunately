/**
 * Precompute "Try a sample": analyse every posting in samples/postings against the sample
 * CV and write samples/results/<id>.json. Run it after a prompt change, then commit.
 *
 *   pnpm samples:build --model ollama:qwen3:8b
 *   pnpm samples:build --model anthropic:claude-haiku-5-5   # ANTHROPIC_API_KEY in .env.local
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
import { checkMatch } from "@/lib/ai/checked-match-stream";
import { EXTRACTION_PROMPT_VERSION, streamExtraction } from "@/lib/ai/extract";
import { MATCH_PROMPT_VERSION, streamMatches } from "@/lib/ai/match";
import { supportsThinkingToggle } from "@/lib/ai/models";
import { getModel, ProviderId } from "@/lib/ai/provider";
import { toNumberedLines } from "@/lib/cv";
import { cleanExtraction } from "@/lib/extraction";
import { SampleResult } from "@/lib/sample-result-schema";
import type { CheckedMatch, Extraction } from "@/lib/schemas";

const SAMPLES = path.join(process.cwd(), "samples");
const OUT = path.join(SAMPLES, "results");

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { values } = parseArgs({ options: { model: { type: "string" } } });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const spec =
  values.model ?? fail("Usage: pnpm samples:build --model <provider:model>");
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
    `Set the ${provider === "anthropic" ? "ANTHROPIC" : "OPENAI"}_API_KEY in .env.local.`,
  );

const model = getModel({ provider, modelId, apiKey });
const disableThinking = supportsThinkingToggle(provider, modelId);
const cvLines = toNumberedLines(
  readFileSync(path.join(SAMPLES, "cv-alex-rivera.md"), "utf8").trim(),
);

function extract(posting: string): Promise<Extraction | null> {
  return new Promise((resolve) => {
    const result = streamExtraction({
      model,
      posting,
      disableThinking,
      onComplete: ({ output }) => resolve(cleanExtraction(output, posting)),
      onFailure: () => resolve(null),
    });
    void result.consumeStream();
  });
}

async function match(extraction: Extraction): Promise<CheckedMatch[]> {
  const result = streamMatches({
    model,
    requirements: extraction.requirements,
    cvLines,
    // Fixed date so a rebuild only changes when the prompts or the model change.
    today: "2026-11-27",
    disableThinking,
  });
  const output = await result.output;
  const byIndex = new Map(
    output.matches
      .filter((m) => m.requirementIndex < extraction.requirements.length)
      .map((m) => [m.requirementIndex, checkMatch(m, cvLines)]),
  );
  return extraction.requirements.map(
    (_, i) =>
      byIndex.get(i) ?? {
        requirementIndex: i,
        verdict: "missing",
        evidence: [],
        rationale: "The model returned no verdict for this requirement.",
        verified: true,
      },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(path.join(SAMPLES, "postings"))
    .filter((f) => f.endsWith(".md"))
    .sort();
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const posting = readFileSync(
      path.join(SAMPLES, "postings", file),
      "utf8",
    ).trim();
    const started = performance.now();
    const extraction = await extract(posting);
    if (!extraction) {
      console.log(`✗ ${id}: extraction failed, kept the previous result`);
      continue;
    }
    const matches = await match(extraction);
    const result = SampleResult.parse({
      id,
      posting,
      provider,
      model: modelId,
      extractPromptVersion: EXTRACTION_PROMPT_VERSION,
      matchPromptVersion: MATCH_PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
      cvLines,
      extraction,
      matches,
    });
    writeFileSync(
      path.join(OUT, `${id}.json`),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    const met = matches.filter((m) => m.verdict === "met").length;
    console.log(
      `✓ ${id}: ${extraction.requirements.length} requirements, ${met} met (${((performance.now() - started) / 1000).toFixed(1)} s)`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
