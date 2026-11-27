import type { DeepPartial } from "ai";
import type { CheckedMatch, Requirement } from "@/lib/schemas";

const CATEGORY_LABEL: Record<Requirement["category"], string> = {
  technology: "Tech",
  experience: "Experience",
  domain: "Domain",
  education: "Education",
  soft_skill: "Soft skill",
  other: "Other",
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "must" | "nice" | "neutral";
}) {
  const tones = {
    must: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
    nice: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
    neutral:
      "bg-neutral-50 text-neutral-600 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** One requirement; renders a skeleton while the streamed item is still incomplete. */
export function RequirementRow({
  index,
  item,
  match,
  yearsOfExperience,
}: {
  index: number;
  item: DeepPartial<Requirement> | undefined;
  /** The checked CV match for this requirement, once available. */
  match?: DeepPartial<CheckedMatch>;
  /** The visitor's years from Profile; pass it to explain year requirements (null = not filled in). */
  yearsOfExperience?: number | null;
}) {
  const ready = Boolean(item?.text);
  return (
    <li
      className="flex gap-3 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-900"
      data-testid="requirement"
    >
      <span className="w-6 shrink-0 pt-0.5 text-right text-xs text-neutral-400 tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {ready ? (
          <p className="text-sm text-neutral-900 dark:text-neutral-100">
            {item?.text}
          </p>
        ) : (
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        )}
        <div className="mt-1.5 flex min-h-5 flex-wrap gap-1.5">
          {item?.kind && (
            <Badge tone={item.kind}>
              {item.kind === "must" ? "Must" : "Nice"}
            </Badge>
          )}
          {item?.category && <Badge>{CATEGORY_LABEL[item.category]}</Badge>}
          {item?.anyOf && (item.skills?.length ?? 0) > 1 && (
            <span className="self-center text-xs text-neutral-500">one of</span>
          )}
          {item?.skills?.map((skill, i) =>
            skill ? <Badge key={`${skill}-${i}`}>{skill}</Badge> : null,
          )}
          {typeof item?.minYears === "number" && (
            <Badge>{item.minYears}+ yrs</Badge>
          )}
        </div>
        {typeof item?.minYears === "number" &&
          yearsOfExperience !== undefined && (
            <p className="mt-1.5 text-xs text-neutral-500" data-testid="years">
              {yearsOfExperience === null
                ? `Asks ${item.minYears}+ years; add yours in Profile`
                : `Asks ${item.minYears}+ years, you have ${yearsOfExperience}`}
            </p>
          )}
        {match?.verdict && (
          <div className="mt-2 flex flex-col gap-1 text-xs" data-testid="match">
            {match.evidence
              ?.filter((e) => e?.text)
              .map((e) => (
                <p
                  key={e?.n}
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  <span className="mr-1.5 font-mono text-neutral-400 tabular-nums">
                    L{e?.n}
                  </span>
                  &ldquo;{e?.text}&rdquo;
                </p>
              ))}
            {match.rationale && (
              <p className="text-neutral-500">{match.rationale}</p>
            )}
            {match.verified === false && (
              <p className="text-amber-700 dark:text-amber-400">
                The model cited a CV line that does not exist, so this was
                marked missing.
              </p>
            )}
          </div>
        )}
      </div>
      {match?.verdict && <VerdictChip verdict={match.verdict} />}
    </li>
  );
}

const VERDICT = {
  met: {
    label: "Met",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  partial: {
    label: "Partial",
    className:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  },
  missing: {
    label: "Missing",
    className:
      "bg-neutral-100 text-neutral-600 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-700",
  },
} as const;

export function VerdictChip({ verdict }: { verdict: CheckedMatch["verdict"] }) {
  const v = VERDICT[verdict];
  return (
    <span
      className={`h-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${v.className}`}
    >
      {v.label}
    </span>
  );
}
