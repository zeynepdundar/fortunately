import type { Match } from "./schemas";

export type CvLine = { n: number; text: string };

/** Split CV text into 1-based numbered, non-empty lines. */
export function toNumberedLines(raw: string): CvLine[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, i) => ({ n: i + 1, text }));
}

/** Render numbered lines for the prompt: "12| Built a design system in React". */
export function formatForPrompt(lines: CvLine[]): string {
  return lines.map((l) => `${l.n}| ${l.text}`).join("\n");
}

export type VerifiedMatch = Match & { verified: boolean };

/**
 * Evidence check enforced in code, not by prompt: every cited line must exist.
 * A met/partial verdict with no valid evidence is downgraded to "missing".
 */
export function verifyMatch(match: Match, lines: CvLine[]): VerifiedMatch {
  const known = new Set(lines.map((l) => l.n));
  const cited = [...new Set(match.evidenceLines)];
  const evidenceLines = cited.filter((n) => known.has(n));
  const allCitedExist = evidenceLines.length === cited.length;

  if (match.verdict === "missing") {
    return { ...match, evidenceLines: [], verified: true };
  }
  if (evidenceLines.length === 0 || !allCitedExist) {
    return { ...match, verdict: "missing", evidenceLines: [], verified: false };
  }
  return { ...match, evidenceLines, verified: true };
}
