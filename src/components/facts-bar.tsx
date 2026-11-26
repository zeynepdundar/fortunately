import type { DeepPartial } from "ai";
import type { PostingFacts } from "@/lib/schemas";

const WORK_MODE: Record<NonNullable<PostingFacts["workMode"]>, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const RELOCATION = {
  yes: {
    label: "Relocation offered",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  no: {
    label: "No relocation",
    className:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
  },
  not_stated: {
    label: "Relocation not stated",
    className:
      "bg-neutral-50 text-neutral-600 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-800",
  },
} as const;

/** Company, location, work mode and relocation for one posting; tolerates partial (streaming) facts. */
export function FactsBar({
  facts,
}: {
  facts: DeepPartial<PostingFacts> | null | undefined;
}) {
  if (!facts) return null;
  const location = [facts.city, facts.country].filter(Boolean).join(", ");
  const relocation = facts.relocation ? RELOCATION[facts.relocation] : null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm"
      data-testid="facts"
    >
      {facts.company && <span className="font-medium">{facts.company}</span>}
      <span className="text-neutral-600 dark:text-neutral-400">
        {location || "Location not stated"}
      </span>
      {facts.workMode && (
        <span className="text-neutral-600 dark:text-neutral-400">
          {WORK_MODE[facts.workMode]}
        </span>
      )}
      {relocation && (
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${relocation.className}`}
        >
          {relocation.label}
        </span>
      )}
    </div>
  );
}
