/** Headings that introduce nice-to-have requirements. */
const NICE_HEADING =
  /\b(nice[\s-]to[\s-]haves?|bonus(?: points)?|preferred(?: qualifications| skills)?|should have|plus(?:es)?|good to have)\b/i;

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+\S/;

/** The heading text when the line is a heading: "## Bonus", "**Bonus**", "Nice to have:". */
function headingText(line: string): string | null {
  const trimmed = line.trim();
  const markdown = /^#{1,6}\s+(.+)$/.exec(trimmed);
  if (markdown) return markdown[1].trim();
  const bold = /^\*\*(.+?)\*\*:?$/.exec(trimmed);
  if (bold) return bold[1].trim();
  if (!BULLET.test(trimmed) && trimmed.length <= 60 && /:$/.test(trimmed))
    return trimmed.slice(0, -1).trim();
  return null;
}

export type SectionHint = { heading: string; lines: number };

/**
 * Nice-to-have sections and how many bullet lines each holds, found by code so the model
 * can be told what to expect. Small models sometimes skip these sections entirely.
 */
export function niceSections(posting: string): SectionHint[] {
  const hints: SectionHint[] = [];
  let current: SectionHint | null = null;
  for (const line of posting.split("\n")) {
    const heading = headingText(line);
    if (heading !== null) {
      current = NICE_HEADING.test(heading) ? { heading, lines: 0 } : null;
      if (current) hints.push(current);
      continue;
    }
    if (current && BULLET.test(line)) current.lines++;
  }
  return hints.filter((h) => h.lines > 0);
}

/** One sentence for the prompt, or an empty string when there is nothing to hint. */
export function niceSectionHint(posting: string): string {
  const hints = niceSections(posting);
  if (hints.length === 0) return "";
  const list = hints
    .map((h) => `"${h.heading}" (${h.lines} line${h.lines === 1 ? "" : "s"})`)
    .join(", ");
  return `This posting has nice-to-have sections: ${list}. Return every one of those lines as its own entry with kind "nice".`;
}
