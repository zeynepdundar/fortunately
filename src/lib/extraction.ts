import type { DeepPartial } from "ai";
import type { Extraction, Requirement } from "@/lib/schemas";
import { normalizeSkill } from "@/lib/skills";

type PartialRequirement = DeepPartial<Requirement>;

/** Generic words a model sometimes emits as a "skill" when splitting a phrase. */
const NOT_A_SKILL = new Set([
  "workspaces",
  "tools",
  "tooling",
  "framework",
  "frameworks",
  "library",
  "libraries",
  "experience",
]);

/** Words that mark a list of technologies as alternatives. */
const ALTERNATIVES = /\b(or|and\/or|such as|e\.g\.|or similar)\b/i;

/** Version phrases that use "or" without listing alternatives ("v17 or later"). */
const VERSION_OR = /\bor (later|newer|higher|above|greater|more)\b/gi;

function listsAlternatives(text: string): boolean {
  return ALTERNATIVES.test(text.replace(VERSION_OR, ""));
}

/**
 * Restore the posting's own casing when the model changed it
 * ("angular (v17 or later)" -> "Angular (v17 or later)").
 */
export function restoreCasing(
  text: string,
  posting: string | undefined,
): string {
  if (!posting || !text) return text;
  const index = posting.toLowerCase().indexOf(text.toLowerCase());
  if (index === -1) return text;
  const original = posting.slice(index, index + text.length);
  return original.toLowerCase() === text.toLowerCase() ? original : text;
}

/** Canonical, de-duplicated skill slugs; tolerates partial (streaming) arrays. */
function cleanSkills(
  skills: readonly (string | undefined)[] | undefined,
): string[] | undefined {
  if (skills === undefined) return undefined;
  const out: string[] = [];
  for (const raw of skills) {
    const slug = normalizeSkill(raw ?? null);
    if (slug && !NOT_A_SKILL.has(slug) && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/**
 * Model-independent clean-up of one requirement, also safe on partial (streaming) items:
 * - canonical, de-duplicated skill slugs
 * - "experience" that names a technology becomes "technology"
 * - anyOf only when there are at least two skills; set when the text lists
 *   alternatives ("or", "such as")
 * - no zero or negative years
 * - the posting's own casing, when the posting is given
 */
export function cleanRequirement<T extends PartialRequirement | Requirement>(
  item: T,
  posting?: string,
): T {
  const skills = cleanSkills(item.skills);
  const category =
    item.category === "experience" && skills && skills.length > 0
      ? "technology"
      : item.category;
  const text =
    item.text === undefined
      ? undefined
      : restoreCasing(item.text.trim(), posting);
  const manySkills = (skills?.length ?? 0) > 1;
  const alternatives = text !== undefined && listsAlternatives(text);
  const anyOf =
    item.anyOf === undefined && !alternatives
      ? undefined
      : manySkills && (Boolean(item.anyOf) || alternatives);
  const minYears =
    item.minYears === undefined
      ? undefined
      : typeof item.minYears === "number" && item.minYears > 0
        ? item.minYears
        : null;
  return {
    ...item,
    text,
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
export function cleanExtraction(
  extraction: Extraction,
  posting?: string,
): Extraction {
  const seen = new Set<string>();
  const requirements: Requirement[] = [];
  for (const raw of extraction.requirements) {
    const item = cleanRequirement(raw, posting);
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
  posting?: string,
): (PartialRequirement | undefined)[] {
  const seen = new Set<string>();
  return items.flatMap((raw) => {
    if (!raw) return [raw];
    const item = cleanRequirement(raw, posting);
    if (!item.text || !item.category) return [item];
    const key = dedupeKey(item);
    if (seen.has(key)) return [];
    seen.add(key);
    return [item];
  });
}
