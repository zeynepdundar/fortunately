import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/application-status";
import type { ListedAnalysis } from "@/lib/criteria/postings-list";
import type { Profile } from "@/lib/criteria/engine";
import type { PostingFacts } from "@/lib/schemas";
import { normalizeSkill } from "@/lib/skills";

export type SkillGap = {
  /** Display name; alternatives ("React / Vue") stay together. */
  skill: string;
  /** Postings with this skill as a must-have, CV-matched. */
  asked: number;
  missing: number;
  partial: number;
};

export type CountryCount = {
  country: string | null;
  count: number;
  /** In the profile's target countries. */
  target: boolean;
};

export type Insights = {
  /** Postings counted below: every posting except Skipped. */
  postings: number;
  /** Of those, matched against a CV (the gap list uses only these). */
  matchedPostings: number;
  status: Record<ApplicationStatus, number>;
  gaps: SkillGap[];
  countries: CountryCount[];
  relocation: Record<PostingFacts["relocation"], number>;
};

const MAX_GAPS = 10;

/**
 * Aggregate the latest analysis of every posting for the Insights page. Skipped postings
 * count in the status totals only: they were a "no" and should not steer what to learn.
 */
export function buildInsights(
  analyses: ListedAnalysis[],
  profile: Pick<Profile, "targetCountries">,
): Insights {
  const status = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;
  for (const a of analyses) status[a.status]++;

  const counted = analyses.filter((a) => a.status !== "skipped");
  const gaps = new Map<string, SkillGap>();
  const countries = new Map<string | null, number>();
  const relocation = { yes: 0, no: 0, not_stated: 0 };
  let matchedPostings = 0;

  for (const a of counted) {
    countries.set(a.country, (countries.get(a.country) ?? 0) + 1);
    relocation[a.relocation]++;
    if (!a.matches.some(Boolean)) continue;
    matchedPostings++;

    // One count per skill per posting, keeping the worst verdict seen for it.
    const seen = new Map<string, { gap: SkillGap; verdict: string }>();
    a.requirements.forEach((r, i) => {
      const verdict = a.matches[i]?.verdict;
      if (r.kind !== "must" || !verdict) return;
      const skills = r.skills
        .map((s) => ({ name: s, key: normalizeSkill(s) }))
        .filter((s): s is { name: string; key: string } => Boolean(s.key));
      const groups =
        r.anyOf && skills.length > 1
          ? [
              {
                key: skills.map((s) => s.key).join("|"),
                name: skills.map((s) => s.name).join(" / "),
              },
            ]
          : skills;
      for (const g of groups) {
        const gap = gaps.get(g.key) ?? {
          skill: g.name,
          asked: 0,
          missing: 0,
          partial: 0,
        };
        gaps.set(g.key, gap);
        const prev = seen.get(g.key);
        if (!prev || rank(verdict) > rank(prev.verdict))
          seen.set(g.key, { gap, verdict });
      }
    });
    for (const { gap, verdict } of seen.values()) {
      gap.asked++;
      if (verdict === "missing") gap.missing++;
      if (verdict === "partial") gap.partial++;
    }
  }

  return {
    postings: counted.length,
    matchedPostings,
    status,
    gaps: [...gaps.values()]
      .filter((g) => g.missing + g.partial > 0)
      .sort(
        (a, b) =>
          b.missing - a.missing ||
          b.partial - a.partial ||
          b.asked - a.asked ||
          a.skill.localeCompare(b.skill),
      )
      .slice(0, MAX_GAPS),
    countries: [...countries.entries()]
      .map(([country, count]) => ({
        country,
        count,
        target: country !== null && profile.targetCountries.includes(country),
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          (a.country ?? "~").localeCompare(b.country ?? "~"),
      ),
    relocation,
  };
}

const rank = (verdict: string) =>
  verdict === "missing" ? 2 : verdict === "partial" ? 1 : 0;
