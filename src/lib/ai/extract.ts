import { Output, streamText, type LanguageModel } from "ai";
import { Extraction } from "@/lib/schemas";

/** Bump when the instructions change, so eval results stay comparable. */
export const EXTRACTION_PROMPT_VERSION = "extract-v4";

export const EXTRACTION_INSTRUCTIONS = `You extract the candidate requirements from a job posting.
Return one entry per requirement, in the order of the posting. Never add anything the posting does not ask for.

WHAT TO INCLUDE
- Qualifications the candidate should have: technologies, years of experience, education, spoken languages, domain knowledge, ways of working.
- Skip the company description, benefits, salary and the team's duties. Exception: a technology named only in the duties is a "nice" requirement.

ONE ENTRY PER LINE
- Each bullet or sentence that states a requirement becomes exactly one entry. Never split it and never merge two lines.

KIND
- "must": listed under Requirements, Must have, You have, What you bring, or phrased as required.
- "nice": listed under Nice to have, Bonus, Should have, Preferred, or marked as "a plus".

TEXT
- Copy the posting's own words. Keep technology names and anything in parentheses.
- You may drop filler like "Strong" or "Solid" at the start. Never paraphrase or summarise.

SKILLS
- List EVERY specific technology the entry names: languages, frameworks, libraries, tools, platforms, standards.
- Write each as a lowercase kebab-case slug ("react", "typescript", "next-js", "node-js", "github-actions"), in the order they appear.
- Use an empty list when the entry names no technology.

ANY OF
- true when the skills are alternatives and one of them is enough: joined by "or", "and/or", "such as", "e.g." or "or similar".
- false when all are required (joined by "and" or a comma without "or"), or when there are fewer than two skills.

CATEGORY
- technology: the entry names at least one technology, also when years are attached ("4+ years of React Native").
- experience: general experience that names no technology ("5+ years of frontend development", "experience building a design system").
- domain: subject or industry knowledge (payments, accessibility, web performance).
- education: degrees and certificates.
- soft_skill: ownership, communication, collaboration.
- other: spoken languages, location, travel, availability.

MIN YEARS
- The number of years if stated ("5+ years" -> 5), otherwise null. Never 0.

EXAMPLES
Posting lines:
  Requirements
  - 4+ years of Vue and Nuxt.
  - A state library such as Pinia or Vuex.
  - Unit testing with Jest, Vitest or Mocha.
  - Experience leading a framework migration.
  Nice to have
  - Fluent Dutch.
Entries:
  {"text":"4+ years of Vue and Nuxt","kind":"must","category":"technology","skills":["vue","nuxt"],"anyOf":false,"minYears":4}
  {"text":"A state library such as Pinia or Vuex","kind":"must","category":"technology","skills":["pinia","vuex"],"anyOf":true,"minYears":null}
  {"text":"Unit testing with Jest, Vitest or Mocha","kind":"must","category":"technology","skills":["jest","vitest","mocha"],"anyOf":true,"minYears":null}
  {"text":"Experience leading a framework migration","kind":"must","category":"experience","skills":[],"anyOf":false,"minYears":null}
  {"text":"Fluent Dutch","kind":"nice","category":"other","skills":[],"anyOf":false,"minYears":null}`;

export type ExtractionResult = {
  output: Extraction;
  inputTokens?: number;
  outputTokens?: number;
};

/** qwen3's soft switch that skips its hidden reasoning step. */
export const NO_THINK = "/no_think";

export function streamExtraction({
  model,
  posting,
  disableThinking = false,
  abortSignal,
  onComplete,
  onFailure,
}: {
  model: LanguageModel;
  posting: string;
  /** Turn off the model's hidden reasoning step (only for models that support it). */
  disableThinking?: boolean;
  abortSignal?: AbortSignal;
  /** Called once with the validated output and token usage when the stream ends. */
  onComplete?: (result: ExtractionResult) => Promise<void> | void;
  /** Called once when the stream errors, is aborted or ends without valid output. */
  onFailure?: () => Promise<void> | void;
}) {
  const prefix = disableThinking ? `${NO_THINK}\n` : "";
  return streamText({
    model,
    instructions: EXTRACTION_INSTRUCTIONS,
    prompt: `${prefix}Job posting:\n<posting>\n${posting}\n</posting>`,
    output: Output.object({ schema: Extraction }),
    // Ollama ignores /no_think on its OpenAI-compatible API but honours reasoning_effort "none".
    providerOptions: disableThinking
      ? { ollama: { reasoningEffort: "none" } }
      : undefined,
    abortSignal,
    // Log only the message: provider errors can carry request details.
    onError: async ({ error }) => {
      console.error(
        "[extract] stream error:",
        error instanceof Error ? error.message : String(error),
      );
      await onFailure?.();
    },
    onAbort: async () => {
      await onFailure?.();
    },
    onEnd: async (event) => {
      if (!event.output) {
        await onFailure?.();
        return;
      }
      await onComplete?.({
        output: event.output,
        inputTokens: event.totalUsage.inputTokens,
        outputTokens: event.totalUsage.outputTokens,
      });
    },
  });
}
