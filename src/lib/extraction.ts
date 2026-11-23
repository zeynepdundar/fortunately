import type { DeepPartial } from "ai";
import type { Extraction, Requirement } from "@/lib/schemas";
import { normalizeSkill } from "@/lib/skills";

/**
 * Model-independent clean-up of one requirement:
 * canonical skill slug, skill only on technology items, no zero or negative years.
 * Works on partial (streaming) items too.
 */
export function cleanRequirement<
  T extends DeepPartial<Requirement> | Requirement,
>(item: T): T {
  const minYears =
    typeof item.minYears === "number" && item.minYears > 0
      ? item.minYears
      : item.minYears === undefined
        ? undefined
        : null;
  const skill =
    item.category === undefined
      ? (normalizeSkill(item.skill ?? null) ?? item.skill)
      : item.category === "technology"
        ? normalizeSkill(item.skill ?? null)
        : null;
  return { ...item, text: item.text?.trim(), skill, minYears };
}

/** Key used to drop exact duplicates (same text and same skill). */
function dedupeKey(item: DeepPartial<Requirement>): string {
  return `${(item.text ?? "").trim().toLowerCase()}|${item.skill ?? ""}`;
}

/** Clean every requirement and drop exact duplicates, keeping the first. */
export function cleanExtraction(extraction: Extraction): Extraction {
  const seen = new Set<string>();
  const requirements: Requirement[] = [];
  for (const raw of extraction.requirements) {
    const item = cleanRequirement(raw);
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    requirements.push(item);
  }
  return { requirements };
}

/** Streaming variant for the UI: clean each partial item, hide complete duplicates. */
export function cleanPartialRequirements(
  items: (DeepPartial<Requirement> | undefined)[],
): (DeepPartial<Requirement> | undefined)[] {
  const seen = new Set<string>();
  return items.flatMap((raw) => {
    if (!raw) return [raw];
    const item = cleanRequirement(raw);
    if (!item.text || !item.category) return [item];
    const key = dedupeKey(item);
    if (seen.has(key)) return [];
    seen.add(key);
    return [item];
  });
}
