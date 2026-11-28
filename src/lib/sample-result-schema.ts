import { z } from "zod";
import type { Profile } from "@/lib/criteria/engine";
import { CheckedMatch, Extraction } from "@/lib/schemas";

/** One sample posting analysed and matched ahead of time. */
export const SampleResult = z.object({
  id: z.string(),
  posting: z.string(),
  provider: z.string(),
  model: z.string(),
  extractPromptVersion: z.string(),
  matchPromptVersion: z.string(),
  generatedAt: z.string(),
  /** The sample CV's numbered lines, so evidence renders exactly as matched. */
  cvLines: z.array(z.object({ n: z.number().int(), text: z.string() })),
  extraction: Extraction,
  /** One per requirement, in order. */
  matches: z.array(CheckedMatch),
});
export type SampleResult = z.infer<typeof SampleResult>;

/** Alex Rivera, the fictional sample candidate: 6 years, lives in Lisbon, would move. */
export const SAMPLE_PROFILE: Profile = {
  yearsOfExperience: 6,
  targetCountries: ["DE", "NL"],
  relocationNeeded: true,
};
