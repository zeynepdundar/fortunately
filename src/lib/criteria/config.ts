import { z } from "zod";

const importance = z.number().int().min(0).max(10);
const unknownHandling = z.enum(["show-flagged", "hide"]);
const fraction = z.number().min(0).max(1);

/**
 * A user's criteria set. Everything here is applied in code after extraction,
 * so changing it re-ranks postings instantly without calling a model.
 * Exported and imported as JSON templates.
 */
export const CriteriaConfig = z.object({
  version: z.literal(1),
  /** Importance 0–10 per criterion; normalised to percentages. 0 leaves the criterion out. */
  weights: z.object({
    technology: importance,
    years: importance,
    relocation: importance,
    country: importance,
  }),
  filters: z.object({
    /** Hide postings that rule relocation out (only when the profile needs relocation). */
    relocation: z.object({ enabled: z.boolean(), unknown: unknownHandling }),
    /** Hide postings outside the profile's target countries (only when targets are set). */
    country: z.object({ enabled: z.boolean(), unknown: unknownHandling }),
    /** Hide postings that ask for more than (your years + value). */
    yearsAbove: z.object({
      enabled: z.boolean(),
      value: z.number().int().min(0).max(30),
    }),
  }),
  /** Optional minimums, as fractions 0–1. Postings below move to "Below threshold". */
  thresholds: z.object({
    technology: fraction.nullable(),
    total: fraction.nullable(),
  }),
  technology: z.object({
    /** How much a nice-to-have counts compared with a must-have. */
    niceFactor: fraction,
    /** Points for a Partial match (Met = 1, Missing = 0). */
    partialValue: fraction,
  }),
});
export type CriteriaConfig = z.infer<typeof CriteriaConfig>;

export const DEFAULT_CRITERIA: CriteriaConfig = {
  version: 1,
  weights: { technology: 10, years: 4, relocation: 3, country: 3 },
  filters: {
    relocation: { enabled: true, unknown: "show-flagged" },
    country: { enabled: true, unknown: "show-flagged" },
    yearsAbove: { enabled: false, value: 3 },
  },
  thresholds: { technology: null, total: null },
  technology: { niceFactor: 0.3, partialValue: 0.5 },
};
