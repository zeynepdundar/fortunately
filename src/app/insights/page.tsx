import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { isDbEnabled } from "@/db";
import { APPLICATION_STATUSES, STATUS_LABEL } from "@/lib/application-status";
import { buildInsights, type Insights } from "@/lib/insights";
import { listLatestAnalyses } from "@/lib/persistence/postings";
import { getProfile } from "@/lib/persistence/profile";
import { readWorkspaceId } from "@/lib/persistence/workspace";

export const metadata: Metadata = { title: "Insights — Fortunately" };

export default function InsightsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-neutral-500">
          What your postings have in common. Skipped postings are left out of
          the gaps, countries and relocation.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        }
      >
        <InsightsLoader />
      </Suspense>
    </main>
  );
}

async function InsightsLoader() {
  // Always per request: depends on the visitor's cookie and the runtime DATABASE_URL.
  await connection();
  if (!isDbEnabled()) {
    return (
      <p
        role="status"
        className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        Insights read saved analyses from Postgres. Set{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> to use them.
      </p>
    );
  }

  const workspaceId = await readWorkspaceId();
  const [analyses, profile] = workspaceId
    ? await Promise.all([
        listLatestAnalyses(workspaceId),
        getProfile(workspaceId),
      ])
    : [[], null];

  if (analyses.length === 0) {
    return (
      <p
        role="status"
        className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700"
      >
        No postings yet.{" "}
        <Link href="/analyze" className="font-medium underline">
          Analyze a few postings
        </Link>{" "}
        to see what they have in common.
      </p>
    );
  }

  const insights = buildInsights(analyses, {
    targetCountries: profile?.targetCountries ?? [],
  });

  return (
    <div className="flex flex-col gap-8">
      <StatusCounts status={insights.status} />
      <Gaps insights={insights} />
      <Countries insights={insights} />
      <Relocation relocation={insights.relocation} />
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-lg font-semibold">
      {children}
    </h2>
  );
}

function StatusCounts({ status }: { status: Insights["status"] }) {
  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-3">
      <SectionTitle id="status-heading">Applications</SectionTitle>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {APPLICATION_STATUSES.map((s) => (
          <div
            key={s}
            className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
          >
            <dt className="text-xs text-neutral-500">{STATUS_LABEL[s]}</dt>
            <dd className="text-xl font-semibold tabular-nums">{status[s]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One horizontal bar row: label, bar scaled to `max`, and the number with its detail. */
function BarRow({
  label,
  value,
  max,
  detail,
  badge,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
  badge?: string;
}) {
  const width = max === 0 ? 0 : Math.max(2, (100 * value) / max);
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-x-3 gap-y-0.5 py-1.5 text-sm">
      <span className="truncate" title={label}>
        {label}
        {badge && (
          <span className="ml-1.5 rounded px-1 text-xs text-neutral-500 ring-1 ring-neutral-300 ring-inset dark:ring-neutral-700">
            {badge}
          </span>
        )}
      </span>
      <div className="flex items-center gap-2" title={detail}>
        <div className="h-2 flex-1">
          <div
            className="h-2 rounded-r bg-neutral-800 dark:bg-neutral-300"
            style={{ width: `${width}%` }}
          />
        </div>
        <span className="w-6 text-right font-medium tabular-nums">{value}</span>
      </div>
      <span />
      <span className="text-xs text-neutral-500">{detail}</span>
    </li>
  );
}

function Gaps({ insights }: { insights: Insights }) {
  const { gaps, matchedPostings } = insights;
  const max = Math.max(0, ...gaps.map((g) => g.missing + g.partial));
  return (
    <section aria-labelledby="gaps-heading" className="flex flex-col gap-3">
      <div>
        <SectionTitle id="gaps-heading">Must-haves you miss most</SectionTitle>
        <p className="mt-1 text-xs text-neutral-500">
          Across {matchedPostings} posting{matchedPostings === 1 ? "" : "s"}{" "}
          matched with your CV. Bars count missing and partly met must-haves.
        </p>
      </div>
      {matchedPostings === 0 ? (
        <p className="text-sm text-neutral-500">
          Match postings with your CV to see which must-haves you miss most.
        </p>
      ) : gaps.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Your CV proves every must-have so far.
        </p>
      ) : (
        <ol data-testid="gaps">
          {gaps.map((g) => (
            <BarRow
              key={g.skill}
              label={g.skill}
              value={g.missing + g.partial}
              max={max}
              detail={[
                g.missing ? `missing in ${g.missing}` : null,
                g.partial ? `partly met in ${g.partial}` : null,
              ]
                .filter(Boolean)
                .join(", ")
                .concat(
                  ` of ${g.asked} posting${g.asked === 1 ? "" : "s"} that require it`,
                )}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function Countries({ insights }: { insights: Insights }) {
  const max = Math.max(0, ...insights.countries.map((c) => c.count));
  return (
    <section
      aria-labelledby="countries-heading"
      className="flex flex-col gap-3"
    >
      <SectionTitle id="countries-heading">Where the jobs are</SectionTitle>
      <ol>
        {insights.countries.map((c) => (
          <BarRow
            key={c.country ?? "none"}
            label={c.country ?? "Not stated"}
            value={c.count}
            max={max}
            badge={c.target ? "target" : undefined}
            detail={`${c.count} of ${insights.postings} posting${insights.postings === 1 ? "" : "s"}`}
          />
        ))}
      </ol>
    </section>
  );
}

const RELOCATION_LABEL = {
  yes: "Offered",
  no: "Not offered",
  not_stated: "Not stated",
} as const;

function Relocation({ relocation }: { relocation: Insights["relocation"] }) {
  return (
    <section
      aria-labelledby="relocation-heading"
      className="flex flex-col gap-3"
    >
      <SectionTitle id="relocation-heading">Relocation support</SectionTitle>
      <dl className="grid grid-cols-3 gap-2">
        {(["yes", "no", "not_stated"] as const).map((k) => (
          <div
            key={k}
            className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
          >
            <dt className="text-xs text-neutral-500">{RELOCATION_LABEL[k]}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {relocation[k]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
