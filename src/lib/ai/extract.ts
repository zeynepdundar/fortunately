import { Output, streamText, type LanguageModel } from "ai";
import { Extraction } from "@/lib/schemas";

/** Bump when the instructions change, so eval results stay comparable. */
export const EXTRACTION_PROMPT_VERSION = "extract-v3";

export const EXTRACTION_INSTRUCTIONS = `You extract the candidate requirements from a job posting.
Return one entry per requirement, in the order of the posting. Never add anything the posting does not ask for.

WHAT TO INCLUDE
- Qualifications the candidate should have: technologies, years of experience, education, spoken languages, domain knowledge, ways of working.
- Skip the company description, benefits, salary and the team's duties. Exception: a technology named only in the duties is a "nice" requirement.

KIND
- "must": listed under Requirements, Must have, You have, What you bring, or phrased as required.
- "nice": listed under Nice to have, Bonus, Should have, Preferred, or marked as "a plus".

SPLITTING
- Split only items joined by "and", where every item is required: "JavaScript and TypeScript" -> two entries, "5+ years of JavaScript" and "5+ years of TypeScript".
- Alternatives stay ONE entry. A list is alternatives when it uses "or", "and/or", "such as", "e.g." or "or similar", even with commas: "Jest, Vitest or Mocha" -> one entry.

TEXT
- Copy the posting's own words. Keep technology names and anything in parentheses.
- You may drop filler like "Strong" or "Solid" at the start. Never paraphrase or summarise.
- When you split an item, repeat the shared words in each entry ("5+ years of JavaScript", "5+ years of TypeScript").

CATEGORY
- technology: names a specific language, framework, library, tool or platform, also when years are attached ("4+ years of React Native").
- experience: general experience without one named technology ("5+ years of frontend development", "experience building a design system").
- domain: subject or industry knowledge (payments, accessibility, web performance).
- education: degrees and certificates.
- soft_skill: ownership, communication, collaboration.
- other: spoken languages, location, travel, availability.

SKILL
- technology entries: a lowercase kebab-case slug of the technology ("react", "next-js", "node-js", "github-actions"). With alternatives, use the first one named ("TanStack Query or SWR" -> "tanstack-query").
- every other category: null.

MIN YEARS
- The number of years if stated ("5+ years" -> 5), otherwise null. Never 0. When you split an item, every entry keeps the years.

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
  {"text":"4+ years of Vue","kind":"must","category":"technology","skill":"vue","minYears":4}
  {"text":"4+ years of Nuxt","kind":"must","category":"technology","skill":"nuxt","minYears":4}
  {"text":"A state library such as Pinia or Vuex","kind":"must","category":"technology","skill":"pinia","minYears":null}
  {"text":"Unit testing with Jest, Vitest or Mocha","kind":"must","category":"technology","skill":"jest","minYears":null}
  {"text":"Experience leading a framework migration","kind":"must","category":"experience","skill":null,"minYears":null}
  {"text":"Fluent Dutch","kind":"nice","category":"other","skill":null,"minYears":null}`;

/** qwen3's soft switch that skips its hidden reasoning step. */
export const NO_THINK = "/no_think";

export function streamExtraction({
  model,
  posting,
  disableThinking = false,
  abortSignal,
}: {
  model: LanguageModel;
  posting: string;
  /** Turn off the model's hidden reasoning step (only for models that support it). */
  disableThinking?: boolean;
  abortSignal?: AbortSignal;
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
    onError: ({ error }) => {
      console.error(
        "[extract] stream error:",
        error instanceof Error ? error.message : String(error),
      );
    },
  });
}
