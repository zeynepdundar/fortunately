import { z } from "zod";

/** One requirement extracted from a job posting. Shared by server, client and evals. */
export const Requirement = z.object({
  /** As written in the posting. */
  text: z.string(),
  kind: z.enum(["must", "nice"]),
  category: z.enum([
    "technology",
    "experience",
    "domain",
    "education",
    "soft_skill",
    "other",
  ]),
  /** Canonical slug, e.g. "react". Null for non-technology items. */
  skill: z.string().nullable(),
  minYears: z.number().int().nullable(),
});
export type Requirement = z.infer<typeof Requirement>;

export const Extraction = z.object({ requirements: z.array(Requirement) });
export type Extraction = z.infer<typeof Extraction>;

/**
 * The model only cites CV line numbers. It never writes the quote itself:
 * the UI prints the cited lines from the stored CV.
 */
export const Match = z.object({
  requirementIndex: z.number().int(),
  verdict: z.enum(["met", "partial", "missing"]),
  evidenceLines: z.array(z.number().int()),
  rationale: z.string().max(240),
});
export type Match = z.infer<typeof Match>;

export const MatchBatch = z.object({ matches: z.array(Match) });
