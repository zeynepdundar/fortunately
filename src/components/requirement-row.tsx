import type { DeepPartial } from "ai";
import type { Requirement } from "@/lib/schemas";

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
}: {
  index: number;
  item: DeepPartial<Requirement> | undefined;
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
          {item?.skill && <Badge>{item.skill}</Badge>}
          {typeof item?.minYears === "number" && (
            <Badge>{item.minYears}+ yrs</Badge>
          )}
        </div>
      </div>
    </li>
  );
}
