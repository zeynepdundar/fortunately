import type { DeepPartial } from "ai";
import type { Extraction, Requirement } from "@/lib/schemas";
import { normalizeSkill } from "@/lib/skills";

type PartialRequirement = DeepPartial<Requirement>;

/** Canonical, de-duplicated skill slugs; tolerates partial (streaming) arrays. */
function cleanSkills(
  skills: readonly (string | undefined)[] | undefined,
): string[] | undefined {
  if (skills === undefined) return undefined;
  const out: string[] = [];
  for (const raw of skills) {
    const slug = normalizeSkill(raw ?? null);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/**
 * Model-independent clean-up of one requirement, also safe on partial (streaming) items:
 * - canonical, de-duplicated skill slugs
 * - "experience" that names a technology becomes "technology"
 * - anyOf only when there are at least two skills
 * - no zero or negative years
 */
export function cleanRequirement<T extends PartialRequirement | Requirement>(
  item: T,
): T {
  const skills = cleanSkills(item.skills);
  const category =
    item.category === "experience" && skills && skills.length > 0
      ? "technology"
      : item.category;
  const anyOf =
    item.anyOf === undefined
      ? undefined
      : Boolean(item.anyOf) && (skills?.length ?? 0) > 1;
  const minYears =
    item.minYears === undefined
      ? undefined
      : typeof item.minYears === "number" && item.minYears > 0
        ? item.minYears
        : null;
  return {
    ...item,
    text: item.text?.trim(),
    category,
    skills,
    anyOf,
    minYears,
  };
}

/** Key used to drop exact duplicates (same text and same skills). */
function dedupeKey(item: PartialRequirement): string {
  return `${(item.text ?? "").trim().toLowerCase()}|${(item.skills ?? []).join(",")}`;
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
  items: (PartialRequirement | undefined)[],
): (PartialRequirement | undefined)[] {
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
