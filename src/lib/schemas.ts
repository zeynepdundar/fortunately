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
  /** Every technology the requirement names, as canonical slugs ("react", "next-js"). */
  skills: z.array(z.string()),
  /** true when the skills are alternatives ("Vite, webpack or Turbopack"): any one is enough. */
  anyOf: z.boolean(),
  minYears: z.number().int().nullable(),
});
export type Requirement = z.infer<typeof Requirement>;

/** Facts about the job itself, used by filters and the criteria engine. */
export const PostingFacts = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  /** ISO 3166-1 alpha-2 code of the job location, e.g. "DE". Null when not stated or not one country. */
  country: z.string().nullable(),
  city: z.string().nullable(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).nullable(),
  /** "yes" or "no" only when the posting says so explicitly. */
  relocation: z.enum(["yes", "no", "not_stated"]),
});
export type PostingFacts = z.infer<typeof PostingFacts>;

export const Extraction = z.object({
  facts: PostingFacts,
  requirements: z.array(Requirement),
});
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
