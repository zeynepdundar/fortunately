import { createHash } from "node:crypto";

/** Stable hash of a posting, ignoring whitespace differences, for de-duplication. */
export function postingHash(posting: string): string {
  const normalized = posting.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/** A short title for lists: the first heading or first non-empty line, max 120 chars. */
export function postingTitle(posting: string): string {
  const line =
    posting
      .split(/\r?\n/)
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .find((l) => l.length > 0) ?? "Untitled posting";
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}
