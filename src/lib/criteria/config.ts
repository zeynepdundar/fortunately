import { z } from "zod";

const preference = z.object({
  /** Hide postings that clearly do not meet this preference. */
  hideMismatches: z.boolean(),
  /** Hide postings that do not state it (otherwise they are shown with a flag). */
  hideUnknown: z.boolean(),
});

export const WorkModeId = z.enum(["remote", "hybrid", "onsite"]);

/**
 * A user's criteria. The MVP ranks by facts (must-haves met), not by a weighted score:
 * users set how many missing must-haves they accept and their own preferences.
 * Applied in code after extraction, so changes re-rank postings instantly.
 */
export const CriteriaConfig = z.object({
  version: z.literal(3),
  /** More missing must-haves than this moves a posting to "Below threshold". */
  allowedMissingMust: z.number().int().min(0).max(3),
  preferences: z.object({
    /** Only applies when the profile says relocation is needed. */
    relocation: preference,
    /** Only applies when the profile has target countries. */
    country: preference,
    /** Accepted work modes; all three means any. */
    workMode: preference.extend({ accepted: z.array(WorkModeId).min(1) }),
  }),
});
export type CriteriaConfig = z.infer<typeof CriteriaConfig>;

export const DEFAULT_CRITERIA: CriteriaConfig = {
  version: 3,
  allowedMissingMust: 1,
  preferences: {
    relocation: { hideMismatches: true, hideUnknown: false },
    country: { hideMismatches: true, hideUnknown: false },
    workMode: {
      accepted: ["remote", "hybrid", "onsite"],
      hideMismatches: true,
      hideUnknown: false,
    },
  },
};

/** Read criteria stored as JSON; anything missing, old or invalid falls back to the defaults. */
export function parseStoredCriteria(value: unknown): {
  config: CriteriaConfig;
  isDefault: boolean;
} {
  const parsed = CriteriaConfig.safeParse(value);
  return parsed.success
    ? { config: parsed.data, isDefault: false }
    : { config: DEFAULT_CRITERIA, isDefault: true };
}
