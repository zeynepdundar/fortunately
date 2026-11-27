import type { Extraction, PostingFacts, Requirement } from "@/lib/schemas";
import { normalizeSkill } from "@/lib/skills";

/** A predicted and a gold requirement count as the same item at or above this similarity. */
export const MATCH_THRESHOLD = 0.5;

const STOPWORDS = new Set(
  "a an and are as at be by for from in is of on or the to with you your our we experience years year plus".split(
    " ",
  ),
);

const skillSet = (r: Pick<Requirement, "skills">) =>
  new Set(
    r.skills
      .map((s) => normalizeSkill(s))
      .filter((s): s is string => Boolean(s)),
  );

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared);
}

/**
 * How alike two requirements are, 0–1. Items that name technologies compare their skill
 * sets; items without technologies compare the words of their text.
 */
export function similarity(predicted: Requirement, gold: Requirement): number {
  const p = skillSet(predicted);
  const g = skillSet(gold);
  if (p.size > 0 || g.size > 0) return jaccard(p, g);
  return jaccard(words(predicted.text), words(gold.text));
}

export type Pair = { predicted: number; gold: number; similarity: number };

/** Greedy one-to-one pairing, most similar pairs first. */
export function pairRequirements(
  predicted: Requirement[],
  gold: Requirement[],
): Pair[] {
  const candidates: Pair[] = [];
  predicted.forEach((p, i) =>
    gold.forEach((g, j) => {
      const s = similarity(p, g);
      if (s >= MATCH_THRESHOLD)
        candidates.push({ predicted: i, gold: j, similarity: s });
    }),
  );
  candidates.sort(
    (a, b) =>
      b.similarity - a.similarity ||
      a.gold - b.gold ||
      a.predicted - b.predicted,
  );
  const usedP = new Set<number>();
  const usedG = new Set<number>();
  const pairs: Pair[] = [];
  for (const c of candidates) {
    if (usedP.has(c.predicted) || usedG.has(c.gold)) continue;
    usedP.add(c.predicted);
    usedG.add(c.gold);
    pairs.push(c);
  }
  return pairs.sort((a, b) => a.gold - b.gold);
}

/** Correct / total counts; turned into rates when cases are summed. */
export type Tally = { correct: number; total: number };

const FACT_FIELDS = ["country", "workMode", "relocation"] as const;
type FactField = (typeof FACT_FIELDS)[number];

export type CaseScore = {
  predicted: number;
  gold: number;
  paired: number;
  kind: Tally;
  category: Tally;
  anyOf: Tally;
  minYears: Tally;
  /** Every skill slug across all items: predicted vs gold. */
  skills: { predicted: number; gold: number; shared: number };
  facts: Record<FactField, Tally>;
  missed: string[];
  extra: string[];
};

const tally = (ok: boolean): Tally => ({ correct: ok ? 1 : 0, total: 1 });
const add = (a: Tally, b: Tally): Tally => ({
  correct: a.correct + b.correct,
  total: a.total + b.total,
});
const sumTallies = (ts: Tally[]) =>
  ts.reduce(add, { correct: 0, total: 0 } as Tally);

const sameFact = (a: unknown, b: unknown) =>
  (typeof a === "string" ? a.toLowerCase() : a) ===
  (typeof b === "string" ? b.toLowerCase() : b);

/** Score one predicted extraction against its gold labels. */
export function scoreCase(predicted: Extraction, gold: Extraction): CaseScore {
  const pairs = pairRequirements(predicted.requirements, gold.requirements);
  const pairOf = (field: keyof Requirement) =>
    sumTallies(
      pairs.map((p) =>
        tally(
          predicted.requirements[p.predicted][field] ===
            gold.requirements[p.gold][field],
        ),
      ),
    );

  const allSkills = (e: Extraction) =>
    new Set(e.requirements.flatMap((r) => [...skillSet(r)]));
  const ps = allSkills(predicted);
  const gs = allSkills(gold);
  let shared = 0;
  for (const s of ps) if (gs.has(s)) shared++;

  const pairedP = new Set(pairs.map((p) => p.predicted));
  const pairedG = new Set(pairs.map((p) => p.gold));

  return {
    predicted: predicted.requirements.length,
    gold: gold.requirements.length,
    paired: pairs.length,
    kind: pairOf("kind"),
    category: pairOf("category"),
    anyOf: pairOf("anyOf"),
    minYears: pairOf("minYears"),
    skills: { predicted: ps.size, gold: gs.size, shared },
    facts: Object.fromEntries(
      FACT_FIELDS.map((f) => [
        f,
        tally(sameFact(predicted.facts[f], gold.facts[f])),
      ]),
    ) as Record<FactField, Tally>,
    missed: gold.requirements
      .filter((_, j) => !pairedG.has(j))
      .map((r) => r.text),
    extra: predicted.requirements
      .filter((_, i) => !pairedP.has(i))
      .map((r) => r.text),
  };
}

export type Summary = {
  cases: number;
  precision: number;
  recall: number;
  f1: number;
  skillPrecision: number;
  skillRecall: number;
  kindAccuracy: number;
  categoryAccuracy: number;
  anyOfAccuracy: number;
  minYearsAccuracy: number;
  factsAccuracy: Record<FactField, number>;
};

const rate = (t: Tally) => (t.total === 0 ? 0 : t.correct / t.total);
const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

/** Micro-averaged metrics over all cases. */
export function summarize(scores: CaseScore[]): Summary {
  const paired = scores.reduce((n, s) => n + s.paired, 0);
  const predicted = scores.reduce((n, s) => n + s.predicted, 0);
  const gold = scores.reduce((n, s) => n + s.gold, 0);
  const precision = ratio(paired, predicted);
  const recall = ratio(paired, gold);
  const sum = (pick: (s: CaseScore) => Tally) =>
    rate(sumTallies(scores.map(pick)));
  return {
    cases: scores.length,
    precision,
    recall,
    f1: ratio(2 * precision * recall, precision + recall),
    skillPrecision: ratio(
      scores.reduce((n, s) => n + s.skills.shared, 0),
      scores.reduce((n, s) => n + s.skills.predicted, 0),
    ),
    skillRecall: ratio(
      scores.reduce((n, s) => n + s.skills.shared, 0),
      scores.reduce((n, s) => n + s.skills.gold, 0),
    ),
    kindAccuracy: sum((s) => s.kind),
    categoryAccuracy: sum((s) => s.category),
    anyOfAccuracy: sum((s) => s.anyOf),
    minYearsAccuracy: sum((s) => s.minYears),
    factsAccuracy: Object.fromEntries(
      FACT_FIELDS.map((f) => [f, sum((s) => s.facts[f])]),
    ) as Record<FactField, number>,
  };
}

export type { PostingFacts };
