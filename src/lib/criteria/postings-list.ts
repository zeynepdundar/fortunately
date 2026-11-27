import type { ApplicationStatus } from "@/lib/application-status";
import type { CheckedMatch, PostingFacts, Requirement } from "@/lib/schemas";
import type { CriteriaConfig } from "./config";
import {
  compareEvaluations,
  evaluatePosting,
  type Evaluation,
  type PostingInput,
  type Profile,
} from "./engine";

/** One saved analysis as the postings list needs it (the latest one per posting). */
export type ListedAnalysis = {
  analysisId: string;
  postingId: string;
  status: ApplicationStatus;
  statusChangedAt: Date | null;
  title: string;
  company: string | null;
  city: string | null;
  country: string | null;
  workMode: PostingFacts["workMode"];
  relocation: PostingFacts["relocation"];
  createdAt: Date;
  requirements: (PostingInput["requirements"][number] &
    Pick<Requirement, "category" | "skills">)[];
  matches: (Pick<CheckedMatch, "verdict"> | undefined)[];
};

export type ListedPosting = {
  analysis: ListedAnalysis;
  evaluation: Evaluation;
  verdicts: { met: number; partial: number; missing: number; matched: boolean };
};

export type PostingList = {
  shown: ListedPosting[];
  belowThreshold: ListedPosting[];
  filteredOut: ListedPosting[];
};

/** Evaluate every posting with the criteria engine and split it into the three sections. */
export function buildPostingList(
  analyses: ListedAnalysis[],
  profile: Profile,
  config: CriteriaConfig,
): PostingList {
  const listed = analyses
    .map((analysis): ListedPosting => {
      const verdicts = { met: 0, partial: 0, missing: 0, matched: false };
      for (const m of analysis.matches) {
        if (!m) continue;
        verdicts[m.verdict]++;
        verdicts.matched = true;
      }
      return {
        analysis,
        verdicts,
        evaluation: evaluatePosting(
          {
            facts: {
              country: analysis.country,
              relocation: analysis.relocation,
              workMode: analysis.workMode,
            },
            requirements: analysis.requirements,
            matches: analysis.matches,
          },
          profile,
          config,
        ),
      };
    })
    .sort(
      (a, b) =>
        compareEvaluations(a.evaluation, b.evaluation) ||
        b.analysis.createdAt.getTime() - a.analysis.createdAt.getTime(),
    );

  return {
    shown: listed.filter((p) => p.evaluation.bucket === "shown"),
    belowThreshold: listed.filter(
      (p) => p.evaluation.bucket === "below_threshold",
    ),
    filteredOut: listed.filter((p) => p.evaluation.bucket === "filtered_out"),
  };
}

/** Profile values the engine uses when the visitor has not filled in a profile yet. */
export const EMPTY_PROFILE: Profile = {
  yearsOfExperience: null,
  targetCountries: [],
  relocationNeeded: false,
};

/** The engine's view of a stored profile; the empty profile when there is none. */
export function toEngineProfile(
  profile: Pick<
    Profile,
    "yearsOfExperience" | "targetCountries" | "relocationNeeded"
  > | null,
): Profile {
  if (!profile) return EMPTY_PROFILE;
  return {
    yearsOfExperience: profile.yearsOfExperience,
    targetCountries: profile.targetCountries,
    relocationNeeded: profile.relocationNeeded,
  };
}
