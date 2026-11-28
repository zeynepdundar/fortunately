import type { ReactNode } from "react";
import type { Evaluation } from "@/lib/criteria/engine";
import { PreferenceBadges } from "./match-summary";

/**
 * The matched state of the "Your match" card: must-haves met, the gaps by name,
 * nice-to-haves and preference badges. The caller supplies the footer line.
 */
export function MatchCard({
  evaluation,
  mustByVerdict,
  footer,
  heading = "Your match",
  cvLabel = "your CV",
}: {
  evaluation: Evaluation;
  /** Texts of the must-haves the CV does not fully prove. */
  mustByVerdict: { missing: string[]; partial: string[] };
  footer: ReactNode;
  heading?: string;
  cvLabel?: string;
}) {
  const { match } = evaluation;
  // "Not stated" facts already sit in the posting details; repeat one here only
  // when it is the reason the posting is hidden.
  const preferences = evaluation.preferences.filter(
    (p) => p.status !== "unknown" || p.hidden,
  );
  const gaps = [
    { label: "Missing", items: mustByVerdict.missing },
    { label: "Partly met", items: mustByVerdict.partial },
  ].filter((g) => g.items.length > 0);

  return (
    <section
      aria-labelledby="match-heading"
      className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div className="min-w-0 flex-1">
        <h2 id="match-heading" className="text-lg font-semibold">
          {heading}
        </h2>
        {gaps.length > 0 ? (
          <div className="mt-1 flex flex-col gap-2" data-testid="gaps">
            {gaps.map((g) => (
              <div key={g.label}>
                <h3 className="text-xs font-medium text-neutral-500">
                  {g.label}
                </h3>
                <ul className="mt-0.5 list-disc pl-4 text-sm">
                  {g.items.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm">
            Every must-have is proven by {cvLabel}.
          </p>
        )}
        {match.nice.total > 0 && (
          <p className="mt-1 text-xs text-neutral-500 tabular-nums">
            {match.nice.met} of {match.nice.total} nice-to-haves met
          </p>
        )}
        <PreferenceBadges preferences={preferences} className="mt-2" />
        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          {footer}
        </p>
      </div>
      <div className="flex w-28 shrink-0 flex-col items-end">
        <span
          className="text-3xl font-semibold tabular-nums"
          data-testid="must-met"
        >
          {match.must.met}/{match.must.total}
        </span>
        <span className="text-xs text-neutral-500">must-haves met</span>
      </div>
    </section>
  );
}
