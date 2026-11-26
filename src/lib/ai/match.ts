import { Output, streamText, type LanguageModel } from "ai";
import { formatForPrompt, type CvLine } from "@/lib/cv";
import { MatchBatch, type Requirement } from "@/lib/schemas";

/** Bump when the instructions change, so eval results stay comparable. */
export const MATCH_PROMPT_VERSION = "match-v1";

export const MATCH_INSTRUCTIONS = `You compare a candidate's CV with the requirements of a job posting.
The CV lines are numbered as "N| text". Requirements are numbered as "[i]".

Return exactly one match per requirement, in the same order, with:
- requirementIndex: the requirement's number i.
- verdict:
  - "met": the CV clearly shows it: the technology was used, the years are reached, the degree or language is held.
  - "partial": related but weaker: fewer years than asked, a closely related technology, only some of several required technologies, or a technology that appears only in a skills list.
  - "missing": nothing in the CV supports it.
- For a requirement marked "one of", the CV needs only one of the listed technologies.
- Years: work them out from the dates in the CV ("2020 to 2023" is 3 years; "present" means today).
- evidenceLines: the numbers of the CV lines that support the verdict. Required for "met" and "partial", empty for "missing". Cite only lines that really support it; never invent a number.
- rationale: one short sentence explaining the verdict.`;

/** "[3] must · technology · one of: vite, webpack · 5+ years — Strong knowledge of build tools" */
export function formatRequirements(requirements: Requirement[]): string {
  return requirements
    .map((r, i) => {
      const skills =
        r.skills.length > 0
          ? ` · ${r.anyOf && r.skills.length > 1 ? "one of" : "all of"}: ${r.skills.join(", ")}`
          : "";
      const years = r.minYears ? ` · ${r.minYears}+ years` : "";
      return `[${i}] ${r.kind} · ${r.category}${skills}${years} — ${r.text}`;
    })
    .join("\n");
}

export function streamMatches({
  model,
  requirements,
  cvLines,
  today,
  disableThinking = false,
  abortSignal,
}: {
  model: LanguageModel;
  requirements: Requirement[];
  cvLines: CvLine[];
  /** ISO date used to resolve "present" in CV dates. */
  today: string;
  disableThinking?: boolean;
  abortSignal?: AbortSignal;
}) {
  const prefix = disableThinking ? "/no_think\n" : "";
  return streamText({
    model,
    instructions: MATCH_INSTRUCTIONS,
    prompt: `${prefix}Today is ${today}.\n\nCV:\n<cv>\n${formatForPrompt(cvLines)}\n</cv>\n\nRequirements:\n<requirements>\n${formatRequirements(requirements)}\n</requirements>`,
    output: Output.object({ schema: MatchBatch }),
    providerOptions: disableThinking
      ? { ollama: { reasoningEffort: "none" } }
      : undefined,
    abortSignal,
    onError: ({ error }) => {
      console.error(
        "[match] stream error:",
        error instanceof Error ? error.message : String(error),
      );
    },
  });
}
