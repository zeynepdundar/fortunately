import { Output, streamText, type LanguageModel } from "ai";
import { Extraction } from "@/lib/schemas";

/** Bump when the instructions change, so eval results stay comparable. */
export const EXTRACTION_PROMPT_VERSION = "extract-v1";

export const EXTRACTION_INSTRUCTIONS = `You extract the candidate requirements from a job posting.

Rules:
- Extract qualifications the candidate is expected to have. Skip company descriptions, benefits, salary and the team's day-to-day duties.
- A technology mentioned only under responsibilities (not under requirements) counts as kind "nice".
- kind is "must" for required items (Requirements, Must have, You have, What you bring) and "nice" for optional ones (Nice to have, Bonus, Should have, Preferred, a plus).
- Split compound items: "React and TypeScript" becomes two requirements.
- A choice between alternatives ("Vite, webpack or Turbopack") stays one requirement; use the first option as its skill.
- text: the requirement as written in the posting, shortened to at most 12 words. Never invent wording.
- category: technology, experience (years or seniority), domain (industry knowledge), education, soft_skill, or other (languages, location, travel).
- skill: for technology items, a lowercase kebab-case slug of the technology ("react", "typescript", "next-js", "node-js", "github-actions"). null for everything else.
- minYears: the number of years if the posting states one ("5+ years" -> 5), else null.
- Keep the order of the posting. Do not add requirements that are not in the posting.`;

export function streamExtraction({
  model,
  posting,
  abortSignal,
}: {
  model: LanguageModel;
  posting: string;
  abortSignal?: AbortSignal;
}) {
  return streamText({
    model,
    instructions: EXTRACTION_INSTRUCTIONS,
    prompt: `Job posting:\n<posting>\n${posting}\n</posting>`,
    output: Output.object({ schema: Extraction }),
    abortSignal,
  });
}
