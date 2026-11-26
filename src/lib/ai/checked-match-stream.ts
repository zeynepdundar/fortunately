import type { DeepPartial } from "ai";
import { verifyMatch, type CvLine } from "@/lib/cv";
import type { CheckedMatch, Match } from "@/lib/schemas";

type PartialMatches = DeepPartial<{ matches: Match[] }>;

/** Model output as the stream exposes it: growing partial objects, then the final object. */
export type MatchSource = {
  partialOutputStream: AsyncIterable<PartialMatches>;
  output: PromiseLike<{ matches: Match[] }>;
};

function isComplete(m: DeepPartial<Match> | undefined): m is Match {
  return (
    !!m &&
    typeof m.requirementIndex === "number" &&
    (m.verdict === "met" ||
      m.verdict === "partial" ||
      m.verdict === "missing") &&
    Array.isArray(m.evidenceLines) &&
    m.evidenceLines.every((n) => typeof n === "number") &&
    typeof m.rationale === "string"
  );
}

/** Verify one model match against the CV and attach the cited lines' text. */
export function checkMatch(match: Match, lines: CvLine[]): CheckedMatch {
  const verified = verifyMatch(match, lines);
  const byNumber = new Map(lines.map((l) => [l.n, l.text]));
  return {
    requirementIndex: verified.requirementIndex,
    verdict: verified.verdict,
    evidence: verified.evidenceLines.map((n) => ({
      n,
      text: byNumber.get(n) ?? "",
    })),
    rationale: verified.rationale,
    verified: verified.verified,
  };
}

/**
 * Turn the model's match stream into a JSON text stream of checked matches,
 * `{"matches":[...]}`, emitting each match only once it is complete and verified.
 * Requirements the model skipped are added at the end as "missing".
 */
export function createCheckedMatchStream({
  source,
  requirementCount,
  lines,
  onComplete,
  onFailure,
}: {
  source: MatchSource;
  requirementCount: number;
  lines: CvLine[];
  onComplete?: (matches: CheckedMatch[]) => Promise<void> | void;
  onFailure?: () => Promise<void> | void;
}): ReadableStream<string> {
  const emitted = new Map<number, CheckedMatch>();

  return new ReadableStream<string>({
    async start(controller) {
      let first = true;
      const emit = (match: Match) => {
        if (
          match.requirementIndex < 0 ||
          match.requirementIndex >= requirementCount
        )
          return;
        if (emitted.has(match.requirementIndex)) return;
        const checked = checkMatch(match, lines);
        emitted.set(match.requirementIndex, checked);
        controller.enqueue(`${first ? "" : ","}${JSON.stringify(checked)}`);
        first = false;
      };

      controller.enqueue('{"matches":[');
      try {
        let done = 0;
        for await (const partial of source.partialOutputStream) {
          const items = partial.matches ?? [];
          // An item is final once the model has started the next one.
          while (done < items.length - 1) {
            const item = items[done];
            if (isComplete(item)) emit(item);
            done++;
          }
        }
        const final = await source.output;
        for (const item of final.matches) emit(item);
        for (let i = 0; i < requirementCount; i++) {
          if (!emitted.has(i)) {
            emit({
              requirementIndex: i,
              verdict: "missing",
              evidenceLines: [],
              rationale: "Not assessed by the model.",
            });
          }
        }
        const ordered = [...emitted.values()].sort(
          (a, b) => a.requirementIndex - b.requirementIndex,
        );
        // Save before closing: on serverless hosts work after the response ends may not run.
        await onComplete?.(ordered);
        controller.enqueue("]}");
        controller.close();
      } catch (error) {
        await onFailure?.();
        controller.error(error);
      }
    },
  });
}
